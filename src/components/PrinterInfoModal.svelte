<script lang="ts">
  import { SoundSettingsItemType } from "@mmote/niimbluelib";
  import AppModal from "$/components/basic/AppModal.svelte";
  import FirmwareUpdater from "$/components/basic/FirmwareUpdater.svelte";
  import {
    heartbeatData,
    printerClient,
    printerInfo,
    printerMeta,
    refreshRfidInfo,
    rfidInfo,
    ribbonRfidInfo,
  } from "$/stores";
  import { tr } from "$/utils/i18n";
  import { Toasts } from "$/utils/toasts";

  interface Props {
    show: boolean;
  }

  let { show = $bindable() } = $props();

  const formatInfoValue = (value: unknown): string => {
    if (value == null || value === "") {
      return "-";
    }
    if (typeof value === "object") {
      return JSON.stringify(value);
    }
    return String(value);
  };

  const startHeartbeat = () => {
    $printerClient.startHeartbeat();
  };

  const stopHeartbeat = () => {
    $printerClient.stopHeartbeat();
  };

  const soundOn = async () => {
    await $printerClient.abstraction.setSoundEnabled(SoundSettingsItemType.BluetoothConnectionSound, true);
    await $printerClient.abstraction.setSoundEnabled(SoundSettingsItemType.PowerSound, true);
  };

  const soundOff = async () => {
    await $printerClient.abstraction.setSoundEnabled(SoundSettingsItemType.BluetoothConnectionSound, false);
    await $printerClient.abstraction.setSoundEnabled(SoundSettingsItemType.PowerSound, false);
  };

  const fetchInfo = async () => {
    try {
      await $printerClient.fetchPrinterInfo();
    } catch (e) {
      Toasts.error(e);
    }
  };

  const reset = async () => {
    try {
      await $printerClient.abstraction.printerReset();
    } catch (e) {
      Toasts.error(e);
    }
  };
</script>

{#snippet infoList(data: Record<string, unknown> | object | undefined)}
  {#if data && Object.keys(data).length > 0}
    <dl class="info-kv">
      {#each Object.entries(data) as [key, value] (key)}
        <div>
          <dt>{key}</dt>
          <dd>{formatInfoValue(value)}</dd>
        </div>
      {/each}
    </dl>
  {:else}
    <p class="info-empty">{$tr("connector.info.empty")}</p>
  {/if}
{/snippet}

{#if show}
  <AppModal bind:show title={$tr("connector.info.title")}>
    <section class="info-block">
      <h3>{$tr("connector.info.printer")}</h3>
      {@render infoList($printerInfo)}
    </section>

    <details class="info-block" open={!!$printerMeta}>
      <summary>{$tr("connector.info.model")}</summary>
      {@render infoList($printerMeta)}
    </details>

    <details class="info-block" open={!!$rfidInfo}>
      <summary>{$tr("connector.info.rfid")}</summary>
      <button type="button" class="ws-btn info-update" onclick={refreshRfidInfo}>
        {$tr("connector.info.update")}
      </button>
      {@render infoList($rfidInfo)}
    </details>

    <details class="info-block" open={!!$ribbonRfidInfo}>
      <summary>{$tr("connector.info.ribbon_rfid")}</summary>
      <button type="button" class="ws-btn info-update" onclick={refreshRfidInfo}>
        {$tr("connector.info.update")}
      </button>
      {@render infoList($ribbonRfidInfo)}
    </details>

    <details class="info-block" open={!!$heartbeatData}>
      <summary>{$tr("connector.info.heartbeat")}</summary>
      {@render infoList($heartbeatData)}
    </details>

    <section class="info-block">
      <h3>{$tr("connector.info.firmware")}</h3>
      <FirmwareUpdater />
    </section>

    <details class="info-block">
      <summary>{$tr("connector.info.tests")}</summary>
      <div class="info-tests">
        <button type="button" class="ws-btn" onclick={startHeartbeat}>{$tr("connector.info.heartbeat_on")}</button>
        <button type="button" class="ws-btn" onclick={stopHeartbeat}>{$tr("connector.info.heartbeat_off")}</button>
        <button type="button" class="ws-btn" onclick={soundOn}>{$tr("connector.info.sound_on")}</button>
        <button type="button" class="ws-btn" onclick={soundOff}>{$tr("connector.info.sound_off")}</button>
        <button type="button" class="ws-btn" onclick={fetchInfo}>{$tr("connector.info.fetch")}</button>
        <button type="button" class="ws-btn" onclick={reset}>{$tr("connector.info.reset")}</button>
      </div>
    </details>
  </AppModal>
{/if}

<style>
  .info-block {
    margin-bottom: 16px;
    padding-bottom: 16px;
    border-bottom: 1px solid var(--ws-line);
  }

  .info-block:last-child {
    margin-bottom: 0;
    padding-bottom: 0;
    border-bottom: 0;
  }

  .info-block h3,
  .info-block summary {
    margin: 0 0 10px;
    color: var(--ws-text);
    font-size: 14px;
    font-weight: 600;
  }

  .info-block summary {
    display: flex;
    align-items: center;
    justify-content: space-between;
    cursor: pointer;
    list-style: none;
  }

  .info-block summary::-webkit-details-marker {
    display: none;
  }

  .info-block summary::after {
    content: "";
    width: 0.55em;
    height: 0.55em;
    margin-left: 8px;
    border-right: 1.5px solid var(--ws-muted);
    border-bottom: 1.5px solid var(--ws-muted);
    transform: rotate(45deg);
    transition: transform 0.16s ease;
  }

  .info-block[open] summary::after {
    transform: translateY(2px) rotate(225deg);
  }

  .info-kv {
    display: grid;
    gap: 8px;
    margin: 0;
  }

  .info-kv div {
    display: flex;
    justify-content: space-between;
    gap: 16px;
    font-size: 13px;
  }

  .info-kv dt {
    color: var(--ws-muted);
    font-weight: 400;
    word-break: break-word;
  }

  .info-kv dd {
    margin: 0;
    max-width: 60%;
    color: var(--ws-text);
    text-align: right;
    word-break: break-word;
  }

  .info-empty {
    margin: 0;
    color: var(--ws-muted);
    font-size: 13px;
  }

  .info-update {
    margin-bottom: 10px;
    min-height: 32px;
    padding: 0 12px;
    border-radius: 8px;
    font-size: 12px;
  }

  .info-tests {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
  }

  .info-tests .ws-btn {
    min-height: 32px;
    padding: 0 10px;
    border-radius: 8px;
    font-size: 12px;
  }

  .info-block :global(.firmware-updater) {
    color: var(--ws-text);
    font-size: 13px;
  }
</style>
