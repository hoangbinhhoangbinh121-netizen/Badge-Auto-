/**
 * superProps.js — builds the x-super-properties header Discord expects.
 * Tries cordapi first (keeps build numbers fresh), falls back to hardcoded values.
 */

const CLIENT_VERSION      = '1.0.9253';
const CLIENT_BUILD_NUMBER = 594031;
const NATIVE_BUILD_NUMBER = 88414;
const OS_VERSION          = '10.0.26200';

export const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 ' +
  '(KHTML, like Gecko) discord/1.0.9253 Chrome/148.0.7778.280 ' +
  'Electron/42.7.1 Safari/537.36';

const PROPERTIES_URL = 'https://cordapi.dolfi.es/api/v2/properties/windows';

function localProps() {
  return {
    os: 'Windows',
    browser: 'Discord Client',
    release_channel: 'stable',
    client_version: CLIENT_VERSION,
    os_version: OS_VERSION,
    os_arch: 'x64',
    app_arch: 'x64',
    system_locale: 'en-GB',
    has_client_mods: false,
    browser_user_agent: USER_AGENT,
    browser_version: '42.7.1',
    os_sdk_version: '26200',
    client_build_number: CLIENT_BUILD_NUMBER,
    native_build_number: NATIVE_BUILD_NUMBER,
    client_event_source: null,
    client_app_state: 'focused',
  };
}

export async function buildSuperProps(launchSignature, heartbeatSession) {
  let props;
  try {
    const res = await fetch(PROPERTIES_URL, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'user-agent': USER_AGENT },
      body: '{}',
      signal: AbortSignal.timeout(10_000),
    });
    const json = await res.json();
    props = json.properties;
  } catch {
    props = localProps();
  }

  props.client_launch_id              = crypto.randomUUID();
  props.launch_signature              = launchSignature;
  props.client_heartbeat_session_id   = heartbeatSession;

  const raw = JSON.stringify(props);
  return Buffer.from(raw).toString('base64');
}
