<script lang="ts">
  import AppModal from "$/components/basic/AppModal.svelte";
  import { appConfig } from "$/stores";
  import { tr } from "$/utils/i18n";
  import { NIIMBOT_CLIENT_DEFAULTS } from "@mmote/niimbluelib";

  let { show = $bindable() } = $props();
</script>

<AppModal title={$tr("debug.title")} bind:show>
  <section class="debug-block">
    <p class="ws-help">{$tr("debug.packet_interval.help")}</p>
    <div class="ws-field-row">
      <input
        class="insp-field"
        type="number"
        min="1"
        placeholder={`${NIIMBOT_CLIENT_DEFAULTS.packetIntervalMs}`}
        bind:value={$appConfig.packetIntervalMs} />
      <span class="ws-suffix">ms</span>
      <button type="button" class="ws-btn" onclick={() => ($appConfig.packetIntervalMs = undefined)}>
        {$tr("debug.reset")}
      </button>
    </div>
  </section>

  <section class="debug-block">
    <p class="ws-help">{$tr("debug.page_delay.help")}</p>
    <div class="ws-field-row">
      <input class="insp-field" type="number" min="0" placeholder="0" bind:value={$appConfig.pageDelay} />
      <span class="ws-suffix">ms</span>
      <button type="button" class="ws-btn" onclick={() => ($appConfig.pageDelay = undefined)}>
        {$tr("debug.reset")}
      </button>
    </div>
  </section>
</AppModal>

<style>
  .debug-block + .debug-block {
    margin-top: 20px;
  }
</style>
