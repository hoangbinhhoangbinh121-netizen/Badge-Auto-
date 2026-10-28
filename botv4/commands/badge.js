/**
 * commands/badge.js — /badge command: claim playtime badges.
 *
 * INTERNAL NOTE (không ra Discord):
 *   Flow người dùng:
 *     1. User gõ /badge [options]
 *     2. Nếu chưa có token trong SESSION_TOKENS → hiện modal nhập token
 *     3. Sau khi nhập token → handleTokenModal() lưu vào RAM
 *     4. User gõ /badge lại → chạy claim với token đã có
 *     5. Token bị xóa khi: reauth=true, auth fail, bot restart
 *
 *   VIP check:
 *     - User có VIP_ROLE_ID → giới hạn cao hơn (VIP_MAX_GAMES, VIP_MAX_HOURS)
 *     - Giá trị input vượt giới hạn tier → bị clamp xuống, không báo lỗi
 *
 *   Server lock:
 *     - checkGuild() đầu execute() → reject interaction nếu không đúng guild
 *
 *   Token storage:
 *     - SESSION_TOKENS là Map trong module scope (RAM only)
 *     - Key: Discord user ID, Value: { token, type }
 *     - KHÔNG bao giờ ghi xuống disk
 */

import {
  SlashCommandBuilder,
  EmbedBuilder,
  ActionRowBuilder,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
} from 'discord.js';

import { State }                            from '../state.js';
import { Session }                          from '../session.js';
import { ensureToken }                      from '../auth.js';
import { ScienceClient }                    from '../scienceClient.js';
import { runSpoofer }                       from '../spoofer.js';
import { loadGames, selectGames }           from '../games.js';
import { assertUserToken, detectTokenType } from '../tokenUtils.js';
import { replyDM, deferDM, editDM, errEmbed, infoEmbed, warnEmbed } from '../dm.js';
import { checkGuild, getLimits }            from '../guards.js';

// userId → { token, type } — RAM only, KHÔNG ghi disk
const SESSION_TOKENS = new Map();

export const data = new SlashCommandBuilder()
  .setName('badge')
  .setDescription('Claim Discord game activity badges (results sent via DM)')
  .addIntegerOption(o =>
    o.setName('games')
     .setDescription('Number of games to claim (default: 10, max depends on tier)')
     .setMinValue(1)
     .setRequired(false))
  .addNumberOption(o =>
    o.setName('hours')
     .setDescription('Playtime hours per game (default: 1, max depends on tier)')
     .setMinValue(0.1)
     .setRequired(false))
  .addBooleanOption(o =>
    o.setName('reauth')
     .setDescription('Force re-enter your user token')
     .setRequired(false));

export async function execute(interaction) {
  // ── Server lock ─────────────────────────────────────────────────────────────
  if (!await checkGuild(interaction)) return;

  const userId = interaction.user.id;
  const reauth = interaction.options.getBoolean('reauth') ?? false;
  if (reauth) SESSION_TOKENS.delete(userId);

  // ── Token modal ─────────────────────────────────────────────────────────────
  // Nếu chưa có token → hiện modal (Discord yêu cầu reply trực tiếp, không defer)
  if (!SESSION_TOKENS.has(userId)) {
    const modal = new ModalBuilder()
      .setCustomId(`badge_token_${userId}`)
      .setTitle('Enter your Discord account token');

    // Modal chỉ có 1 field — nhập user token (không phải bot token)
    modal.addComponents(
      new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId('token_input')
          .setLabel('Your Discord USER token (NOT bot token)')
          .setStyle(TextInputStyle.Short)
          .setPlaceholder('MTEx... (3 segments separated by dots)')
          .setRequired(true)
      )
    );
    await interaction.showModal(modal);
    return;
  }

  // ── Get tier limits ──────────────────────────────────────────────────────────
  // VIP user có giới hạn cao hơn, check role ở đây
  const limits = await getLimits(interaction);

  // Clamp input values xuống limit của tier — không báo lỗi, chỉ giảm
  const rawGames = interaction.options.getInteger('games') ?? 10;
  const rawHours = interaction.options.getNumber('hours')  ?? 1.0;
  const gameCount  = Math.min(rawGames, limits.maxGames);
  const hours      = Math.min(rawHours, limits.maxHours);
  const durationMs = Math.floor(hours * 3600 * 1000);

  // ── Setup state ──────────────────────────────────────────────────────────────
  const state  = State.load();
  state.token  = SESSION_TOKENS.get(userId).token;

  if (!state.hasCookie) {
    return replyDM(interaction, {
      embeds: [errEmbed('No cookie set', 'Bot owner needs to run `/setcookie` first.')],
    });
  }

  // ── Open DM với "working" message ────────────────────────────────────────────
  const tierLabel = limits.isVip ? '⭐ VIP' : 'Standard';
  const { dmMsg } = await deferDM(interaction, `⏳ Setting up session... [${tierLabel}]`);

  // ── Auth ─────────────────────────────────────────────────────────────────────
  let session;
  try {
    session = await Session.create();
    await ensureToken(state, session.superProps);
  } catch (err) {
    SESSION_TOKENS.delete(userId);
    return editDM(interaction, dmMsg, {
      embeds: [errEmbed('Auth failed',
        `${err.message}\n\nToken cleared — run \`/badge\` again to re-enter.`)],
    });
  }

  // ── Load games ────────────────────────────────────────────────────────────────
  await editDM(interaction, dmMsg, { embeds: [infoEmbed('⏳ Loading game list...')] });
  const allGames = await loadGames();
  if (!allGames.length) {
    return editDM(interaction, dmMsg, {
      embeds: [errEmbed('Game list failed', 'Could not load from CDN.')],
    });
  }

  const selected = selectGames(allGames, state, gameCount);
  if (!selected.length) {
    return editDM(interaction, dmMsg, {
      embeds: [errEmbed('No games', 'Could not select games.')],
    });
  }

  // ── Progress update ──────────────────────────────────────────────────────────
  await editDM(interaction, dmMsg, {
    embeds: [infoEmbed(
      `⏳ Claiming **${hours}h** on **${selected.length}** games...\n` +
      `Tier: **${tierLabel}** · Batch: 50 games · ~${Math.ceil(selected.length / 50)} req(s)`
    )],
  });

  // ── Run spoofer ──────────────────────────────────────────────────────────────
  const logs    = [];
  let lastEdit  = Date.now();

  const logFn = async (type, msg) => {
    logs.push({ type, msg });
    console.log(`[spoofer:${type}] ${msg}`);
    // Rate-limit DM edits to every 2s
    if (Date.now() - lastEdit > 2000) {
      lastEdit = Date.now();
      const tail = logs.slice(-5).map(l => `\`${l.type}\` ${l.msg}`).join('\n');
      await editDM(interaction, dmMsg, {
        embeds: [infoEmbed(`⏳ Running...\n\n${tail}`)],
      }).catch(() => {});
    }
  };

  const sci = new ScienceClient(state, session);
  const ok  = await runSpoofer(sci, selected, g => sci.buildSession(g, durationMs), logFn);

  // ── Save stats ────────────────────────────────────────────────────────────────
  state.totalGamesClaimed += ok;
  state.totalHoursClaimed += ok * hours;
  state.save();

  // ── Final embed → DM ─────────────────────────────────────────────────────────
  const allOk = ok === selected.length;
  const color = allOk ? 0x57f287 : ok > 0 ? 0xfee75c : 0xed4245;
  const icon  = allOk ? '✅' : ok > 0 ? '⚠️' : '❌';

  const resultEmbed = new EmbedBuilder()
    .setColor(color)
    .setTitle(`${icon} Badge Claim ${allOk ? 'Complete' : ok > 0 ? 'Partial' : 'Failed'}`)
    .addFields(
      { name: 'Games claimed',  value: `${ok} / ${selected.length}`,                                      inline: true  },
      { name: 'Hours claimed',  value: `${(ok * hours).toLocaleString()}h`,                                inline: true  },
      { name: 'Tier',           value: tierLabel,                                                          inline: true  },
      { name: 'All-time total', value: `${state.totalGamesClaimed} games · ${state.totalHoursClaimed.toLocaleString()}h`, inline: false },
    )
    .setTimestamp();

  if (!state.fingerprint) {
    resultEmbed.setFooter({ text: '⚠ No fingerprint — badge credit may be reduced' });
  }

  const tail = logs.slice(-8).map(l => `\`${l.type}\` ${l.msg}`).join('\n');
  if (tail) resultEmbed.addFields({ name: 'Log', value: tail, inline: false });

  await editDM(interaction, dmMsg, { embeds: [resultEmbed] });
}

// ─── Modal: token input ───────────────────────────────────────────────────────
// handleTokenModal được gọi từ index.js khi customId match "badge_token_*"
export async function handleTokenModal(interaction) {
  // Server lock check trong modal cũng cần thiết
  if (!await checkGuild(interaction)) return;

  const userId = interaction.user.id;
  const raw    = interaction.fields.getTextInputValue('token_input').trim();

  // Validate format trước khi lưu vào RAM
  try {
    assertUserToken(raw);
  } catch (err) {
    return replyDM(interaction, {
      embeds: [errEmbed('Invalid token', err.message)],
    });
  }

  const type = detectTokenType(raw);
  // Chỉ lưu vào Map (RAM), KHÔNG ghi disk
  SESSION_TOKENS.set(userId, { token: raw, type });

  await replyDM(interaction, {
    embeds: [
      new EmbedBuilder()
        .setColor(0x57f287)
        .setTitle('✅ Token accepted')
        .setDescription(
          `Type: \`${type}\`\n` +
          `Stored in **memory only** — never written to disk.\n\n` +
          `Now run \`/badge\` again with your options to start claiming.`
        ),
    ],
  });
}
