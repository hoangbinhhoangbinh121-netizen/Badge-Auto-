/**
 * spoofer.js — sends events in batches, returns count of successfully claimed games.
 */

const BATCH_SIZE  = 50;
const BATCH_DELAY = 300; // ms between requests

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function* chunked(arr, size) {
  for (let i = 0; i < arr.length; i += size) {
    yield arr.slice(i, i + size);
  }
}

/**
 * @param {Object}   sciClient  — ScienceClient instance
 * @param {Array}    games      — game objects to claim
 * @param {Function} buildFn    — (game) => event[]
 * @param {Function} logFn      — (type, msg) => void  (type: 'ok'|'err'|'warn')
 * @returns {number} count of games successfully sent
 */
export async function runSpoofer(sciClient, games, buildFn, logFn = () => {}) {
  const total = games.length;
  let sentOk  = 0;
  let reqNo   = 0;

  for (const chunk of chunked(games, BATCH_SIZE)) {
    reqNo++;
    const events = chunk.flatMap(g => buildFn(g));
    const status = await sciClient.post(events);

    if (status === 204) {
      sentOk += chunk.length;
      logFn('ok', `batch ${reqNo} → ${sentOk}/${total} games`);
    } else if (status === 401 || status === 403) {
      logFn('err', `batch ${reqNo} → [${status}] auth rejected — refresh cookie`);
      return sentOk; // hard stop on auth failure
    } else {
      logFn('warn', `batch ${reqNo} → [${status}]`);
    }

    if (reqNo < Math.ceil(games.length / BATCH_SIZE)) {
      await sleep(BATCH_DELAY);
    }
  }

  return sentOk;
}
