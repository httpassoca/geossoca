<script lang="ts">
  import { Heading, Button, MetricTile, EmptyState, Modal, toast } from 'dssoca'
  import { store } from '$lib/store.svelte'
  import { chronological } from '$lib/rankings'
  import GameForm from '$lib/components/GameForm.svelte'
  import GameCard from '$lib/components/GameCard.svelte'
  import type { Game } from '$lib/types'

  let formOpen = $state(false)
  let editing = $state<Game | undefined>(undefined)
  let deleteTarget = $state<Game | undefined>(undefined)

  const gamesNewestFirst = $derived(chronological(store.data.games).reverse())
  const lastGameDate = $derived(gamesNewestFirst[0]?.date ?? '—')

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

<section class="metrics">
  <MetricTile label="Games" value={store.data.games.length} />
  <MetricTile label="Players" value={store.data.players.length} />
  <MetricTile label="Last played" value={lastGameDate} />
</section>

{#if store.data.games.length === 0}
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
{:else}
  <section class="games">
    {#each gamesNewestFirst as game (game.id)}
      <GameCard {game} onedit={() => editGame(game)} ondelete={() => (deleteTarget = game)} />
    {/each}
  </section>
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
  .metrics {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
    gap: var(--ss-s-3, 12px);
  }
  .games {
    display: flex;
    flex-direction: column;
    gap: var(--ss-s-3, 12px);
  }
</style>
