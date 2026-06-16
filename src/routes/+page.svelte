<script lang="ts">
  import { Accordion, Heading, Button, Input, EmptyState, Modal, Badge, toast } from 'dssoca'
  import { store } from '$lib/store.svelte'
  import { positionsForGame, chronological } from '$lib/rankings'
  import GameForm from '$lib/components/GameForm.svelte'
  import PlayerTag from '$lib/components/PlayerTag.svelte'
  import { posTone } from '$lib/components/posTone'
  import { reveal } from '$lib/motion'
  import type { Game } from '$lib/types'

  let formOpen = $state(false)
  let editing = $state<Game | undefined>(undefined)
  let deleteTarget = $state<Game | undefined>(undefined)

  const gamesNewestFirst = $derived(chronological(store.data.games).reverse())
  const gamesById = $derived(new Map(gamesNewestFirst.map((g) => [g.id, g])))

  function longDate(date: string) {
    return new Date(date + 'T00:00:00').toLocaleDateString(undefined, {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })
  }
  function winnerName(g: Game) {
    const first = positionsForGame(g).find((r) => r.position === 1)
    return first ? store.playerName(first.playerId) : '—'
  }
  function highScore(g: Game) {
    return Math.max(...g.entries.map((e) => e.score)).toLocaleString()
  }
  function playerColor(playerId: string) {
    return store.data.players.find((p) => p.id === playerId)?.color ?? '#888'
  }

  let query = $state('')
  const q = $derived(query.trim().toLowerCase())
  const filtered = $derived(
    q === ''
      ? gamesNewestFirst
      : gamesNewestFirst.filter(
          (g) =>
            longDate(g.date).toLowerCase().includes(q) ||
            g.date.includes(q) ||
            winnerName(g).toLowerCase().includes(q),
        ),
  )

  const items = $derived(
    filtered.map((g) => ({
      id: g.id,
      label: longDate(g.date),
      hint: `🏆 ${winnerName(g)} · ${highScore(g)}`,
    })),
  )

  function newGame() {
    editing = undefined
    formOpen = true
  }
  function editGame(g: Game) {
    editing = g
    formOpen = true
  }
  function doDelete() {
    if (!deleteTarget) return
    store.deleteGame(deleteTarget.id)
    toast.success('Game deleted')
    deleteTarget = undefined
  }
</script>

<svelte:head><title>Games — geossoca</title></svelte:head>

<header class="head">
  <Heading level={1}>Games</Heading>
  <Button variant="primary" onclick={newGame} disabled={store.data.players.length === 0}>
    New game
  </Button>
</header>

{#if store.data.games.length === 0}
  <div in:reveal={{ y: 10, delay: 60 }}>
    <EmptyState
      title="No games yet"
      message={store.data.players.length === 0
        ? 'Add players first, then record your first game.'
        : 'Record your first game to start tracking scores.'}
      icon="∅"
    >
      {#snippet action()}
        <Button variant="primary" onclick={newGame} disabled={store.data.players.length === 0}>
          New game
        </Button>
      {/snippet}
    </EmptyState>
  </div>
{:else}
  <div class="search" in:reveal={{ y: 10, delay: 40 }}>
    <Input bind:value={query} placeholder="Search by date or champion" />
  </div>

  {#if items.length === 0}
    <p class="no-match" in:reveal={{ y: 10 }}>No games match “{query}”.</p>
  {:else}
    <div in:reveal={{ y: 10, delay: 60 }}>
      <Accordion {items} multiple headingLevel={2}>
        {#snippet header(item)}
          {@const g = gamesById.get(item.id)}
          <div class="hd">
            <span class="hd-date">{item.label}</span>
            {#if g}
              <span class="hd-meta">🏆 {winnerName(g)} · {highScore(g)}</span>
            {/if}
          </div>
        {/snippet}

        {#snippet panel(item)}
          {@const g = gamesById.get(item.id)}
          {#if g}
            <ol class="rows">
              {#each positionsForGame(g) as row (row.playerId)}
                <li>
                  <Badge tone={posTone(row.position)} label={`Position ${row.position}`}>
                    {row.position}
                  </Badge>
                  <PlayerTag
                    name={store.playerName(row.playerId)}
                    color={playerColor(row.playerId)}
                  />
                  <span class="name">{store.playerName(row.playerId)}</span>
                  <span class="score">{row.score.toLocaleString()}</span>
                </li>
              {/each}
            </ol>
            <div class="actions">
              <Button variant="ghost" size="sm" onclick={() => editGame(g)}>Edit</Button>
              <Button variant="ghost" size="sm" onclick={() => (deleteTarget = g)}>Delete</Button>
            </div>
          {/if}
        {/snippet}
      </Accordion>
    </div>
  {/if}
{/if}

<GameForm bind:open={formOpen} game={editing} />

<Modal
  open={deleteTarget !== undefined}
  title="Delete game?"
  danger
  onclose={() => (deleteTarget = undefined)}
>
  <p>This permanently removes the game and its scores. This can't be undone.</p>
  {#snippet footer()}
    <Button variant="ghost" onclick={() => (deleteTarget = undefined)}>Cancel</Button>
    <Button variant="danger" onclick={doDelete}>Delete</Button>
  {/snippet}
</Modal>

<style>
  .head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--ss-s-3, 12px);
  }
  .search {
    max-width: 22rem;
  }
  .no-match {
    color: var(--ss-fg-muted);
    margin: 0;
  }
  .hd {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--ss-s-3, 12px);
    flex: 1;
  }
  .hd-meta {
    color: var(--ss-fg-muted);
    font-family: var(--ss-font-mono);
    white-space: nowrap;
  }
  .rows {
    list-style: none;
    margin: 0 0 var(--ss-s-3, 12px);
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: var(--ss-s-2, 8px);
  }
  .rows li {
    display: flex;
    align-items: center;
    gap: var(--ss-s-3, 12px);
  }
  .name {
    flex: 1;
  }
  .score {
    font-family: var(--ss-font-mono);
    color: var(--ss-fg-muted);
  }
  .actions {
    display: flex;
    gap: var(--ss-s-1, 4px);
  }
</style>
