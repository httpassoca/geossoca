// Pure stats layer — no DOM, no store, no dssoca. Unit-tested in stats.test.ts.
//
// Builds on the two simple rankings (rankings.ts) with difficulty-aware stats.
// The design problem: counting wins alone is unfair (a player can finish 2nd
// every game, never win, yet be excellent), and a strong score in a HARD game
// means more than the same score in an EASY one.
//
// Because all four players play the SAME locations each game (shared challenge
// link), raw scores are directly comparable WITHIN a game — so we rank a game on
// raw score and read its difficulty straight off the group's average that night.
// Only AGGREGATING across games of differing difficulty needs normalisation, and
// with just ~4 players a per-game z-score is too noisy (a std-dev from 4 numbers
// is unreliable), so we normalise with:
//   • Min-max index — (score − min) / (max − min) ∈ [0,1], 1 = best that game.
//   • Points-above-average (PAA) — score − group average; difficulty cancels out.
//
// The headline "Power Rating" blends placement and difficulty-adjusted score into
// one transparent, tunable number (see DEFAULT_OPTIONS).

import type { Game, Player } from './types'
import { chronological, positionsForGame } from './rankings'

/** Tunable knobs for the composite. Defaults match the approved design. */
export interface StatsOptions {
  /** Weight on placement in the power score (0–1). */
  placementWeight: number
  /** Weight on difficulty-adjusted score in the power score (0–1). */
  scoreWeight: number
  /** Points per finishing position (1-based). Positions absent here score 0. */
  placementPoints: Record<number, number>
  /** A "podium" finish is a position ≤ this. Top-2 for a 4-player field. */
  podiumCutoff: number
  /** How many recent games feed the form sparkline. */
  formWindow: number
}

export const DEFAULT_OPTIONS: StatsOptions = {
  placementWeight: 0.6,
  scoreWeight: 0.4,
  // Win-heavy taper, but 2nd is still well rewarded (Borda-style).
  placementPoints: { 1: 10, 2: 6, 3: 3, 4: 1 },
  podiumCutoff: 2,
  formWindow: 8,
}

/** Per-player derived metrics for ONE game. */
export interface GameMetric {
  playerId: string
  score: number
  /** 1-based finishing position (1 = highest score). */
  position: number
  /** (score − min) / (max − min) ∈ [0,1]; 0.5 if every score is equal. */
  minMaxIndex: number
  /** score − group average that game (difficulty-cancelled "vs field"). */
  paa: number
  /** Points from finishing position (see options.placementPoints). */
  placementPts: number
  /** Difficulty-adjusted score points, 0–10 (= 10 × minMaxIndex). */
  scorePts: number
  /** Blended power points, 0–10 (placementWeight·placement + scoreWeight·score). */
  powerPts: number
}

function resolve(opts?: Partial<StatsOptions>): StatsOptions {
  return { ...DEFAULT_OPTIONS, ...opts }
}

/** Derived per-player metrics for a single game (difficulty read off the field). */
export function gameMetrics(game: Game, opts?: Partial<StatsOptions>): GameMetric[] {
  const o = resolve(opts)
  const scores = game.entries.map((e) => e.score)
  const max = Math.max(...scores)
  const min = Math.min(...scores)
  const range = max - min
  const avg = scores.reduce((a, b) => a + b, 0) / scores.length

  return positionsForGame(game).map(({ playerId, position, score }) => {
    // No spread in the field → index is undefined; use a neutral 0.5.
    const minMaxIndex = range === 0 ? 0.5 : (score - min) / range
    const placementPts = o.placementPoints[position] ?? 0
    const scorePts = 10 * minMaxIndex
    const powerPts = o.placementWeight * placementPts + o.scoreWeight * scorePts
    return { playerId, score, position, minMaxIndex, paa: score - avg, placementPts, scorePts, powerPts }
  })
}

/** One row of the difficulty-aware leaderboard. */
export interface StatRow {
  rank: number
  player: Player
  gamesPlayed: number
  /** Headline composite — average power points per game (rate stat). */
  powerRating: number
  /** Sum of power points (counting stat — rewards showing up). */
  powerTotal: number
  wins: number
  /** wins / gamesPlayed. */
  winRate: number
  /** Mean finishing position, 1..n; lower is better. The core consistency stat. */
  avgFinish: number
  /** Share of games finished within options.podiumCutoff (top-2 by default). */
  podiumRate: number
  /** Mean points-above-average — "+3.1k vs the field" across games. */
  avgPaa: number
  /** Best single raw score. */
  peak: number
  /** Date (yyyy-mm-dd) of the peak game. */
  peakDate: string
  /** Mean raw score. */
  meanScore: number
  /** Sample standard deviation of raw scores (0 if <2 games). */
  stdScore: number
  /** meanScore / stdScore — high = steadily strong; null when std is 0. Computed
   *  on RAW scores only (never on the zero-centred PAA, which would blow up). */
  consistency: number | null
  /** 25th-percentile raw score — the player's "floor". */
  floor: number
  /** Peak raw score — the player's "ceiling" (== peak). */
  ceiling: number
  /** Raw scores of the last options.formWindow games, chronological. */
  recentScores: number[]
}

function mean(xs: number[]): number {
  return xs.reduce((a, b) => a + b, 0) / xs.length
}

/** Sample (Bessel-corrected) standard deviation; 0 for fewer than two values. */
function sampleStd(xs: number[]): number {
  if (xs.length < 2) return 0
  const m = mean(xs)
  const v = xs.reduce((a, x) => a + (x - m) ** 2, 0) / (xs.length - 1)
  return Math.sqrt(v)
}

/** Linear-interpolation percentile; p ∈ [0,1]. Empty → 0. */
export function percentile(xs: number[], p: number): number {
  if (xs.length === 0) return 0
  const s = [...xs].sort((a, b) => a - b)
  if (s.length === 1) return s[0]
  const idx = p * (s.length - 1)
  const lo = Math.floor(idx)
  const hi = Math.ceil(idx)
  if (lo === hi) return s[lo]
  return s[lo] + (s[hi] - s[lo]) * (idx - lo)
}

/** Assign 1-based ranks over an already-sorted list, sharing the rank on equal
 *  keys (competition ranking: 1, 2, 2, 4). Matches rankings.ts behaviour. */
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

/** Difficulty-aware leaderboard — players who played ≥1 game, best power first. */
export function statRanking(players: Player[], games: Game[], opts?: Partial<StatsOptions>): StatRow[] {
  const o = resolve(opts)
  const byId = new Map(players.map((p) => [p.id, p]))
  const acc = new Map<
    string,
    {
      scores: number[]
      positions: number[]
      powerPts: number[]
      paa: number[]
      dates: string[]
      wins: number
      podiums: number
    }
  >()

  for (const game of chronological(games)) {
    for (const m of gameMetrics(game, o)) {
      if (!byId.has(m.playerId)) continue
      const a =
        acc.get(m.playerId) ??
        { scores: [], positions: [], powerPts: [], paa: [], dates: [], wins: 0, podiums: 0 }
      a.scores.push(m.score)
      a.positions.push(m.position)
      a.powerPts.push(m.powerPts)
      a.paa.push(m.paa)
      a.dates.push(game.date)
      if (m.position === 1) a.wins += 1
      if (m.position <= o.podiumCutoff) a.podiums += 1
      acc.set(m.playerId, a)
    }
  }

  const rows = [...acc.entries()]
    .map(([id, a]) => {
      const n = a.scores.length
      const peakIdx = a.scores.reduce((best, s, i) => (s > a.scores[best] ? i : best), 0)
      const std = sampleStd(a.scores)
      const m = mean(a.scores)
      return {
        player: byId.get(id)!,
        gamesPlayed: n,
        powerRating: mean(a.powerPts),
        powerTotal: a.powerPts.reduce((x, y) => x + y, 0),
        wins: a.wins,
        winRate: a.wins / n,
        avgFinish: mean(a.positions),
        podiumRate: a.podiums / n,
        avgPaa: mean(a.paa),
        peak: a.scores[peakIdx],
        peakDate: a.dates[peakIdx],
        meanScore: m,
        stdScore: std,
        consistency: std === 0 ? null : m / std,
        floor: percentile(a.scores, 0.25),
        ceiling: a.scores[peakIdx],
        recentScores: a.scores.slice(-o.formWindow),
      }
    })
    // Highest power first; stable secondary sort by name keeps tied rows in a
    // deterministic order (they still share a rank number).
    .sort((x, y) => y.powerRating - x.powerRating || x.player.name.localeCompare(y.player.name))

  return withRanks(rows, (r) => r.powerRating)
}

/** A Friday session: all games sharing one date, oldest date first. */
export interface FridaySession {
  date: string
  games: Game[]
}

/** Group games into Friday sessions by their date, sessions oldest → newest and
 *  games within a session in their chronological (id-stable) order. */
export function groupByFriday(games: Game[]): FridaySession[] {
  const byDate = new Map<string, Game[]>()
  for (const g of chronological(games)) {
    const gs = byDate.get(g.date) ?? []
    gs.push(g)
    byDate.set(g.date, gs)
  }
  return [...byDate.entries()].map(([date, gs]) => ({ date, games: gs }))
}

/** One player's head-to-head record against every other player. */
export interface HeadToHeadRow {
  playerId: string
  /** Keyed by opponent id: games where this player finished ahead / behind. */
  vs: Record<string, { wins: number; losses: number; games: number }>
}

/** Pairwise "who finished ahead of whom" across all games. Descriptive only —
 *  read alongside the per-pair game count (small samples). */
export function headToHead(players: Player[], games: Game[]): HeadToHeadRow[] {
  const ids = players.map((p) => p.id)
  const idSet = new Set(ids)
  const rec = new Map<string, Record<string, { wins: number; losses: number; games: number }>>()
  for (const id of ids) rec.set(id, {})

  for (const game of games) {
    const positions = positionsForGame(game).filter((p) => idSet.has(p.playerId))
    for (const a of positions) {
      for (const b of positions) {
        if (a.playerId === b.playerId) continue
        const row = rec.get(a.playerId)!
        const cell = (row[b.playerId] ??= { wins: 0, losses: 0, games: 0 })
        cell.games += 1
        if (a.position < b.position) cell.wins += 1
        else cell.losses += 1
      }
    }
  }

  return ids.map((id) => ({ playerId: id, vs: rec.get(id)! }))
}
