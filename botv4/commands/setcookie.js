/**
 * commands/setcookie.js — /setcookie: lưu cf_clearance cookie.
 *
 * INTERNAL NOTE (không ra Discord):
 *   Cookie này là của OWNER/BOT RUNNER, không phải của từng user.
 *   Cookie được ghi xuống science_state.json và dùng chung cho mọi /science request.
 *   Sau khi set cookie mới → analytics_token tự động bị invalidate → fetch lại lần sau.
 */

import {
  SlashCommandBuilder,
  ActionRowBuilder,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
} from 'discord.js';

import { State }                    from '../state.js';
import { replyDM, errEmbed, okEmbed } from '../dm.js';
import { checkGuild }                from '../guards.js';

export const data = new SlashCommandBuilder()
  .setName('setcookie')
  .setDescription('Set the cf_clearance cookie (bot owner only — confirmation via DM)');

export async function execute(interaction) {
  // Server lock — chỉ chạy trong guild đúng
  if (!await checkGuild(interaction)) return;

  const modal = new ModalBuilder()
    .setCustomId(`setcookie_modal_${interaction.user.id}`)
    .setTitle('Set cf_clearance Cookie');

  modal.addComponents(
    new ActionRowBuilder().addComponents(
      new TextInputBuilder()
        .setCustomId('cookie_input')
        .setLabel('cf_clearance cookie value')
        .setStyle(TextInputStyle.Paragraph)
        .setPlaceholder('Paste the full cookie header value here')
        .setRequired(true)
    )
  );
  await interaction.showModal(modal);
}

export async function handleCookieModal(interaction) {
  // Server lock trong modal handler
  if (!await checkGuild(interaction)) return;

  const cookie = interaction.fields.getTextInputValue('cookie_input').trim();

  if (!cookie) {
    return replyDM(interaction, {
      embeds: [errEmbed('Empty cookie', 'Cookie cannot be empty.')],
    });
  }

  const state  = State.load();
  state.cookie = cookie;
  state.invalidateToken(); // force analytics_token refetch vì cookie mới
  state.save();

  await replyDM(interaction, {
    embeds: [okEmbed('Cookie saved',
      'Cookie written to `science_state.json`.\n' +
      'Analytics token will refresh on next `/badge` run.')],
  });
}
