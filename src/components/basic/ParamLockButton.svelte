<script lang="ts">
  import MdIcon from "$/components/basic/MdIcon.svelte";
  import { IconButton } from "$/components/ui";

  interface Props {
    propName: string;
    savedValue: unknown;
    value: unknown;
    onClick: (key: string, value: unknown) => void;
  }

  let { propName, savedValue, value, onClick }: Props = $props();
</script>

<IconButton class="param-lock-btn size-8 rounded-none" onclick={() => onClick(propName, value)}>
  {#if savedValue !== undefined}
    <MdIcon icon="lock" class="text-amber-600" />
  {:else}
    <MdIcon icon="lock_open" />
  {/if}
</IconButton>
