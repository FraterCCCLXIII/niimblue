<script lang="ts">
  import type { HTMLButtonAttributes } from "svelte/elements";
  import { cn } from "$/utils/cn";

  export type ButtonVariant = "primary" | "secondary" | "ghost" | "soft" | "danger";
  export type ButtonSize = "sm" | "md";

  interface Props extends HTMLButtonAttributes {
    variant?: ButtonVariant;
    size?: ButtonSize;
    pill?: boolean;
    class?: string;
  }

  let {
    variant = "secondary",
    size = "md",
    pill = true,
    class: className,
    type = "button",
    children,
    ...rest
  }: Props = $props();
</script>

<button
  {type}
  {...rest}
  class={cn(
    "inline-flex items-center justify-center gap-1.5 whitespace-nowrap border font-normal transition-colors disabled:opacity-45",
    pill ? "rounded-full" : "rounded-lg",
    size === "md" && "min-h-9 px-4 text-sm",
    size === "sm" && "min-h-8 px-3 text-xs",
    variant === "secondary" && "border-line-strong bg-surface text-foreground hover:bg-hover",
    variant === "primary" && "border-accent bg-accent text-white hover:border-accent-hover hover:bg-accent-hover",
    variant === "ghost" && "border-transparent bg-transparent text-foreground hover:bg-hover",
    variant === "soft" && "border-transparent bg-active text-foreground hover:bg-soft-hover",
    variant === "danger" && "border-danger bg-danger text-white hover:bg-danger/90",
    className,
  )}>
  {@render children?.()}
</button>
