<script lang="ts">
  import type { HTMLButtonAttributes } from "svelte/elements";
  import { cn } from "$/utils/cn";

  interface Props extends HTMLButtonAttributes {
    danger?: boolean;
    class?: string;
    style?: string;
  }

  let { danger = false, class: className, style, type = "button", children, ...rest }: Props = $props();
</script>

<button
  {type}
  {style}
  {...rest}
  class={cn(
    "flex w-full items-center gap-2 whitespace-nowrap rounded-lg px-3 py-1.5 text-left text-xs text-foreground hover:bg-hover disabled:opacity-45",
    danger && "text-danger",
    className,
  )}>
  {@render children?.()}
</button>
