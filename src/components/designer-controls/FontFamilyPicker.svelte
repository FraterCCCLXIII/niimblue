<script lang="ts">
  import { onMount } from "svelte";
  import Dropdown from "bootstrap/js/dist/dropdown";
  import { APP_FONTS, OBJECT_DEFAULTS_TEXT } from "$/defaults";
  import { tr } from "$/utils/i18n";
  import { Toasts } from "$/utils/toasts";
  import MdIcon from "$/components/basic/MdIcon.svelte";
  import CustomScroll from "$/components/basic/CustomScroll.svelte";
  import { LocalStoragePersistence } from "$/utils/persistence";
  import { fontCache, userFonts } from "$/stores";
  import FontsMenu from "$/components/designer-controls/FontsMenu.svelte";
  import { readLocalFontFamilies } from "$/utils/local_fonts";
  import { fixedDropdown } from "$/utils/fixed_dropdown";

  interface Props {
    editRevision?: number;
    value: string;
    valueUpdated: (v: string) => void;
    variant?: "default" | "inspector";
  }

  let { value, valueUpdated, editRevision, variant = "default" }: Props = $props();

  const fontQuerySupported = typeof queryLocalFonts !== "undefined";
  let pickerRoot: HTMLDivElement | undefined = $state();
  let searchInput: HTMLInputElement | undefined = $state();
  let searchString = $state("");
  let fontsStatus = $state<"idle" | "loading" | "ready" | "denied" | "unsupported">(
    fontQuerySupported ? "idle" : "unsupported",
  );

  const matchesSearch = (family: string) => family.toLowerCase().includes(searchString.toLowerCase());

  let customFonts = $derived($userFonts.map((font) => font.family).filter(matchesSearch));
  let yourFonts = $derived($fontCache.filter((family) => !APP_FONTS.includes(family)).filter(matchesSearch));
  let appFonts = $derived(APP_FONTS.filter(matchesSearch));

  const mergeFontCache = (fonts: string[]) => {
    const unique = [...new Set([...APP_FONTS, ...fonts, OBJECT_DEFAULTS_TEXT.fontFamily])].sort((a, b) =>
      a.localeCompare(b),
    );
    fontCache.set(unique);
    LocalStoragePersistence.saveCachedFonts(unique);
  };

  const getLocalFonts = async (notify = true) => {
    fontsStatus = "loading";
    try {
      const fonts = await readLocalFontFamilies();
      mergeFontCache(fonts);
      fontsStatus = fonts.length > 0 || !fontQuerySupported ? "ready" : "denied";
    } catch (error) {
      fontsStatus = fontQuerySupported ? "denied" : "unsupported";
      if (notify) {
        Toasts.error(error);
      }
    }
  };

  const closeMenu = () => {
    const toggle = pickerRoot?.querySelector<HTMLElement>("[data-bs-toggle='dropdown']");
    if (toggle) {
      Dropdown.getOrCreateInstance(toggle).hide();
    }
  };

  const fontClick = (family: string) => {
    searchString = "";
    valueUpdated(family);
    closeMenu();
  };

  const onToggleClick = () => {
    void getLocalFonts(false);
  };

  onMount(() => {
    try {
      const stored = LocalStoragePersistence.loadCachedFonts();
      if (stored.length > 0) {
        mergeFontCache(stored);
        if (stored.some((family) => !APP_FONTS.includes(family))) {
          fontsStatus = "ready";
        }
      }
    } catch (error) {
      Toasts.error(error);
    }

    void getLocalFonts(false);

    const toggle = pickerRoot?.querySelector("[data-bs-toggle='dropdown']");
    const onShow = () => {
      void getLocalFonts(false);
      requestAnimationFrame(() => searchInput?.focus());
    };
    toggle?.addEventListener("show.bs.dropdown", onShow);
    return () => toggle?.removeEventListener("show.bs.dropdown", onShow);
  });
</script>

<div
  class="input-group flex-nowrap input-group-sm font-family-picker"
  class:insp-font={variant === "inspector"}
  bind:this={pickerRoot}>
  {#if variant !== "inspector"}
    <span class="input-group-text" title={$tr("params.text.font_family")}>
      <MdIcon icon="text_format" />
    </span>
  {/if}

  <input
    type="text"
    class="form-control font-family-input"
    data-ver={editRevision}
    {value}
    oninput={(e) => valueUpdated(e.currentTarget.value)} />

  <!-- svelte-ignore a11y_consider_explicit_label -->
  <button
    class="btn btn-outline-secondary dropdown-toggle"
    type="button"
    data-bs-toggle="dropdown"
    data-bs-auto-close="outside"
    use:fixedDropdown
    onclick={onToggleClick}></button>

  <div class="dropdown-menu font-dropdown">
    <div class="font-dropdown__search">
      <MdIcon icon="search" />
      <input
        bind:this={searchInput}
        type="search"
        placeholder={$tr("params.text.font_family.search")}
        bind:value={searchString}
        onclick={(event) => event.stopPropagation()}
        onkeydown={(event) => event.stopPropagation()} />
    </div>

    <CustomScroll class="font-dropdown__list">
      {#if customFonts.length > 0}
        <h6 class="dropdown-header">{$tr("params.text.user_fonts")}</h6>
        {#each customFonts as family (family)}
          <button class="dropdown-item" style="font-family: {family}" type="button" onclick={() => fontClick(family)}>
            {family}
          </button>
        {/each}
      {/if}

      <h6 class="dropdown-header">{$tr("params.text.your_fonts")}</h6>
      {#if yourFonts.length > 0}
        {#each yourFonts as family (family)}
          <button class="dropdown-item" style="font-family: {family}" type="button" onclick={() => fontClick(family)}>
            {family}
          </button>
        {/each}
      {:else if fontsStatus === "loading"}
        <div class="dropdown-item-text text-body-secondary">{$tr("params.text.your_fonts_loading")}</div>
      {:else if fontsStatus === "unsupported"}
        <div class="dropdown-item-text text-body-secondary">{$tr("params.text.your_fonts_unsupported")}</div>
      {:else}
        <button class="dropdown-item font-dropdown__action" type="button" onclick={() => getLocalFonts()}>
          {$tr("params.text.your_fonts_empty")}
        </button>
      {/if}

      {#if appFonts.length > 0}
        <h6 class="dropdown-header">{$tr("params.text.app_fonts")}</h6>
        {#each appFonts as family (family)}
          <button class="dropdown-item" style="font-family: {family}" type="button" onclick={() => fontClick(family)}>
            {family}
          </button>
        {/each}
      {/if}

      {#if fontQuerySupported && yourFonts.length > 0}
        <button class="dropdown-item font-dropdown__action" type="button" onclick={() => getLocalFonts()}>
          <MdIcon icon="refresh" />
          {$tr("params.text.fetch_fonts")}
        </button>
      {/if}
    </CustomScroll>
  </div>

  <FontsMenu />
</div>

<style>
  .font-family-picker {
    width: unset;
  }

  .font-family-input {
    width: 14em;
  }

  .font-dropdown {
    width: min(320px, 80vw);
    max-height: 320px;
    padding: 0;
    overflow: hidden;
    flex-direction: column;
  }

  .font-dropdown:global(.show) {
    display: flex;
  }

  .font-dropdown__search {
    display: flex;
    align-items: center;
    gap: 8px;
    flex: 0 0 auto;
    padding: 10px 12px;
    color: var(--ws-muted, #8a8a8a);
    background: var(--ws-surface, #fff);
    border-bottom: 1px solid var(--ws-line, #eee);
  }

  .font-dropdown__search :global(.app-icon svg) {
    width: 16px;
    height: 16px;
  }

  .font-dropdown__search input {
    flex: 1;
    min-width: 0;
    border: 0;
    outline: none;
    box-shadow: none;
    background: transparent;
    color: var(--ws-text, #111);
    font-size: 14px;
    line-height: 20px;
  }

  .font-dropdown__search input::placeholder {
    color: var(--ws-muted, #8a8a8a);
  }

  /* CustomScroll is a child component, so list constraints must be :global. */
  .font-dropdown :global(.font-dropdown__list) {
    flex: 1 1 auto;
    min-height: 0;
    height: auto;
    max-height: 248px;
    padding: 0;
  }

  .font-dropdown :global(.ws-scroll__view) {
    height: auto;
    max-height: 248px;
    padding: 6px 0;
    overscroll-behavior: contain;
  }

  .font-dropdown :global(.dropdown-header) {
    margin: 4px 0 0;
    padding: 8px 12px 4px;
    font-size: 11px;
    font-weight: 600;
    letter-spacing: 0.02em;
    text-transform: uppercase;
  }

  .font-dropdown :global(.dropdown-item),
  .font-dropdown :global(.dropdown-item-text) {
    padding: 6px 12px;
    font-size: 13px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .font-dropdown__action {
    color: var(--ws-muted, #8a8a8a);
    white-space: normal;
    display: flex;
    align-items: center;
    gap: 8px;
  }
</style>
