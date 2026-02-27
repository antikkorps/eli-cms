<script setup lang="ts">
const { t } = useI18n();

interface FieldDefinition {
  name: string;
  type: string;
  required: boolean;
  label: string;
  options?: string[];
}

const model = defineModel<FieldDefinition[]>({ default: () => [] });

const fieldTypes = [
  { label: 'Text', value: 'text' },
  { label: 'Textarea', value: 'textarea' },
  { label: 'Number', value: 'number' },
  { label: 'Boolean', value: 'boolean' },
  { label: 'Date', value: 'date' },
  { label: 'Email', value: 'email' },
  { label: 'URL', value: 'url' },
  { label: 'Select', value: 'select' },
];

function addField() {
  model.value = [
    ...model.value,
    { name: '', type: 'text', required: false, label: '' },
  ];
}

function removeField(index: number) {
  model.value = model.value.filter((_, i) => i !== index);
}

function updateField(index: number, key: keyof FieldDefinition, value: unknown) {
  const updated = [...model.value];
  (updated[index] as Record<string, unknown>)[key] = value;
  model.value = updated;
}

function updateOptions(index: number, raw: string) {
  const updated = [...model.value];
  updated[index] = {
    ...updated[index],
    options: raw.split('\n').map((s) => s.trim()).filter(Boolean),
  };
  model.value = updated;
}

function getOptionsRaw(index: number): string {
  return model.value[index]?.options?.join('\n') ?? '';
}

function isDuplicate(index: number): boolean {
  const name = model.value[index]?.name;
  if (!name) return false;
  return model.value.some((f, i) => i !== index && f.name === name);
}
</script>

<template>
  <div class="space-y-4">
    <div
      v-for="(field, index) in model"
      :key="index"
      class="border rounded-lg p-4 space-y-3"
    >
      <div class="flex items-start gap-3">
        <div class="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-3">
          <UFormField :label="$t('fieldBuilder.fieldName')" :error="isDuplicate(index) ? $t('fieldBuilder.duplicateName') : undefined">
            <UInput
              :model-value="field.name"
              :placeholder="$t('fieldBuilder.fieldNamePlaceholder')"
              class="w-full"
              @update:model-value="(v: string) => updateField(index, 'name', v)"
            />
          </UFormField>

          <UFormField :label="$t('fieldBuilder.fieldLabel')">
            <UInput
              :model-value="field.label"
              :placeholder="$t('fieldBuilder.fieldLabelPlaceholder')"
              class="w-full"
              @update:model-value="(v: string) => updateField(index, 'label', v)"
            />
          </UFormField>

          <UFormField :label="$t('fieldBuilder.fieldType')">
            <USelect
              :model-value="field.type"
              :items="fieldTypes"
              class="w-full"
              @update:model-value="(v: string) => updateField(index, 'type', v)"
            />
          </UFormField>

          <UFormField :label="$t('fieldBuilder.fieldRequired')">
            <USwitch
              :model-value="field.required"
              @update:model-value="(v: boolean) => updateField(index, 'required', v)"
            />
          </UFormField>
        </div>

        <UButton
          icon="i-lucide-trash-2"
          variant="ghost"
          color="error"
          size="sm"
          class="mt-6"
          @click="removeField(index)"
        />
      </div>

      <UFormField v-if="field.type === 'select'" :label="$t('fieldBuilder.fieldOptions')">
        <UTextarea
          :model-value="getOptionsRaw(index)"
          :placeholder="$t('fieldBuilder.fieldOptionsPlaceholder')"
          :rows="3"
          class="w-full"
          @update:model-value="(v: string) => updateOptions(index, v)"
        />
      </UFormField>
    </div>

    <UButton variant="outline" icon="i-lucide-plus" @click="addField">
      {{ $t('fieldBuilder.addField') }}
    </UButton>
  </div>
</template>
