// Data model for geossoca. Everything lives in the browser (localStorage) and
// round-trips through a single JSON file the user imports/exports — it is never
// stored anywhere else.

export interface Player {
  id: string
  name: string
  /** Identity colour (hex) — used for the avatar tag, podium, and chart series. */
  color: string
  /** ISO timestamp. */
  createdAt: string
}

/** One player's raw points in a single game. */
export interface GameEntry {
  playerId: string
  score: number
}

export interface Game {
  id: string
  /** ISO date (yyyy-mm-dd) the game was played. */
  date: string
  entries: GameEntry[]
}

export type Theme = 'dark' | 'light'

/** The entire persisted state — the shape of the exported JSON file. */
export interface AppData {
  version: 1
  players: Player[]
  games: Game[]
  settings: { theme: Theme }
}

export const SCHEMA_VERSION = 1 as const

/** A fresh, empty store. */
export function emptyData(): AppData {
  return { version: SCHEMA_VERSION, players: [], games: [], settings: { theme: 'dark' } }
}
