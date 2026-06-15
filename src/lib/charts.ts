// Chart series builders for the /charts page. Each returns dssoca `ChartSeries[]`.
// Players are passed in a stable order so the palette colour per player stays
// consistent across the three time-series charts.

import type { ChartSeries } from 'dssoca'
import type { Game, Player } from './types'
import { chronological, positionsForGame } from './rankings'

/** Cumulative position-sum over games — lower line = leading the season. */
export function cumulativePositionSeries(players: Player[], games: Game[]): ChartSeries[] {
  const ordered = chronological(games)
  return players.map((p) => {
    let sum = 0
    const data: { x: number; y: number }[] = []
    ordered.forEach((game, i) => {
      const pos = positionsForGame(game).find((g) => g.playerId === p.id)
      if (!pos) return
      sum += pos.position
      data.push({ x: i + 1, y: sum })
    })
    return { label: p.name, data }
  })
}

/** Cumulative raw points over games — higher line = leading on points. */
export function cumulativePointsSeries(players: Player[], games: Game[]): ChartSeries[] {
  const ordered = chronological(games)
  return players.map((p) => {
    let sum = 0
    const data: { x: number; y: number }[] = []
    ordered.forEach((game, i) => {
      const entry = game.entries.find((e) => e.playerId === p.id)
      if (!entry) return
      sum += entry.score
      data.push({ x: i + 1, y: sum })
    })
    return { label: p.name, data }
  })
}

/** Each game's raw score per player — spiky single-game form. */
export function pointsPerGameSeries(players: Player[], games: Game[]): ChartSeries[] {
  const ordered = chronological(games)
  return players.map((p) => {
    const data: { x: number; y: number }[] = []
    ordered.forEach((game, i) => {
      const entry = game.entries.find((e) => e.playerId === p.id)
      if (entry) data.push({ x: i + 1, y: entry.score })
    })
    return { label: p.name, data }
  })
}

/** Podium distribution as grouped bars: one series per placement (1st…4th),
 *  one bar per player in each group. */
export function podiumSeries(players: Player[], games: Game[]): ChartSeries[] {
  const placements = [1, 2, 3, 4]
  // counts[playerId][position] = number of finishes
  const counts = new Map<string, Record<number, number>>()
  for (const p of players) counts.set(p.id, {})
  for (const game of games) {
    for (const { playerId, position } of positionsForGame(game)) {
      const c = counts.get(playerId)
      if (c) c[position] = (c[position] ?? 0) + 1
    }
  }
  const ordinal = ['1st', '2nd', '3rd', '4th']
  return placements.map((pos) => ({
    label: ordinal[pos - 1],
    data: players.map((p) => ({ x: p.name, y: counts.get(p.id)?.[pos] ?? 0 })),
  }))
}
