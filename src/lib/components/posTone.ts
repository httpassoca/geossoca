// Map a finishing position to a dssoca Badge tone (podium feel: gold/silver/
// bronze-ish, then neutral). The literal union matches Badge's `tone` prop.
export type BadgeTone = 'up' | 'deg' | 'down' | 'maint' | 'info' | 'neutral'

export function posTone(position: number): BadgeTone {
  if (position === 1) return 'up'
  if (position === 2) return 'info'
  if (position === 3) return 'maint'
  return 'neutral'
}
