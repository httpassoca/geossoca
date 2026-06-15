<script lang="ts">
  import { Card, Badge, Button } from 'dssoca'
  import { store } from '$lib/store.svelte'
  import { positionsForGame } from '$lib/rankings'
  import type { Game } from '$lib/types'
  import { posTone } from './posTone'

  interface Props {
    game: Game
    onedit: () => void
    ondelete: () => void
  }
  let { game, onedit, ondelete }: Props = $props()

  const positions = $derived(positionsForGame(game))
  const longDate = $derived(
    new Date(game.date + 'T00:00:00').toLocaleDateString(undefined, {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    }),
  )
</script>

<Card title={longDate} meta={`${game.entries.length} players`}>
  {#snippet action()}
    <div class="actions">
      <Button variant="ghost" size="sm" onclick={onedit}>Edit</Button>
      <Button variant="ghost" size="sm" onclick={ondelete}>Delete</Button>
    </div>
  {/snippet}

  <ol class="rows">
    {#each positions as row (row.playerId)}
      <li>
        <Badge tone={posTone(row.position)} label={`Position ${row.position}`}>{row.position}</Badge
        >
        <span class="name">{store.playerName(row.playerId)}</span>
        <span class="score">{row.score.toLocaleString()}</span>
      </li>
    {/each}
  </ol>
</Card>

<style>
  .actions {
    display: flex;
    gap: var(--ss-s-1, 4px);
  }
  .rows {
    list-style: none;
    margin: 0;
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
</style>
