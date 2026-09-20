<script lang="ts">
  import { tr } from "$/utils/i18n";
  import { csvParse } from "d3-dsv";
  import { type CsvParams } from "$/types";
  import { csvData } from "$/stores";
  import AppModal from "$/components/basic/AppModal.svelte";

  interface Props {
    enabled: boolean;
    onPlaceholderPicked: (name: string) => void;
  }

  let { enabled = $bindable(), onPlaceholderPicked }: Props = $props();

  let show = $state(false);
  let placeholders = $state<string[]>([]);
  let rows = $state<number>(0);

  const parse = (csv: CsvParams) => {
    const result = csvParse(csv.data);
    placeholders = result.columns;
    rows = result.length;
  };

  $effect(() => {
    parse($csvData);
  });
</script>

<button type="button" class="ws-btn" onclick={() => (show = true)}>
  {$tr("editor.data_source.import")}
</button>

{#if show}
  <AppModal bind:show title={$tr("params.csv.title")}>
    <label class="ws-check">
      <input type="checkbox" bind:checked={enabled} />
      <span>{$tr("params.csv.enabled")}</span>
    </label>

    <p class="ws-help">{$tr("params.csv.tip")}</p>

    <textarea class="insp-field insp-textarea dsv" bind:value={$csvData.data} oninput={() => (enabled = true)}></textarea>

    <p class="ws-help">
      {$tr("params.csv.rowsfound")}
      <strong>{rows}</strong>
    </p>
    <div class="placeholders">
      <span class="ws-help">{$tr("params.csv.placeholders")}</span>
      {#each placeholders as placeholder (placeholder)}
        <button type="button" class="ws-btn" onclick={() => onPlaceholderPicked(placeholder)}>
          {`{${placeholder}}`}
        </button>
      {/each}
    </div>

    {#snippet footer()}
      <button type="button" class="ws-btn ws-btn-primary" onclick={() => (show = false)}>
        {$tr("params.csv.done")}
      </button>
    {/snippet}
  </AppModal>
{/if}

<style>
  textarea.dsv {
    font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
    min-height: 220px;
    width: 100%;
    resize: vertical;
  }

  .placeholders {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 8px;
  }
</style>
