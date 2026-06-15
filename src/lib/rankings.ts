// Pure ranking logic — no DOM, no store. Unit-tested in rankings.test.ts.
//
// Two rankings (per the design):
//   • Positions — each game ranks players 1..n by score (1 = best). A player's
//     score for this ranking is the SUM of their finishing positions; LOWER is
//     better (win every game of 4 → all 1s → lowest possible sum).
//   • Points — the SUM of raw game scores; HIGHER is better. Raw scores aren't
//     comparable across games (10k one night, 20k the next), but their total is
//     a fair "who racked up the most" measure.
//
// In-game ties are prevented at entry (unique scores per game), so positions are
// always distinct. Ties in the *aggregate* rankings are shown as tied: equal
// keys share a rank number (competition ranking → 1, 2, 2, 4), no tie-break.

import type { Game, Player } from './types'

/** A player's placement in one game. `position` is 1-based (1 = highest score). */
export interface GamePosition {
  playerId: string
  position: number
  score: number
}

/** Rank the entries of a single game by score, highest first (position 1 = best). */
export function positionsForGame(game: Game): GamePosition[] {
  return [...game.entries]
    .sort((a, b) => b.score - a.score)
    .map((e, i) => ({ playerId: e.playerId, position: i + 1, score: e.score }))
}

/** Games oldest → newest (by date, then stable by id) for cumulative/recent views. */
export function chronological(games: Game[]): Game[] {
  return [...games].sort((a, b) =>
    a.date < b.date ? -1 : a.date > b.date ? 1 : a.id < b.id ? -1 : 1,
  )
}

export interface PositionRow {
  rank: number
  player: Player
  gamesPlayed: number
  /** Sum of finishing positions across games played — lower is better. */
  positionSum: number
  avgPosition: number
  firsts: number
  seconds: number
  thirds: number
  /** Finishing positions in chronological order (for a trend sparkline). */
  recentPositions: number[]
}

export interface PointsRow {
  rank: number
  player: Player
  gamesPlayed: number
  /** Sum of raw scores — higher is better. */
  totalPoints: number
  avgPoints: number
  /** Raw scores in chronological order (for a trend sparkline). */
  recentScores: number[]
}

/** Assign 1-based ranks over an already-sorted list, sharing the rank on equal
 *  keys (competition ranking: 1, 2, 2, 4). */
function withRanks<T>(sorted: T[], key: (row: T) => number): (T & { rank: number })[] {
  let lastKey: number | null = null
  let lastRank = 0
  return sorted.map((row, i) => {
    const k = key(row)
    const rank = lastKey !== null && k === lastKey ? lastRank : i + 1
    lastKey = k
    lastRank = rank
    return { ...row, rank }
  })
}

/** Positions ranking — players who played ≥1 game, best (lowest sum) first. */
export function positionRanking(players: Player[], games: Game[]): PositionRow[] {
  const byId = new Map(players.map((p) => [p.id, p]))
  const acc = new Map<
    string,
    { sum: number; n: number; firsts: number; seconds: number; thirds: number; recent: number[] }
  >()

  for (const game of chronological(games)) {
    for (const { playerId, position } of positionsForGame(game)) {
      if (!byId.has(playerId)) continue
      const a = acc.get(playerId) ?? { sum: 0, n: 0, firsts: 0, seconds: 0, thirds: 0, recent: [] }
      a.sum += position
      a.n += 1
      if (position === 1) a.firsts += 1
      else if (position === 2) a.seconds += 1
      else if (position === 3) a.thirds += 1
      a.recent.push(position)
      acc.set(playerId, a)
    }
  }

  const rows = [...acc.entries()]
    .map(([id, a]) => ({
      player: byId.get(id)!,
      gamesPlayed: a.n,
      positionSum: a.sum,
      avgPosition: a.sum / a.n,
      firsts: a.firsts,
      seconds: a.seconds,
      thirds: a.thirds,
      recentPositions: a.recent,
    }))
    // lower sum first; gentle, stable secondary sort by name keeps equal-key rows
    // in a deterministic order (they still share a rank number).
    .sort((x, y) => x.positionSum - y.positionSum || x.player.name.localeCompare(y.player.name))

  return withRanks(rows, (r) => r.positionSum)
}

/** Points ranking — players who played ≥1 game, highest total first. */
export function pointsRanking(players: Player[], games: Game[]): PointsRow[] {
  const byId = new Map(players.map((p) => [p.id, p]))
  const acc = new Map<string, { total: number; n: number; recent: number[] }>()

  for (const game of chronological(games)) {
    for (const e of game.entries) {
      if (!byId.has(e.playerId)) continue
      const a = acc.get(e.playerId) ?? { total: 0, n: 0, recent: [] }
      a.total += e.score
      a.n += 1
      a.recent.push(e.score)
      acc.set(e.playerId, a)
    }
  }

  const rows = [...acc.entries()]
    .map(([id, a]) => ({
      player: byId.get(id)!,
      gamesPlayed: a.n,
      totalPoints: a.total,
      avgPoints: a.total / a.n,
      recentScores: a.recent,
    }))
    .sort((x, y) => y.totalPoints - x.totalPoints || x.player.name.localeCompare(y.player.name))

  return withRanks(rows, (r) => r.totalPoints)
}
