// Builders that turn the players/games data into props for the dashboard's
// dssoca charts (ScatterPlot, BoxPlot, BumpChart, Heatmap). Pure — no DOM, no
// store. Unit-tested in dashboard.test.ts. Mirrors charts.ts in spirit.

import type { ChartSeries, BumpSeries } from 'dssoca'
import type { Game, Player } from './types'
import { chronological, positionsForGame } from './rankings'
import { headToHead, type FridaySession } from './stats'

/** Trailing rolling-average of each player's raw score — the "current form" line.
 *  x is the global game index (1-based, matching charts.ts), y the mean over the
 *  last `window` games the player has played. */
export function rollingAverageSeries(players: Player[], games: Game[], window = 5): ChartSeries[] {
  const ordered = chronological(games)
  return players.map((p) => {
    const scores: number[] = []
    const data: { x: number; y: number }[] = []
    ordered.forEach((game, i) => {
      const entry = game.entries.find((e) => e.playerId === p.id)
      if (!entry) return
      scores.push(entry.score)
      const recent = scores.slice(-window)
      const avg = recent.reduce((a, b) => a + b, 0) / recent.length
      data.push({ x: i + 1, y: Math.round(avg) })
    })
    return { label: p.name, data, color: p.color }
  })
}

export interface HeatmapMatrix {
  rows: string[]
  columns: string[]
  /** values[r][c] = times player r finished ahead of player c; null on the diagonal. */
  values: (number | null)[][]
}

/** Head-to-head win matrix for the Heatmap — rows and columns are the players in
 *  the given order, the diagonal is blank (null). */
export function headToHeadMatrix(players: Player[], games: Game[]): HeatmapMatrix {
  const byId = new Map(headToHead(players, games).map((r) => [r.playerId, r]))
  const labels = players.map((p) => p.name)
  const values = players.map((rowP) =>
    players.map((colP) =>
      rowP.id === colP.id ? null : (byId.get(rowP.id)?.vs[colP.id]?.wins ?? 0),
    ),
  )
  return { rows: labels, columns: labels, values }
}

export interface SessionBump {
  stages: string[]
  series: BumpSeries[]
}

/** Rank-over-games for one Friday session — each player's finishing position
 *  across that night's games (stage labels G1…Gn). Players absent from every game
 *  of the session are dropped; an absence in a single game is a NaN rank (the
 *  BumpChart line skips that node but still connects the present ones). */
export function sessionBump(players: Player[], session: FridaySession): SessionBump {
  const games = session.games
  const stages = games.map((_, i) => `G${i + 1}`)
  const series = players
    .map((p) => ({
      label: p.name,
      color: p.color,
      ranks: games.map(
        (g) => positionsForGame(g).find((x) => x.playerId === p.id)?.position ?? NaN,
      ),
    }))
    .filter((s) => s.ranks.some((r) => Number.isFinite(r)))
  return { stages, series }
}
