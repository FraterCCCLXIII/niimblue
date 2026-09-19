<script lang="ts">
  import { NiimbotCapacitorBleClient, SoundSettingsItemType, Utils, type AvailableTransports } from "@mmote/niimbluelib";
  import {
    printerClient,
    connectedPrinterName,
    connectionState,
    initClient,
    heartbeatData,
    printerInfo,
    printerMeta,
    heartbeatFails,
    automation,
    rfidInfo,
    ribbonRfidInfo,
    refreshRfidInfo,
  } from "$/stores";
  import type { ConnectionType } from "$/types";
  import { tr, type TranslationKey } from "$/utils/i18n";
  import MdIcon from "$/components/basic/MdIcon.svelte";
  import { Toasts } from "$/utils/toasts";
  import { onMount } from "svelte";
  import { LocalStoragePersistence } from "$/utils/persistence";
  import type { AppIconName } from "$/utils/lucide_icons";
  import FirmwareUpdater from "$/components/basic/FirmwareUpdater.svelte";

  let connectionType = $state<ConnectionType>("bluetooth");
  let featureSupport = $state<AvailableTransports>({ webBluetooth: false, webSerial: false, capacitorBle: false });

  const transports = $derived(
    (
      [
        featureSupport.webBluetooth
          ? { type: "bluetooth" as const, icon: "bluetooth" as const, label: "connector.bluetooth" as TranslationKey, hint: "connector.bluetooth.hint" as TranslationKey }
          : null,
        featureSupport.webSerial
          ? { type: "serial" as const, icon: "usb" as const, label: "connector.serial" as TranslationKey, hint: "connector.serial.hint" as TranslationKey }
          : null,
        featureSupport.capacitorBle
          ? {
              type: "capacitor-ble" as const,
              icon: "bluetooth" as const,
              label: "connector.capacitor_ble" as TranslationKey,
              hint: "connector.capacitor_ble.hint" as TranslationKey,
            }
          : null,
      ] as const
    ).filter((item) => item !== null),
  );

  const hasTransport = $derived(transports.length > 0);
  const connecting = $derived($connectionState === "connecting");
  const connected = $derived($connectionState === "connected");
  const printerLabel = $derived($printerMeta?.model ?? $connectedPrinterName ?? $tr("connector.connect"));

  const onConnectClicked = async (type = connectionType) => {
    switchConnectionType(type);
    initClient(type);
    connectionState.set("connecting");

    try {
      if ($printerClient instanceof NiimbotCapacitorBleClient && $automation?.autoConnectDeviceId !== undefined) {
        await $printerClient.connect({ deviceId: $automation.autoConnectDeviceId });
      } else {
        await $printerClient.connect();
      }
    } catch (e) {
      connectionState.set("disconnected");
      Toasts.error(e);
    }
  };

  const onDisconnectClicked = () => {
    $printerClient.disconnect();
  };

  const startHeartbeat = async () => {
    $printerClient.startHeartbeat();
  };

  const stopHeartbeat = async () => {
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
    await $printerClient.fetchPrinterInfo();
  };

  const reset = async () => {
    await $printerClient.abstraction.printerReset();
  };

  const switchConnectionType = (c: ConnectionType) => {
    LocalStoragePersistence.saveLastConnectionType(c);
    connectionType = c;
  };

  const batteryIcon = (value: number): AppIconName => {
    if (value > 4) {
      value = Math.min(4, Math.max(1, Math.ceil(value / 25)));
    }

    if (value === 4) {
      return "battery_full";
    } else if (value === 3) {
      return "battery_5_bar";
    } else if (value === 2) {
      return "battery_3_bar";
    } else if (value === 1) {
      return "battery_2_bar";
    }
    return "battery_0_bar";
  };

  onMount(() => {
    featureSupport = Utils.getAvailableTransports();

    connectionType = LocalStoragePersistence.loadLastConnectionType() ?? "bluetooth";

    if (!featureSupport.capacitorBle && connectionType === "capacitor-ble") {
      connectionType = "bluetooth";
    }
    if (!featureSupport.webSerial && connectionType === "serial") {
      connectionType = "bluetooth";
    }
    if (!featureSupport.webBluetooth && connectionType === "bluetooth" && featureSupport.capacitorBle) {
      connectionType = "capacitor-ble";
    }

    if ($automation !== undefined && $automation.autoConnect && connectionType === "capacitor-ble") {
      onConnectClicked();
    }
  });
</script>

<div class="connect-menu dropdown">
  <button
    type="button"
    class="connect-trigger"
    class:is-connected={connected}
    class:is-connecting={connecting}
    data-bs-toggle="dropdown"
    data-bs-auto-close={connected ? "outside" : true}
    disabled={connecting || (!connected && !hasTransport)}
    aria-haspopup="menu">
    {#if connected}
      <MdIcon icon={connectionType === "serial" ? "usb" : "bluetooth"} />
      <span class="connect-trigger__label" class:is-warn={$heartbeatFails > 0}>{printerLabel}</span>
      {#if $heartbeatData?.chargeLevel}
        <MdIcon icon={batteryIcon($heartbeatData.chargeLevel)} class="r-90" />
      {/if}
    {:else}
      <MdIcon icon="power" />
      <span class="connect-trigger__label">{connecting ? $tr("connector.connecting") : $tr("connector.connect")}</span>
    {/if}
    <MdIcon icon="expand_more" />
  </button>

  <div class="dropdown-menu connect-dropdown" role="menu">
    {#if connected}
      <div class="connect-status">
        <div class="connect-status__name">{printerLabel}</div>
        <div class="connect-status__meta">
          {connectionType === "serial" ? $tr("connector.serial") : $tr("connector.bluetooth")}
        </div>
      </div>

      {#if $printerInfo}
        <div class="connect-details">
          Printer info
          <ul>
            {#each Object.entries($printerInfo) as [key, value] (key)}
              <li>{key}: <strong>{value ?? "-"}</strong></li>
            {/each}
          </ul>
        </div>
      {/if}

      {#if $printerMeta}
        <button class="connect-item" type="button" data-bs-toggle="collapse" data-bs-target="#modelMeta">
          Model metadata
          <MdIcon icon="expand_more" />
        </button>
        <div class="collapse" id="modelMeta">
          <ul>
            {#each Object.entries($printerMeta) as [key, value] (key)}
              <li>{key}: <strong>{value ?? "-"}</strong></li>
            {/each}
          </ul>
        </div>
      {/if}

      {#if $rfidInfo}
        <button class="connect-item" type="button" data-bs-toggle="collapse" data-bs-target="#rfidInfo">
          RFID info
          <MdIcon icon="expand_more" />
        </button>
        <div class="collapse" id="rfidInfo">
          <button class="connect-item" type="button" onclick={refreshRfidInfo}>Update</button>
          <ul>
            {#each Object.entries($rfidInfo) as [key, value] (key)}
              <li>{key}: <strong>{value ?? "-"}</strong></li>
            {/each}
          </ul>
        </div>
      {/if}

      {#if $ribbonRfidInfo}
        <button class="connect-item" type="button" data-bs-toggle="collapse" data-bs-target="#ribbonRfidInfo">
          Ribbon RFID info
          <MdIcon icon="expand_more" />
        </button>
        <div class="collapse" id="ribbonRfidInfo">
          <button class="connect-item" type="button" onclick={refreshRfidInfo}>Update</button>
          <ul>
            {#each Object.entries($ribbonRfidInfo) as [key, value] (key)}
              <li>{key}: <strong>{value ?? "-"}</strong></li>
            {/each}
          </ul>
        </div>
      {/if}

      {#if $heartbeatData}
        <button class="connect-item" type="button" data-bs-toggle="collapse" data-bs-target="#heartbeatData">
          Heartbeat data
          <MdIcon icon="expand_more" />
        </button>
        <div class="collapse" id="heartbeatData">
          <ul>
            {#each Object.entries($heartbeatData) as [key, value] (key)}
              <li>{key}: <strong>{value ?? "-"}</strong></li>
            {/each}
          </ul>
        </div>
      {/if}

      <FirmwareUpdater />

      <button class="connect-item" type="button" data-bs-toggle="collapse" data-bs-target="#tests">
        Tests
        <MdIcon icon="expand_more" />
      </button>
      <div class="collapse" id="tests">
        <div class="connect-tests">
          <button type="button" onclick={startHeartbeat}>Heartbeat on</button>
          <button type="button" onclick={stopHeartbeat}>Heartbeat off</button>
          <button type="button" onclick={soundOn}>Sound on</button>
          <button type="button" onclick={soundOff}>Sound off</button>
          <button type="button" onclick={fetchInfo}>Fetch info again</button>
          <button type="button" onclick={reset}>Reset</button>
        </div>
      </div>

      <div class="connect-dropdown__rule"></div>
      <button type="button" class="connect-item is-danger" role="menuitem" onclick={onDisconnectClicked}>
        <MdIcon icon="power_off" />
        {$tr("connector.disconnect")}
      </button>
    {:else}
      {#each transports as transport (transport.type)}
        <button
          type="button"
          class="connect-item"
          class:is-active={connectionType === transport.type}
          role="menuitem"
          disabled={connecting}
          onclick={() => onConnectClicked(transport.type)}>
          <span class="connect-item__icon"><MdIcon icon={transport.icon} /></span>
          <span class="connect-item__copy">
            <span class="connect-item__title">{$tr(transport.label)}</span>
            <span class="connect-item__hint">{$tr(transport.hint)}</span>
          </span>
        </button>
      {/each}
    {/if}
  </div>
</div>

<style>
  .connect-menu {
    position: relative;
  }

  .connect-trigger {
    appearance: none;
    display: inline-flex;
    align-items: center;
    gap: 8px;
    min-height: 36px;
    padding: 0 12px 0 14px;
    border: 1px solid var(--ws-line-strong);
    border-radius: 999px;
    background: var(--ws-surface);
    color: var(--ws-text);
    font-size: 14px;
    font-weight: 500;
  }

  .connect-trigger:hover:not(:disabled) {
    background: var(--ws-hover);
  }

  .connect-trigger:disabled {
    opacity: 0.55;
  }

  .connect-trigger.is-connected {
    border-color: #d8efe4;
    background: #f3fbf6;
  }

  .connect-trigger.is-connecting {
    color: var(--ws-muted);
  }

  .connect-trigger__label {
    max-width: 140px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .connect-trigger__label.is-warn {
    color: #c48a00;
  }

  .connect-dropdown {
    --bs-dropdown-padding-x: 0;
    --bs-dropdown-padding-y: 0;
    --bs-dropdown-border-radius: 12px;
    --bs-dropdown-border-color: var(--ws-line);
    --bs-dropdown-bg: var(--ws-surface);
    min-width: 260px;
    max-width: 320px;
    margin-top: 8px !important;
    padding: 6px;
    border-radius: 12px;
    box-shadow: 0 10px 28px rgba(17, 17, 17, 0.1);
  }

  .connect-status {
    padding: 10px 12px 8px;
  }

  .connect-status__name {
    font-size: 14px;
    font-weight: 600;
  }

  .connect-status__meta {
    color: var(--ws-muted);
    font-size: 12px;
  }

  .connect-item {
    appearance: none;
    display: flex;
    align-items: center;
    gap: 10px;
    width: 100%;
    padding: 10px 12px;
    border: 0;
    border-radius: 8px;
    background: transparent;
    color: var(--ws-text);
    text-align: left;
  }

  .connect-item:hover:not(:disabled) {
    background: var(--ws-hover);
  }

  .connect-item.is-active {
    background: var(--ws-active);
  }

  .connect-item.is-danger {
    color: #c62828;
  }

  .connect-item__icon {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 32px;
    height: 32px;
    border-radius: 8px;
    background: #f4f6f8;
    color: #3d3d3d;
  }

  .connect-item__copy {
    display: flex;
    min-width: 0;
    flex-direction: column;
    gap: 1px;
  }

  .connect-item__title {
    font-size: 14px;
    font-weight: 500;
  }

  .connect-item__hint {
    color: var(--ws-muted);
    font-size: 12px;
  }

  .connect-dropdown__rule {
    height: 1px;
    margin: 4px 8px;
    background: var(--ws-line);
  }

  .connect-details,
  .connect-dropdown :global(.collapse) {
    padding: 4px 12px 8px;
    color: var(--ws-muted);
    font-size: 12px;
  }

  .connect-details ul,
  .connect-dropdown ul {
    margin: 6px 0 0;
    padding-left: 16px;
  }

  .connect-tests {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
  }

  .connect-tests button {
    appearance: none;
    border: 1px solid var(--ws-line-strong);
    border-radius: 8px;
    background: var(--ws-surface);
    padding: 4px 8px;
    font-size: 12px;
  }
</style>
