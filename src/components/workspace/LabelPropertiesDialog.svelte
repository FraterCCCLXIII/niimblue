<script lang="ts">
  import AppModal from "$/components/basic/AppModal.svelte";
  import { Button } from "$/components/ui";
  import LabelPropsEditor from "$/components/designer-controls/LabelPropsEditor.svelte";
  import { tr } from "$/utils/i18n";
  import type { LabelProps } from "$/types";

  interface Props {
    show: boolean;
    labelProps: LabelProps;
    onChange: (next: LabelProps) => void;
  }

  let { show = $bindable(), labelProps, onChange }: Props = $props();

  let editor = $state<{ apply: () => void; saveTemplate: () => void } | undefined>();

  const apply = () => {
    editor?.apply();
    show = false;
  };
</script>

{#if show}
  <AppModal bind:show title={$tr("params.label.menu_title")} size="lg">
    <LabelPropsEditor bind:this={editor} {labelProps} {onChange} />

    {#snippet footer()}
      <Button onclick={() => editor?.saveTemplate()}>
        {$tr("params.label.save_template")}
      </Button>
      <Button variant="primary" class="ml-auto" onclick={apply}>
        {$tr("params.label.apply")}
      </Button>
    {/snippet}
  </AppModal>
{/if}

