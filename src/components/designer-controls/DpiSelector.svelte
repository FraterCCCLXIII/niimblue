<script lang="ts">
  import { InputAddon, InputGroup, SelectField, TextField } from "$/components/ui";
  import { tr } from "$/utils/i18n";

  interface Props {
    value: number;
  }

  let { value = $bindable() }: Props = $props();
</script>

<InputGroup class="mb-2">
  <InputAddon>{$tr("params.label.head_density")}</InputAddon>

  <SelectField class="min-h-8 text-[13px]" bind:value>
    <option value={8}>203dpi</option>
    <option value={11.81}>300dpi</option>
  </SelectField>

  <TextField class="min-h-8 text-[13px]" type="number" min="1" bind:value />

  <InputAddon class="cursor-help" title={$tr("params.label.head_density.help")}>
    {$tr("params.label.dpmm")}
  </InputAddon>
</InputGroup>
