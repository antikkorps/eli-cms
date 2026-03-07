<script setup lang="ts">
import draggable from 'vuedraggable';

const { t } = useI18n();

interface FieldDefinition {
  name: string;
  type: string;
  required: boolean;
  label: string;
  options?: string[];
  multiple?: boolean;
  accept?: string[];
  subFields?: FieldDefinition[];
  defaultValue?: unknown;
  group?: string;
}

const model = defineModel<FieldDefinition[]>({ default: () => [] });

let uidCounter = 0;
function ensureUid(field: FieldDefinition): FieldDefinition {
  const f = field as unknown as Record<string, unknown>;
  if (!f._uid) f._uid = `f_${++uidCounter}`;
  for (const sub of field.subFields ?? []) {
    const s = sub as unknown as Record<string, unknown>;
    if (!s._uid) s._uid = `s_${++uidCounter}`;
  }
  return field;
}

// Ensure existing fields get UIDs
watch(model, (fields) => { fields.forEach(ensureUid); }, { immediate: true, deep: false });

const props = defineProps<{
  /** When true, hides the repeatable type (used for sub-field builders) */
  disableRepeatable?: boolean;
}>();

const allFieldTypes = [
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
  { label: 'Author', value: 'author' },
  { label: 'Repeatable', value: 'repeatable' },
];

const fieldTypes = computed(() =>
  props.disableRepeatable
    ? allFieldTypes.filter((ft) => ft.value !== 'repeatable')
    : allFieldTypes,
);

function addField() {
  const field = { name: '', type: 'text', required: false, label: '' } as FieldDefinition;
  ensureUid(field);
  model.value = [...model.value, field];
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

function addSubField(index: number) {
  const updated = [...model.value];
  const field = { ...updated[index] };
  const sub = { name: '', type: 'text', required: false, label: '' } as FieldDefinition;
  ensureUid(sub);
  field.subFields = [...(field.subFields ?? []), sub];
  updated[index] = field;
  model.value = updated;
}

function removeSubField(fieldIndex: number, subIndex: number) {
  const updated = [...model.value];
  const field = { ...updated[fieldIndex] };
  field.subFields = (field.subFields ?? []).filter((_, i) => i !== subIndex);
  updated[fieldIndex] = field;
  model.value = updated;
}

function updateSubField(fieldIndex: number, subIndex: number, key: keyof FieldDefinition, value: unknown) {
  const updated = [...model.value];
  const field = { ...updated[fieldIndex] };
  const subs = [...(field.subFields ?? [])];
  subs[subIndex] = { ...subs[subIndex], [key]: value };
  field.subFields = subs;
  updated[fieldIndex] = field;
  model.value = updated;
}

function updateSubFieldOptions(fieldIndex: number, subIndex: number, raw: string) {
  const updated = [...model.value];
  const field = { ...updated[fieldIndex] };
  const subs = [...(field.subFields ?? [])];
  subs[subIndex] = { ...subs[subIndex], options: raw.split('\n').map((s) => s.trim()).filter(Boolean) };
  field.subFields = subs;
  updated[fieldIndex] = field;
  model.value = updated;
}

function getSubFieldOptionsRaw(fieldIndex: number, subIndex: number): string {
  return model.value[fieldIndex]?.subFields?.[subIndex]?.options?.join('\n') ?? '';
}

function isSubFieldDuplicate(fieldIndex: number, subIndex: number): boolean {
  const subs = model.value[fieldIndex]?.subFields ?? [];
  const name = subs[subIndex]?.name;
  if (!name) return false;
  return subs.some((f, i) => i !== subIndex && f.name === name);
}

function subFieldNameError(fieldIndex: number, subIndex: number): string | undefined {
  if (isSubFieldDuplicate(fieldIndex, subIndex)) return t('fieldBuilder.duplicateName');
  const name = model.value[fieldIndex]?.subFields?.[subIndex]?.name;
  if (name && !/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(name)) return t('fieldBuilder.invalidName');
  return undefined;
}

function isDuplicate(index: number): boolean {
  const name = model.value[index]?.name;
  if (!name) return false;
  return model.value.some((f, i) => i !== index && f.name === name);
}

function nameError(index: number): string | undefined {
  if (isDuplicate(index)) return t('fieldBuilder.duplicateName');
  const name = model.value[index]?.name;
  if (name && !/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(name)) return t('fieldBuilder.invalidName');
  return undefined;
}

function onSubFieldsReorder(fieldIndex: number, newSubFields: FieldDefinition[]) {
  const updated = [...model.value];
  updated[fieldIndex] = { ...updated[fieldIndex], subFields: newSubFields };
  model.value = updated;
}
</script>

<template>
  <div class="space-y-4">
    <draggable
      :model-value="model"
      item-key="_uid"
      handle=".drag-handle"
      animation="200"
      ghost-class="opacity-30"
      class="space-y-4"
      @update:model-value="(v: FieldDefinition[]) => model = v"
    >
      <template #item="{ element: field, index }">
        <div class="border border-accented rounded-lg p-4 space-y-4">
          <div class="flex items-start gap-3">
            <UButton
              icon="i-lucide-grip-vertical"
              variant="ghost"
              color="neutral"
              size="sm"
              class="drag-handle cursor-grab mt-6"
            />

            <div class="flex-1 space-y-3">
              <!-- Row 1: Name, Label, Type -->
              <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                <UFormField :label="$t('fieldBuilder.fieldName')" :error="nameError(index)">
                  <UInput
                    :model-value="field.name"
                    :placeholder="$t('fieldBuilder.fieldNamePlaceholder')"
                    required
                    class="w-full"
                    @update:model-value="(v: string) => updateField(index, 'name', v)"
                  />
                </UFormField>

                <UFormField :label="$t('fieldBuilder.fieldLabel')">
                  <UInput
                    :model-value="field.label"
                    :placeholder="$t('fieldBuilder.fieldLabelPlaceholder')"
                    required
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
              </div>

              <!-- Row 2: Required, Group, Default value -->
              <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                <UFormField>
                  <template #label>
                    <span class="flex items-center gap-1">
                      {{ $t('fieldBuilder.fieldGroup') }}
                      <UTooltip :text="$t('fieldBuilder.fieldGroupHint')">
                        <UIcon name="i-lucide-info" class="size-3.5 text-gray-400 dark:text-gray-500" />
                      </UTooltip>
                    </span>
                  </template>
                  <UInput
                    :model-value="field.group ?? ''"
                    :placeholder="$t('fieldBuilder.fieldGroupPlaceholder')"
                    class="w-full"
                    @update:model-value="(v: string) => updateField(index, 'group', v || undefined)"
                  />
                </UFormField>

                <UFormField
                  v-if="!['media', 'author', 'richtext', 'repeatable', 'select'].includes(field.type)"
                >
                  <template #label>
                    <span class="flex items-center gap-1">
                      {{ $t('fieldBuilder.fieldDefault') }}
                      <UTooltip :text="$t('fieldBuilder.fieldDefaultHint')">
                        <UIcon name="i-lucide-info" class="size-3.5 text-gray-400 dark:text-gray-500" />
                      </UTooltip>
                    </span>
                  </template>
                  <UInput
                    v-if="['text', 'textarea', 'email', 'url'].includes(field.type)"
                    :model-value="(field.defaultValue as string) ?? ''"
                    :placeholder="$t('fieldBuilder.fieldDefaultPlaceholder')"
                    class="w-full"
                    @update:model-value="(v: string) => updateField(index, 'defaultValue', v || undefined)"
                  />
                  <UInput
                    v-else-if="field.type === 'number'"
                    :model-value="(field.defaultValue as number) ?? ''"
                    type="number"
                    :placeholder="$t('fieldBuilder.fieldDefaultPlaceholder')"
                    class="w-full"
                    @update:model-value="(v: number | string) => updateField(index, 'defaultValue', v === '' ? undefined : Number(v))"
                  />
                  <div v-else-if="field.type === 'boolean'" class="h-9 flex items-center">
                    <USwitch
                      :model-value="(field.defaultValue as boolean) ?? false"
                      @update:model-value="(v: boolean) => updateField(index, 'defaultValue', v)"
                    />
                  </div>
                  <UInput
                    v-else-if="field.type === 'date'"
                    :model-value="(field.defaultValue as string) ?? ''"
                    type="date"
                    class="w-full"
                    @update:model-value="(v: string) => updateField(index, 'defaultValue', v || undefined)"
                  />
                </UFormField>

                <div class="flex items-end h-full pb-1">
                  <label class="flex items-center gap-2 cursor-pointer">
                    <USwitch
                      :model-value="field.required"
                      @update:model-value="(v: boolean) => updateField(index, 'required', v)"
                    />
                    <span class="text-sm font-medium">{{ $t('fieldBuilder.fieldRequired') }}</span>
                  </label>
                </div>
              </div>
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

          <!-- Select: default value + options (separate row since they need more space) -->
          <template v-if="field.type === 'select'">
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <UFormField>
                <template #label>
                  <span class="flex items-center gap-1">
                    {{ $t('fieldBuilder.fieldDefault') }}
                    <UTooltip :text="$t('fieldBuilder.fieldDefaultHint')">
                      <UIcon name="i-lucide-info" class="size-3.5 text-gray-400 dark:text-gray-500" />
                    </UTooltip>
                  </span>
                </template>
                <USelect
                  :model-value="(field.defaultValue as string) ?? ''"
                  :items="[{ label: $t('fieldBuilder.noDefault'), value: '' }, ...(field.options ?? []).map((o) => ({ label: o, value: o }))]"
                  class="w-full"
                  @update:model-value="(v: string) => updateField(index, 'defaultValue', v || undefined)"
                />
              </UFormField>

              <UFormField :label="$t('fieldBuilder.fieldOptions')">
                <UTextarea
                  :model-value="getOptionsRaw(index)"
                  :placeholder="$t('fieldBuilder.fieldOptionsPlaceholder')"
                  :rows="3"
                  class="w-full"
                  @update:model-value="(v: string) => updateOptions(index, v)"
                />
              </UFormField>
            </div>
          </template>

          <!-- Media options -->
          <div v-if="field.type === 'media'" class="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <UFormField :label="$t('fieldBuilder.fieldMultiple')">
              <USwitch
                :model-value="field.multiple ?? false"
                @update:model-value="(v: boolean) => updateField(index, 'multiple', v)"
              />
            </UFormField>
            <UFormField>
              <template #label>
                <span class="flex items-center gap-1">
                  {{ $t('fieldBuilder.fieldAccept') }}
                  <UTooltip :text="$t('fieldBuilder.fieldAcceptHint')">
                    <UIcon name="i-lucide-info" class="size-3.5 text-gray-400 dark:text-gray-500" />
                  </UTooltip>
                </span>
              </template>
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

          <!-- Sub-field builder for repeatable fields -->
          <div v-if="field.type === 'repeatable'" class="mt-1 ml-4 border-l-2 border-primary-200 dark:border-primary-800 pl-4 space-y-3">
            <p class="text-sm font-medium text-gray-600 dark:text-gray-400">{{ $t('fieldBuilder.subFields') }}</p>

            <draggable
              :model-value="field.subFields ?? []"
              item-key="_uid"
              handle=".sub-drag-handle"
              animation="200"
              ghost-class="opacity-30"
              class="space-y-3"
              @update:model-value="(v: FieldDefinition[]) => onSubFieldsReorder(index, v)"
            >
              <template #item="{ element: sub, index: si }">
                <div class="border border-accented rounded-lg p-3 space-y-3 bg-gray-50 dark:bg-gray-900">
                  <div class="flex items-start gap-3">
                    <UButton
                      icon="i-lucide-grip-vertical"
                      variant="ghost"
                      color="neutral"
                      size="xs"
                      class="sub-drag-handle cursor-grab mt-6"
                    />

                    <div class="flex-1 space-y-3">
                      <!-- Sub row 1: Name, Label, Type -->
                      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                        <UFormField :label="$t('fieldBuilder.fieldName')" :error="subFieldNameError(index, si)">
                          <UInput
                            :model-value="sub.name"
                            :placeholder="$t('fieldBuilder.fieldNamePlaceholder')"
                            required
                            class="w-full"
                            @update:model-value="(v: string) => updateSubField(index, si, 'name', v)"
                          />
                        </UFormField>

                        <UFormField :label="$t('fieldBuilder.fieldLabel')">
                          <UInput
                            :model-value="sub.label"
                            :placeholder="$t('fieldBuilder.fieldLabelPlaceholder')"
                            required
                            class="w-full"
                            @update:model-value="(v: string) => updateSubField(index, si, 'label', v)"
                          />
                        </UFormField>

                        <UFormField :label="$t('fieldBuilder.fieldType')">
                          <USelect
                            :model-value="sub.type"
                            :items="allFieldTypes.filter((ft) => ft.value !== 'repeatable')"
                            class="w-full"
                            @update:model-value="(v: string) => updateSubField(index, si, 'type', v)"
                          />
                        </UFormField>
                      </div>

                      <!-- Sub row 2: Required -->
                      <UFormField :label="$t('fieldBuilder.fieldRequired')">
                        <USwitch
                          :model-value="sub.required"
                          @update:model-value="(v: boolean) => updateSubField(index, si, 'required', v)"
                        />
                      </UFormField>
                    </div>

                    <UButton
                      icon="i-lucide-trash-2"
                      variant="ghost"
                      color="error"
                      size="sm"
                      class="mt-6"
                      @click="removeSubField(index, si)"
                    />
                  </div>

                  <UFormField v-if="sub.type === 'select'" :label="$t('fieldBuilder.fieldOptions')">
                    <UTextarea
                      :model-value="getSubFieldOptionsRaw(index, si)"
                      :placeholder="$t('fieldBuilder.fieldOptionsPlaceholder')"
                      :rows="3"
                      class="w-full"
                      @update:model-value="(v: string) => updateSubFieldOptions(index, si, v)"
                    />
                  </UFormField>
                </div>
              </template>
            </draggable>

            <UButton variant="outline" size="sm" icon="i-lucide-plus" @click="addSubField(index)">
              {{ $t('fieldBuilder.addSubField') }}
            </UButton>
          </div>
        </div>
      </template>
    </draggable>

    <UButton variant="outline" icon="i-lucide-plus" @click="addField">
      {{ $t('fieldBuilder.addField') }}
    </UButton>
  </div>
</template>
