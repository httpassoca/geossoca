// Player identity colours. Hex (not CSS vars) so they work in <input type=color>
// and as D3 chart series colours. Drawn from dssoca's dark-theme accents.

export const PALETTE = [
  '#66ef73', // primary green
  '#9aa4ff', // blue
  '#b98cff', // purple
  '#66d9ef', // cyan
  '#e0c36a', // yellow
  '#a6e22e', // lime
  '#ff5c5c', // red
  '#ff9e64', // orange
]

/** Deterministic colour for the nth player (cycles the palette). */
export function pickColor(index: number): string {
  return PALETTE[((index % PALETTE.length) + PALETTE.length) % PALETTE.length]
}

/** Up to two uppercase initials from a name ("Ada Lovelace" → "AL"). */
export function initials(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean)
  if (words.length === 0) return '?'
  if (words.length === 1) return words[0].slice(0, 1).toUpperCase()
  return (words[0][0] + words[words.length - 1][0]).toUpperCase()
}

const SCORE_MAX = 50000

export { SCORE_MAX }
