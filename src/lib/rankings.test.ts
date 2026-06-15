import { describe, it, expect } from 'vitest'
import { positionsForGame, positionRanking, pointsRanking } from './rankings'
import type { Game, Player } from './types'

const players: Player[] = [
  { id: 'a', name: 'Ada', color: '#66ef73', createdAt: '' },
  { id: 'b', name: 'Bob', color: '#9aa4ff', createdAt: '' },
  { id: 'c', name: 'Cy', color: '#b98cff', createdAt: '' },
  { id: 'd', name: 'Dot', color: '#66d9ef', createdAt: '' },
]

// Two games. g1: A>B>C>D. g2: B>A>C>D. → A and B both finish 1st once + 2nd once.
const games: Game[] = [
  {
    id: 'g1',
    date: '2026-01-01',
    entries: [
      { playerId: 'a', score: 100 },
      { playerId: 'b', score: 90 },
      { playerId: 'c', score: 80 },
      { playerId: 'd', score: 70 },
    ],
  },
  {
    id: 'g2',
    date: '2026-01-02',
    entries: [
      { playerId: 'b', score: 100 },
      { playerId: 'a', score: 90 },
      { playerId: 'c', score: 80 },
      { playerId: 'd', score: 70 },
    ],
  },
]

describe('positionsForGame', () => {
  it('ranks by score, highest = position 1', () => {
    const pos = positionsForGame(games[0])
    expect(pos.map((p) => [p.playerId, p.position])).toEqual([
      ['a', 1],
      ['b', 2],
      ['c', 3],
      ['d', 4],
    ])
  })
})

describe('positionRanking', () => {
  const rows = positionRanking(players, games)

  it('orders by position-sum ascending (lower is better)', () => {
    expect(rows.map((r) => r.player.id)).toEqual(['a', 'b', 'c', 'd'])
    expect(rows.map((r) => r.positionSum)).toEqual([3, 3, 6, 8])
  })

  it('shows tied position-sums as a shared rank (1, 1, 3, 4)', () => {
    expect(rows.map((r) => r.rank)).toEqual([1, 1, 3, 4])
  })

  it('counts podium finishes and games played', () => {
    const ada = rows.find((r) => r.player.id === 'a')!
    expect(ada.firsts).toBe(1)
    expect(ada.seconds).toBe(1)
    expect(ada.gamesPlayed).toBe(2)
    expect(ada.avgPosition).toBe(1.5)
    expect(ada.recentPositions).toEqual([1, 2])
  })
})

describe('pointsRanking', () => {
  const rows = pointsRanking(players, games)

  it('orders by total points descending (higher is better)', () => {
    expect(rows.map((r) => r.totalPoints)).toEqual([190, 190, 160, 140])
  })

  it('shows tied totals as a shared rank', () => {
    expect(rows.map((r) => r.rank)).toEqual([1, 1, 3, 4])
  })

  it('tracks averages and recent scores', () => {
    const cy = rows.find((r) => r.player.id === 'c')!
    expect(cy.avgPoints).toBe(80)
    expect(cy.recentScores).toEqual([80, 80])
  })
})

describe('players who skip games', () => {
  it('only counts games a player actually played', () => {
    const withGuest: Player[] = [
      ...players,
      { id: 'e', name: 'Eve', color: '#e0c36a', createdAt: '' },
    ]
    const extra: Game[] = [
      ...games,
      { id: 'g3', date: '2026-01-03', entries: [{ playerId: 'e', score: 50 }] },
    ]
    const rows = positionRanking(withGuest, extra)
    const eve = rows.find((r) => r.player.id === 'e')!
    expect(eve.gamesPlayed).toBe(1)
    expect(eve.positionSum).toBe(1)
  })
})
