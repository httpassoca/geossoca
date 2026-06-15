<script lang="ts">
  import { Modal, DateField, NumberField, Button, Badge, toast } from 'dssoca'
  import { store } from '$lib/store.svelte'
  import { positionsForGame } from '$lib/rankings'
  import type { Game, GameEntry } from '$lib/types'
  import { posTone } from './posTone'

  interface Props {
    open: boolean
    /** When set, the form edits this game; otherwise it creates a new one. */
    game?: Game
  }
  let { open = $bindable(), game }: Props = $props()

  const today = () => new Date().toISOString().slice(0, 10)

  let date = $state(today())
  let scores = $state<Record<string, number | null>>({})

  // (Re)initialise whenever the modal opens, from the edited game or blank.
  $effect(() => {
    if (!open) return
    date = game?.date ?? today()
    const next: Record<string, number | null> = {}
    for (const p of store.data.players) {
      next[p.id] = game?.entries.find((e) => e.playerId === p.id)?.score ?? null
    }
    scores = next
  })

  const entries = $derived<GameEntry[]>(
    store.data.players
      .filter((p) => scores[p.id] != null)
      .map((p) => ({ playerId: p.id, score: scores[p.id] as number })),
  )

  const scoreValues = $derived(entries.map((e) => e.score))
  const hasDuplicate = $derived(new Set(scoreValues).size !== scoreValues.length)
  const preview = $derived(entries.length ? positionsForGame({ id: '', date, entries }) : [])
  const canSave = $derived(entries.length >= 1 && !hasDuplicate)

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
          <NumberField
            label={p.name}
            bind:value={scores[p.id]}
            min={0}
            step={100}
            placeholder="—"
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
