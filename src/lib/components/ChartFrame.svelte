<script lang="ts">
  import { Card, Chart, Modal } from 'dssoca'
  import type { ChartSeries } from 'dssoca'

  interface Props {
    title: string
    description?: string
    series: ChartSeries[]
    variant?: 'line' | 'area' | 'bar'
    xFormat?: (x: number | string | Date) => string
    yFormat?: (y: number) => string
  }
  let { title, description, series, variant = 'line', xFormat, yFormat }: Props = $props()

  let open = $state(false)
</script>

<Card {title} {description}>
  <!-- The whole chart area is a button that opens the large viewer. The chart
       itself is `inert` so its own focusable points don't nest inside the
       button; full interactivity lives in the modal. -->
  <div
    class="thumb"
    role="button"
    tabindex="0"
    aria-label={`Open the ${title} chart in a larger view`}
    onclick={() => (open = true)}
    onkeydown={(e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault()
        open = true
      }
    }}
  >
    <div class="inert" inert>
      <Chart {series} {variant} {xFormat} {yFormat} tooltip={false} fluid height={240} />
    </div>
    <span class="hint">Click to expand ⤢</span>
  </div>
</Card>

<div class="viewer">
  <Modal bind:open {title} size="lg">
    <div class="big">
      <Chart {series} {variant} {xFormat} {yFormat} fluid height={560} />
    </div>
  </Modal>
</div>

<style>
  .thumb {
    position: relative;
    display: block;
    width: 100%;
    padding: 0;
    background: none;
    border: 0;
    cursor: zoom-in;
    text-align: left;
  }
  .thumb:focus-visible {
    outline: 2px solid var(--ss-primary);
    outline-offset: 2px;
  }
  .inert {
    pointer-events: none;
  }
  .hint {
    position: absolute;
    top: 0;
    right: 0;
    font-family: var(--ss-font-mono);
    font-size: var(--ss-ui-xs);
    color: var(--ss-fg-faint);
    opacity: 0;
    transition: opacity var(--ss-dur-fast, 120ms) var(--ss-ease, ease);
  }
  .thumb:hover .hint,
  .thumb:focus-visible .hint {
    opacity: 1;
  }
  .big {
    width: 100%;
  }
  /* The viewer is an "almost full screen" reader: widen the dialog well past the
     default lg max-width (it still caps at the viewport on smaller screens). */
  .viewer :global(.ss-modal) {
    --ss-modal-w: 92rem;
  }
</style>
