<script lang="ts">
  import type { Snippet } from "svelte";
  import { cn } from "$/utils/cn";

  interface Props {
    class?: string;
    children: Snippet;
  }

  let { class: className, children }: Props = $props();
</script>

<div class={cn("flex w-full min-w-0 items-stretch [&>*]:min-h-8 [&>*]:rounded-none [&>:first-child]:rounded-l-[10px] [&>:last-child]:rounded-r-[10px] [&>:not(:first-child)]:-ml-px", className)}>
  {@render children()}
</div>
