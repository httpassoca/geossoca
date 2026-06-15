<script lang="ts">
  import { Button, FileDrop, Modal, toast } from 'dssoca'
  import { store } from '$lib/store.svelte'
  import { downloadExport, readImportFile, applyImport, summarize } from '$lib/json'
  import type { ImportMode } from '$lib/json'
  import type { AppData } from '$lib/types'

  let pending = $state<AppData | null>(null)
  const summary = $derived(pending ? summarize(pending) : '')

  function exportNow() {
    downloadExport(store.data)
    toast.success('Exported JSON')
  }

  async function onfiles(files: File[]) {
    const file = files[0]
    if (!file) return
    const res = await readImportFile(file)
    if (res.ok) {
      pending = res.data
    } else {
      toast.error(res.error)
    }
  }

  function run(mode: ImportMode) {
    if (!pending) return
    store.setData(applyImport(store.data, pending, mode))
    toast.success(mode === 'replace' ? 'Data replaced' : 'Data merged')
    pending = null
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
