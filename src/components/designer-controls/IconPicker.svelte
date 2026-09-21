<script lang="ts">
  import { tr } from "$/utils/i18n";
  import MdIcon from "$/components/basic/MdIcon.svelte";
  import CustomScroll from "$/components/basic/CustomScroll.svelte";
  import { Button, InputAddon, InputGroup, Menu, SelectField, TextField } from "$/components/ui";
  import { appConfig, userIcons } from "$/stores";
  import { FileUtils } from "$/utils/file_utils";
  import { Toasts } from "$/utils/toasts";
  import { getLucidePackNames, lucideIconToSvg, lucideSearchKey } from "$/utils/lucide_icons";

  interface Props {
    onSubmitSvg: (i: string) => void;
  }

  let { onSubmitSvg }: Props = $props();

  let iconNames = $state<string[]>([]);
  let search = $state<string>("");
  let deleteMode = $state<boolean>(false);

  const visiblePackIcons = $derived.by(() => {
    const query = search.trim().toLowerCase();
    const filtered = query
      ? iconNames.filter((name) => lucideSearchKey(name).includes(query) || name.toLowerCase().includes(query))
      : iconNames;
    return filtered.slice(0, 240);
  });

  const onShow = () => {
    if (iconNames.length === 0) {
      iconNames = getLucidePackNames();
    }
  };

  const addOwn = async () => {
    try {
      let counter = 0;
      const xmls = await FileUtils.pickAndReadTextFile("svg", true);
      const iconsToAdd = xmls.map((xml) => ({
        name: `i_${FileUtils.timestampFloat()}_${counter++}`,
        data: xml,
      }));

      userIcons.update((prev) => [...prev, ...iconsToAdd]);
    } catch (e) {
      Toasts.error(e);
    }
  };

  const svgClicked = (name: string, data: string) => {
    if (deleteMode) {
      userIcons.update((prev) => prev.filter((e) => e.name !== name));
      return;
    }

    onSubmitSvg(data);
  };

  const packClicked = (name: string) => {
    if (deleteMode) {
      return;
    }

    onSubmitSvg(lucideIconToSvg(name, "#000000"));
  };
</script>

<Menu closeOnSelect={false} onOpen={onShow} class="w-[min(100vw,450px)] p-0">
  {#snippet trigger({ toggle })}
    <Button size="sm" pill={false} onclick={toggle}>
      <MdIcon icon="emoji_emotions" />
    </Button>
  {/snippet}
  <h6 class="px-3 pt-3 text-[11px] font-semibold tracking-wide text-muted uppercase">{$tr("editor.iconpicker.title")}</h6>
  <div class="flex flex-col gap-2 p-3">
    <TextField
      disabled={$appConfig.iconListMode === "user"}
      placeholder={$tr("editor.iconpicker.search")}
      bind:value={search} />

    <InputGroup>
      <InputAddon>{$tr("editor.iconpicker.show")}</InputAddon>
      <SelectField class="min-h-8 text-[13px]" bind:value={$appConfig.iconListMode}>
        <option value="both">{$tr("editor.iconpicker.show.both")}</option>
        <option value="user">{$tr("editor.iconpicker.show.user")}</option>
        <option value="pack">{$tr("editor.iconpicker.show.pack")}</option>
      </SelectField>
    </InputGroup>

    <CustomScroll class="icon-grid">
      {#if $appConfig.iconListMode === "both" || $appConfig.iconListMode === "user"}
        {#each $userIcons as { name, data } (name)}
          <button
            type="button"
            class="user-icon mb-1 mr-1 inline-flex rounded-lg border border-line-strong p-1.5 {deleteMode ? 'bg-danger text-white' : 'bg-surface'}"
            onclick={() => svgClicked(name, data)}>
            <img src="data:image/svg+xml;base64,{FileUtils.base64str(data)}" alt="user-svg" />
          </button>
        {/each}
      {/if}

      {#if $appConfig.iconListMode === "both" || $appConfig.iconListMode === "pack"}
        {#each visiblePackIcons as name (name)}
          <button
            type="button"
            class="pack-icon mr-1 mb-1 inline-flex rounded-lg border border-transparent p-1.5 hover:bg-hover"
            title={lucideSearchKey(name)}
            onclick={() => packClicked(name)}>
            {@html lucideIconToSvg(name)}
          </button>
        {/each}
      {/if}
    </CustomScroll>

    <div class="flex flex-wrap gap-2">
      <Button size="sm" pill={false} onclick={addOwn}>
        <MdIcon icon="add" />
        {$tr("editor.iconpicker.add")}
      </Button>
      <Button size="sm" pill={false} variant={deleteMode ? "danger" : "secondary"} onclick={() => (deleteMode = !deleteMode)}>
        <MdIcon icon="delete" />
        {$tr("editor.iconpicker.delete_mode")}
      </Button>
    </div>

    <a href="https://lucide.dev/icons/" target="_blank" class="text-muted">
      {$tr("editor.iconpicker.mdi_link_title")}
    </a>
  </div>
</Menu>

<style>
  :global(.icon-grid) {
    height: 240px;
    max-height: 400px;
  }
  .user-icon img,
  .pack-icon :global(svg) {
    width: 24px;
    height: 24px;
    display: block;
  }
</style>
