<script lang="ts">
  import { Button, FileDrop, Modal, toast } from 'dssoca'
  import { store } from '$lib/store.svelte'
  import { downloadExport, readImportFile, applyImport, summarize } from '$lib/json'
  import type { ImportMode } from '$lib/json'
  import type { AppData } from '$lib/types'

  let pending = $state<AppData | null>(null)
  const summary = $derived(pending ? summarize(pending) : '')

  function exportNow() {
    try {
      // snapshot: store.data is a $state proxy, not structured-cloneable as-is
      downloadExport($state.snapshot(store.data))
      toast.success('Exported JSON')
    } catch (e) {
      toast.error(`Export failed: ${(e as Error).message}`)
    }
  }

  async function onfiles(files: File[]) {
    const file = files[0]
    if (!file) return
    try {
      const res = await readImportFile(file)
      if (res.ok) {
        pending = res.data
      } else {
        toast.error(res.error)
      }
    } catch (e) {
      toast.error(`Could not read file: ${(e as Error).message}`)
    }
  }

  function run(mode: ImportMode) {
    if (!pending) return
    try {
      // snapshot both sides to plain objects — applyImport deep-clones, which
      // throws on Svelte's $state proxies.
      const next = applyImport($state.snapshot(store.data), $state.snapshot(pending), mode)
      store.setData(next)
      toast.success(mode === 'replace' ? 'Data replaced' : 'Data merged')
      pending = null
    } catch (e) {
      toast.error(`Import failed: ${(e as Error).message}`)
    }
  }
</script>

<div class="port">
  <div class="export">
    <h3>Export</h3>
    <p class="hint">Download all data as a JSON file you keep on your PC.</p>
    <Button variant="secondary" onclick={exportNow}>Export JSON</Button>
  </div>

  <div class="import">
    <h3>Import</h3>
    <p class="hint">Load a previously exported file. You choose replace or merge.</p>
    <FileDrop
      label="Import JSON"
      accept="application/json,.json"
      {onfiles}
      hint="drag a file or click"
    />
  </div>
</div>

<Modal open={pending !== null} title="Import data" onclose={() => (pending = null)}>
  <p>Importing <strong>{summary}</strong>.</p>
  <p class="hint">
    <strong>Replace</strong> overwrites everything currently in this browser.
    <strong>Merge</strong> keeps both, combining by id (the imported file wins on conflicts).
  </p>
  {#snippet footer()}
    <Button variant="ghost" onclick={() => (pending = null)}>Cancel</Button>
    <Button variant="secondary" onclick={() => run('merge')}>Merge</Button>
    <Button variant="primary" onclick={() => run('replace')}>Replace</Button>
  {/snippet}
</Modal>

<style>
  .port {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
    gap: var(--ss-s-5, 20px);
  }
  h3 {
    font-family: var(--ss-font-subhead, var(--ss-font-mono));
    margin: 0 0 var(--ss-s-1, 4px);
  }
  .hint {
    color: var(--ss-fg-faint);
    font-size: var(--ss-ui-xs);
    margin: 0 0 var(--ss-s-3, 12px);
  }
</style>
