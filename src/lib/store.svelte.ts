// The single source of app state: an AppData held in a rune, loaded from and
// persisted to localStorage on every mutation. Browser-only (the app runs with
// ssr = false), so localStorage / document access is safe behind `browser`.

import { browser } from '$app/environment'
import { applyDesignConfig } from 'dssoca'
import { emptyData, type AppData, type GameEntry, type Player, type Theme } from './types'

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
    this.loaded = true
    this.applyTheme()
  }

  private save() {
    if (browser) localStorage.setItem(KEY, JSON.stringify(this.data))
  }

  private applyTheme() {
    if (browser) applyDesignConfig({ theme: this.data.settings.theme })
  }

  // ── players ───────────────────────────────────────────────────────────────

  addPlayer(name: string): Player {
    const player: Player = { id: uid(), name: name.trim(), createdAt: new Date().toISOString() }
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
    this.applyTheme()
    this.save()
  }

  /** Replace the whole dataset (used by JSON import). */
  setData(next: AppData) {
    this.data = next
    this.applyTheme()
    this.save()
  }

  playerName(id: string): string {
    return this.data.players.find((p) => p.id === id)?.name ?? 'unknown'
  }
}

export const store = new AppStore()
