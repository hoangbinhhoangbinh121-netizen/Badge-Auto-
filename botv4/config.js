/**
 * config.js — central constants for the badge bot.
 *
 * INTERNAL NOTE (không hiển thị ra Discord):
 *   - ALLOWED_GUILD_ID   : bot chỉ chạy trong server này, ignore mọi interaction từ nơi khác
 *   - VIP_ROLE_ID        : role được hưởng giới hạn cao hơn (game/hour cap)
 *   - DEFAULT_*          : giới hạn cho user thường
 *   - VIP_*              : giới hạn cho user có VIP role
 *
 * Thay đổi giới hạn ở đây, không cần sửa từng command.
 */

// ─── SERVER LOCK ──────────────────────────────────────────────────────────────
// Bot chỉ phản hồi interaction từ server có ID này.
// Interaction từ bất kỳ server khác hoặc DM đều bị silent-ignore.
export const ALLOWED_GUILD_ID = '1530517263046934569';

// ─── VIP ROLE ─────────────────────────────────────────────────────────────────
// Role ID cho VIP. Load từ .env để dễ thay đổi không cần sửa code.
export const VIP_ROLE_ID = process.env.VIP_ROLE_ID ?? '';

// ─── DEFAULT USER LIMITS ──────────────────────────────────────────────────────
export const DEFAULT_MAX_GAMES = 100;   // max game count /badge --games
export const DEFAULT_MAX_HOURS = 10;    // max hours/game /badge --hours

// ─── VIP USER LIMITS ──────────────────────────────────────────────────────────
export const VIP_MAX_GAMES = 500;       // VIP có thể claim nhiều hơn
export const VIP_MAX_HOURS = 24;        // VIP có thể set giờ cao hơn

// ─── BATCH CONFIG ─────────────────────────────────────────────────────────────
// Không đổi trừ khi biết mình đang làm gì
export const BATCH_SIZE  = 50;
export const BATCH_DELAY = 300; // ms
