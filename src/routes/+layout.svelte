<script lang="ts">
  import 'dssoca/theme.css'
  import favicon from '$lib/assets/favicon.svg'
  import { Topbar, Toaster, Container, Switch, SegmentedControl } from 'dssoca'
  import { page } from '$app/state'
  import { store } from '$lib/store.svelte'
  import type { SizeVariant } from '$lib/types'

  let { children } = $props()

  const tabs = [
    { id: 'games', label: 'Games', href: '/' },
    { id: 'dashboard', label: 'Dashboard', href: '/dashboard' },
    { id: 'rankings', label: 'Rankings', href: '/rankings' },
    { id: 'players', label: 'Players', href: '/players' },
  ]

  const active = $derived.by(() => {
    const p = page.url.pathname
    if (p.startsWith('/dashboard')) return 'dashboard'
    if (p.startsWith('/rankings')) return 'rankings'
    if (p.startsWith('/players')) return 'players'
    return 'games'
  })

  const isDashboard = $derived(active === 'dashboard')

  const isLight = $derived(store.data.settings.theme === 'light')
</script>

<svelte:head>
  <link rel="icon" href={favicon} />
</svelte:head>

<Topbar
  {tabs}
  {active}
  stats={[]}
  services={false}
  clock={false}
  sticky
  ariaLabel="Main navigation"
>
  {#snippet brand()}
    <span class="brand">geo<span class="brand-accent">ssoca</span></span>
  {/snippet}
  {#snippet userMenu()}
    <div class="chrome">
      <SegmentedControl
        label="Size"
        size="sm"
        value={store.data.settings.sizeVariant}
        options={[
          { value: 'md', label: 'M' },
          { value: 'lg', label: 'L' },
        ]}
        onChange={(v) => store.setSize(v as SizeVariant)}
      />
      <Switch
        checked={isLight}
        label="Light"
        onchange={(v) => store.setTheme(v ? 'light' : 'dark')}
      />
    </div>
  {/snippet}
</Topbar>

{#if isDashboard}
  <div class="fluid-shell">
    <main id="main" class="page">
      {@render children()}
    </main>
  </div>
{:else}
  <Container page>
    <main id="main" class="page">
      {@render children()}
    </main>
  </Container>
{/if}

<Toaster />

<style>
  .brand {
    font-family: var(--ss-font-display, var(--ss-font-mono));
    font-weight: 700;
    letter-spacing: 0.04em;
  }
  .brand-accent {
    color: var(--ss-primary);
  }
  .chrome {
    display: flex;
    align-items: center;
    gap: var(--ss-s-3, 12px);
  }
  .page {
    padding-block: var(--ss-s-6, 24px);
    display: flex;
    flex-direction: column;
    gap: var(--ss-block-gap, 32px);
  }
  /* Dashboard breaks out of the centered max-width Container to use the full
     viewport width, so its panels spread horizontally. */
  .fluid-shell {
    width: 100%;
    padding-inline: var(--ss-s-5, 20px);
  }
</style>
