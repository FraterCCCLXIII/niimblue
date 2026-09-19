<script lang="ts">
  import { onMount } from "svelte";
  import { getDesktop } from "$/utils/desktop";

  const desktop = getDesktop();
  const isMac = desktop?.platform === "darwin";
  let maximized = $state(false);

  onMount(() => {
    if (!desktop) {
      return;
    }
    desktop.window.isMaximized().then((value) => {
      maximized = value;
    });
    return desktop.window.onMaximized((value) => {
      maximized = value;
    });
  });
</script>

{#if desktop}
  <div class="window-controls" class:is-mac={isMac} class:is-win={!isMac}>
    {#if isMac}
      <button type="button" class="traffic close" title="Close" onclick={() => desktop.window.close()}></button>
      <button type="button" class="traffic min" title="Minimize" onclick={() => desktop.window.minimize()}></button>
      <button type="button" class="traffic max" title={maximized ? "Restore" : "Zoom"} onclick={() => desktop.window.maximize()}></button>
    {:else}
      <button type="button" class="win-btn" title="Minimize" onclick={() => desktop.window.minimize()}>
        <span class="win-min"></span>
      </button>
      <button type="button" class="win-btn" title={maximized ? "Restore" : "Maximize"} onclick={() => desktop.window.maximize()}>
        <span class="win-max" class:is-restore={maximized}></span>
      </button>
      <button type="button" class="win-btn win-close" title="Close" onclick={() => desktop.window.close()}>
        <span class="win-x"></span>
      </button>
    {/if}
  </div>
{/if}

<style>
  .window-controls {
    -webkit-app-region: no-drag;
    display: flex;
    align-items: center;
    flex-shrink: 0;
  }

  .window-controls.is-mac {
    gap: 8px;
    padding: 0 10px 0 4px;
  }

  .traffic {
    appearance: none;
    width: 12px;
    height: 12px;
    padding: 0;
    border-radius: 999px;
    border: 0.5px solid rgb(0 0 0 / 12%);
  }

  .traffic.close {
    background: #ff5f57;
  }

  .traffic.min {
    background: #febc2e;
  }

  .traffic.max {
    background: #28c840;
  }

  .window-controls.is-win {
    height: 100%;
    margin-right: -12px;
  }

  .win-btn {
    appearance: none;
    border: 0;
    background: transparent;
    width: 46px;
    height: 48px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    color: #1f1f1f;
  }

  .win-btn:hover {
    background: #f0f0f0;
  }

  .win-btn.win-close:hover {
    background: #e81123;
    color: #fff;
  }

  .win-min,
  .win-max,
  .win-x {
    display: block;
    background: currentColor;
  }

  .win-min {
    width: 10px;
    height: 1px;
  }

  .win-max {
    width: 9px;
    height: 9px;
    background: transparent;
    border: 1px solid currentColor;
  }

  .win-max.is-restore {
    width: 7px;
    height: 7px;
    box-shadow: 2px -2px 0 -1px currentColor;
  }

  .win-x {
    width: 10px;
    height: 1px;
    transform: rotate(45deg);
    position: relative;
  }

  .win-x::after {
    content: "";
    position: absolute;
    inset: 0;
    background: currentColor;
    transform: rotate(90deg);
  }
</style>
