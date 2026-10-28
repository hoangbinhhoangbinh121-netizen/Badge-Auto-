/**
 * tokenUtils.js — detect + validate Discord token types.
 *
 * Discord có 2 loại token:
 *   Bot token  : "Bot MTEx..." — discord.js dùng để login, KHÔNG dùng cho /science
 *   User token : "MTEx..."     — dùng trực tiếp cho /science Authorization header
 *
 * /science chỉ accept USER token, raw, không có prefix "Bot ".
 * Nếu chief paste nhầm bot token vào modal → detect + báo lỗi rõ.
 */

/**
 * Detect token type from raw string.
 * Returns: 'bot' | 'user' | 'unknown'
 */
export function detectTokenType(raw) {
  if (!raw || typeof raw !== 'string') return 'unknown';
  const t = raw.trim();

  // Bot tokens have explicit "Bot " prefix
  if (/^Bot\s+/i.test(t)) return 'bot';

  // Discord tokens are 3 base64 segments separated by dots
  // segment[0] = base64(user_id), segment[1] = timestamp, segment[2] = hmac
  const parts = t.split('.');
  if (parts.length === 3) {
    try {
      const uid = Buffer.from(parts[0], 'base64').toString('utf-8');
      // user IDs are snowflakes: 17–19 digit numbers
      if (/^\d{17,19}$/.test(uid)) return 'user';
    } catch { /* fall through */ }
  }

  return 'unknown';
}

/**
 * Sanitize token for use in Authorization header.
 * - User token: return as-is
 * - Bot token: strip "Bot " prefix and return the raw part
 *   (though /science will still reject it — we just normalize)
 * - Unknown: return as-is, let Discord API reject it
 */
export function sanitizeToken(raw) {
  if (!raw) return '';
  const t = raw.trim();
  if (/^Bot\s+/i.test(t)) return t.replace(/^Bot\s+/i, '').trim();
  return t;
}

/**
 * Decode user_id from a user token.
 * Returns '' if it fails or token is not a user token.
 */
export function userIdFromToken(token) {
  try {
    const t     = sanitizeToken(token);
    const first = t.split('.')[0];
    const uid   = Buffer.from(first, 'base64').toString('utf-8');
    if (/^\d{17,19}$/.test(uid)) return uid;
    return '';
  } catch {
    return '';
  }
}

/**
 * Quick format check before hitting the API.
 * Throws with a descriptive message if something's obviously wrong.
 */
export function assertUserToken(raw) {
  if (!raw || !raw.trim()) {
    throw new Error('Token is empty.');
  }

  const type = detectTokenType(raw);

  if (type === 'bot') {
    throw new Error(
      'That looks like a **Bot token** (starts with "Bot "). ' +
      '/science requires your **user account token**, not a bot token.',
    );
  }

  if (type === 'unknown') {
    throw new Error(
      'Token format not recognized. ' +
      'Make sure you paste the raw user token from Discord (3 segments separated by dots).',
    );
  }
  // type === 'user' → ok
}
