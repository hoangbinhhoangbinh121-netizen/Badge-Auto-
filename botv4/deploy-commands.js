/**
 * deploy-commands.js — register slash commands vào Discord.
 *
 * INTERNAL NOTE (không ra Discord):
 *   Chạy một lần trước khi start bot: node deploy-commands.js
 *
 *   CLIENT_ID KHÔNG cần trong .env — script tự lấy từ bot token qua /users/@me.
 *   GUILD_ID đã hardcode = ALLOWED_GUILD_ID trong config.js, lấy từ .env hoặc fallback.
 *
 *   Commands: badge, setcookie, status, cleargames, menu
 */

import 'dotenv/config';
import { REST, Routes } from 'discord.js';
import { ALLOWED_GUILD_ID } from './config.js';

import * as badge      from './commands/badge.js';
import * as setcookie  from './commands/setcookie.js';
import * as status     from './commands/status.js';
import * as cleargames from './commands/cleargames.js';
import * as menu       from './commands/menu.js';

const commands = [badge, setcookie, status, cleargames, menu].map(c => c.data.toJSON());
const rest     = new REST().setToken(process.env.BOT_TOKEN);

(async () => {
  try {
    // Tự lấy CLIENT_ID từ bot token — không cần user nhập trong .env
    console.log('Fetching application ID from bot token...');
    const appData  = await rest.get(Routes.currentApplication());
    const clientId = appData.id;
    console.log(`Application ID: ${clientId}`);

    // Dùng GUILD_ID từ .env nếu có, fallback về ALLOWED_GUILD_ID trong config.js
    const guildId = process.env.GUILD_ID ?? ALLOWED_GUILD_ID;

    console.log(`Registering ${commands.length} commands to guild ${guildId}...`);
    const route = Routes.applicationGuildCommands(clientId, guildId);
    const data  = await rest.put(route, { body: commands });

    console.log(`✅ Registered ${data.length} commands:`, data.map(c => `/${c.name}`).join(', '));
  } catch (err) {
    console.error('❌ Deploy failed:', err);
  }
})();
