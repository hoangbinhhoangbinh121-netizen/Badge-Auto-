/**
 * guards.js — server lock + VIP tier check.
 *
 * INTERNAL NOTE (không ra Discord):
 *   checkGuild()  : gọi đầu mỗi command execute(). Nếu interaction đến từ
 *                   server sai → reply ephemeral "not available here" + return false.
 *                   Silent fail nếu không thể reply.
 *
 *   isVip()       : kiểm tra member có role VIP_ROLE_ID không.
 *                   Trả về false nếu VIP_ROLE_ID chưa set trong .env.
 *
 *   getLimits()   : trả về { maxGames, maxHours } tùy theo tier của user.
 */

import { ALLOWED_GUILD_ID, VIP_ROLE_ID, DEFAULT_MAX_GAMES, DEFAULT_MAX_HOURS, VIP_MAX_GAMES, VIP_MAX_HOURS } from './config.js';

/**
 * Kiểm tra interaction có đến từ đúng server không.
 * Gọi ở đầu mọi command execute() — return false nghĩa là bail out.
 *
 * @param {import('discord.js').Interaction} interaction
 * @returns {Promise<boolean>}
 */
export async function checkGuild(interaction) {
  if (interaction.guildId === ALLOWED_GUILD_ID) return true;

  // Interaction từ server khác hoặc DM — từ chối lặng lẽ
  try {
    await interaction.reply({
      content: '❌ This bot is not available here.',
      ephemeral: true,
    });
  } catch { /* ignore — modal ack may have been sent already */ }

  return false;
}

/**
 * Kiểm tra user có VIP role không.
 * Cần GatewayIntentBits.GuildMembers hoặc fetch member từ guild.
 *
 * @param {import('discord.js').Interaction} interaction
 * @returns {Promise<boolean>}
 */
export async function isVip(interaction) {
  if (!VIP_ROLE_ID) return false; // VIP feature chưa được cấu hình
  try {
    const member = interaction.member
      ?? await interaction.guild?.members.fetch(interaction.user.id);
    return member?.roles?.cache?.has(VIP_ROLE_ID) ?? false;
  } catch {
    return false;
  }
}

/**
 * Trả về giới hạn game/hour cho user dựa theo tier.
 *
 * @param {import('discord.js').Interaction} interaction
 * @returns {Promise<{ maxGames: number, maxHours: number }>}
 */
export async function getLimits(interaction) {
  const vip = await isVip(interaction);
  return {
    maxGames: vip ? VIP_MAX_GAMES : DEFAULT_MAX_GAMES,
    maxHours: vip ? VIP_MAX_HOURS : DEFAULT_MAX_HOURS,
    isVip:    vip,
  };
}
