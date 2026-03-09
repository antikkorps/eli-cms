<script setup lang="ts">
import draggable from 'vuedraggable';

const { t } = useI18n();
const { items: availableComponents, fetch: fetchComponents } = useComponents();
onMounted(fetchComponents);

interface FieldValidation {
  minLength?: number;
  maxLength?: number;
  min?: number;
  max?: number;
  pattern?: string;
  patternMessage?: string;
  unique?: boolean;
}

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
  componentSlugs?: string[];
  validation?: FieldValidation;
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

const allFieldTypes = computed(() => [
  { label: t('fieldTypes.text'), value: 'text' },
  { label: t('fieldTypes.textarea'), value: 'textarea' },
  { label: t('fieldTypes.number'), value: 'number' },
  { label: t('fieldTypes.boolean'), value: 'boolean' },
  { label: t('fieldTypes.date'), value: 'date' },
  { label: t('fieldTypes.email'), value: 'email' },
  { label: t('fieldTypes.url'), value: 'url' },
  { label: t('fieldTypes.select'), value: 'select' },
  { label: t('fieldTypes.media'), value: 'media' },
  { label: t('fieldTypes.richtext'), value: 'richtext' },
  { label: t('fieldTypes.author'), value: 'author' },
  { label: t('fieldTypes.repeatable'), value: 'repeatable' },
  { label: t('fieldTypes.component'), value: 'component' },
]);

const fieldTypes = computed(() =>
  props.disableRepeatable
    ? allFieldTypes.value.filter((ft) => ft.value !== 'repeatable' && ft.value !== 'component')
    : allFieldTypes.value,
);

const componentSelectItems = computed(() =>
  availableComponents.value.map((c) => ({ label: c.name, value: c.slug })),
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
  updated[index] = Object.assign({}, updated[index]!, {
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
    updated[index] = Object.assign({}, updated[index]!, { accept: undefined });
  } else {
    const mimes = selected.flatMap((v) => v.split(', ').map((s) => s.trim()));
    updated[index] = Object.assign({}, updated[index]!, { accept: mimes });
  }
  model.value = updated;
}

function addSubField(index: number) {
  const updated = [...model.value];
  const field = { ...updated[index]! };
  const sub = { name: '', type: 'text', required: false, label: '' } as FieldDefinition;
  ensureUid(sub);
  field.subFields = [...(field.subFields ?? []), sub];
  updated[index] = field;
  model.value = updated;
}

function removeSubField(fieldIndex: number, subIndex: number) {
  const updated = [...model.value];
  const field = { ...updated[fieldIndex]! };
  field.subFields = (field.subFields ?? []).filter((_, i) => i !== subIndex);
  updated[fieldIndex] = field;
  model.value = updated;
}

function updateSubField(fieldIndex: number, subIndex: number, key: keyof FieldDefinition, value: unknown) {
  const updated = [...model.value];
  const field = { ...updated[fieldIndex]! };
  const subs = [...(field.subFields ?? [])];
  subs[subIndex] = { ...subs[subIndex]!, [key]: value };
  field.subFields = subs;
  updated[fieldIndex] = field;
  model.value = updated;
}

function updateSubFieldOptions(fieldIndex: number, subIndex: number, raw: string) {
  const updated = [...model.value];
  const field = { ...updated[fieldIndex]! };
  const subs = [...(field.subFields ?? [])];
  subs[subIndex] = { ...subs[subIndex]!, options: raw.split('\n').map((s) => s.trim()).filter(Boolean) };
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

function updateValidation(index: number, key: keyof FieldValidation, value: unknown) {
  const updated = [...model.value];
  const field = { ...updated[index]! };
  const v = { ...(field.validation ?? {}) } as Record<string, unknown>;
  if (value === '' || value === undefined || value === null) {
    delete v[key];
  } else {
    v[key] = value;
  }
  field.validation = Object.keys(v).length > 0 ? (v as FieldValidation) : undefined;
  updated[index] = field;
  model.value = updated;
}

function updateSubFieldValidation(fieldIndex: number, subIndex: number, key: keyof FieldValidation, value: unknown) {
  const updated = [...model.value];
  const field = { ...updated[fieldIndex]! };
  const subs = [...(field.subFields ?? [])];
  const sub = { ...subs[subIndex]! };
  const v = { ...(sub.validation ?? {}) } as Record<string, unknown>;
  if (value === '' || value === undefined || value === null) {
    delete v[key];
  } else {
    v[key] = value;
  }
  sub.validation = Object.keys(v).length > 0 ? (v as FieldValidation) : undefined;
  subs[subIndex] = sub;
  field.subFields = subs;
  updated[fieldIndex] = field;
  model.value = updated;
}

const validatableStringTypes = ['text', 'textarea', 'email', 'url', 'richtext'];
const validatableUniqueTypes = ['text', 'email', 'url', 'number'];
const patternTypes = ['text', 'textarea', 'email', 'url'];

function showValidation(type: string): boolean {
  return validatableStringTypes.includes(type) || type === 'number';
}

function onSubFieldsReorder(fieldIndex: number, newSubFields: FieldDefinition[]) {
  const updated = [...model.value];
  updated[fieldIndex] = { ...updated[fieldIndex]!, subFields: newSubFields };
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
                  :items="[{ label: $t('fieldBuilder.noDefault'), value: '' }, ...(field.options ?? []).map((o: string) => ({ label: o, value: o }))]"
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
                value-key="value"
                :placeholder="$t('fieldBuilder.fieldAcceptPlaceholder')"
                class="w-full"
                @update:model-value="(v: string[]) => updateAcceptFromSelect(index, v)"
              />
            </UFormField>
          </div>

          <!-- Component type: select allowed components -->
          <div v-if="field.type === 'component'" class="grid grid-cols-1 gap-3">
            <UFormField :label="$t('fieldBuilder.allowedComponents')">
              <USelectMenu
                :model-value="field.componentSlugs ?? []"
                :items="componentSelectItems"
                multiple
                value-key="value"
                :placeholder="$t('fieldBuilder.allowedComponentsPlaceholder')"
                class="w-full"
                @update:model-value="(v: string[]) => updateField(index, 'componentSlugs', v)"
              />
            </UFormField>
          </div>

          <!-- Validation rules (collapsible) -->
          <UCollapsible v-if="showValidation(field.type)" class="mt-1">
            <UButton variant="ghost" color="neutral" size="sm" icon="i-lucide-shield-check" trailing-icon="i-lucide-chevron-down" block class="justify-start">
              {{ $t('fieldBuilder.validation') }}
            </UButton>
            <template #content>
              <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 p-2 mt-1 border border-accented rounded-lg">
                <UFormField v-if="validatableStringTypes.includes(field.type)" :label="$t('fieldBuilder.validationMinLength')">
                  <UInput
                    type="number"
                    :model-value="field.validation?.minLength ?? ''"
                    placeholder="0"
                    class="w-full"
                    @update:model-value="(v: string | number) => updateValidation(index, 'minLength', v === '' ? undefined : Number(v))"
                  />
                </UFormField>
                <UFormField v-if="validatableStringTypes.includes(field.type)" :label="$t('fieldBuilder.validationMaxLength')">
                  <UInput
                    type="number"
                    :model-value="field.validation?.maxLength ?? ''"
                    placeholder="1000"
                    class="w-full"
                    @update:model-value="(v: string | number) => updateValidation(index, 'maxLength', v === '' ? undefined : Number(v))"
                  />
                </UFormField>
                <UFormField v-if="field.type === 'number'" :label="$t('fieldBuilder.validationMin')">
                  <UInput
                    type="number"
                    :model-value="field.validation?.min ?? ''"
                    class="w-full"
                    @update:model-value="(v: string | number) => updateValidation(index, 'min', v === '' ? undefined : Number(v))"
                  />
                </UFormField>
                <UFormField v-if="field.type === 'number'" :label="$t('fieldBuilder.validationMax')">
                  <UInput
                    type="number"
                    :model-value="field.validation?.max ?? ''"
                    class="w-full"
                    @update:model-value="(v: string | number) => updateValidation(index, 'max', v === '' ? undefined : Number(v))"
                  />
                </UFormField>
                <UFormField v-if="patternTypes.includes(field.type)" :label="$t('fieldBuilder.validationPattern')">
                  <UInput
                    :model-value="field.validation?.pattern ?? ''"
                    :placeholder="$t('fieldBuilder.validationPatternPlaceholder')"
                    class="w-full"
                    @update:model-value="(v: string) => updateValidation(index, 'pattern', v || undefined)"
                  />
                </UFormField>
                <UFormField v-if="field.validation?.pattern" :label="$t('fieldBuilder.validationPatternMessage')">
                  <UInput
                    :model-value="field.validation?.patternMessage ?? ''"
                    :placeholder="$t('fieldBuilder.validationPatternMessagePlaceholder')"
                    class="w-full"
                    @update:model-value="(v: string) => updateValidation(index, 'patternMessage', v || undefined)"
                  />
                </UFormField>
                <div v-if="validatableUniqueTypes.includes(field.type)" class="flex items-end pb-1">
                  <label class="flex items-center gap-2 cursor-pointer">
                    <USwitch
                      :model-value="field.validation?.unique ?? false"
                      @update:model-value="(v: boolean) => updateValidation(index, 'unique', v || undefined)"
                    />
                    <span class="text-sm font-medium">{{ $t('fieldBuilder.validationUnique') }}</span>
                    <UTooltip :text="$t('fieldBuilder.validationUniqueHint')">
                      <UIcon name="i-lucide-info" class="size-3.5 text-gray-400 dark:text-gray-500" />
                    </UTooltip>
                  </label>
                </div>
              </div>
            </template>
          </UCollapsible>

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
                            :items="allFieldTypes.filter((ft: { value: string }) => ft.value !== 'repeatable' && ft.value !== 'component')"
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

                  <!-- Sub-field validation rules -->
                  <UCollapsible v-if="showValidation(sub.type)" class="mt-1">
                    <UButton variant="ghost" color="neutral" size="xs" icon="i-lucide-shield-check" trailing-icon="i-lucide-chevron-down" block class="justify-start">
                      {{ $t('fieldBuilder.validation') }}
                    </UButton>
                    <template #content>
                      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 p-2 mt-1 border border-accented rounded-lg">
                        <UFormField v-if="validatableStringTypes.includes(sub.type)" :label="$t('fieldBuilder.validationMinLength')">
                          <UInput
                            type="number"
                            :model-value="sub.validation?.minLength ?? ''"
                            placeholder="0"
                            class="w-full"
                            @update:model-value="(v: string | number) => updateSubFieldValidation(index, si, 'minLength', v === '' ? undefined : Number(v))"
                          />
                        </UFormField>
                        <UFormField v-if="validatableStringTypes.includes(sub.type)" :label="$t('fieldBuilder.validationMaxLength')">
                          <UInput
                            type="number"
                            :model-value="sub.validation?.maxLength ?? ''"
                            placeholder="1000"
                            class="w-full"
                            @update:model-value="(v: string | number) => updateSubFieldValidation(index, si, 'maxLength', v === '' ? undefined : Number(v))"
                          />
                        </UFormField>
                        <UFormField v-if="sub.type === 'number'" :label="$t('fieldBuilder.validationMin')">
                          <UInput
                            type="number"
                            :model-value="sub.validation?.min ?? ''"
                            class="w-full"
                            @update:model-value="(v: string | number) => updateSubFieldValidation(index, si, 'min', v === '' ? undefined : Number(v))"
                          />
                        </UFormField>
                        <UFormField v-if="sub.type === 'number'" :label="$t('fieldBuilder.validationMax')">
                          <UInput
                            type="number"
                            :model-value="sub.validation?.max ?? ''"
                            class="w-full"
                            @update:model-value="(v: string | number) => updateSubFieldValidation(index, si, 'max', v === '' ? undefined : Number(v))"
                          />
                        </UFormField>
                        <UFormField v-if="patternTypes.includes(sub.type)" :label="$t('fieldBuilder.validationPattern')">
                          <UInput
                            :model-value="sub.validation?.pattern ?? ''"
                            :placeholder="$t('fieldBuilder.validationPatternPlaceholder')"
                            class="w-full"
                            @update:model-value="(v: string) => updateSubFieldValidation(index, si, 'pattern', v || undefined)"
                          />
                        </UFormField>
                        <UFormField v-if="sub.validation?.pattern" :label="$t('fieldBuilder.validationPatternMessage')">
                          <UInput
                            :model-value="sub.validation?.patternMessage ?? ''"
                            :placeholder="$t('fieldBuilder.validationPatternMessagePlaceholder')"
                            class="w-full"
                            @update:model-value="(v: string) => updateSubFieldValidation(index, si, 'patternMessage', v || undefined)"
                          />
                        </UFormField>
                      </div>
                    </template>
                  </UCollapsible>
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
