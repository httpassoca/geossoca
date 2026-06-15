<script lang="ts">
  import { Heading, Input, Button, Card, Avatar, Tooltip, Modal, EmptyState, toast } from 'dssoca'
  import { store } from '$lib/store.svelte'
  import DataPort from '$lib/components/DataPort.svelte'
  import type { Player } from '$lib/types'

  let newName = $state('')
  let editing = $state<Player | undefined>(undefined)
  let editName = $state('')

  function add() {
    const name = newName.trim()
    if (!name) return
    store.addPlayer(name)
    toast.success(`Added ${name}`)
    newName = ''
  }

  function openRename(p: Player) {
    editing = p
    editName = p.name
  }
  function saveRename() {
    if (editing && editName.trim()) {
      store.renamePlayer(editing.id, editName)
      toast.success('Renamed')
    }
    editing = undefined
  }

  function remove(p: Player) {
    if (store.deletePlayer(p.id)) toast.success(`Removed ${p.name}`)
  }
</script>

<svelte:head><title>Players — geossoca</title></svelte:head>

<Heading level={1}>Players</Heading>

<form
  class="add"
  onsubmit={(e) => {
    e.preventDefault()
    add()
  }}
>
  <Input label="Add player" bind:value={newName} placeholder="Name" />
  <Button type="submit" variant="primary" disabled={!newName.trim()}>Add</Button>
</form>

{#if store.data.players.length === 0}
  <EmptyState title="No players yet" message="Add the people you play with." icon="∅" />
{:else}
  <section class="list">
    {#each store.data.players as p (p.id)}
      {@const referenced = store.isPlayerReferenced(p.id)}
      <Card title={p.name}>
        {#snippet media()}<Avatar name={p.name} />{/snippet}
        {#snippet action()}
          <div class="row-actions">
            <Button variant="ghost" size="sm" onclick={() => openRename(p)}>Rename</Button>
            {#if referenced}
              <Tooltip text="Has recorded games — can't be deleted">
                <Button variant="ghost" size="sm" disabled>Delete</Button>
              </Tooltip>
            {:else}
              <Button variant="ghost" size="sm" onclick={() => remove(p)}>Delete</Button>
            {/if}
          </div>
        {/snippet}
        <span class="meta">
          {referenced ? 'in the rankings' : 'no games yet'}
        </span>
      </Card>
    {/each}
  </section>
{/if}

<section class="data">
  <Heading level={2} size="sm">Data</Heading>
  <p class="lede">
    Everything lives in this browser. Export to back it up or move it; import to restore.
  </p>
  <DataPort />
</section>

<Modal open={editing !== undefined} title="Rename player" onclose={() => (editing = undefined)}>
  <Input label="Name" bind:value={editName} />
  {#snippet footer()}
    <Button variant="ghost" onclick={() => (editing = undefined)}>Cancel</Button>
    <Button variant="primary" disabled={!editName.trim()} onclick={saveRename}>Save</Button>
  {/snippet}
</Modal>

<style>
  .add {
    display: flex;
    align-items: flex-end;
    gap: var(--ss-s-2, 8px);
  }
  .add :global(.ss-field) {
    flex: 1;
    max-width: 320px;
  }
  .list {
    display: flex;
    flex-direction: column;
    gap: var(--ss-s-2, 8px);
  }
  .row-actions {
    display: flex;
    gap: var(--ss-s-1, 4px);
  }
  .meta {
    color: var(--ss-fg-faint);
    font-size: var(--ss-ui-xs);
    font-family: var(--ss-font-mono);
  }
  .data {
    display: flex;
    flex-direction: column;
    gap: var(--ss-s-2, 8px);
    border-top: 1px solid var(--ss-line);
    padding-top: var(--ss-s-5, 20px);
  }
  .lede {
    color: var(--ss-fg-muted);
    margin: 0 0 var(--ss-s-2, 8px);
  }
</style>
