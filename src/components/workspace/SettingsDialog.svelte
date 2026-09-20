<script lang="ts">
  import AppModal from "$/components/basic/AppModal.svelte";
  import MdIcon from "$/components/basic/MdIcon.svelte";
  import { locale, locales, tr } from "$/utils/i18n";

  interface Props {
    show: boolean;
    commit?: string;
    buildDate?: string;
    onDebug: () => void;
  }

  let { show = $bindable(), commit, buildDate, onDebug }: Props = $props();
</script>

{#if show}
  <AppModal bind:show title={$tr("settings.title")}>
    <section class="settings-block">
      <h3>{$tr("settings.language")}</h3>
      <select class="insp-field insp-select" bind:value={$locale}>
        {#each Object.entries(locales) as [key, name] (key)}
          <option value={key}>{name}</option>
        {/each}
      </select>
    </section>

    <section class="settings-block">
      <h3>{$tr("settings.about")}</h3>
      <dl class="settings-meta">
        <div>
          <dt>{$tr("settings.app")}</dt>
          <dd>Pressmark</dd>
        </div>
        {#if commit}
          <div>
            <dt>{$tr("settings.commit")}</dt>
            <dd>
              <a href="https://github.com/FraterCCCLXIII/pressmark/commit/{commit}" target="_blank" rel="noreferrer">
                {commit.slice(0, 7)}
              </a>
            </dd>
          </div>
        {/if}
        {#if buildDate}
          <div>
            <dt>{$tr("main.built")}</dt>
            <dd>{buildDate}</dd>
          </div>
        {/if}
        <div>
          <dt>{$tr("main.code")}</dt>
          <dd>
            <a href="https://github.com/FraterCCCLXIII/pressmark" target="_blank" rel="noreferrer">GitHub</a>
          </dd>
        </div>
      </dl>
    </section>

    <section class="settings-block">
      <button type="button" class="settings-debug" onclick={onDebug}>
        <MdIcon icon="bug_report" />
        {$tr("settings.debug")}
      </button>
    </section>
  </AppModal>
{/if}

<style>
  .settings-block {
    margin-bottom: 20px;
  }

  .settings-block:last-child {
    margin-bottom: 0;
  }

  .settings-block h3 {
    margin: 0 0 8px;
    color: var(--ws-text);
    font-size: 14px;
    font-weight: 600;
  }

  .settings-block :global(.insp-field) {
    background: var(--ws-surface);
    color: var(--ws-text);
  }

  .settings-meta {
    display: grid;
    gap: 10px;
    margin: 0;
  }

  .settings-meta div {
    display: flex;
    justify-content: space-between;
    gap: 16px;
    font-size: 14px;
  }

  .settings-meta dt {
    color: var(--ws-muted);
    font-weight: 400;
  }

  .settings-meta dd {
    margin: 0;
    text-align: right;
  }

  .settings-meta a {
    color: inherit;
  }

  .settings-debug {
    appearance: none;
    display: inline-flex;
    align-items: center;
    gap: 8px;
    min-height: 36px;
    padding: 0 12px;
    border: 1px solid var(--ws-line-strong);
    border-radius: 10px;
    background: var(--ws-surface);
    color: var(--ws-text);
    font-size: 14px;
  }

  .settings-debug:hover {
    background: var(--ws-hover);
  }
</style>
