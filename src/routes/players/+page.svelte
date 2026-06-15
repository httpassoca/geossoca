<script lang="ts">
  import { Heading, Input, Button, Table, Tooltip, Modal, EmptyState, toast } from 'dssoca'
  import type { TableColumn } from 'dssoca'
  import { store } from '$lib/store.svelte'
  import PlayerTag from '$lib/components/PlayerTag.svelte'
  import DataPort from '$lib/components/DataPort.svelte'
  import { reveal } from '$lib/motion'
  import type { Player } from '$lib/types'

  let newName = $state('')
  let editing = $state<Player | undefined>(undefined)
  let editName = $state('')
  let editColor = $state('')

  const rows = $derived(
    store.data.players.map((p) => ({
      ...p,
      games: store.data.games.filter((g) => g.entries.some((e) => e.playerId === p.id)).length,
      referenced: store.isPlayerReferenced(p.id),
    })),
  )

  function add() {
    const name = newName.trim()
    if (!name) return
    store.addPlayer(name)
    toast.success(`Added ${name}`)
    newName = ''
  }

  function openEdit(p: Player) {
    editing = p
    editName = p.name
    editColor = p.color
  }
  function saveEdit() {
    if (editing && editName.trim()) {
      store.renamePlayer(editing.id, editName)
      store.setPlayerColor(editing.id, editColor)
      toast.success('Saved')
    }
    editing = undefined
  }

  function remove(p: { id: string; name: string }) {
    if (store.deletePlayer(p.id)) toast.success(`Removed ${p.name}`)
  }
</script>

<svelte:head><title>Players — geossoca</title></svelte:head>

<Heading level={1}>Players</Heading>

<form
  class="add"
  in:reveal={{ y: 10 }}
  onsubmit={(e) => {
    e.preventDefault()
    add()
  }}
>
  <Input label="Add player" bind:value={newName} placeholder="Name" />
  <Button type="submit" variant="primary" disabled={!newName.trim()}>Add</Button>
</form>

{#snippet playerCell(row: any)}
  <span class="player">
    <PlayerTag name={row.name} color={row.color} />
    {row.name}
  </span>
{/snippet}

{#snippet colorCell(row: any)}
  <button
    type="button"
    class="swatch"
    style="background:{row.color}"
    title={row.color}
    aria-label="Edit colour for {row.name}"
    onclick={() => openEdit(row)}
  ></button>
{/snippet}

{#snippet actionsCell(row: any)}
  <span class="row-actions">
    <Button variant="ghost" size="sm" onclick={() => openEdit(row)}>Rename</Button>
    {#if row.referenced}
      <Tooltip text="Has recorded games — can't be deleted">
        <Button variant="ghost" size="sm" disabled>Delete</Button>
      </Tooltip>
    {:else}
      <Button variant="ghost" size="sm" onclick={() => remove(row)}>Delete</Button>
    {/if}
  </span>
{/snippet}

{#if store.data.players.length === 0}
  <div in:reveal={{ y: 10, delay: 60 }}>
    <EmptyState title="No players yet" message="Add the people you play with." icon="∅" />
  </div>
{:else}
  <section class="list" in:reveal={{ y: 10, delay: 60 }}>
    <Table
      getRowKey={(row) => row.id}
      {rows}
      columns={[
        { key: 'name', label: 'Player', cell: playerCell },
        { key: 'color', label: 'Colour', cell: colorCell },
        { key: 'games', label: 'Games', numeric: true },
        { key: 'actions', label: '', cell: actionsCell },
      ] satisfies TableColumn[]}
    />
  </section>
{/if}

<section class="data" in:reveal={{ y: 10, delay: 120 }}>
  <Heading level={2} size="sm">Data</Heading>
  <p class="lede">
    Everything lives in this browser. Export to back it up or move it; import to restore.
  </p>
  <DataPort />
</section>

<Modal open={editing !== undefined} title="Edit player" onclose={() => (editing = undefined)}>
  <Input label="Name" bind:value={editName} />
  <label class="color-field">
    <span class="color-label">Colour</span>
    <input type="color" bind:value={editColor} />
  </label>
  {#snippet footer()}
    <Button variant="ghost" onclick={() => (editing = undefined)}>Cancel</Button>
    <Button variant="primary" disabled={!editName.trim()} onclick={saveEdit}>Save</Button>
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
    display: block;
  }
  .player {
    display: inline-flex;
    align-items: center;
    gap: var(--ss-s-2, 8px);
  }
  .swatch {
    width: 22px;
    height: 22px;
    padding: 0;
    border: 1px solid var(--ss-line);
    border-radius: 0;
    cursor: pointer;
  }
  .row-actions {
    display: inline-flex;
    gap: var(--ss-s-1, 4px);
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
  .color-field {
    display: flex;
    align-items: center;
    gap: var(--ss-s-2, 8px);
    margin-top: var(--ss-s-2, 8px);
  }
  .color-label {
    color: var(--ss-fg-muted);
    font-size: var(--ss-ui-xs);
  }
  .color-field input[type='color'] {
    width: 44px;
    height: 28px;
    padding: 0;
    border: 1px solid var(--ss-line);
    border-radius: 0;
    background: none;
    cursor: pointer;
  }
</style>
