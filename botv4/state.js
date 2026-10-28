/**
 * state.js — persisted session state.
 *
 * INTERNAL NOTE (không ra Discord):
 *   TOKEN KHÔNG BAO GIỜ được lưu xuống disk.
 *   Chỉ tồn tại trong RAM (SESSION_TOKENS map trong badge.js) cho đến khi bot restart.
 *   Mỗi user tự nhập token của họ qua modal khi dùng /badge.
 *
 *   Cookie (cf_clearance) được lưu chung vào science_state.json — đây là cookie
 *   của người chạy bot (owner), không phải cookie của từng user.
 */

import fs   from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname   = path.dirname(fileURLToPath(import.meta.url));
const STATE_FILE  = path.join(__dirname, 'science_state.json');

const AUTH_MAX_AGE = 12 * 60 * 60 * 1000; // 12h in ms

export class State {
  constructor() {
    // ─── KHÔNG PERSIST (RAM only) ─────────────────────────────────────────────
    this.token = ''; // user token — set tại runtime, xóa khi bot restart

    // ─── PERSIST (ghi vào science_state.json) ────────────────────────────────
    this.cookie             = '';
    this.fingerprint        = '';
    this.analyticsToken     = '';
    this.fetchedAt          = 0;
    this.usedGames          = [];
    this.totalGamesClaimed  = 0;
    this.totalHoursClaimed  = 0;
  }

  get isStale()   { return !this.analyticsToken || (Date.now() - this.fetchedAt) > AUTH_MAX_AGE; }
  get hasCookie() { return this.cookie.trim().length > 0; }
  get hasToken()  { return this.token.trim().length > 0; }

  static load() {
    const s = new State();
    if (fs.existsSync(STATE_FILE)) {
      try {
        const d = JSON.parse(fs.readFileSync(STATE_FILE, 'utf-8'));
        // token sẽ KHÔNG bao giờ được load từ file — intentional
        s.cookie            = d.cookie              ?? '';
        s.fingerprint       = d.fingerprint         ?? '';
        s.analyticsToken    = d.analytics_token     ?? '';
        s.fetchedAt         = d.fetched_at          ?? 0;
        s.usedGames         = d.used_games          ?? [];
        s.totalGamesClaimed = d.total_games_claimed ?? 0;
        s.totalHoursClaimed = d.total_hours_claimed ?? 0;
      } catch { /* corrupt state → start fresh */ }
    }
    return s;
  }

  save() {
    // Token KHÔNG được lưu — chỉ persist những field an toàn
    const d = {
      cookie:               this.cookie,
      fingerprint:          this.fingerprint,
      analytics_token:      this.analyticsToken,
      fetched_at:           this.fetchedAt,
      used_games:           this.usedGames,
      total_games_claimed:  this.totalGamesClaimed,
      total_hours_claimed:  this.totalHoursClaimed,
    };
    fs.writeFileSync(STATE_FILE, JSON.stringify(d, null, 2), 'utf-8');
  }

  invalidateToken() {
    this.analyticsToken = '';
    this.fetchedAt      = 0;
  }
}
