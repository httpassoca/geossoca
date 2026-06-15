<script lang="ts">
  import PlayerTag from './PlayerTag.svelte'

  export interface PodiumEntry {
    name: string
    color: string
    /** Pre-formatted value shown under the name (e.g. "12 pts" or "1.50 avg"). */
    value: string
    rank: number
  }
  interface Props {
    title: string
    /** Top finishers in rank order (1st, 2nd, 3rd). */
    entries: PodiumEntry[]
  }
  let { title, entries }: Props = $props()

  // Display order places 1st in the centre: [2nd, 1st, 3rd].
  const arranged = $derived([entries[1], entries[0], entries[2]].filter(Boolean))
</script>

<div class="podium">
  <h3 class="title">{title}</h3>
  {#if arranged.length === 0}
    <p class="empty">—</p>
  {:else}
    <div class="stage">
      {#each arranged as e (e.rank)}
        <div class="col" data-rank={e.rank}>
          <PlayerTag name={e.name} color={e.color} px={36} />
          <span class="name">{e.name}</span>
          <span class="value">{e.value}</span>
          <div class="plinth" style="background:{e.color}">
            <span class="medal">{e.rank}</span>
          </div>
        </div>
      {/each}
    </div>
  {/if}
</div>

<style>
  .podium {
    display: flex;
    flex-direction: column;
    gap: var(--ss-s-2, 8px);
  }
  .title {
    font-family: var(--ss-font-subhead, var(--ss-font-mono));
    font-size: var(--ss-ui-xs);
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: var(--ss-fg-muted);
    margin: 0;
  }
  .stage {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    align-items: end;
    gap: var(--ss-s-2, 8px);
  }
  .col {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: var(--ss-s-1, 4px);
    text-align: center;
  }
  .name {
    font-size: var(--ss-ui-xs);
    color: var(--ss-fg);
    max-width: 9ch;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .value {
    font-family: var(--ss-font-mono);
    font-size: var(--ss-ui-xs);
    color: var(--ss-fg-muted);
  }
  .plinth {
    width: 100%;
    display: flex;
    align-items: flex-start;
    justify-content: center;
    padding-top: var(--ss-s-1, 4px);
    color: #0b0b0b;
    font-family: var(--ss-font-mono);
    font-weight: 700;
    opacity: 0.9;
  }
  /* 1st tallest, then 2nd, then 3rd. */
  .col[data-rank='1'] .plinth {
    height: 72px;
  }
  .col[data-rank='2'] .plinth {
    height: 52px;
  }
  .col[data-rank='3'] .plinth {
    height: 36px;
  }
  .medal {
    font-size: var(--ss-ui-xs);
  }
  .empty {
    color: var(--ss-fg-faint);
    margin: 0;
  }
</style>
