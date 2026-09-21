<script lang="ts">
  import AppModal from "$/components/basic/AppModal.svelte";
  import MdIcon from "$/components/basic/MdIcon.svelte";
  import { Button } from "$/components/ui";
  import { userFonts } from "$/stores";
  import { FileUtils } from "$/utils/file_utils";
  import { tr } from "$/utils/i18n";
  import { LocalStoragePersistence } from "$/utils/persistence";
  import { Toasts } from "$/utils/toasts";

  let show = $state<boolean>(false);
  let usedSpace = $state<number>(0);
  let selectExt = $state<"ttf" | "woff2">("ttf");
  let overrideFamily = $state<string>("");

  const calcUsedSpace = () => {
    usedSpace = LocalStoragePersistence.usedSpace();
  };

  const browseFont = async () => {
    const result = await FileUtils.pickAndReadBinaryFile(selectExt);

    let fontName = result.name.split(".")[0];
    const mime = `text/${selectExt}`;

    if (overrideFamily.trim() !== "") {
      fontName = overrideFamily.trim();
    }

    if ($userFonts.some((e) => e.family == fontName)) {
      Toasts.error(`${fontName} already loaded`);
      return;
    }

    const compressed = await FileUtils.compressData(result.data);
    const b64data = await FileUtils.base64buf(compressed);

    userFonts.update((prev) => [...prev, { gzippedDataB64: b64data, family: fontName, mimeType: mime }]);

    calcUsedSpace();
    overrideFamily = "";
  };

  const removeFont = (family: string) => {
    userFonts.update((prev) => prev.filter((e) => e.family !== family));
    calcUsedSpace();
  };

  $effect(() => {
    if (show) calcUsedSpace();
  });
</script>

<button
  type="button"
  class="workspace-icon-btn"
  onclick={() => {
    show = true;
  }}>
  <MdIcon icon="settings" />
</button>

{#if show}
  <AppModal title={$tr("fonts.title")} bind:show>
    <div class="font-list">
      {#each $userFonts as font (font.family)}
        <div class="ws-field-row">
          <span class="insp-field font-name" style="font-family: {font.family}">{font.family}</span>
          <Button onclick={() => removeFont(font.family)}>
            <MdIcon icon="delete" />
          </Button>
        </div>
      {:else}
        <p class="ws-help">{$tr("fonts.empty")}</p>
      {/each}
    </div>

    <div class="ws-field-row add-row">
      <span class="ws-suffix">{$tr("fonts.add")}</span>
      <select class="insp-field insp-select" bind:value={selectExt}>
        <option value="ttf">ttf</option>
        <option value="woff2">woff2</option>
      </select>
      <input class="insp-field" type="text" placeholder={$tr("fonts.title_override")} bind:value={overrideFamily} />
      <Button onclick={browseFont}>{$tr("fonts.browse")}</Button>
    </div>

    {#snippet footer()}
      <div class="ws-help">
        {usedSpace}
        {$tr("params.saved_labels.kb_used")} |
        <a href="https://fonts.google.com">{$tr("fonts.gfonts")}</a>
      </div>
    {/snippet}
  </AppModal>
{/if}

<style>
  .font-list {
    display: grid;
    gap: 8px;
    margin-bottom: 16px;
  }

  .font-name {
    display: flex;
    align-items: center;
  }

  .add-row {
    flex-wrap: wrap;
  }
</style>
