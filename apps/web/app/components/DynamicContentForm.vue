<script setup lang="ts">
interface FieldDefinition {
  name: string;
  type: string;
  required: boolean;
  label: string;
  options?: string[];
}

const props = defineProps<{
  fields: FieldDefinition[];
}>();

const model = defineModel<Record<string, unknown>>({ default: () => ({}) });

function updateValue(fieldName: string, value: unknown) {
  model.value = { ...model.value, [fieldName]: value };
}

function getSelectItems(field: FieldDefinition) {
  return (field.options ?? []).map((o) => ({ label: o, value: o }));
}
</script>

<template>
  <div class="space-y-4">
    <UFormField
      v-for="field in props.fields"
      :key="field.name"
      :label="field.label"
      :required="field.required"
    >
      <UInput
        v-if="field.type === 'text' || field.type === 'email' || field.type === 'url'"
        :model-value="(model[field.name] as string) ?? ''"
        :type="field.type === 'email' ? 'email' : field.type === 'url' ? 'url' : 'text'"
        :required="field.required"
        class="w-full"
        @update:model-value="(v: string) => updateValue(field.name, v)"
      />

      <UTextarea
        v-else-if="field.type === 'textarea'"
        :model-value="(model[field.name] as string) ?? ''"
        :required="field.required"
        :rows="4"
        class="w-full"
        @update:model-value="(v: string) => updateValue(field.name, v)"
      />

      <UInput
        v-else-if="field.type === 'number'"
        :model-value="(model[field.name] as number) ?? ''"
        type="number"
        :required="field.required"
        class="w-full"
        @update:model-value="(v: string) => updateValue(field.name, v ? Number(v) : undefined)"
      />

      <USwitch
        v-else-if="field.type === 'boolean'"
        :model-value="(model[field.name] as boolean) ?? false"
        @update:model-value="(v: boolean) => updateValue(field.name, v)"
      />

      <UInput
        v-else-if="field.type === 'date'"
        :model-value="(model[field.name] as string) ?? ''"
        type="date"
        :required="field.required"
        class="w-full"
        @update:model-value="(v: string) => updateValue(field.name, v)"
      />

      <USelect
        v-else-if="field.type === 'select'"
        :model-value="(model[field.name] as string) ?? ''"
        :items="getSelectItems(field)"
        :required="field.required"
        class="w-full"
        @update:model-value="(v: string) => updateValue(field.name, v)"
      />

      <MediaPicker
        v-else-if="field.type === 'media'"
        :model-value="(model[field.name] as string) ?? null"
        @update:model-value="(v: string | null) => updateValue(field.name, v)"
      />
    </UFormField>
  </div>
</template>
