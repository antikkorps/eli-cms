<script setup lang="ts">
const { t } = useI18n();

interface FieldDefinition {
  name: string;
  type: string;
  required: boolean;
  label: string;
  options?: string[];
  multiple?: boolean;
  accept?: string[];
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
  { label: 'Media', value: 'media' },
  { label: 'Rich Text', value: 'richtext' },
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
  (updated[index] as unknown as Record<string, unknown>)[key] = value;
  model.value = updated;
}

function updateOptions(index: number, raw: string) {
  const updated = [...model.value];
  updated[index] = Object.assign({}, updated[index], {
    options: raw.split('\n').map((s) => s.trim()).filter(Boolean),
  });
  model.value = updated;
}

function getOptionsRaw(index: number): string {
  return model.value[index]?.options?.join('\n') ?? '';
}

const mediaAcceptCategories = [
  { label: 'Images (JPEG, PNG, GIF, WebP, SVG)', value: 'image/*' },
  { label: 'PDF', value: 'application/pdf' },
  { label: 'Word', value: 'application/msword, application/vnd.openxmlformats-officedocument.wordprocessingml.document' },
  { label: 'Excel', value: 'application/vnd.ms-excel, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' },
  { label: 'PowerPoint', value: 'application/vnd.ms-powerpoint, application/vnd.openxmlformats-officedocument.presentationml.presentation' },
];

function getAcceptSelected(index: number): string[] {
  const accept = model.value[index]?.accept;
  if (!accept?.length) return [];
  const flat = accept.join(', ');
  return mediaAcceptCategories
    .filter((cat) => cat.value.split(', ').every((mime) => flat.includes(mime)))
    .map((cat) => cat.value);
}

function updateAcceptFromSelect(index: number, selected: string[]) {
  const updated = [...model.value];
  if (!selected.length) {
    updated[index] = Object.assign({}, updated[index], { accept: undefined });
  } else {
    const mimes = selected.flatMap((v) => v.split(', ').map((s) => s.trim()));
    updated[index] = Object.assign({}, updated[index], { accept: mimes });
  }
  model.value = updated;
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

      <div v-if="field.type === 'media'" class="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <UFormField :label="$t('fieldBuilder.fieldMultiple')">
          <USwitch
            :model-value="field.multiple ?? false"
            @update:model-value="(v: boolean) => updateField(index, 'multiple', v)"
          />
        </UFormField>
        <UFormField :label="$t('fieldBuilder.fieldAccept')" :hint="$t('fieldBuilder.fieldAcceptHint')">
          <USelectMenu
            :model-value="getAcceptSelected(index)"
            :items="mediaAcceptCategories"
            multiple
            :placeholder="$t('fieldBuilder.fieldAcceptPlaceholder')"
            class="w-full"
            @update:model-value="(v: string[]) => updateAcceptFromSelect(index, v)"
          />
        </UFormField>
      </div>
    </div>

    <UButton variant="outline" icon="i-lucide-plus" @click="addField">
      {{ $t('fieldBuilder.addField') }}
    </UButton>
  </div>
</template>
