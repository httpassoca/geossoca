<script lang="ts">
  import { Heading, SegmentedControl, Table, Avatar, Sparkline, EmptyState } from 'dssoca'
  import type { TableColumn } from 'dssoca'
  import { store } from '$lib/store.svelte'
  import { positionRanking, pointsRanking } from '$lib/rankings'

  let view = $state('positions')

  const positionRows = $derived(positionRanking(store.data.players, store.data.games))
  const pointsRows = $derived(pointsRanking(store.data.players, store.data.games))
  const hasData = $derived(store.data.games.length > 0)

  const num = (v: number) => v.toLocaleString()
  const two = (v: number) => v.toFixed(2)
</script>

<svelte:head><title>Rankings — geossoca</title></svelte:head>

<header class="head">
  <Heading level={1}>Rankings</Heading>
  <SegmentedControl
    label="Ranking"
    bind:value={view}
    options={[
      { value: 'positions', label: 'Positions' },
      { value: 'points', label: 'Points' },
    ]}
  />
</header>

<p class="lede">
  {#if view === 'positions'}
    Sum of finishing positions — <strong>lower is better</strong>. Equal sums share a rank.
  {:else}
    Total raw points across all games — <strong>higher is better</strong>.
  {/if}
</p>

{#snippet playerCell(row: { player: { name: string } })}
  <span class="player">
    <Avatar name={row.player.name} size="sm" />
    <span>{row.player.name}</span>
  </span>
{/snippet}

{#snippet posTrend(row: { recentPositions: number[] })}
  <Sparkline data={row.recentPositions} variant="line" width="80px" label="Recent positions" />
{/snippet}

{#snippet ptsTrend(row: { recentScores: number[] })}
  <Sparkline
    data={row.recentScores}
    variant="line"
    trend="auto"
    width="80px"
    label="Recent scores"
  />
{/snippet}

{#if !hasData}
  <EmptyState title="Nothing to rank yet" message="Record some games to see standings." icon="∅" />
{:else if view === 'positions'}
  <Table
    rows={positionRows}
    columns={[
      { key: 'rank', label: '#', numeric: true },
      { key: 'player', label: 'Player', cell: playerCell },
      { key: 'gamesPlayed', label: 'Games', numeric: true },
      { key: 'positionSum', label: 'Pos. sum', numeric: true },
      { key: 'avgPosition', label: 'Avg', numeric: true, format: (v) => two(v as number) },
      { key: 'firsts', label: '1st', numeric: true },
      { key: 'seconds', label: '2nd', numeric: true },
      { key: 'thirds', label: '3rd', numeric: true },
      { key: 'trend', label: 'Trend', cell: posTrend },
    ] satisfies TableColumn[]}
  />
{:else}
  <Table
    rows={pointsRows}
    columns={[
      { key: 'rank', label: '#', numeric: true },
      { key: 'player', label: 'Player', cell: playerCell },
      { key: 'gamesPlayed', label: 'Games', numeric: true },
      { key: 'totalPoints', label: 'Total', numeric: true, format: (v) => num(v as number) },
      {
        key: 'avgPoints',
        label: 'Avg / game',
        numeric: true,
        format: (v) => Math.round(v as number).toLocaleString(),
      },
      { key: 'trend', label: 'Trend', cell: ptsTrend },
    ] satisfies TableColumn[]}
  />
{/if}

<style>
  .head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--ss-s-3, 12px);
    flex-wrap: wrap;
  }
  .lede {
    color: var(--ss-fg-muted);
    margin: 0;
  }
  .player {
    display: inline-flex;
    align-items: center;
    gap: var(--ss-s-2, 8px);
  }
</style>
