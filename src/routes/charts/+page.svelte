<script lang="ts">
  import { Heading, EmptyState } from 'dssoca'
  import { reveal } from '$lib/motion'
  import { store } from '$lib/store.svelte'
  import ChartFrame from '$lib/components/ChartFrame.svelte'
  import {
    cumulativePositionSeries,
    cumulativePointsSeries,
    pointsPerGameSeries,
    podiumSeries,
  } from '$lib/charts'

  const players = $derived(store.data.players)
  const games = $derived(store.data.games)
  const hasData = $derived(games.length > 0 && players.length > 0)

  const positionRace = $derived(cumulativePositionSeries(players, games))
  const pointsRace = $derived(cumulativePointsSeries(players, games))
  const perGame = $derived(pointsPerGameSeries(players, games))
  const podium = $derived(podiumSeries(players, games))

  const gameLabel = (x: number | string | Date) => `G${x}`
  const compact = (y: number) => (y >= 1000 ? `${(y / 1000).toFixed(0)}k` : `${y}`)
</script>

<svelte:head><title>Charts — geossoca</title></svelte:head>

<div in:reveal={{ y: 12, delay: 0 }}>
  <Heading level={1}>Charts</Heading>
</div>

{#if !hasData}
  <div in:reveal={{ y: 12, delay: 70 }}>
    <EmptyState
      title="No data to chart"
      message="Add players and record a few games to see performance graphs."
      icon="∅"
    />
  </div>
{:else}
  <div class="charts">
    <div class="chart-cell" in:reveal={{ y: 12, delay: 0 }}>
      <ChartFrame
        title="Position race"
        description="Cumulative sum of finishing positions — lower is leading."
        series={positionRace}
        variant="line"
        xFormat={gameLabel}
      />
    </div>

    <div class="chart-cell" in:reveal={{ y: 12, delay: 70 }}>
      <ChartFrame
        title="Points race"
        description="Cumulative raw points across games — higher is leading."
        series={pointsRace}
        variant="line"
        xFormat={gameLabel}
        yFormat={compact}
      />
    </div>

    <div class="chart-cell" in:reveal={{ y: 12, delay: 140 }}>
      <ChartFrame
        title="Points per game"
        description="Each game's raw score per player."
        series={perGame}
        variant="line"
        xFormat={gameLabel}
        yFormat={compact}
      />
    </div>

    <div class="chart-cell" in:reveal={{ y: 12, delay: 210 }}>
      <ChartFrame
        title="Podium distribution"
        description="How often each player finishes 1st–4th."
        series={podium}
        variant="bar"
      />
    </div>
  </div>
{/if}

<style>
  .charts {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
    gap: var(--ss-s-4, 16px);
  }
</style>
