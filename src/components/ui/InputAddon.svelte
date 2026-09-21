<script lang="ts">
  import type { Snippet } from "svelte";
  import { cn } from "$/utils/cn";

  interface Props {
    class?: string;
    title?: string;
    children: Snippet;
  }

  let { class: className, title, children }: Props = $props();
</script>

<span
  {title}
  class={cn(
    "inline-flex shrink-0 items-center border border-line-strong bg-hover px-2.5 text-[13px] whitespace-nowrap text-foreground",
    className,
  )}>
  {@render children()}
</span>
