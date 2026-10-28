/**
 * commands/status.js — /status: hiển thị trạng thái bot và thông tin tier của user.
 *
 * INTERNAL NOTE (không ra Discord):
 *   Embed gồm 3 phần:
 *     1. Auth: cookie/analytics token/fingerprint status
 *     2. Tier: Standard hay VIP, giới hạn tương ứng
 *     3. Stats: tổng game và giờ đã claim
 *
 *   Token info KHÔNG hiển thị trong embed — chỉ note ngắn về cách hoạt động.
 */

import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import { State }               from '../state.js';
import { replyDM }             from '../dm.js';
import { checkGuild, getLimits } from '../guards.js';

export const data = new SlashCommandBuilder()
  .setName('status')
  .setDescription('Show badge bot status and your tier (sent via DM)');

export async function execute(interaction) {
  // Server lock
  if (!await checkGuild(interaction)) return;

  const state  = State.load();
  const limits = await getLimits(interaction);

  const embed = new EmbedBuilder()
    .setColor(limits.isVip ? 0xf1c40f : 0x5865f2)
    .setTitle(`${limits.isVip ? '⭐ Badge Bot — VIP' : '🤖 Badge Bot — Standard'}`)
    .addFields(
      {
        name: '🔑 Auth',
        value: [
          `Cookie:           ${state.hasCookie      ? '✅ Set'    : '❌ Not set → `/setcookie`'}`,
          `Analytics token:  ${state.analyticsToken ? '✅ Cached' : '⚠ Fetches on next run'}`,
          `Fingerprint:      ${state.fingerprint    ? `✅ ${state.fingerprint.length} chars` : '⚠ Not set (optional)'}`,
        ].join('\n'),
        inline: false,
      },
      {
        name: '🎫 Your Tier',
        value: [
          `Tier:       **${limits.isVip ? '⭐ VIP' : 'Standard'}**`,
          `Max games:  **${limits.maxGames}**`,
          `Max hours:  **${limits.maxHours}h/game**`,
        ].join('\n'),
        inline: false,
      },
      {
        name: '📊 Stats',
        value: [
          `Games claimed:   **${state.totalGamesClaimed}**`,
          `Hours claimed:   **${state.totalHoursClaimed.toLocaleString()}h**`,
          `Used-game ring:  **${state.usedGames.length}** IDs`,
        ].join('\n'),
        inline: false,
      },
    )
    .setFooter({ text: 'User token lives in RAM — re-enter after bot restart' })
    .setTimestamp();

  await replyDM(interaction, { embeds: [embed] });
}
