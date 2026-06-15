// Page-entrance animation. A thin wrapper over Svelte's `fly` that becomes a
// no-op under prefers-reduced-motion, so callers can use it freely.

import { fly } from 'svelte/transition'
import { cubicOut } from 'svelte/easing'
import { prefersReducedMotion } from 'svelte/motion'
import type { TransitionConfig } from 'svelte/transition'

interface RevealParams {
  y?: number
  duration?: number
  delay?: number
}

export function reveal(node: Element, params: RevealParams = {}): TransitionConfig {
  if (prefersReducedMotion.current) return { duration: 0 }
  const { y = 10, duration = 240, delay = 0 } = params
  return fly(node, { y, duration, delay, easing: cubicOut })
}
