/**
 * commands/menu.js — /menu: hiển thị danh sách lệnh và hướng dẫn dùng bot.
 *
 * INTERNAL NOTE (không ra Discord):
 *   Menu embed chỉ liệt kê lệnh và mô tả ngắn.
 *   Tier của user được check để hiển thị giới hạn đúng (VIP vs Standard).
 *   Ghi chú kỹ thuật (flow token, disk/RAM) KHÔNG được đưa vào embed.
 */

import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import { replyDM }             from '../dm.js';
import { checkGuild, getLimits } from '../guards.js';

export const data = new SlashCommandBuilder()
  .setName('menu')
  .setDescription('Show all available commands and usage guide (sent via DM)');

export async function execute(interaction) {
  // Server lock
  if (!await checkGuild(interaction)) return;

  const limits = await getLimits(interaction);
  const tierLabel = limits.isVip ? '⭐ VIP' : 'Standard';
  const color     = limits.isVip ? 0xf1c40f : 0x5865f2;

  const embed = new EmbedBuilder()
    .setColor(color)
    .setTitle('📋 Badge Bot — Command Menu')
    .setDescription(
      `Your tier: **${tierLabel}**\n` +
      `Max games: **${limits.maxGames}** · Max hours/game: **${limits.maxHours}h**\n\n` +
      `All responses are sent to your **DMs** to keep the channel clean.`
    )
    .addFields(
      {
        name: '🎮 `/badge` — Claim game badges',
        value: [
          '> Start a badge claim session.',
          '> First run will ask for your **user token** via a secure modal.',
          '> Token is kept in RAM only — never saved to disk.',
          '',
          '**Options:**',
          '`games` — how many games to claim *(default: 10)*',
          `\`hours\` — playtime hours per game *(default: 1, max: ${limits.maxHours}h)*`,
          '`reauth` — force re-enter your token *(use if auth fails)*',
        ].join('\n'),
        inline: false,
      },
      {
        name: '🍪 `/setcookie` — Set cf_clearance cookie',
        value: [
          '> Required before first run.',
          '> Opens a modal to paste your `cf_clearance` cookie.',
          '> Cookie is saved to disk and shared across all runs.',
          '> Re-run if you get 401/403 errors.',
        ].join('\n'),
        inline: false,
      },
      {
        name: '📊 `/status` — Check bot status',
        value: [
          '> Shows current auth state, your tier limits, and claim stats.',
          '> Use this to verify cookie + token are ready before claiming.',
        ].join('\n'),
        inline: false,
      },
      {
        name: '🔄 `/cleargames` — Reset game rotation',
        value: [
          '> Clears the used-games ring so all games are available again.',
          '> Useful if you want to re-claim the same games.',
        ].join('\n'),
        inline: false,
      },
      {
        name: '📋 `/menu` — This menu',
        value: '> Shows this command guide with your current tier info.',
        inline: false,
      },
      {
        name: '🚀 Quick Start',
        value: [
          '1️⃣ Run `/setcookie` → paste your `cf_clearance` cookie',
          '2️⃣ Run `/badge` → paste your **user token** in the modal',
          '3️⃣ Run `/badge games:50 hours:2` → start claiming',
          '4️⃣ Run `/status` → check results and stats',
        ].join('\n'),
        inline: false,
      },
    )
    .setFooter({ text: `Badge Bot v4 · Server-locked · ${tierLabel} tier` })
    .setTimestamp();

  await replyDM(interaction, { embeds: [embed] });
}
