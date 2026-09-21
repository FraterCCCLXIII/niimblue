<script lang="ts">
  import type { HTMLInputAttributes, HTMLTextareaAttributes } from "svelte/elements";
  import { cn } from "$/utils/cn";

  type Props = {
    multiline?: boolean;
    narrow?: boolean;
    class?: string;
    value?: string | number;
  } & Omit<HTMLInputAttributes, "class" | "value"> &
    Omit<HTMLTextareaAttributes, "class" | "value">;

  let { multiline = false, narrow = false, class: className, value = $bindable(""), ...rest }: Props = $props();

  const classes = $derived(
    cn(
      "insp-field w-full min-h-10 rounded-field border border-field bg-surface px-3 py-2 text-sm text-foreground shadow-none outline-none focus:border-field-focus",
      multiline && "insp-textarea min-h-[92px] resize-y leading-snug",
      narrow && "insp-field-narrow w-[132px] min-w-0 flex-[0_0_132px]",
      className,
    ),
  );
</script>

{#if multiline}
  <textarea class={classes} bind:value {...rest}></textarea>
{:else}
  <input class={classes} bind:value {...rest} />
{/if}
