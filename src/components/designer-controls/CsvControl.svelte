<script lang="ts">
  import { csvData } from "$/stores";
  import { Toasts } from "$/utils/toasts";
  import { tr } from "$/utils/i18n";
  import {
    CSV_FIELD_MIME,
    csvFileTitle,
    csvVariableToken,
    parseCsvTable,
    serializeCsvTable,
    type CsvImportResult,
    type CsvTable,
  } from "$/utils/csv_source";
  import MdIcon from "$/components/basic/MdIcon.svelte";
  import CsvImportModal from "$/components/designer-controls/CsvImportModal.svelte";

  interface Props {
    enabled: boolean;
    onPlaceholderPicked: (name: string) => void;
    onImported?: () => void;
    onCleared?: () => void;
  }

  let { enabled = $bindable(), onPlaceholderPicked, onImported, onCleared }: Props = $props();

  let fileInput: HTMLInputElement | undefined = $state();
  let showTable = $state(false);
  let pendingTable = $state<CsvTable>({ columns: [], rows: [] });
  let pendingName = $state("");
  let pendingSource = $state("");
  let pendingSelected = $state<number[]>([]);
  let pendingPrintNames = $state(false);

  const table = $derived(parseCsvTable($csvData.data));
  const columns = $derived(table.columns);

  const openPicker = () => {
    fileInput?.click();
  };

  const openCurrentTable = () => {
    const source = $csvData.sourceData ?? $csvData.data;
    const parsed = parseCsvTable(source);
    if (parsed.columns.length === 0 || parsed.rows.length === 0) {
      openPicker();
      return;
    }
    pendingName = $csvData.name ?? "";
    pendingSource = source;
    pendingTable = parsed;
    pendingSelected =
      $csvData.selected?.filter((index) => index >= 0 && index < parsed.rows.length) ??
      parsed.rows.map((_, index) => index);
    pendingPrintNames = !!$csvData.printColumnNames;
    showTable = true;
  };

  const onFileChosen = async (event: Event) => {
    const input = event.currentTarget as HTMLInputElement;
    const file = input.files?.[0];
    input.value = "";
    if (!file) {
      return;
    }

    try {
      const text = await file.text();
      const parsed = parseCsvTable(text);
      if (parsed.columns.length === 0 || parsed.rows.length === 0) {
        Toasts.error($tr("params.csv.empty"));
        return;
      }
      pendingName = csvFileTitle(file.name);
      pendingSource = text;
      pendingTable = parsed;
      pendingSelected = parsed.rows.map((_, index) => index);
      pendingPrintNames = !!$csvData.printColumnNames;
      showTable = true;
    } catch (error) {
      Toasts.error(error instanceof Error ? error.message : $tr("params.csv.invalid"));
    }
  };

  const closeTable = () => {
    showTable = false;
  };

  const confirmTable = (result: CsvImportResult) => {
    const rows = result.selected
      .map((index) => result.table.rows[index])
      .filter((row): row is NonNullable<typeof row> => !!row);
    const sourceData = serializeCsvTable(result.table.columns, result.table.rows);
    $csvData = {
      data: serializeCsvTable(result.table.columns, rows),
      sourceData,
      name: pendingName,
      selected: result.selected,
      printColumnNames: result.printColumnNames,
    };
    pendingTable = result.table;
    pendingSource = sourceData;
    pendingSelected = result.selected;
    pendingPrintNames = result.printColumnNames;
    enabled = true;
    showTable = false;
    onImported?.();
  };

  const clearSource = () => {
    enabled = false;
    onCleared?.();
  };

  const onFieldDragStart = (event: DragEvent, name: string) => {
    if (!event.dataTransfer) {
      return;
    }
    event.dataTransfer.setData(CSV_FIELD_MIME, name);
    event.dataTransfer.setData("text/plain", csvVariableToken(name));
    event.dataTransfer.effectAllowed = "copy";
  };
</script>

<input
  bind:this={fileInput}
  class="csv-file-input"
  type="file"
  accept=".csv,text/csv"
  onchange={(event) => void onFileChosen(event)} />

{#if !enabled || columns.length === 0}
  <button type="button" class="ws-btn" onclick={openPicker}>
    {$tr("editor.data_source.import")}
  </button>
  <p>{$tr("editor.data_source.help")}</p>
{:else}
  <div class="csv-source">
    <div class="csv-source__head">
      <strong>{$csvData.name || $tr("editor.data_source.csv")}</strong>
      <button type="button" class="csv-source__link" onclick={clearSource}>{$tr("params.csv.cancel")}</button>
    </div>
    <button type="button" class="csv-source__card" onclick={openPicker}>
      <span>{$csvData.name || $tr("editor.data_source.csv")}</span>
      <MdIcon icon="swap_horiz" />
    </button>
    <button type="button" class="csv-source__card" onclick={openCurrentTable}>
      <span>{table.rows.length} {$tr("params.csv.rows_selected")}</span>
      <MdIcon icon="chevron_right" />
    </button>
    <p>{$tr("params.csv.drag_fields")}</p>
    <div class="csv-fields">
      {#each columns as column (column)}
        <button
          type="button"
          class="csv-field"
          draggable="true"
          ondragstart={(event) => onFieldDragStart(event, column)}
          onclick={() => onPlaceholderPicked(column)}>
          <MdIcon icon="tag" />
          <span>{column}</span>
          <MdIcon icon="density_medium" />
        </button>
      {/each}
    </div>
  </div>
{/if}

<CsvImportModal
  bind:show={showTable}
  table={pendingTable}
  selected={pendingSelected}
  printColumnNames={pendingPrintNames}
  onCancel={closeTable}
  onConfirm={confirmTable} />

<style>
  .csv-file-input {
    display: none;
  }

  .csv-source,
  .csv-fields {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .csv-source__head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
  }

  .csv-source__head strong {
    font-size: 13px;
    font-weight: 600;
  }

  .csv-source__link {
    appearance: none;
    border: 0;
    background: transparent;
    color: var(--ws-accent);
    font-size: 12px;
    padding: 0;
  }

  .csv-source__card,
  .csv-field {
    appearance: none;
    width: 100%;
    border: 1px solid var(--ws-line);
    border-radius: 10px;
    background: #f7f9fc;
    color: var(--ws-text);
    min-height: 40px;
    padding: 8px 12px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
    font-size: 13px;
    text-align: left;
  }

  .csv-field {
    cursor: grab;
  }

  .csv-field span {
    flex: 1;
  }

  p {
    color: var(--ws-muted);
    font-size: 12px;
    margin: 0;
  }
</style>
