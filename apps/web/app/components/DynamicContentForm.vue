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
  subFields?: FieldDefinition[];
}

const props = withDefaults(
  defineProps<{
    fields: FieldDefinition[];
    errors?: Record<string, string>;
  }>(),
  { errors: () => ({}) },
);

const model = defineModel<Record<string, unknown>>({ default: () => ({}) });

function updateValue(fieldName: string, value: unknown) {
  model.value = { ...model.value, [fieldName]: value };
}

function getSelectItems(field: FieldDefinition) {
  return (field.options ?? []).map((o) => ({ label: o, value: o }));
}

// ─── Repeatable helpers ─────────────────────────────────
function getRepeatableItems(fieldName: string): Record<string, unknown>[] {
  const val = model.value[fieldName];
  return Array.isArray(val) ? val : [];
}

function addRepeatableItem(fieldName: string) {
  const items = [...getRepeatableItems(fieldName), {}];
  updateValue(fieldName, items);
}

function removeRepeatableItem(fieldName: string, index: number) {
  const items = getRepeatableItems(fieldName).filter((_, i) => i !== index);
  updateValue(fieldName, items);
}

function updateRepeatableItem(fieldName: string, index: number, subFieldName: string, value: unknown) {
  const items = [...getRepeatableItems(fieldName)];
  items[index] = { ...items[index], [subFieldName]: value };
  updateValue(fieldName, items);
}

function moveRepeatableItem(fieldName: string, index: number, direction: 'up' | 'down') {
  const items = [...getRepeatableItems(fieldName)];
  const target = direction === 'up' ? index - 1 : index + 1;
  if (target < 0 || target >= items.length) return;
  [items[index], items[target]] = [items[target]!, items[index]!];
  updateValue(fieldName, items);
}

function getRepeatableSubSelectItems(field: FieldDefinition) {
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
      :error="props.errors[field.name]"
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
        @update:model-value="(v: number) => updateValue(field.name, v)"
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
        :model-value="field.multiple ? ((model[field.name] as string[]) ?? []) : ((model[field.name] as string) ?? null)"
        :multiple="field.multiple"
        :accept="field.accept"
        @update:model-value="(v: any) => updateValue(field.name, v)"
      />

      <AuthorPicker
        v-else-if="field.type === 'author'"
        :model-value="(model[field.name] as string) ?? null"
        @update:model-value="(v: string | null) => updateValue(field.name, v)"
      />

      <UEditor
        v-else-if="field.type === 'richtext'"
        :model-value="(model[field.name] as string) ?? ''"
        content-type="html"
        :placeholder="field.label"
        class="w-full min-h-48"
        @update:model-value="(v: string) => updateValue(field.name, v)"
      />

      <!-- Repeatable field -->
      <template v-else-if="field.type === 'repeatable' && field.subFields">
        <div class="space-y-3 w-full">
          <div
            v-for="(item, itemIndex) in getRepeatableItems(field.name)"
            :key="itemIndex"
            class="border rounded-lg p-4 space-y-3 bg-gray-50 dark:bg-gray-900"
          >
            <div class="flex items-center justify-between mb-2">
              <span class="text-sm font-medium text-gray-500">#{{ itemIndex + 1 }}</span>
              <div class="flex gap-1">
                <UButton
                  icon="i-lucide-arrow-up"
                  variant="ghost"
                  size="xs"
                  :disabled="itemIndex === 0"
                  @click="moveRepeatableItem(field.name, itemIndex, 'up')"
                />
                <UButton
                  icon="i-lucide-arrow-down"
                  variant="ghost"
                  size="xs"
                  :disabled="itemIndex === getRepeatableItems(field.name).length - 1"
                  @click="moveRepeatableItem(field.name, itemIndex, 'down')"
                />
                <UButton
                  icon="i-lucide-trash-2"
                  variant="ghost"
                  color="error"
                  size="xs"
                  @click="removeRepeatableItem(field.name, itemIndex)"
                />
              </div>
            </div>

            <UFormField
              v-for="sub in field.subFields"
              :key="sub.name"
              :label="sub.label"
              :required="sub.required"
              :error="props.errors[`${field.name}.${itemIndex}.${sub.name}`]"
            >
              <UInput
                v-if="sub.type === 'text' || sub.type === 'email' || sub.type === 'url'"
                :model-value="(item[sub.name] as string) ?? ''"
                :type="sub.type === 'email' ? 'email' : sub.type === 'url' ? 'url' : 'text'"
                :required="sub.required"
                class="w-full"
                @update:model-value="(v: string) => updateRepeatableItem(field.name, itemIndex, sub.name, v)"
              />

              <UTextarea
                v-else-if="sub.type === 'textarea'"
                :model-value="(item[sub.name] as string) ?? ''"
                :required="sub.required"
                :rows="3"
                class="w-full"
                @update:model-value="(v: string) => updateRepeatableItem(field.name, itemIndex, sub.name, v)"
              />

              <UInput
                v-else-if="sub.type === 'number'"
                :model-value="(item[sub.name] as number) ?? ''"
                type="number"
                :required="sub.required"
                class="w-full"
                @update:model-value="(v: number) => updateRepeatableItem(field.name, itemIndex, sub.name, v)"
              />

              <USwitch
                v-else-if="sub.type === 'boolean'"
                :model-value="(item[sub.name] as boolean) ?? false"
                @update:model-value="(v: boolean) => updateRepeatableItem(field.name, itemIndex, sub.name, v)"
              />

              <UInput
                v-else-if="sub.type === 'date'"
                :model-value="(item[sub.name] as string) ?? ''"
                type="date"
                :required="sub.required"
                class="w-full"
                @update:model-value="(v: string) => updateRepeatableItem(field.name, itemIndex, sub.name, v)"
              />

              <USelect
                v-else-if="sub.type === 'select'"
                :model-value="(item[sub.name] as string) ?? ''"
                :items="getRepeatableSubSelectItems(sub)"
                :required="sub.required"
                class="w-full"
                @update:model-value="(v: string) => updateRepeatableItem(field.name, itemIndex, sub.name, v)"
              />

              <MediaPicker
                v-else-if="sub.type === 'media'"
                :model-value="sub.multiple ? ((item[sub.name] as string[]) ?? []) : ((item[sub.name] as string) ?? null)"
                :multiple="sub.multiple"
                :accept="sub.accept"
                @update:model-value="(v: any) => updateRepeatableItem(field.name, itemIndex, sub.name, v)"
              />

              <AuthorPicker
                v-else-if="sub.type === 'author'"
                :model-value="(item[sub.name] as string) ?? null"
                @update:model-value="(v: string | null) => updateRepeatableItem(field.name, itemIndex, sub.name, v)"
              />

              <UEditor
                v-else-if="sub.type === 'richtext'"
                :model-value="(item[sub.name] as string) ?? ''"
                content-type="html"
                :placeholder="sub.label"
                class="w-full min-h-32"
                @update:model-value="(v: string) => updateRepeatableItem(field.name, itemIndex, sub.name, v)"
              />
            </UFormField>
          </div>

          <UButton variant="outline" size="sm" icon="i-lucide-plus" @click="addRepeatableItem(field.name)">
            {{ t('fieldBuilder.addItem') }}
          </UButton>
        </div>
      </template>
    </UFormField>
  </div>
</template>
