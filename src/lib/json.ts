// JSON import/export — the only way data leaves or enters the browser.
//
// The pure helpers (validate / summarize / applyImport) are unit-tested; the
// browser helpers (download / read) are thin wrappers used by the UI.

import { SCHEMA_VERSION, emptyData, type AppData, type Game, type Player } from './types'

export type ImportMode = 'replace' | 'merge'

export type ValidateResult = { ok: true; data: AppData } | { ok: false; error: string }

function isObj(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v)
}

/** Validate an untrusted parsed value into a well-formed AppData (shape +
 *  referential integrity: every game entry points at a known player). */
export function validateData(raw: unknown): ValidateResult {
  if (!isObj(raw)) return { ok: false, error: 'File is not a JSON object.' }
  if (raw.version !== SCHEMA_VERSION) {
    return {
      ok: false,
      error: `Unsupported version ${String(raw.version)} (expected ${SCHEMA_VERSION}).`,
    }
  }
  if (!Array.isArray(raw.players) || !Array.isArray(raw.games)) {
    return { ok: false, error: 'Missing players or games array.' }
  }

  const players: Player[] = []
  const ids = new Set<string>()
  for (const p of raw.players) {
    if (!isObj(p) || typeof p.id !== 'string' || typeof p.name !== 'string') {
      return { ok: false, error: 'A player is missing an id or name.' }
    }
    if (ids.has(p.id)) return { ok: false, error: `Duplicate player id "${p.id}".` }
    ids.add(p.id)
    players.push({
      id: p.id,
      name: p.name,
      createdAt: typeof p.createdAt === 'string' ? p.createdAt : new Date(0).toISOString(),
    })
  }

  const games: Game[] = []
  const gameIds = new Set<string>()
  for (const g of raw.games) {
    if (!isObj(g) || typeof g.id !== 'string' || typeof g.date !== 'string') {
      return { ok: false, error: 'A game is missing an id or date.' }
    }
    if (gameIds.has(g.id)) return { ok: false, error: `Duplicate game id "${g.id}".` }
    gameIds.add(g.id)
    if (!Array.isArray(g.entries)) return { ok: false, error: `Game ${g.id} has no entries.` }
    const entries = []
    for (const e of g.entries) {
      if (!isObj(e) || typeof e.playerId !== 'string' || typeof e.score !== 'number') {
        return { ok: false, error: `Game ${g.id} has a malformed entry.` }
      }
      if (!ids.has(e.playerId)) {
        return { ok: false, error: `Game ${g.id} references unknown player "${e.playerId}".` }
      }
      entries.push({ playerId: e.playerId, score: e.score })
    }
    games.push({ id: g.id, date: g.date, entries })
  }

  const theme =
    isObj(raw.settings) && (raw.settings.theme === 'light' || raw.settings.theme === 'dark')
      ? raw.settings.theme
      : 'dark'

  return { ok: true, data: { version: SCHEMA_VERSION, players, games, settings: { theme } } }
}

/** A short human summary of an import, for the confirm dialog. */
export function summarize(data: AppData): string {
  const dates = data.games.map((g) => g.date).sort()
  const range = dates.length ? `${dates[0]} → ${dates[dates.length - 1]}` : 'no games'
  return `${data.players.length} players · ${data.games.length} games · ${range}`
}

/** Apply an imported file to the current data. `replace` swaps everything;
 *  `merge` unions by id (incoming wins on id collisions) and keeps the current
 *  theme. */
export function applyImport(current: AppData, incoming: AppData, mode: ImportMode): AppData {
  if (mode === 'replace') return structuredClone(incoming)

  const players = new Map(current.players.map((p) => [p.id, p]))
  for (const p of incoming.players) players.set(p.id, p)
  const games = new Map(current.games.map((g) => [g.id, g]))
  for (const g of incoming.games) games.set(g.id, g)

  return {
    version: SCHEMA_VERSION,
    players: [...players.values()],
    games: [...games.values()],
    settings: current.settings,
  }
}

// ── browser-only helpers ────────────────────────────────────────────────────

/** A stable export filename: geossoca-YYYY-MM-DD.json. */
export function exportFilename(now: Date = new Date()): string {
  return `geossoca-${now.toISOString().slice(0, 10)}.json`
}

/** Trigger a download of the data as a pretty-printed JSON file. */
export function downloadExport(data: AppData, now: Date = new Date()): void {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = exportFilename(now)
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}

/** Read + parse + validate a picked File. */
export async function readImportFile(file: File): Promise<ValidateResult> {
  try {
    const text = await file.text()
    return validateData(JSON.parse(text))
  } catch (e) {
    return { ok: false, error: `Could not read file: ${(e as Error).message}` }
  }
}

export { emptyData }
