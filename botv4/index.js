/**
 * index.js — Badge Bot v4 entry point.
 *
 * INTERNAL NOTE (không ra Discord):
 *   Bot chỉ phản hồi interaction từ ALLOWED_GUILD_ID (config.js).
 *   Guard được check trong từng command execute() và modal handler.
 *   index.js không làm guard — để tránh bot crash nếu interaction thiếu guildId.
 *
 *   Required env vars (.env):
 *     BOT_TOKEN   — bot token từ Discord Dev Portal
 *     CLIENT_ID   — application ID của bot
 *     GUILD_ID    — guild để register slash command tức thì (nên set = ALLOWED_GUILD_ID)
 *     VIP_ROLE_ID — role ID cho VIP tier (optional, bỏ trống = tắt VIP)
 *
 *   Commands registered:
 *     /badge, /setcookie, /status, /cleargames, /menu
 *
 *   Modal handlers:
 *     badge_token_*    → badge.handleTokenModal()
 *     setcookie_modal_ → setcookie.handleCookieModal()
 */

import 'dotenv/config';
import {
  Client,
  GatewayIntentBits,
  Collection,
  Events,
} from 'discord.js';

import { ALLOWED_GUILD_ID } from './config.js';
import * as badge      from './commands/badge.js';
import * as setcookie  from './commands/setcookie.js';
import * as status     from './commands/status.js';
import * as cleargames from './commands/cleargames.js';
import * as menu       from './commands/menu.js';

// GuildMembers intent cần thiết để check VIP role qua member.roles.cache
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.DirectMessages,
  ],
});

// Command registry
client.commands = new Collection();
for (const cmd of [badge, setcookie, status, cleargames, menu]) {
  client.commands.set(cmd.data.name, cmd);
}

client.once(Events.ClientReady, c => {
  // CLIENT_ID không cần .env — bot biết ID của chính nó qua c.user.id sau khi login
  console.log(`[bot] ready as ${c.user.tag} (ID: ${c.user.id})`);
  console.log(`[bot] server-locked to guild: ${ALLOWED_GUILD_ID}`);
  console.log(`[bot] VIP role: ${process.env.VIP_ROLE_ID ? process.env.VIP_ROLE_ID : 'disabled'}`);
});

client.on(Events.InteractionCreate, async interaction => {

  // ── Slash commands ──────────────────────────────────────────────────────────
  if (interaction.isChatInputCommand()) {
    const cmd = client.commands.get(interaction.commandName);
    if (!cmd) return;
    try {
      await cmd.execute(interaction);
    } catch (err) {
      console.error(`[cmd:${interaction.commandName}]`, err);
      const payload = { content: '❌ Something went wrong.', ephemeral: true };
      if (interaction.replied || interaction.deferred) {
        await interaction.followUp(payload).catch(() => {});
      } else {
        await interaction.reply(payload).catch(() => {});
      }
    }
    return;
  }

  // ── Modal submissions ───────────────────────────────────────────────────────
  if (interaction.isModalSubmit()) {
    const id = interaction.customId;

    // Modal nhập user token từ /badge
    if (id.startsWith('badge_token_')) {
      try {
        await badge.handleTokenModal(interaction);
      } catch (err) {
        console.error('[modal:badge_token]', err);
        await interaction.reply({ content: '❌ Failed to process token.', ephemeral: true }).catch(() => {});
      }
      return;
    }

    // Modal nhập cf_clearance cookie từ /setcookie
    if (id.startsWith('setcookie_modal_')) {
      try {
        await setcookie.handleCookieModal(interaction);
      } catch (err) {
        console.error('[modal:setcookie]', err);
        await interaction.reply({ content: '❌ Failed to save cookie.', ephemeral: true }).catch(() => {});
      }
      return;
    }
  }
});

client.login(process.env.BOT_TOKEN);
