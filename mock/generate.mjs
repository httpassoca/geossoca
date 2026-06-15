// Deterministic mock-data generator for geossoca.
// A quarter (13 weeks) of GeoGuessr nights: 4 games/week, 4 players.
// Output matches AppData (version 1) and respects the rules:
//   • scores are integers in [0, 50000]
//   • scores are unique within each game (in-game ties are impossible)
// Run: node mock/generate.mjs  → writes mock/geossoca-2026-Q1.json
import { writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

// Seeded RNG (mulberry32) so the file is reproducible.
function rng(seed) {
  let a = seed >>> 0
  return () => {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}
const rand = rng(20260101)

const players = [
  { id: 'p1', name: 'Ana', color: '#66ef73', createdAt: '2026-01-01T09:00:00.000Z' },
  { id: 'p2', name: 'Bruno', color: '#9aa4ff', createdAt: '2026-01-01T09:00:00.000Z' },
  { id: 'p3', name: 'Caio', color: '#b98cff', createdAt: '2026-01-01T09:00:00.000Z' },
  { id: 'p4', name: 'Duda', color: '#66d9ef', createdAt: '2026-01-01T09:00:00.000Z' },
]

// Slightly different skill means so the standings actually move around.
const means = { p1: 22000, p2: 20500, p3: 19500, p4: 18500 }
const SPREAD = 4500
const MIN = 6000
const MAX = 25000 // realistic GeoGuessr ceiling (well under the 50k app cap)

function isoDate(d) {
  return d.toISOString().slice(0, 10)
}

// 13 weeks, 4 nights each (Mon/Wed/Fri/Sun), starting Monday 2026-01-05.
const start = new Date(Date.UTC(2026, 0, 5))
const dayOffsets = [0, 2, 4, 6]

const games = []
let n = 0
for (let week = 0; week < 13; week++) {
  for (const off of dayOffsets) {
    n++
    const d = new Date(start)
    d.setUTCDate(start.getUTCDate() + week * 7 + off)

    const used = new Set()
    const entries = players.map((p) => {
      let score
      do {
        const noise = Math.round((rand() * 2 - 1) * SPREAD)
        score = Math.min(MAX, Math.max(MIN, Math.round((means[p.id] + noise) / 10) * 10))
        // guarantee uniqueness within the game
        while (used.has(score)) score = Math.min(MAX, score + 10)
      } while (used.has(score))
      used.add(score)
      return { playerId: p.id, score }
    })

    games.push({ id: `g${String(n).padStart(4, '0')}`, date: isoDate(d), entries })
  }
}

const data = { version: 1, players, games, settings: { theme: 'dark' } }

// sanity: unique scores per game, in range
for (const g of games) {
  const s = g.entries.map((e) => e.score)
  if (new Set(s).size !== s.length) throw new Error(`dup scores in ${g.id}`)
  for (const v of s) if (v < 0 || v > 50000) throw new Error(`out-of-range score in ${g.id}`)
}

const out = join(dirname(fileURLToPath(import.meta.url)), 'geossoca-2026-Q1.json')
writeFileSync(out, JSON.stringify(data, null, 2) + '\n')
console.log(`wrote ${out}: ${players.length} players, ${games.length} games, ${games[0].date} → ${games[games.length - 1].date}`)
