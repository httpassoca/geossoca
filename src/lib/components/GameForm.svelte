<script lang="ts">
  import { Modal, DateField, Input, Button, Badge, toast } from 'dssoca'
  import { store } from '$lib/store.svelte'
  import { positionsForGame } from '$lib/rankings'
  import type { Game, GameEntry } from '$lib/types'
  import { posTone } from './posTone'
  import { SCORE_MAX } from '$lib/palette'

  interface Props {
    open: boolean
    /** When set, the form edits this game; otherwise it creates a new one. */
    game?: Game
  }
  let { open = $bindable(), game }: Props = $props()

  const today = () => new Date().toISOString().slice(0, 10)

  // Scores are held as raw strings (the inputs are plain text-number fields, no
  // steppers). Every player always has a key so `bind:value` is never undefined.
  const blankScores = () =>
    Object.fromEntries(store.data.players.map((p) => [p.id, ''])) as Record<string, string>

  let date = $state(today())
  let scores = $state<Record<string, string>>(blankScores())

  // Keep a key for any player added while this form is mounted.
  $effect(() => {
    for (const p of store.data.players) if (!(p.id in scores)) scores[p.id] = ''
  })

  // Load values from the edited game (or clear) each time the modal opens.
  let prevOpen = false
  $effect(() => {
    if (open && !prevOpen) {
      date = game?.date ?? today()
      const next = blankScores()
      for (const e of game?.entries ?? []) next[e.playerId] = String(e.score)
      scores = next
    }
    prevOpen = open
  })

  function parsed(id: string): number | null {
    const raw = (scores[id] ?? '').trim()
    if (raw === '') return null
    const n = Number(raw)
    return Number.isFinite(n) ? n : null
  }

  const entries = $derived<GameEntry[]>(
    store.data.players
      .map((p) => ({ playerId: p.id, score: parsed(p.id) }))
      .filter((e): e is GameEntry => e.score !== null),
  )

  const scoreValues = $derived(entries.map((e) => e.score))
  const hasDuplicate = $derived(new Set(scoreValues).size !== scoreValues.length)
  const inRange = $derived(scoreValues.every((s) => s >= 0 && s <= SCORE_MAX))
  const preview = $derived(entries.length ? positionsForGame({ id: '', date, entries }) : [])
  const canSave = $derived(entries.length >= 1 && !hasDuplicate && inRange)

  function fieldError(id: string): string | undefined {
    const n = parsed(id)
    if (n === null) return undefined
    if (n < 0) return 'must be 0 or more'
    if (n > SCORE_MAX) return 'max 50,000'
    return undefined
  }

  function save() {
    if (!canSave) return
    if (game) {
      store.updateGame(game.id, date, entries)
      toast.success('Game updated')
    } else {
      store.addGame(date, entries)
      toast.success('Game added')
    }
    open = false
  }
</script>

<Modal bind:open title={game ? 'Edit game' : 'New game'}>
  <div class="form">
    <DateField label="Date" bind:value={date} max={today()} />

    <div class="scores">
      <span class="scores-label">Scores</span>
      {#if store.data.players.length === 0}
        <p class="hint">Add players first (Players tab).</p>
      {:else}
        {#each store.data.players as p (p.id)}
          <Input
            label={p.name}
            type="number"
            inputmode="numeric"
            min={0}
            max={SCORE_MAX}
            bind:value={scores[p.id]}
            placeholder="—"
            error={fieldError(p.id)}
          />
        {/each}
      {/if}
    </div>

    {#if hasDuplicate}
      <p class="error">Two players can't have the same score — break the tie.</p>
    {/if}

    {#if preview.length}
      <div class="preview">
        <span class="scores-label">Positions</span>
        <ol class="podium">
          {#each preview as row (row.playerId)}
            <li>
              <Badge tone={posTone(row.position)} label={`Position ${row.position}`}>
                {row.position}
              </Badge>
              <span class="pname">{store.playerName(row.playerId)}</span>
              <span class="pscore">{row.score.toLocaleString()}</span>
            </li>
          {/each}
        </ol>
      </div>
    {/if}
  </div>

  {#snippet footer()}
    <Button variant="ghost" onclick={() => (open = false)}>Cancel</Button>
    <Button variant="primary" disabled={!canSave} onclick={save}>
      {game ? 'Save' : 'Add game'}
    </Button>
  {/snippet}
</Modal>

<style>
  .form {
    display: flex;
    flex-direction: column;
    gap: var(--ss-s-4, 16px);
  }
  .scores,
  .preview {
    display: flex;
    flex-direction: column;
    gap: var(--ss-s-2, 8px);
  }
  .scores-label {
    font-family: var(--ss-font-mono);
    font-size: var(--ss-ui-xs);
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: var(--ss-fg-muted);
  }
  /* Plain number entry: no native spinner arrows (and no DS steppers). */
  .scores :global(.ss-input)::-webkit-outer-spin-button,
  .scores :global(.ss-input)::-webkit-inner-spin-button {
    -webkit-appearance: none;
    margin: 0;
  }
  .scores :global(.ss-input[type='number']) {
    appearance: textfield;
    -moz-appearance: textfield;
  }
  .error {
    color: var(--ss-red);
    font-size: var(--ss-ui-xs);
    font-family: var(--ss-font-mono);
    margin: 0;
  }
  .hint {
    color: var(--ss-fg-faint);
    font-size: var(--ss-ui-xs);
    margin: 0;
  }
  .podium {
    list-style: none;
    margin: 0;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: var(--ss-s-1, 4px);
  }
  .podium li {
    display: flex;
    align-items: center;
    gap: var(--ss-s-2, 8px);
  }
  .pname {
    flex: 1;
  }
  .pscore {
    font-family: var(--ss-font-mono);
    color: var(--ss-fg-muted);
  }
</style>
