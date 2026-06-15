import { describe, it, expect } from 'vitest'
import { validateData, applyImport, summarize } from './json'
import type { AppData } from './types'

const valid: AppData = {
  version: 1,
  players: [
    { id: 'a', name: 'Ada', createdAt: '2026-01-01T00:00:00.000Z' },
    { id: 'b', name: 'Bob', createdAt: '2026-01-01T00:00:00.000Z' },
  ],
  games: [
    {
      id: 'g1',
      date: '2026-01-01',
      entries: [
        { playerId: 'a', score: 100 },
        { playerId: 'b', score: 90 },
      ],
    },
  ],
  settings: { theme: 'dark' },
}

describe('validateData', () => {
  it('accepts a well-formed file', () => {
    const r = validateData(structuredClone(valid))
    expect(r.ok).toBe(true)
    if (r.ok) expect(r.data.players).toHaveLength(2)
  })

  it('rejects a wrong version', () => {
    const r = validateData({ ...valid, version: 2 })
    expect(r.ok).toBe(false)
  })

  it('rejects a game referencing an unknown player', () => {
    const bad = structuredClone(valid)
    bad.games[0].entries.push({ playerId: 'ghost', score: 1 })
    const r = validateData(bad)
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.error).toContain('ghost')
  })

  it('rejects non-objects and missing arrays', () => {
    expect(validateData(null).ok).toBe(false)
    expect(validateData({ version: 1, players: [] }).ok).toBe(false)
  })

  it('rejects duplicate player ids', () => {
    const dup = structuredClone(valid)
    dup.players.push({ id: 'a', name: 'Clone', createdAt: '' })
    expect(validateData(dup).ok).toBe(false)
  })
})

describe('summarize', () => {
  it('reports counts and date range', () => {
    expect(summarize(valid)).toBe('2 players · 1 games · 2026-01-01 → 2026-01-01')
  })
})

describe('applyImport', () => {
  const current: AppData = {
    version: 1,
    players: [{ id: 'a', name: 'Ada', createdAt: '' }],
    games: [],
    settings: { theme: 'light' },
  }

  it('replace swaps everything (deep clone)', () => {
    const out = applyImport(current, valid, 'replace')
    expect(out.players).toHaveLength(2)
    expect(out.settings.theme).toBe('dark')
    expect(out.players).not.toBe(valid.players) // cloned
  })

  it('merge unions by id and keeps the current theme', () => {
    const out = applyImport(current, valid, 'merge')
    // a (exists, updated by incoming) + b (new) = 2 players, no dupes
    expect(out.players.map((p) => p.id).sort()).toEqual(['a', 'b'])
    expect(out.games).toHaveLength(1)
    expect(out.settings.theme).toBe('light') // current theme preserved on merge
  })

  it('merge updates an existing record from the incoming file', () => {
    const incoming = structuredClone(valid)
    incoming.players[0].name = 'Ada Lovelace'
    const out = applyImport(current, incoming, 'merge')
    expect(out.players.find((p) => p.id === 'a')!.name).toBe('Ada Lovelace')
  })
})
