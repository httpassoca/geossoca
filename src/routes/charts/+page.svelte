<script lang="ts">
  import { Heading, Chart, EmptyState, Card } from 'dssoca'
  import { store } from '$lib/store.svelte'
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

<Heading level={1}>Charts</Heading>

{#if !hasData}
  <EmptyState
    title="No data to chart"
    message="Add players and record a few games to see performance graphs."
    icon="∅"
  />
{:else}
  <div class="charts">
    <Card
      title="Position race"
      description="Cumulative sum of finishing positions — lower is leading."
    >
      <Chart series={positionRace} variant="line" xFormat={gameLabel} fluid height={260} />
    </Card>

    <Card title="Points race" description="Cumulative raw points across games — higher is leading.">
      <Chart
        series={pointsRace}
        variant="line"
        xFormat={gameLabel}
        yFormat={compact}
        fluid
        height={260}
      />
    </Card>

    <Card title="Points per game" description="Each game's raw score per player.">
      <Chart
        series={perGame}
        variant="line"
        xFormat={gameLabel}
        yFormat={compact}
        fluid
        height={260}
      />
    </Card>

    <Card title="Podium distribution" description="How often each player finishes 1st–4th.">
      <Chart series={podium} variant="bar" fluid height={260} />
    </Card>
  </div>
{/if}

<style>
  .charts {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
    gap: var(--ss-s-4, 16px);
  }
</style>
