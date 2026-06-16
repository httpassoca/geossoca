import { describe, it, expect } from 'vitest'
import {
  gameMetrics,
  statRanking,
  groupByFriday,
  headToHead,
  percentile,
  DEFAULT_OPTIONS,
} from './stats'
import type { Game, Player } from './types'

const players: Player[] = [
  { id: 'a', name: 'Ada', color: '#66ef73', createdAt: '' },
  { id: 'b', name: 'Bob', color: '#9aa4ff', createdAt: '' },
  { id: 'c', name: 'Cy', color: '#b98cff', createdAt: '' },
  { id: 'd', name: 'Dot', color: '#66d9ef', createdAt: '' },
]

/** A game from a {playerId: score} map. */
function game(id: string, date: string, scores: Record<string, number>): Game {
  return { id, date, entries: Object.entries(scores).map(([playerId, score]) => ({ playerId, score })) }
}

describe('gameMetrics', () => {
  const m = gameMetrics(game('g', '2026-01-01', { a: 25000, b: 20000, c: 15000, d: 10000 }))
  const byId = (id: string) => m.find((x) => x.playerId === id)!

  it('min-max index maps best→1, worst→0', () => {
    expect(byId('a').minMaxIndex).toBe(1)
    expect(byId('d').minMaxIndex).toBe(0)
    expect(byId('b').minMaxIndex).toBeCloseTo((20000 - 10000) / (25000 - 10000))
  })

  it('points-above-average cancels difficulty (sums to ~0 over the field)', () => {
    const avg = (25000 + 20000 + 15000 + 10000) / 4 // 17500
    expect(byId('a').paa).toBe(25000 - avg)
    expect(m.reduce((s, x) => s + x.paa, 0)).toBeCloseTo(0)
  })

  it('power points use the default 0.6/0.4 blend on a 0–10 scale', () => {
    // winner: placement 10, score 10 → 0.6*10 + 0.4*10 = 10
    expect(byId('a').powerPts).toBeCloseTo(10)
    // last: placement 1, score 0 → 0.6*1 + 0.4*0 = 0.6
    expect(byId('d').powerPts).toBeCloseTo(0.6)
  })

  it('uses a neutral 0.5 index when every score is equal (no field spread)', () => {
    const flat = gameMetrics(game('g', '2026-01-01', { a: 100, b: 100, c: 100, d: 100 }))
    expect(flat.every((x) => x.minMaxIndex === 0.5)).toBe(true)
    expect(flat.every((x) => x.paa === 0)).toBe(true)
  })
})

describe('difficulty adjustment', () => {
  it('the SAME raw score scores higher in a harder (lower-average) game', () => {
    // Hard game: field averages low, our 20k is the top score.
    const hard = gameMetrics(game('h', '2026-01-01', { a: 20000, b: 12000, c: 9000, d: 7000 }))
    // Easy game: field averages high, our 20k is the worst score.
    const easy = gameMetrics(game('e', '2026-01-02', { a: 20000, b: 40000, c: 45000, d: 48000 }))
    const aHard = hard.find((x) => x.playerId === 'a')!
    const aEasy = easy.find((x) => x.playerId === 'a')!

    expect(aHard.minMaxIndex).toBeGreaterThan(aEasy.minMaxIndex)
    expect(aHard.paa).toBeGreaterThan(aEasy.paa)
    expect(aHard.powerPts).toBeGreaterThan(aEasy.powerPts)
  })
})

describe('statRanking — the "always 2nd" vs "spiky" design goal', () => {
  // Four games. Ada finishes 2nd EVERY game (never wins). Bob is boom-or-bust:
  // wins two games outright, comes dead last in the other two.
  const games: Game[] = [
    game('g1', '2026-01-02', { a: 20000, b: 25000, c: 15000, d: 10000 }), // b 1st, a 2nd
    game('g2', '2026-01-02', { a: 20000, b: 25000, c: 15000, d: 10000 }), // b 1st, a 2nd
    game('g3', '2026-01-09', { a: 20000, b: 8000, c: 25000, d: 15000 }), // c 1st, a 2nd, b last
    game('g4', '2026-01-09', { a: 20000, b: 8000, c: 25000, d: 15000 }), // c 1st, a 2nd, b last
  ]
  const rows = statRanking(players, games)
  const row = (id: string) => rows.find((r) => r.player.id === id)!

  it('the consistent runner-up has 0 wins, avg finish 2.0, and 100% podium rate', () => {
    const ada = row('a')
    expect(ada.wins).toBe(0)
    expect(ada.winRate).toBe(0)
    expect(ada.avgFinish).toBe(2)
    expect(ada.podiumRate).toBe(1) // top-2 every game
  })

  it('ranks the consistent runner-up above the boom-or-bust player', () => {
    expect(row('a').powerRating).toBeGreaterThan(row('b').powerRating)
    expect(row('a').rank).toBeLessThan(row('b').rank)
  })

  it('reflects steadiness: the runner-up scores a flat 20k, so std 0 / consistency null', () => {
    const ada = row('a')
    expect(ada.stdScore).toBe(0)
    expect(ada.consistency).toBeNull()
    expect(ada.meanScore).toBe(20000)
    expect(ada.floor).toBe(20000)
    expect(ada.peak).toBe(20000)
  })

  it('the spiky player is streakier: higher std than a steadier field', () => {
    expect(row('b').stdScore).toBeGreaterThan(0)
    // Bob: 25k,25k,8k,8k → mean 16.5k, clearly spread.
    expect(row('b').meanScore).toBe(16500)
  })
})

describe('statRanking — consistency is computed on RAW scores, not PAA', () => {
  it('a steadily-strong player beats an erratic one on the consistency ratio', () => {
    const games: Game[] = [
      game('g1', '2026-01-02', { a: 21000, b: 30000, c: 10000, d: 5000 }),
      game('g2', '2026-01-02', { a: 19000, b: 5000, c: 30000, d: 12000 }),
      game('g3', '2026-01-09', { a: 21000, b: 30000, c: 10000, d: 5000 }),
      game('g4', '2026-01-09', { a: 19000, b: 5000, c: 30000, d: 12000 }),
    ]
    const rows = statRanking(players, games)
    const ada = rows.find((r) => r.player.id === 'a')! // 21k,19k,21k,19k — tight
    const bob = rows.find((r) => r.player.id === 'b')! // 30k,5k,30k,5k — wild
    expect(ada.consistency).not.toBeNull()
    expect(bob.consistency).not.toBeNull()
    expect(ada.consistency!).toBeGreaterThan(bob.consistency!)
  })
})

describe('statRanking — bookkeeping', () => {
  const games: Game[] = [
    game('g1', '2026-01-02', { a: 100, b: 90, c: 80, d: 70 }),
    game('g2', '2026-01-09', { b: 100, a: 90, c: 80, d: 70 }),
  ]

  it('only counts games a player actually played', () => {
    const withGuest: Player[] = [...players, { id: 'e', name: 'Eve', color: '#e0c36a', createdAt: '' }]
    const extra: Game[] = [...games, game('g3', '2026-01-16', { e: 50 })]
    const eve = statRanking(withGuest, extra).find((r) => r.player.id === 'e')!
    expect(eve.gamesPlayed).toBe(1)
  })

  it('respects tunable options (a placement-only blend ignores score quality)', () => {
    const placementOnly = statRanking(players, games, { placementWeight: 1, scoreWeight: 0 })
    const ada = placementOnly.find((r) => r.player.id === 'a')!
    // a: 1st then 2nd → (10 + 6) / 2 = 8 power points, score quality irrelevant.
    expect(ada.powerRating).toBeCloseTo(8)
  })

  it('default options are the approved 0.6/0.4, 10/6/3/1, top-2 design', () => {
    expect(DEFAULT_OPTIONS.placementWeight).toBe(0.6)
    expect(DEFAULT_OPTIONS.scoreWeight).toBe(0.4)
    expect(DEFAULT_OPTIONS.placementPoints).toEqual({ 1: 10, 2: 6, 3: 3, 4: 1 })
    expect(DEFAULT_OPTIONS.podiumCutoff).toBe(2)
  })
})

describe('percentile', () => {
  it('interpolates linearly and handles edges', () => {
    expect(percentile([10, 20, 30, 40], 0.25)).toBeCloseTo(17.5)
    expect(percentile([10, 20, 30, 40], 0)).toBe(10)
    expect(percentile([10, 20, 30, 40], 1)).toBe(40)
    expect(percentile([42], 0.25)).toBe(42)
    expect(percentile([], 0.25)).toBe(0)
  })
})

describe('groupByFriday', () => {
  it('groups games by date, sessions oldest first', () => {
    const games: Game[] = [
      game('g3', '2026-01-09', { a: 1, b: 2 }),
      game('g1', '2026-01-02', { a: 1, b: 2 }),
      game('g2', '2026-01-02', { a: 1, b: 2 }),
    ]
    const sessions = groupByFriday(games)
    expect(sessions.map((s) => s.date)).toEqual(['2026-01-02', '2026-01-09'])
    expect(sessions[0].games.map((g) => g.id)).toEqual(['g1', 'g2'])
    expect(sessions[1].games.map((g) => g.id)).toEqual(['g3'])
  })
})

describe('headToHead', () => {
  const games: Game[] = [
    game('g1', '2026-01-02', { a: 100, b: 90, c: 80, d: 70 }), // a ahead of all
    game('g2', '2026-01-09', { b: 100, a: 90, c: 80, d: 70 }), // b ahead of a
  ]
  const rows = headToHead(players, games)

  it('counts who finished ahead of whom, both directions', () => {
    const aVsB = rows.find((r) => r.playerId === 'a')!.vs['b']
    expect(aVsB).toEqual({ wins: 1, losses: 1, games: 2 })
    const aVsC = rows.find((r) => r.playerId === 'a')!.vs['c']
    expect(aVsC).toEqual({ wins: 2, losses: 0, games: 2 })
  })

  it('has no self entry on the diagonal', () => {
    expect(rows.find((r) => r.playerId === 'a')!.vs['a']).toBeUndefined()
  })
})
