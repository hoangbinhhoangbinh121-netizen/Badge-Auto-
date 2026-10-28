/**
 * commands/cleargames.js — /cleargames: reset vòng quay game đã dùng.
 *
 * INTERNAL NOTE (không ra Discord):
 *   usedGames là mảng ID game đã claim, để tránh lặp trong cùng session.
 *   Reset mảng này → lần claim tiếp theo bắt đầu từ đầu danh sách game.
 */

import { SlashCommandBuilder } from 'discord.js';
import { State }               from '../state.js';
import { replyDM, okEmbed }    from '../dm.js';
import { checkGuild }          from '../guards.js';

export const data = new SlashCommandBuilder()
  .setName('cleargames')
  .setDescription('Reset the used-games rotation ring (confirmation via DM)');

export async function execute(interaction) {
  // Server lock
  if (!await checkGuild(interaction)) return;

  const state = State.load();
  const prev  = state.usedGames.length;
  state.usedGames = [];
  state.save();

  await replyDM(interaction, {
    embeds: [okEmbed('Games reset',
      `Cleared **${prev}** used game IDs.\nAll games are fresh for next run.`)],
  });
}
