/**
 * games.js — loads/caches Discord's game detectables list.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname   = path.dirname(fileURLToPath(import.meta.url));
const GAMES_FILE  = path.join(__dirname, 'data', 'games.json');
const GAMES_CDN   = 'https://cdn.discordapp.com/detectables/games.json';
const UA          = 'Mozilla/5.0';

function winExe(entry) {
  for (const e of (entry.executables ?? [])) {
    if (e.os === 'win32' && e.name) return e.name;
  }
  return 'game.exe';
}

function parseGames(raw) {
  const data = JSON.parse(raw);
  const seen = new Set();
  const games = [];
  for (const entry of data) {
    const id = String(entry.id ?? '');
    if (!id || !/^\d+$/.test(id) || seen.has(id)) continue;
    const hasExe = (entry.executables ?? []).some(e => e.os === 'win32' && e.name);
    if (!hasExe) continue;
    seen.add(id);
    games.push({ id, name: entry.name ?? 'Unknown', exe: winExe(entry) });
  }
  return games;
}

async function downloadGames() {
  const res = await fetch(GAMES_CDN, {
    headers: { 'User-Agent': UA },
    signal: AbortSignal.timeout(30_000),
  });
  if (!res.ok) throw new Error(`CDN returned ${res.status}`);
  const raw = await res.text();
  try {
    fs.mkdirSync(path.dirname(GAMES_FILE), { recursive: true });
    fs.writeFileSync(GAMES_FILE, raw, 'utf-8');
  } catch { /* cache best-effort */ }
  return raw;
}

export async function loadGames() {
  // try cache first
  if (fs.existsSync(GAMES_FILE)) {
    try {
      const raw = fs.readFileSync(GAMES_FILE, 'utf-8').trim();
      if (raw) {
        const g = parseGames(raw);
        if (g.length) return g;
      }
    } catch { /* corrupt cache, fall through */ }
  }
  // download fresh
  try {
    return parseGames(await downloadGames());
  } catch {
    return [];
  }
}

/**
 * Pick N games from list, prefer unused ones, rotate through used if needed.
 * Mutates state.usedGames.
 */
export function selectGames(allGames, state, count) {
  const available = new Set(allGames.map(g => g.id));
  const unusedIds = allGames.map(g => g.id).filter(id => !state.usedGames.includes(id));
  const usedIds   = state.usedGames.filter(id => available.has(id));

  let selectedIds;
  if (unusedIds.length >= count) {
    selectedIds = unusedIds.slice(0, count);
  } else {
    selectedIds = [...unusedIds];
    const remaining = count - selectedIds.length;
    if (usedIds.length) {
      // rotate: take from the back so we cycle
      const rotated = [...usedIds.slice(remaining), ...usedIds.slice(0, remaining)];
      selectedIds.push(...rotated.slice(0, remaining));
    }
  }

  // update used-games ring
  state.usedGames = state.usedGames.filter(id => !selectedIds.includes(id));
  state.usedGames.push(...selectedIds);

  const byId = Object.fromEntries(allGames.map(g => [g.id, g]));
  return selectedIds.filter(id => byId[id]).map(id => byId[id]);
}
