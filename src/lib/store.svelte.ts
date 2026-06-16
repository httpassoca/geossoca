// The single source of app state: an AppData held in a rune, loaded from and
// persisted to localStorage on every mutation. Browser-only (the app runs with
// ssr = false), so localStorage / document access is safe behind `browser`.

import { browser } from '$app/environment'
import { applyDesignConfig } from 'dssoca'
import {
  emptyData,
  type AppData,
  type GameEntry,
  type Player,
  type Theme,
  type SizeVariant,
} from './types'
import { pickColor } from './palette'

const KEY = 'geossoca:data:v1'

function uid(): string {
  return crypto.randomUUID()
}

class AppStore {
  data = $state<AppData>(emptyData())
  loaded = $state(false)

  constructor() {
    if (browser) this.load()
  }

  load() {
    try {
      const raw = localStorage.getItem(KEY)
      if (raw) this.data = JSON.parse(raw) as AppData
    } catch {
      // corrupt/missing → keep the empty default
    }
    // Backfill fields added in later versions of the schema.
    if (!this.data.settings) this.data.settings = { theme: 'dark', sizeVariant: 'md' }
    if (!this.data.settings.sizeVariant) this.data.settings.sizeVariant = 'md'
    // The 'sm' size variant was retired; fold it into 'md'.
    if (this.data.settings.sizeVariant === 'sm') this.data.settings.sizeVariant = 'md'
    this.data.players.forEach((p, i) => {
      if (!p.color) p.color = pickColor(i)
    })
    this.loaded = true
    this.applyDesign()
  }

  private save() {
    if (browser) localStorage.setItem(KEY, JSON.stringify(this.data))
  }

  private applyDesign() {
    if (browser) {
      applyDesignConfig({
        theme: this.data.settings.theme,
        sizeVariant: this.data.settings.sizeVariant,
      })
    }
  }

  // ── players ───────────────────────────────────────────────────────────────

  addPlayer(name: string): Player {
    const player: Player = {
      id: uid(),
      name: name.trim(),
      color: pickColor(this.data.players.length),
      createdAt: new Date().toISOString(),
    }
    this.data.players.push(player)
    this.save()
    return player
  }

  renamePlayer(id: string, name: string) {
    const p = this.data.players.find((p) => p.id === id)
    if (p) {
      p.name = name.trim()
      this.save()
    }
  }

  setPlayerColor(id: string, color: string) {
    const p = this.data.players.find((p) => p.id === id)
    if (p) {
      p.color = color
      this.save()
    }
  }

  /** Is this player referenced by any game? Referenced players can't be deleted. */
  isPlayerReferenced(id: string): boolean {
    return this.data.games.some((g) => g.entries.some((e) => e.playerId === id))
  }

  /** Delete a player. Returns false (and does nothing) if they appear in a game. */
  deletePlayer(id: string): boolean {
    if (this.isPlayerReferenced(id)) return false
    this.data.players = this.data.players.filter((p) => p.id !== id)
    this.save()
    return true
  }

  // ── games ─────────────────────────────────────────────────────────────────

  addGame(date: string, entries: GameEntry[]) {
    this.data.games.push({ id: uid(), date, entries })
    this.save()
  }

  updateGame(id: string, date: string, entries: GameEntry[]) {
    const g = this.data.games.find((g) => g.id === id)
    if (g) {
      g.date = date
      g.entries = entries
      this.save()
    }
  }

  deleteGame(id: string) {
    this.data.games = this.data.games.filter((g) => g.id !== id)
    this.save()
  }

  // ── settings + bulk ───────────────────────────────────────────────────────

  setTheme(theme: Theme) {
    this.data.settings.theme = theme
    this.applyDesign()
    this.save()
  }

  setSize(sizeVariant: SizeVariant) {
    this.data.settings.sizeVariant = sizeVariant
    this.applyDesign()
    this.save()
  }

  /** Replace the whole dataset (used by JSON import). */
  setData(next: AppData) {
    this.data = next
    this.applyDesign()
    this.save()
  }

  playerName(id: string): string {
    return this.data.players.find((p) => p.id === id)?.name ?? 'unknown'
  }
}

export const store = new AppStore()
