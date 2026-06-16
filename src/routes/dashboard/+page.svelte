<script lang="ts">
  import {
    Heading,
    EmptyState,
    Card,
    Table,
    Sparkline,
    Select,
    ScatterPlot,
    BoxPlot,
    BumpChart,
    Heatmap,
  } from 'dssoca'
  import type { TableColumn, ScatterPoint, BoxGroup } from 'dssoca'
  import { store } from '$lib/store.svelte'
  import { statRanking, percentile, groupByFriday } from '$lib/stats'
  import { rollingAverageSeries, headToHeadMatrix, sessionBump } from '$lib/dashboard'
  import { cumulativePositionSeries, cumulativePointsSeries, podiumSeries } from '$lib/charts'
  import ChartFrame from '$lib/components/ChartFrame.svelte'
  import PlayerTag from '$lib/components/PlayerTag.svelte'
  import { reveal } from '$lib/motion'

  const players = $derived(store.data.players)
  const games = $derived(store.data.games)
  const hasData = $derived(games.length > 0 && players.length > 0)

  // Difficulty-aware leaderboard.
  const rows = $derived(statRanking(players, games))

  // Current form — trailing rolling average of raw score. (Merges the old
  // "points per game" chart: this is the smoothed view of the same data.)
  const form = $derived(rollingAverageSeries(players, games, 5))

  // Charts carried over from the former /charts page.
  const positionRace = $derived(cumulativePositionSeries(players, games))
  const pointsRace = $derived(cumulativePointsSeries(players, games))
  const podium = $derived(podiumSeries(players, games))

  // Score distribution per player (box + beeswarm).
  const boxGroups = $derived<BoxGroup[]>(
    players
      .map((p) => ({
        label: p.name,
        color: p.color,
        values: games.flatMap((g) =>
          g.entries.filter((e) => e.playerId === p.id).map((e) => e.score),
        ),
      }))
      .filter((g) => g.values.length > 0),
  )

  // Quadrant scatter — consistency (x) vs power rating (y), bubble = wins.
  const scatter = $derived<ScatterPoint[]>(
    rows.map((r) => ({
      label: r.player.name,
      x: r.consistency ?? 0,
      y: r.powerRating,
      size: r.wins,
      color: r.player.color,
    })),
  )
  const xRef = $derived(
    percentile(
      scatter.map((p) => p.x),
      0.5,
    ),
  )
  const yRef = $derived(
    percentile(
      scatter.map((p) => p.y),
      0.5,
    ),
  )

  // Head-to-head win matrix.
  const matrix = $derived(headToHeadMatrix(players, games))

  // Per-session bump — pick a Friday, default the latest.
  const sessions = $derived(groupByFriday(games))
  let sessionDate = $state('')
  $effect(() => {
    if (!sessions.some((s) => s.date === sessionDate) && sessions.length) {
      sessionDate = sessions[sessions.length - 1].date
    }
  })
  const selectedSession = $derived(
    sessions.find((s) => s.date === sessionDate) ?? sessions[sessions.length - 1],
  )
  const bump = $derived(
    selectedSession ? sessionBump(players, selectedSession) : { stages: [], series: [] },
  )
  const sessionOptions = $derived(
    [...sessions].reverse().map((s) => ({ value: s.date, label: longDate(s.date) })),
  )

  // Formatters.
  const gameLabel = (x: number | string | Date) => `G${x}`
  const compact = (y: number) =>
    Math.abs(y) >= 1000 ? `${(y / 1000).toFixed(1)}k` : `${Math.round(y)}`
  const pct = (v: number) => `${Math.round(v * 100)}%`
  const two = (v: number) => v.toFixed(2)
  const signedK = (v: number) => `${v >= 0 ? '+' : '−'}${(Math.abs(v) / 1000).toFixed(1)}k`
  function longDate(d: string): string {
    return new Date(d + 'T00:00:00').toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
    })
  }
</script>

<svelte:head><title>Dashboard — geossoca</title></svelte:head>

<div in:reveal={{ y: 12 }}>
  <Heading level={1}>Dashboard</Heading>
</div>

{#if !hasData}
  <div in:reveal={{ y: 12, delay: 70 }}>
    <EmptyState
      title="No data yet"
      message="Add players and record a few games to light up the dashboard."
      icon="∅"
    />
  </div>
{:else}
  {#snippet playerCell(row: { player: { name: string; color: string } })}
    <span class="player">
      <PlayerTag name={row.player.name} color={row.player.color} />
      <span>{row.player.name}</span>
    </span>
  {/snippet}

  {#snippet formCell(row: { recentScores: number[] })}
    <Sparkline
      data={row.recentScores}
      variant="line"
      trend="auto"
      width="80px"
      label="Recent form"
    />
  {/snippet}

  <section in:reveal={{ y: 12, delay: 40 }}>
    <Card title="Power rankings" description="Sortable. Default order is the power rating.">
      <Table
        {rows}
        columns={[
          { key: 'rank', label: '#', numeric: true },
          { key: 'player', label: 'Player', cell: playerCell },
          { key: 'gamesPlayed', label: 'GP', numeric: true },
          { key: 'powerRating', label: 'Power', numeric: true, format: (v) => two(v as number) },
          { key: 'winRate', label: 'Win%', numeric: true, format: (v) => pct(v as number) },
          { key: 'avgFinish', label: 'Avg fin', numeric: true, format: (v) => two(v as number) },
          { key: 'podiumRate', label: 'Podium%', numeric: true, format: (v) => pct(v as number) },
          { key: 'avgPaa', label: 'vs field', numeric: true, format: (v) => signedK(v as number) },
          { key: 'peak', label: 'Peak', numeric: true, format: (v) => compact(v as number) },
          {
            key: 'consistency',
            label: 'Consist',
            numeric: true,
            format: (v) => (v == null ? '—' : two(v as number)),
          },
          { key: 'form', label: 'Form', cell: formCell },
        ] satisfies TableColumn[]}
      />
    </Card>
  </section>

  <div class="grid">
    <div class="cell" in:reveal={{ y: 12, delay: 0 }}>
      <ChartFrame
        title="Current form"
        description="Rolling 5-game average of each player's score — recent momentum."
        series={form}
        variant="line"
        xFormat={gameLabel}
        yFormat={compact}
      />
    </div>

    <div class="cell" in:reveal={{ y: 12, delay: 35 }}>
      <ChartFrame
        title="Position race"
        description="Cumulative sum of finishing positions — lower is leading."
        series={positionRace}
        variant="line"
        xFormat={gameLabel}
      />
    </div>

    <div class="cell" in:reveal={{ y: 12, delay: 70 }}>
      <ChartFrame
        title="Points race"
        description="Cumulative raw points across games — higher is leading."
        series={pointsRace}
        variant="line"
        xFormat={gameLabel}
        yFormat={compact}
      />
    </div>

    <div class="cell" in:reveal={{ y: 12, delay: 105 }}>
      <ChartFrame
        title="Podium distribution"
        description="How often each player finishes 1st–4th."
        series={podium}
        variant="bar"
      />
    </div>

    <div class="cell" in:reveal={{ y: 12, delay: 140 }}>
      <Card
        title="Skill vs consistency"
        description="Power rating (up) against consistency (right). Bubble = wins — the small dots high up score well without winning much."
      >
        <ScatterPlot
          points={scatter}
          {xRef}
          {yRef}
          xLabel="Consistency (mean ÷ std)"
          yLabel="Power rating"
          yFormat={two}
          xFormat={two}
          quadrantLabels={{
            tl: 'spiky scorer',
            tr: 'steady star',
            bl: 'erratic, low',
            br: 'steady, building',
          }}
          fluid
          height={320}
        />
      </Card>
    </div>

    <div class="cell" in:reveal={{ y: 12, delay: 140 }}>
      <Card
        title="Score distribution"
        description="Every game as a dot; the box spans the middle half. A short box = a steady player."
      >
        <BoxPlot groups={boxGroups} yLabel="Score" yFormat={compact} fluid height={320} />
      </Card>
    </div>

    <div class="cell" in:reveal={{ y: 12, delay: 210 }}>
      <Card
        title="Head-to-head"
        description="How often the row player finished ahead of the column player."
      >
        <Heatmap
          rows={matrix.rows}
          columns={matrix.columns}
          values={matrix.values}
          valueFormat={(v) => String(v)}
          cellSize={52}
        />
      </Card>
    </div>
    <div class="cell" in:reveal={{ y: 12, delay: 280 }}>
      <Card
        title="A single Friday"
        description="Finishing rank across the night's games — 1 is at the top."
      >
        {#if sessionOptions.length > 1}
          <div class="session-pick">
            <Select label="Session" bind:value={sessionDate} options={sessionOptions} />
          </div>
        {/if}
        {#if bump.series.length}
          <BumpChart series={bump.series} stages={bump.stages} fluid height={300} />
        {:else}
          <EmptyState title="No games that night" message="Pick another Friday." icon="∅" />
        {/if}
      </Card>
    </div>
  </div>
{/if}

<style>
  .grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(340px, 1fr));
    gap: var(--ss-s-4, 16px);
  }
  .player {
    display: inline-flex;
    align-items: center;
    gap: var(--ss-s-2, 8px);
  }
  .session-pick {
    margin-bottom: var(--ss-s-3, 12px);
    max-width: 16rem;
  }
</style>
