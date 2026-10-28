/**
 * auth.js — fetch + cache analytics_token cho /science endpoint.
 *
 * INTERNAL NOTE (không ra Discord):
 *   analytics_token khác với user token.
 *   User token → Authorization header.
 *   analytics_token → payload.token trong mỗi /science POST.
 *   Token được cache 12h trong science_state.json, tự refetch khi stale.
 */

import { USER_AGENT }     from './superProps.js';
import { sanitizeToken }  from './tokenUtils.js';

const ME_URL = 'https://discord.com/api/v9/users/@me?with_analytics_token=true';

async function readAnalyticsToken(rawToken, superProps) {
  const token = sanitizeToken(rawToken);
  const res   = await fetch(ME_URL, {
    headers: {
      authorization:        token,
      'user-agent':         USER_AGENT,
      'x-super-properties': superProps,
    },
    signal: AbortSignal.timeout(15_000),
  });

  if (res.status === 401) throw new Error('Token rejected (401) — wrong token or expired.');
  if (res.status === 403) throw new Error('Token rejected (403) — account may be restricted.');
  if (!res.ok)            throw new Error(`Unexpected response: HTTP ${res.status}`);

  const data = await res.json();
  if (!data.analytics_token) throw new Error('No analytics_token in response — token may lack required scope.');
  return data.analytics_token;
}

export async function ensureToken(state, superProps) {
  if (!state.isStale) return;
  state.analyticsToken = await readAnalyticsToken(state.token, superProps);
  state.fetchedAt      = Date.now();
  state.save();
}
