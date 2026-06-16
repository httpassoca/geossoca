import { describe, it, expect } from 'vitest'
import { rollingAverageSeries, headToHeadMatrix, sessionBump } from './dashboard'
import { groupByFriday } from './stats'
import type { Game, Player } from './types'

const players: Player[] = [
  { id: 'a', name: 'Ada', color: '#66ef73', createdAt: '' },
  { id: 'b', name: 'Bob', color: '#9aa4ff', createdAt: '' },
  { id: 'c', name: 'Cy', color: '#b98cff', createdAt: '' },
  { id: 'd', name: 'Dot', color: '#66d9ef', createdAt: '' },
]

function game(id: string, date: string, scores: Record<string, number>): Game {
  return {
    id,
    date,
    entries: Object.entries(scores).map(([playerId, score]) => ({ playerId, score })),
  }
}

describe('rollingAverageSeries', () => {
  const games: Game[] = [
    game('g1', '2026-01-02', { a: 100, b: 50 }),
    game('g2', '2026-01-02', { a: 200, b: 60 }),
    game('g3', '2026-01-09', { a: 300, b: 70 }),
  ]

  it('averages over a trailing window and carries the player colour', () => {
    const series = rollingAverageSeries(players, games, 2)
    const ada = series.find((s) => s.label === 'Ada')!
    expect(ada.color).toBe('#66ef73')
    // window 2: [100], [100,200]->150, [200,300]->250
    expect(ada.data.map((d) => d.y)).toEqual([100, 150, 250])
    // x is the global game index (1-based)
    expect(ada.data.map((d) => d.x)).toEqual([1, 2, 3])
  })

  it('only plots games a player actually played', () => {
    const withGap: Game[] = [...games, game('g4', '2026-01-16', { b: 80 })]
    const ada = rollingAverageSeries(players, withGap).find((s) => s.label === 'Ada')!
    expect(ada.data).toHaveLength(3) // Ada didn't play g4
  })
})

describe('headToHeadMatrix', () => {
  // g1: a>b>c>d ; g2: b>a>c>d
  const games: Game[] = [
    game('g1', '2026-01-02', { a: 100, b: 90, c: 80, d: 70 }),
    game('g2', '2026-01-09', { b: 100, a: 90, c: 80, d: 70 }),
  ]
  const m = headToHeadMatrix(players, games)

  it('labels rows and columns with player names in order', () => {
    expect(m.rows).toEqual(['Ada', 'Bob', 'Cy', 'Dot'])
    expect(m.columns).toEqual(['Ada', 'Bob', 'Cy', 'Dot'])
  })

  it('blanks the diagonal and counts wins-over per cell', () => {
    expect(m.values[0][0]).toBeNull() // Ada vs Ada
    // Ada beat Bob once (g1), lost once (g2)
    expect(m.values[0][1]).toBe(1)
    // Ada beat Cy both games
    expect(m.values[0][2]).toBe(2)
    // Dot beat nobody
    expect(m.values[3][0]).toBe(0)
  })
})

describe('sessionBump', () => {
  const games: Game[] = [
    game('g1', '2026-01-09', { a: 100, b: 90, c: 80, d: 70 }), // a1 b2 c3 d4
    game('g2', '2026-01-09', { a: 70, b: 100, c: 90, d: 80 }), // b1 c2 d3 a4
    game('g3', '2026-01-16', { a: 100, b: 90 }), // different Friday
  ]
  const sessions = groupByFriday(games)
  const bump = sessionBump(players, sessions[0]) // the 2026-01-09 session

  it('uses only that session games as stages', () => {
    expect(bump.stages).toEqual(['G1', 'G2'])
  })

  it("tracks each player's rank across the session", () => {
    const ada = bump.series.find((s) => s.label === 'Ada')!
    expect(ada.ranks).toEqual([1, 4]) // 1st then last
    const bob = bump.series.find((s) => s.label === 'Bob')!
    expect(bob.ranks).toEqual([2, 1])
  })

  it('drops players absent from the whole session', () => {
    const lonely = sessionBump(players, sessions[1]) // 2026-01-16: only a,b
    expect(lonely.series.map((s) => s.label).sort()).toEqual(['Ada', 'Bob'])
  })
})
