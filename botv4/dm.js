/**
 * dm.js — DM helper utilities.
 *
 * INTERNAL NOTE (không ra Discord):
 *   Tất cả response thực sự đều được gửi qua DM, không phải channel.
 *   Flow chuẩn:
 *     1. interaction.reply() — ack trong channel (ephemeral, user thấy "Sent to DMs!")
 *     2. user.send()         — nội dung thật gửi vào DM
 *
 *   Nếu DM bị tắt → fallback về ephemeral reply trong channel.
 *   Modal phải reply trực tiếp (không defer được) trước khi DM.
 */

import { EmbedBuilder } from 'discord.js';

/**
 * Ack interaction + gửi payload thật vào DM.
 */
export async function replyDM(interaction, payload) {
  if (!interaction.replied && !interaction.deferred) {
    await interaction.reply({ content: '📨 Sent to your DMs!', ephemeral: true }).catch(() => {});
  }
  try {
    await interaction.user.send(payload);
  } catch {
    const fallback = {
      ...payload,
      content: '⚠ Could not DM you (DMs may be closed). Sending here instead.\n' + (payload.content ?? ''),
    };
    if (interaction.replied || interaction.deferred) {
      await interaction.followUp({ ...fallback, ephemeral: true }).catch(() => {});
    } else {
      await interaction.reply({ ...fallback, ephemeral: true }).catch(() => {});
    }
  }
}

/**
 * Defer variant — ack ngay, trả về dmMsg object để edit progress updates.
 */
export async function deferDM(interaction, initialContent = '⏳ Working...') {
  const ack = interaction.reply({ content: '📨 Results incoming in your DMs!', ephemeral: true }).catch(() => {});
  let dmMsg = null;
  try {
    dmMsg = await interaction.user.send({ content: initialContent });
  } catch {
    await ack;
    await interaction.editReply({ content: initialContent }).catch(() => {});
    return { dmMsg: null, ack };
  }
  await ack;
  return { dmMsg, ack };
}

/**
 * Edit DM message, fallback to editReply nếu DM fail.
 */
export async function editDM(interaction, dmMsg, payload) {
  if (dmMsg) {
    await dmMsg.edit(payload).catch(() => {});
  } else {
    await interaction.editReply(payload).catch(() => {});
  }
}

// ─── Embed builders ───────────────────────────────────────────────────────────
export function errEmbed(title, desc) {
  return new EmbedBuilder().setColor(0xed4245).setTitle(`❌ ${title}`).setDescription(desc);
}
export function infoEmbed(desc) {
  return new EmbedBuilder().setColor(0x5865f2).setDescription(desc);
}
export function okEmbed(title, desc) {
  return new EmbedBuilder().setColor(0x57f287).setTitle(`✅ ${title}`).setDescription(desc);
}
export function warnEmbed(title, desc) {
  return new EmbedBuilder().setColor(0xfee75c).setTitle(`⚠️ ${title}`).setDescription(desc);
}
