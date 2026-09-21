<script lang="ts">
  import { Utils } from "@mmote/niimbluelib";
  import { tr } from "$/utils/i18n";
  import MdIcon from "$/components/basic/MdIcon.svelte";
  import { detectAntiFingerprinting } from "$/utils/browsers";

  let caps = Utils.getAvailableTransports();
  let antiFingerprinting = detectAntiFingerprinting();
</script>

{#if !caps.webSerial && !caps.webBluetooth && !caps.capacitorBle}
  <div class="rounded-[10px] border border-danger-border bg-danger-soft px-3 py-2.5 text-danger-text" role="alert">
    <div>
      {$tr("browser_warning.lines.first")}
      <MdIcon icon="sentiment_very_dissatisfied" />
    </div>
    <div>
      {$tr("browser_warning.lines.second")}
    </div>
  </div>
{/if}

{#if antiFingerprinting}
  <div class="rounded-[10px] border border-danger-border bg-danger-soft px-3 py-2.5 text-danger-text" role="alert">
    {$tr("browser_warning.fingerprinting")}
  </div>
{/if}
