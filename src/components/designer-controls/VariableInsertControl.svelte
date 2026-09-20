<script lang="ts">
  import * as fabric from "fabric";
  import { tr } from "$/utils/i18n";
  import MdIcon from "$/components/basic/MdIcon.svelte";
  import { fixedDropdown } from "$/utils/fixed_dropdown";
  import { csvVariableToken } from "$/utils/csv_source";
  import { getBoundText, setBoundText } from "$/utils/csv_preview";

  interface Props {
    selectedObject: fabric.FabricObject;
    valueUpdated: () => void;
    csvColumns?: string[];
    csvVariables?: { [key: string]: string };
  }

  let { selectedObject, valueUpdated, csvColumns = [], csvVariables }: Props = $props();

  const applyText = (next: string) => {
    if (selectedObject instanceof fabric.IText && selectedObject.isEditing) {
      selectedObject.exitEditing();
    }
    setBoundText(selectedObject, next, csvVariables);
    valueUpdated();
  };

  const insertToken = (token: string) => {
    applyText(`${getBoundText(selectedObject)}${token}`);
  };

  const insertDateTime = (format?: string) => {
    insertToken(format ? `{dt|${format}}` : "{dt}");
  };
</script>

<div class="btn-group btn-group-sm" role="group" title={$tr("params.variables.insert")}>
  <button
    class="btn btn-sm btn-secondary dropdown-toggle"
    data-bs-toggle="dropdown"
    data-bs-auto-close="outside"
    use:fixedDropdown>
    <MdIcon icon="data_object" />
  </button>

  <div class="dropdown-menu px-2 variable-menu">
    {#if csvColumns.length > 0}
      <div class="variable-menu__section">
        <div class="variable-menu__label">{$tr("params.variables.csv")}</div>
        <div class="d-flex gap-1 flex-wrap">
          {#each csvColumns as column (column)}
            <button
              type="button"
              class="btn btn-secondary btn-sm"
              onmousedown={(event) => {
                event.preventDefault();
                insertToken(csvVariableToken(column));
              }}>
              {column}
            </button>
          {/each}
        </div>
      </div>
    {/if}
    <div class="d-flex gap-1 flex-wrap">
      <button
        type="button"
        class="btn btn-secondary btn-sm"
        onmousedown={(event) => {
          event.preventDefault();
          insertDateTime();
        }}>
        <MdIcon icon="calendar_today" />
        {$tr("params.variables.insert.datetime")}
      </button>
      <button
        type="button"
        class="btn btn-secondary btn-sm"
        onmousedown={(event) => {
          event.preventDefault();
          insertDateTime("YYYY-MM-DD");
        }}>
        <MdIcon icon="calendar_today" />
        {$tr("params.variables.insert.date")}
      </button>
      <button
        type="button"
        class="btn btn-secondary btn-sm"
        onmousedown={(event) => {
          event.preventDefault();
          insertDateTime("HH:mm:ss");
        }}>
        <MdIcon icon="schedule" />
        {$tr("params.variables.insert.time")}
      </button>
    </div>
  </div>
</div>

<style>
  .variable-menu {
    min-width: 220px;
  }

  .variable-menu__section {
    margin-bottom: 8px;
    padding-bottom: 8px;
    border-bottom: 1px solid var(--ws-line);
  }

  .variable-menu__label {
    font-size: 11px;
    color: var(--ws-muted);
    margin-bottom: 6px;
  }
</style>
