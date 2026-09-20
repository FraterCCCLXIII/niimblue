<script lang="ts">
  import { onDestroy, onMount } from "svelte";
  import { tr } from "$/utils/i18n";
  import MdIcon from "$/components/basic/MdIcon.svelte";
  import CustomScroll from "$/components/basic/CustomScroll.svelte";
  import { appConfig, userIcons } from "$/stores";
  import { FileUtils } from "$/utils/file_utils";
  import { Toasts } from "$/utils/toasts";
  import { getLucidePackNames, lucideIconToSvg, lucideSearchKey } from "$/utils/lucide_icons";
  import { fixedDropdown } from "$/utils/fixed_dropdown";

  interface Props {
    onSubmitSvg: (i: string) => void;
  }

  let { onSubmitSvg }: Props = $props();

  let iconNames = $state<string[]>([]);
  let search = $state<string>("");
  let deleteMode = $state<boolean>(false);
  let dropdown: HTMLDivElement;

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

  onMount(() => {
    dropdown?.addEventListener("show.bs.dropdown", onShow);
  });

  onDestroy(() => {
    dropdown?.removeEventListener("show.bs.dropdown", onShow);
  });
</script>

<div class="dropdown" bind:this={dropdown}>
  <button class="btn btn-sm btn-secondary" data-bs-toggle="dropdown" data-bs-auto-close="outside" use:fixedDropdown>
    <MdIcon icon="emoji_emotions" />
  </button>

  <div class="dropdown-menu">
    <h6 class="dropdown-header">{$tr("editor.iconpicker.title")}</h6>
    <div class="p-3">
      <input
        disabled={$appConfig.iconListMode === "user"}
        type="text"
        class="form-control mb-1"
        placeholder={$tr("editor.iconpicker.search")}
        bind:value={search} />

      <div class="input-group input-group-sm mb-1">
        <span class="input-group-text">{$tr("editor.iconpicker.show")}</span>
        <select class="form-select form-select-sm" bind:value={$appConfig.iconListMode}>
          <option value="both">{$tr("editor.iconpicker.show.both")}</option>
          <option value="user">{$tr("editor.iconpicker.show.user")}</option>
          <option value="pack">{$tr("editor.iconpicker.show.pack")}</option>
        </select>
      </div>

      <CustomScroll class="icons mb-1">
        {#if $appConfig.iconListMode === "both" || $appConfig.iconListMode === "user"}
          {#each $userIcons as { name, data } (name)}
            <button
              class="btn {deleteMode ? 'btn-danger' : 'btn-light'} me-1 mb-1 user-icon"
              onclick={() => svgClicked(name, data)}>
              <img src="data:image/svg+xml;base64,{FileUtils.base64str(data)}" alt="user-svg" />
            </button>
          {/each}
        {/if}

        {#if $appConfig.iconListMode === "both" || $appConfig.iconListMode === "pack"}
          {#each visiblePackIcons as name (name)}
            <button class="btn me-1 pack-icon" title={lucideSearchKey(name)} onclick={() => packClicked(name)}>
              {@html lucideIconToSvg(name)}
            </button>
          {/each}
        {/if}
      </CustomScroll>

      <div class="input-group input-group-sm mb-1">
        <button class="btn btn-outline-secondary" onclick={addOwn}>
          <MdIcon icon="add" />

          {$tr("editor.iconpicker.add")}
        </button>
        <button
          class="btn {deleteMode ? 'btn-danger' : 'btn-outline-secondary'}"
          onclick={() => (deleteMode = !deleteMode)}>
          <MdIcon icon="delete" />
          {$tr("editor.iconpicker.delete_mode")}
        </button>
      </div>

      <a href="https://lucide.dev/icons/" target="_blank" class="text-secondary">
        {$tr("editor.iconpicker.mdi_link_title")}
      </a>
    </div>
  </div>
</div>

<style>
  .dropdown-menu {
    width: 100vw;
    max-width: 450px;
  }
  .icons {
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
