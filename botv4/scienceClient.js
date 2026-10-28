/**
 * scienceClient.js — builds launch_game + running_game_heartbeat events
 * and POSTs them to Discord's /science endpoint.
 *
 * Authorization header always uses the raw USER token (no "Bot " prefix).
 * Discord's /science endpoint rejects bot tokens outright.
 */

import { USER_AGENT }    from './superProps.js';
import { sanitizeToken } from './tokenUtils.js';

const SCIENCE_URL = 'https://discord.com/api/v9/science';

export class ScienceClient {
  constructor(state, session) {
    this.state   = state;
    this.session = session;
    this._seq    = 0;
  }

  _nextSeq() { return ++this._seq; }

  buildLaunch(game) {
    const now   = Date.now();
    const props = {
      client_track_timestamp:         now,
      client_heartbeat_session_id:    this.session.heartbeatSession,
      event_sequence_number:          this._nextSeq(),
      game:                           game.name,
      game_id:                        game.id,
      verified:                       true,
      elevated:                       false,
      is_launcher:                    false,
      game_platform:                  'desktop',
      detection_method:               'verified_game',
      is_overlay_enabled:             false,
      is_overlay_game_enabled:        true,
      is_overlay_game_source:         'OOP_DEFAULT_DATABASE',
      fullscreen_type:                'UNKNOWN',
      hardware_display_count:         1,
      overlay_method:                 'Disabled',
      activity_status_enabled:        true,
      activity_status_shared_guilds:  [],
      current_user_status:            'online',
      game_detection_enabled:         true,
      executable_path:                game.exe,
      voice_channel_id:               null,
      voice_channel_type:             null,
      voice_channel_bitrate:          null,
      voice_channel_guild_id:         null,
      hidden_by_distributor:          false,
      game_metadata:                  null,
      executable_fingerprint:         this.state.fingerprint || undefined,
      client_performance_cpu:         null,
      client_performance_memory:      null,
      cpu_core_count:                 null,
      accessibility_features:         0,
      rendered_locale:                'en-GB',
      launch_signature:               this.session.launchSignature,
      client_rtc_state:               null,
      client_app_state:               'focused',
      client_send_timestamp:          now,
    };
    if (!this.state.fingerprint) delete props.executable_fingerprint;
    return { type: 'launch_game', properties: props };
  }

  buildHeartbeat(game, durationMs, sessionId, initial, final, ts = null) {
    const now = ts ?? Date.now();
    return {
      type: 'running_game_heartbeat',
      properties: {
        client_track_timestamp:         now,
        client_heartbeat_session_id:    this.session.heartbeatSession,
        event_sequence_number:          this._nextSeq(),
        game_id:                        game.id,
        game_name:                      game.name,
        game_metadata:                  null,
        game_executable:                game.exe,
        game_detection_enabled:         true,
        initial_heartbeat:              initial,
        final_heartbeat:                final,
        game_session_id:                sessionId,
        duration_tracked_ms:            durationMs,
        rtc_connection_id:              null,
        media_session_id:               null,
        launch_signature:               this.session.launchSignature,
        client_app_state:               'focused',
        client_send_timestamp:          now,
      },
    };
  }

  buildSession(game, durationMs) {
    const sid   = crypto.randomUUID();
    const now   = Date.now();
    const start = now - durationMs > 0 ? now - durationMs : now;
    return [
      this.buildHeartbeat(game, 0,          sid, true,  false, start),
      this.buildLaunch(game),
      this.buildHeartbeat(game, durationMs, sid, false, true,  now),
    ];
  }

  async post(events) {
    // ⚠ Critical: /science MUST receive user token, never bot token
    const userToken = sanitizeToken(this.state.token);

    const payload = {
      token:  this.state.analyticsToken,
      events,
    };

    const headers = {
      'accept':              '*/*',
      'accept-language':     'en-GB',
      'authorization':        userToken,        // raw user token
      'content-type':        'application/json',
      'cookie':               this.state.cookie,
      'origin':              'https://discord.com',
      'referer':             'https://discord.com/channels/@me',
      'user-agent':           USER_AGENT,
      'x-debug-options':     'bugReporterEnabled',
      'x-discord-locale':    'en-GB',
      'x-discord-timezone':  'Europe/Oslo',
      'x-super-properties':   this.session.superProps,
    };

    try {
      const res = await fetch(SCIENCE_URL, {
        method: 'POST',
        headers,
        body:   JSON.stringify(payload),
        signal: AbortSignal.timeout(15_000),
      });
      return res.status;
    } catch {
      return 0;
    }
  }
}
