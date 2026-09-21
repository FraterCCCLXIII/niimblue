<script lang="ts">
  import { onDestroy } from "svelte";
  import AppModal from "$/components/basic/AppModal.svelte";
  import MdIcon from "$/components/basic/MdIcon.svelte";
  import { Button } from "$/components/ui";
  import { tr as translate } from "$/utils/i18n";
  import {
    parseCopyCount,
    rowMatchesQuery,
    type AdvancedPrintPlan,
    type CsvTable,
    type PrintQtyMode,
  } from "$/utils/csv_source";

  interface Props {
    show: boolean;
    table: CsvTable;
    selected: number[];
    quantities: number[];
    mode: PrintQtyMode;
    column?: string;
    sameQuantity: number;
    onCancel: () => void;
    onConfirm: (plan: AdvancedPrintPlan) => void;
  }

  let {
    show = $bindable(),
    table,
    selected,
    quantities,
    mode,
    column,
    sameQuantity,
    onCancel,
    onConfirm,
  }: Props = $props();

  let query = $state("");
  let selectedIds = $state<Set<number>>(new Set());
  let qtyMode = $state<PrintQtyMode>("same");
  let sameQty = $state(1);
  let rowQty = $state<number[]>([]);
  let qtyColumn = $state<string | undefined>(undefined);
  let menuOpen = $state(false);
  let columnMenuOpen = $state(false);
  let menuStyle = $state("");
  let columnMenuStyle = $state("");

  const syncFromProps = () => {
    selectedIds = new Set(selected.length > 0 ? selected : table.rows.map((_, index) => index));
    qtyMode = mode;
    sameQty = Math.max(1, sameQuantity);
    qtyColumn = column && table.columns.includes(column) ? column : undefined;
    rowQty = table.rows.map((row, index) => {
      const stored = quantities[index];
      if (stored != null && stored > 0) {
        return stored;
      }
      if (qtyMode === "column" && qtyColumn) {
        return Math.max(1, parseCopyCount(row[qtyColumn], 1));
      }
      return sameQty;
    });
    query = "";
    menuOpen = false;
    columnMenuOpen = false;
  };

  let wasOpen = $state(false);
  $effect(() => {
    if (show && !wasOpen) {
      syncFromProps();
    }
    wasOpen = show;
  });

  const visibleRows = $derived(
    table.rows
      .map((row, index) => ({ row, index }))
      .filter((item) => rowMatchesQuery(item.row, table.columns, query)),
  );
  const selectedCount = $derived(selectedIds.size);
  const allVisibleSelected = $derived(
    visibleRows.length > 0 && visibleRows.every((item) => selectedIds.has(item.index)),
  );
  const qtyLabel = $derived(
    qtyMode === "same"
      ? $translate("preview.advanced.qty.same")
      : qtyMode === "each"
        ? $translate("preview.advanced.qty.each")
        : qtyColumn || $translate("preview.advanced.qty.column"),
  );

  const qtyForRow = (index: number): number => {
    if (qtyMode === "same") {
      return Math.max(1, parseCopyCount(sameQty, 1));
    }
    if (qtyMode === "column" && qtyColumn) {
      return Math.max(1, parseCopyCount(table.rows[index]?.[qtyColumn], 1));
    }
    return Math.max(1, rowQty[index] ?? 1);
  };

  const setRowQty = (index: number, value: number) => {
    const next = [...rowQty];
    next[index] = Math.max(1, parseCopyCount(value, 1));
    rowQty = next;
  };

  const setMode = (next: PrintQtyMode, nextColumn?: string) => {
    if (next === "each" && qtyMode !== "each") {
      rowQty = table.rows.map((_, index) => qtyForRow(index));
    }
    qtyMode = next;
    qtyColumn = next === "column" ? nextColumn : undefined;
    menuOpen = false;
    columnMenuOpen = false;
  };

  const toggleAllVisible = () => {
    const next = new Set(selectedIds);
    if (allVisibleSelected) {
      for (const item of visibleRows) {
        next.delete(item.index);
      }
    } else {
      for (const item of visibleRows) {
        next.add(item.index);
      }
    }
    selectedIds = next;
  };

  const toggleRow = (index: number) => {
    const next = new Set(selectedIds);
    if (next.has(index)) {
      next.delete(index);
    } else {
      next.add(index);
    }
    selectedIds = next;
  };

  const closeMenus = () => {
    menuOpen = false;
    columnMenuOpen = false;
  };

  const toggleMenu = (event: MouseEvent) => {
    event.stopPropagation();
    const button = event.currentTarget as HTMLElement;
    const rect = button.getBoundingClientRect();
    menuStyle = `top:${Math.round(rect.bottom + 4)}px;right:${Math.round(window.innerWidth - rect.right)}px;`;
    menuOpen = !menuOpen;
    columnMenuOpen = false;
  };

  const openColumnMenu = (event: MouseEvent) => {
    event.stopPropagation();
    const item = event.currentTarget as HTMLElement;
    const rect = item.getBoundingClientRect();
    columnMenuStyle = `top:${Math.round(rect.top)}px;left:${Math.round(rect.right + 4)}px;`;
    columnMenuOpen = true;
  };

  const onDocumentPointer = (event: PointerEvent) => {
    const target = event.target as HTMLElement | null;
    if (target?.closest(".adv-print__qty-menu, .adv-print__menu, .adv-print__submenu")) {
      return;
    }
    closeMenus();
  };

  $effect(() => {
    if (!menuOpen && !columnMenuOpen) {
      return;
    }
    document.addEventListener("pointerdown", onDocumentPointer, true);
    return () => document.removeEventListener("pointerdown", onDocumentPointer, true);
  });

  onDestroy(closeMenus);

  const confirm = () => {
    const ordered = table.rows.map((_, index) => index).filter((index) => selectedIds.has(index));
    onConfirm({
      selected: ordered,
      quantities: ordered.map((index) => qtyForRow(index)),
      mode: qtyMode,
      column: qtyColumn,
    });
  };
</script>

{#if show}
  <AppModal
    bind:show
    title={$translate("params.csv.select_title")}
    size="xl"
    scroll={false}
    stack
    onClose={onCancel}>
    <div class="adv-print">
      <div class="adv-print__toolbar">
        <p>
          {$translate("params.csv.select_title")}
          <span>({$translate("params.csv.selected")} {selectedCount}/{table.rows.length})</span>
        </p>
        <label class="adv-print__search">
          <MdIcon icon="search" />
          <input type="search" bind:value={query} placeholder={$translate("params.csv.search")} />
        </label>
      </div>

      <div class="adv-print__table-wrap">
        <table class="adv-print__table">
          <thead>
            <tr>
              <th class="adv-print__check">
                <input
                  type="checkbox"
                  checked={allVisibleSelected}
                  disabled={visibleRows.length === 0}
                  onchange={toggleAllVisible}
                  aria-label={$translate("params.csv.select_all")} />
              </th>
              {#each table.columns as columnName (columnName)}
                <th>{columnName}</th>
              {/each}
              <th class="adv-print__qty-col">
                <div class="adv-print__qty-head">
                  <div class="adv-print__qty-menu">
                    <button type="button" class="adv-print__qty-trigger" onclick={toggleMenu}>
                      <span>{qtyLabel}</span>
                      <MdIcon icon="expand_more" />
                    </button>
                  </div>
                  {#if qtyMode === "same"}
                    <input
                      class="adv-print__qty-input"
                      type="number"
                      min="1"
                      max="999"
                      bind:value={sameQty}
                      oninput={() => {
                        sameQty = Math.max(1, parseCopyCount(sameQty, 1));
                      }}
                      aria-label={$translate("preview.advanced.qty.same")} />
                  {/if}
                </div>
              </th>
            </tr>
          </thead>
          <tbody>
            {#each visibleRows as item (item.index)}
              <tr class:is-selected={selectedIds.has(item.index)}>
                <td class="adv-print__check">
                  <input
                    type="checkbox"
                    checked={selectedIds.has(item.index)}
                    onchange={() => toggleRow(item.index)}
                    aria-label={item.row[table.columns[0]] ?? `${item.index + 1}`} />
                </td>
                {#each table.columns as columnName (columnName)}
                  <td>{item.row[columnName]}</td>
                {/each}
                <td class="adv-print__qty-col">
                  {#if qtyMode === "each"}
                    <input
                      class="adv-print__qty-input"
                      type="number"
                      min="1"
                      max="999"
                      value={qtyForRow(item.index)}
                      oninput={(event) => setRowQty(item.index, Number((event.currentTarget as HTMLInputElement).value))}
                      aria-label={$translate("preview.copies")} />
                  {:else}
                    <span class="adv-print__qty-value">{qtyForRow(item.index)}</span>
                  {/if}
                </td>
              </tr>
            {/each}
          </tbody>
        </table>
      </div>
    </div>

    {#snippet footer()}
      <div class="adv-print__footer">
        <Button onclick={onCancel}>{$translate("params.csv.cancel")}</Button>
        <Button variant="primary" disabled={selectedCount === 0} onclick={confirm}>
          {$translate("params.csv.confirm")}
        </Button>
      </div>
    {/snippet}
  </AppModal>
{/if}

{#if menuOpen}
  <div class="adv-print__menu" style={menuStyle} role="menu">
    <button
      type="button"
      class="adv-print__menu-item"
      class:is-active={qtyMode === "same"}
      onclick={() => setMode("same")}>
      {$translate("preview.advanced.qty.same")}
    </button>
    <button
      type="button"
      class="adv-print__menu-item"
      class:is-active={qtyMode === "each"}
      onclick={() => setMode("each")}>
      {$translate("preview.advanced.qty.each")}
    </button>
    <button
      type="button"
      class="adv-print__menu-item adv-print__menu-item--sub"
      class:is-active={qtyMode === "column"}
      title={$translate("preview.advanced.qty.column_hint")}
      onpointerenter={openColumnMenu}
      onclick={openColumnMenu}>
      <span>{$translate("preview.advanced.qty.column")}</span>
      <MdIcon icon="chevron_right" />
    </button>
  </div>
{/if}

{#if columnMenuOpen}
  <div class="adv-print__submenu" style={columnMenuStyle} role="menu">
    {#each table.columns as columnName (columnName)}
      <button
        type="button"
        class="adv-print__menu-item"
        class:is-active={qtyMode === "column" && qtyColumn === columnName}
        onclick={() => setMode("column", columnName)}>
        {columnName}
      </button>
    {/each}
  </div>
{/if}

<style>
  .adv-print {
    display: flex;
    flex-direction: column;
    gap: 12px;
    min-height: min(60vh, 520px);
  }

  .adv-print__toolbar {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 12px 16px;
  }

  .adv-print__toolbar p {
    margin: 0;
    margin-right: auto;
    font-size: 14px;
    color: var(--ws-text);
  }

  .adv-print__toolbar p span {
    color: var(--ws-muted);
  }

  .adv-print__search {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    min-height: 36px;
    padding: 0 12px;
    border: 1px solid var(--ws-line-strong);
    border-radius: 999px;
    background: var(--ws-surface);
  }

  .adv-print__search input {
    border: 0;
    outline: none;
    background: transparent;
    min-width: 140px;
    font-size: 13px;
  }

  .adv-print__table-wrap {
    overflow: auto;
    border: 1px solid var(--ws-line);
    border-radius: 12px;
    max-height: min(56vh, 480px);
  }

  .adv-print__table {
    width: 100%;
    border-collapse: collapse;
    font-size: 13px;
  }

  .adv-print__table th,
  .adv-print__table td {
    padding: 10px 14px;
    border-bottom: 1px solid var(--ws-line);
    text-align: left;
    white-space: nowrap;
  }

  .adv-print__table thead th {
    position: sticky;
    top: 0;
    z-index: 1;
    background: #f7f7f8;
    font-weight: 600;
  }

  .adv-print__table tbody tr:last-child td {
    border-bottom: 0;
  }

  .adv-print__table tbody tr.is-selected td {
    background: #fff;
  }

  .adv-print__check {
    width: 42px;
  }

  .adv-print__qty-col {
    position: sticky;
    right: 0;
    min-width: 148px;
    background: #f7f7f8;
    box-shadow: -8px 0 8px -8px rgba(17, 17, 17, 0.12);
  }

  .adv-print__table tbody .adv-print__qty-col {
    background: #fff;
  }

  .adv-print__qty-head {
    display: flex;
    align-items: center;
    justify-content: flex-end;
    gap: 8px;
  }

  .adv-print__qty-trigger {
    display: inline-flex;
    align-items: center;
    gap: 2px;
    max-width: 168px;
    padding: 0;
    border: 0;
    background: transparent;
    color: var(--ws-text);
    font-size: 13px;
    font-weight: 600;
  }

  .adv-print__qty-trigger span {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .adv-print__qty-input {
    width: 64px;
    min-height: 32px;
    padding: 0 8px;
    border: 1px solid var(--ws-line-strong);
    border-radius: 999px;
    background: var(--ws-surface);
    color: var(--ws-text);
    text-align: center;
    font-size: 13px;
  }

  .adv-print__qty-value {
    display: inline-flex;
    min-width: 24px;
    justify-content: center;
  }

  .adv-print__footer {
    display: flex;
    justify-content: flex-end;
    gap: 8px;
    width: 100%;
  }

  .adv-print__menu,
  .adv-print__submenu {
    position: fixed;
    z-index: 1080;
    min-width: 220px;
    padding: 6px;
    border: 1px solid var(--ws-line);
    border-radius: 12px;
    background: var(--ws-surface);
    box-shadow: var(--ws-shadow);
  }

  .adv-print__menu-item {
    display: flex;
    align-items: center;
    justify-content: space-between;
    width: 100%;
    min-height: 36px;
    padding: 0 10px;
    border: 0;
    border-radius: 8px;
    background: transparent;
    color: var(--ws-text);
    text-align: left;
    font-size: 13px;
  }

  .adv-print__menu-item:hover,
  .adv-print__menu-item:focus {
    background: var(--ws-hover);
  }

  .adv-print__menu-item.is-active {
    color: var(--ws-accent);
    font-weight: 600;
  }
</style>
