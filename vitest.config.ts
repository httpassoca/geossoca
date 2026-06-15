import { defineConfig } from 'vitest/config'

// Pure-logic unit tests (rankings, json) — no Svelte / $app, so we skip the
// SvelteKit plugin and run in a plain node environment.
export default defineConfig({
  test: {
    include: ['src/**/*.test.ts'],
    environment: 'node',
  },
})
