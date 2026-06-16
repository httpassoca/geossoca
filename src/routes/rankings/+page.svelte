<script lang="ts">
  import { Heading, Table, Sparkline, EmptyState } from 'dssoca'
  import type { TableColumn } from 'dssoca'
  import { store } from '$lib/store.svelte'
  import { positionRanking, pointsRanking } from '$lib/rankings'
  import Podium from '$lib/components/Podium.svelte'
  import PlayerTag from '$lib/components/PlayerTag.svelte'
  import { reveal } from '$lib/motion'

  const positionRows = $derived(positionRanking(store.data.players, store.data.games))
  const pointsRows = $derived(pointsRanking(store.data.players, store.data.games))
  const hasData = $derived(store.data.games.length > 0)

  const pointsPodium = $derived(
    pointsRows.slice(0, 3).map((r) => ({
      name: r.player.name,
      color: r.player.color,
      value: `${r.totalPoints.toLocaleString()} pts`,
      rank: r.rank,
    })),
  )
  const positionsPodium = $derived(
    positionRows.slice(0, 3).map((r) => ({
      name: r.player.name,
      color: r.player.color,
      value: `${r.positionSum} (avg ${r.avgPosition.toFixed(2)})`,
      rank: r.rank,
    })),
  )

  const num = (v: number) => v.toLocaleString()
  const two = (v: number) => v.toFixed(2)
</script>

<svelte:head><title>Rankings — geossoca</title></svelte:head>

<Heading level={1}>Rankings</Heading>

{#snippet playerCell(row: { player: { name: string; color: string } })}
  <span class="player">
    <PlayerTag name={row.player.name} color={row.player.color} />
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
{:else}
  <section class="block" in:reveal={{ y: 10 }}>
    <Podium title="Positions" entries={positionsPodium} />
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
  </section>

  <section class="block" in:reveal={{ y: 10, delay: 80 }}>
    <Podium title="Points" entries={pointsPodium} />
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
  </section>
{/if}

<style>
  .block {
    display: flex;
    flex-direction: column;
    gap: var(--ss-s-4, 16px);
  }
  .player {
    display: inline-flex;
    align-items: center;
    gap: var(--ss-s-2, 8px);
  }
</style>
