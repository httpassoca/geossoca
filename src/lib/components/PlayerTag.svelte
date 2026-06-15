<script lang="ts">
  import { initials } from '$lib/palette'

  interface Props {
    name: string
    color: string
    /** Side length in px. */
    px?: number
  }
  let { name, color, px = 28 }: Props = $props()
</script>

<span
  class="tag"
  style="background:{color};width:{px}px;height:{px}px;font-size:{Math.round(px * 0.4)}px"
  title={name}
  aria-hidden="true"
>
  {initials(name)}
</span>

<style>
  .tag {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    flex: none;
    border-radius: 0;
    color: #0b0b0b;
    font-family: var(--ss-font-mono);
    font-weight: 700;
    line-height: 1;
    letter-spacing: 0.02em;
  }
</style>
