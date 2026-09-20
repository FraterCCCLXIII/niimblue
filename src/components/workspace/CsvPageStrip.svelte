<script lang="ts">
  import type { FabricJson, LabelProps } from "$/types";
  import type { CsvRow } from "$/utils/csv_source";
  import { renderCsvPageThumbnail } from "$/utils/label_preview";
  import MdIcon from "$/components/basic/MdIcon.svelte";
  import { tr } from "$/utils/i18n";

  interface Props {
    rows: CsvRow[];
    page: number;
    labelProps: LabelProps;
    revision: number;
    getTemplate: (page: number) => FabricJson;
    onSelect: (page: number) => void;
  }

  let { rows, page, labelProps, revision, getTemplate, onSelect }: Props = $props();

  let scroller: HTMLDivElement | undefined = $state();
  let thumbs = $state<Record<number, string>>({});
  let renderToken = 0;

  const pageCount = $derived(rows.length);
  const aspect = $derived(`${Math.max(labelProps.size.width, 1)} / ${Math.max(labelProps.size.height, 1)}`);

  const scrollToPage = (index: number) => {
    const node = scroller?.querySelector<HTMLElement>(`[data-page='${index}']`);
    node?.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
  };

  const selectPage = (index: number) => {
    onSelect(Math.max(0, Math.min(pageCount - 1, index)));
  };

  $effect(() => {
    page;
    queueMicrotask(() => scrollToPage(page));
  });

  $effect(() => {
    const currentRows = rows;
    const currentLabel = labelProps;
    revision;
    if (currentRows.length === 0) {
      thumbs = {};
      return;
    }

    const token = ++renderToken;
    let cancelled = false;
    const next: Record<number, string> = {};
    const timer = window.setTimeout(() => {
      if (cancelled || token !== renderToken) {
        return;
      }
      void render();
    }, 200);

    const render = async () => {
      for (let index = 0; index < currentRows.length; index++) {
        if (cancelled || token !== renderToken) {
          return;
        }
        try {
          next[index] = await renderCsvPageThumbnail(getTemplate(index), currentLabel, currentRows[index]);
          if (!cancelled && token === renderToken) {
            thumbs = { ...next };
          }
        } catch {
          // Keep the numbered card if a preview fails.
        }
        await new Promise((resolve) => requestAnimationFrame(() => resolve(undefined)));
      }
    };

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  });
</script>

<div class="csv-pages">
  <div class="csv-pages__count">{page + 1}/{pageCount}</div>
  <button type="button" class="csv-pages__nav" disabled={page <= 0} onclick={() => selectPage(page - 1)} aria-label={$tr("editor.page.prev")}>
    <MdIcon icon="chevron_left" />
  </button>
  <div class="csv-pages__scroller" bind:this={scroller}>
    {#each rows as _, index (index)}
      <button
        type="button"
        class="csv-pages__item"
        class:is-active={index === page}
        data-page={index}
        onclick={() => selectPage(index)}>
        <span class="csv-pages__thumb" style={`aspect-ratio: ${aspect}`}>
          {#if thumbs[index]}
            <img src={thumbs[index]} alt="" />
          {/if}
        </span>
        <span class="csv-pages__num">{index + 1}</span>
      </button>
    {/each}
  </div>
  <button
    type="button"
    class="csv-pages__nav"
    disabled={page >= pageCount - 1}
    onclick={() => selectPage(page + 1)}
    aria-label={$tr("editor.page.next")}>
    <MdIcon icon="chevron_right" />
  </button>
</div>

<style>
  .csv-pages {
    display: grid;
    grid-template-columns: auto auto 1fr auto;
    align-items: center;
    gap: 8px;
    padding: 10px 16px 12px;
    border-top: 1px solid var(--ws-line);
    background: #fafafa;
    min-height: 0;
  }

  .csv-pages__count {
    min-width: 44px;
    color: var(--ws-muted);
    font-size: 13px;
  }

  .csv-pages__nav {
    appearance: none;
    width: 32px;
    height: 32px;
    border: 1px solid var(--ws-line-strong);
    border-radius: 999px;
    background: #fff;
    color: var(--ws-text);
    display: inline-flex;
    align-items: center;
    justify-content: center;
  }

  .csv-pages__nav:disabled {
    opacity: 0.35;
  }

  .csv-pages__scroller {
    display: flex;
    align-items: flex-end;
    gap: 16px;
    overflow-x: auto;
    padding: 4px 8px 0;
    scrollbar-width: thin;
  }

  .csv-pages__item {
    appearance: none;
    border: 0;
    background: transparent;
    padding: 0;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 6px;
    flex: 0 0 auto;
  }

  .csv-pages__thumb {
    width: 112px;
    max-width: 18vw;
    background: #f3f3f3;
    border: 2px solid transparent;
    border-radius: 12px;
    overflow: hidden;
    box-shadow: 0 1px 4px rgba(17, 17, 17, 0.06);
  }

  .csv-pages__item.is-active .csv-pages__thumb {
    border-color: var(--ws-accent);
  }

  .csv-pages__thumb img {
    display: block;
    width: 100%;
    height: 100%;
    object-fit: contain;
    background: #fff;
  }

  .csv-pages__num {
    font-size: 12px;
    color: var(--ws-muted);
  }

  .csv-pages__item.is-active .csv-pages__num {
    color: var(--ws-accent);
  }
</style>
