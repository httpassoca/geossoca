<script lang="ts">
  import 'dssoca/theme.css'
  import favicon from '$lib/assets/favicon.svg'
  import { Topbar, Toaster, Container, Switch } from 'dssoca'
  import { page } from '$app/state'
  import { store } from '$lib/store.svelte'

  let { children } = $props()

  const tabs = [
    { id: 'games', label: 'Games', href: '/' },
    { id: 'rankings', label: 'Rankings', href: '/rankings' },
    { id: 'players', label: 'Players', href: '/players' },
    { id: 'charts', label: 'Charts', href: '/charts' },
  ]

  const active = $derived.by(() => {
    const p = page.url.pathname
    if (p.startsWith('/rankings')) return 'rankings'
    if (p.startsWith('/players')) return 'players'
    if (p.startsWith('/charts')) return 'charts'
    return 'games'
  })

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
    <Switch
      checked={isLight}
      label="Light"
      onchange={(v) => store.setTheme(v ? 'light' : 'dark')}
    />
  {/snippet}
</Topbar>

<Container page>
  <main id="main" class="page">
    {@render children()}
  </main>
</Container>

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
  .page {
    padding-block: var(--ss-s-6, 24px);
    display: flex;
    flex-direction: column;
    gap: var(--ss-block-gap, 32px);
  }
</style>
