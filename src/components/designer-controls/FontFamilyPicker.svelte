<script lang="ts">
  import { onMount } from "svelte";
  import { APP_FONTS, OBJECT_DEFAULTS_TEXT } from "$/defaults";
  import { tr } from "$/utils/i18n";
  import { Toasts } from "$/utils/toasts";
  import MdIcon from "$/components/basic/MdIcon.svelte";
  import CustomScroll from "$/components/basic/CustomScroll.svelte";
  import { Menu, MenuItem } from "$/components/ui";
  import { LocalStoragePersistence } from "$/utils/persistence";
  import { fontCache, userFonts } from "$/stores";
  import FontsMenu from "$/components/designer-controls/FontsMenu.svelte";
  import { readLocalFontFamilies } from "$/utils/local_fonts";

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
  let menu: { hide: () => void } | undefined = $state();
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
    menu?.hide();
  };

  const fontClick = (family: string) => {
    searchString = "";
    valueUpdated(family);
    closeMenu();
  };

  const onMenuOpen = () => {
    void getLocalFonts(false);
    requestAnimationFrame(() => searchInput?.focus());
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
  });
</script>

<div
  class="font-family-picker flex min-w-0 items-stretch"
  class:insp-font={variant === "inspector"}
  bind:this={pickerRoot}>
  {#if variant !== "inspector"}
    <span class="inline-flex items-center rounded-l-[10px] border border-line-strong bg-hover px-2.5" title={$tr("params.text.font_family")}>
      <MdIcon icon="text_format" />
    </span>
  {/if}

  <input
    type="text"
    class="font-family-input min-h-10 min-w-0 flex-1 border border-field bg-surface px-3 text-sm text-foreground outline-none focus:border-field-focus {variant === 'inspector' ? 'rounded-l-[10px]' : '-ml-px'}"
    data-ver={editRevision}
    {value}
    oninput={(e) => valueUpdated(e.currentTarget.value)} />

  <Menu bind:this={menu} closeOnSelect={false} onOpen={onMenuOpen} class="font-dropdown flex max-h-80 w-[min(320px,80vw)] flex-col overflow-hidden p-0">
    {#snippet trigger({ toggle })}
      <button
        class="workspace-icon-btn -ml-px h-10 w-9 shrink-0 rounded-l-none rounded-r-[10px] border border-field"
        type="button"
        aria-label={$tr("params.text.font_family")}
        onclick={toggle}>
        <MdIcon icon="expand_more" />
      </button>
    {/snippet}
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
        <h6 class="font-dropdown__heading">{$tr("params.text.user_fonts")}</h6>
        {#each customFonts as family (family)}
          <MenuItem class="font-dropdown__item" style="font-family: {family}" onclick={() => fontClick(family)}>
            {family}
          </MenuItem>
        {/each}
      {/if}

      <h6 class="font-dropdown__heading">{$tr("params.text.your_fonts")}</h6>
      {#if yourFonts.length > 0}
        {#each yourFonts as family (family)}
          <MenuItem class="font-dropdown__item" style="font-family: {family}" onclick={() => fontClick(family)}>
            {family}
          </MenuItem>
        {/each}
      {:else if fontsStatus === "loading"}
        <div class="font-dropdown__hint">{$tr("params.text.your_fonts_loading")}</div>
      {:else if fontsStatus === "unsupported"}
        <div class="font-dropdown__hint">{$tr("params.text.your_fonts_unsupported")}</div>
      {:else}
        <MenuItem class="font-dropdown__action" onclick={() => getLocalFonts()}>
          {$tr("params.text.your_fonts_empty")}
        </MenuItem>
      {/if}

      {#if appFonts.length > 0}
        <h6 class="font-dropdown__heading">{$tr("params.text.app_fonts")}</h6>
        {#each appFonts as family (family)}
          <MenuItem class="font-dropdown__item" style="font-family: {family}" onclick={() => fontClick(family)}>
            {family}
          </MenuItem>
        {/each}
      {/if}

      {#if fontQuerySupported && yourFonts.length > 0}
        <MenuItem class="font-dropdown__action" onclick={() => getLocalFonts()}>
          <MdIcon icon="refresh" />
          {$tr("params.text.fetch_fonts")}
        </MenuItem>
      {/if}
    </CustomScroll>
  </Menu>

  <FontsMenu />
</div>

<style>
  .font-family-picker {
    width: unset;
  }

  .font-family-input {
    width: 14em;
  }

  :global(.font-dropdown) {
    width: min(320px, 80vw);
    max-height: 320px;
    padding: 0;
    overflow: hidden;
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

  .font-dropdown__heading {
    margin: 4px 0 0;
    padding: 8px 12px 4px;
    font-size: 11px;
    font-weight: 600;
    letter-spacing: 0.02em;
    text-transform: uppercase;
    color: var(--ws-muted);
  }

  .font-dropdown__hint,
  :global(.font-dropdown__item) {
    padding: 6px 12px;
    font-size: 13px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .font-dropdown__hint {
    color: var(--ws-muted);
  }

  .font-dropdown__action {
    color: var(--ws-muted, #8a8a8a);
    white-space: normal;
    display: flex;
    align-items: center;
    gap: 8px;
  }
</style>
