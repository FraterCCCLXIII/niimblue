<script lang="ts">
  import { type AppIconName, uiIconToSvg } from "$/utils/lucide_icons";

  interface Props {
    icon: AppIconName;
    class?: string;
  }

  let { icon, class: className = "" }: Props = $props();

  const svg = $derived(uiIconToSvg(icon));
</script>

<span class="app-icon {className}">
  {@html svg}
</span>

<style>
  .app-icon {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    line-height: 1;
    vertical-align: -0.125em;
    color: inherit;
  }

  .app-icon :global(svg) {
    display: block;
    width: 1.25em;
    height: 1.25em;
  }

  .app-icon.r-90 {
    transform: rotate(90deg);
  }
</style>
