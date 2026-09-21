<script lang="ts">
  import type { HTMLSelectAttributes } from "svelte/elements";
  import { cn } from "$/utils/cn";

  interface Props extends HTMLSelectAttributes {
    class?: string;
    value?: string | number | undefined;
  }

  let { class: className, value = $bindable(""), children, ...rest }: Props = $props();
</script>

<select
  class={cn("insp-field insp-select w-full min-h-10 rounded-field border border-field bg-surface px-3 py-2 pr-8 text-sm text-foreground outline-none focus:border-field-focus", className)}
  bind:value
  {...rest}>
  {@render children?.()}
</select>
