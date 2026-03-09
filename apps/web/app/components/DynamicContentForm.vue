<script setup lang="ts">
const { t } = useI18n();

const editorToolbarItems = [
  [
    { kind: 'mark', mark: 'bold', icon: 'i-lucide-bold', tooltip: { text: 'Bold' } },
    { kind: 'mark', mark: 'italic', icon: 'i-lucide-italic', tooltip: { text: 'Italic' } },
    { kind: 'mark', mark: 'strike', icon: 'i-lucide-strikethrough', tooltip: { text: 'Strikethrough' } },
  ],
  [
    { kind: 'heading', level: 2, icon: 'i-lucide-heading-2', tooltip: { text: 'Heading 2' } },
    { kind: 'heading', level: 3, icon: 'i-lucide-heading-3', tooltip: { text: 'Heading 3' } },
  ],
  [
    { kind: 'bulletList', icon: 'i-lucide-list', tooltip: { text: 'Bullet list' } },
    { kind: 'orderedList', icon: 'i-lucide-list-ordered', tooltip: { text: 'Ordered list' } },
  ],
  [
    { kind: 'blockquote', icon: 'i-lucide-quote', tooltip: { text: 'Blockquote' } },
    { kind: 'codeBlock', icon: 'i-lucide-code', tooltip: { text: 'Code block' } },
    { kind: 'link', icon: 'i-lucide-link', tooltip: { text: 'Link' } },
  ],
  [
    { kind: 'undo', icon: 'i-lucide-undo', tooltip: { text: 'Undo' } },
    { kind: 'redo', icon: 'i-lucide-redo', tooltip: { text: 'Redo' } },
  ],
];

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

interface ComponentDef {
  slug: string;
  name: string;
  icon?: string | null;
  fields: FieldDefinition[];
}

const props = withDefaults(
  defineProps<{
    fields: FieldDefinition[];
    errors?: Record<string, string>;
  }>(),
  { errors: () => ({}) },
);

const model = defineModel<Record<string, unknown>>({ default: () => ({}) });

// ─── Component blocks ──────────────────────────────────
const { items: availableComponents, fetch: fetchComponents } = useComponents();
onMounted(fetchComponents);

const componentMap = computed(() => {
  const map = new Map<string, ComponentDef>();
  for (const c of availableComponents.value) {
    map.set(c.slug, c as ComponentDef);
  }
  return map;
});

function getComponentBlocks(fieldName: string): Array<Record<string, unknown>> {
  const val = model.value[fieldName];
  return Array.isArray(val) ? val : [];
}

function buildDefaultBlock(componentSlug: string): Record<string, unknown> {
  const comp = componentMap.value.get(componentSlug);
  const block: Record<string, unknown> = { _component: componentSlug };
  if (!comp) return block;
  for (const f of comp.fields) {
    if (f.defaultValue !== undefined && f.defaultValue !== null) {
      block[f.name] = f.defaultValue;
    } else {
      switch (f.type) {
        case 'boolean': block[f.name] = false; break;
        case 'number': block[f.name] = undefined; break;
        case 'repeatable': block[f.name] = []; break;
        case 'media': block[f.name] = f.multiple ? [] : null; break;
        default: block[f.name] = ''; break;
      }
    }
  }
  return block;
}

function addComponentBlock(fieldName: string, componentSlug: string) {
  const blocks = [...getComponentBlocks(fieldName), buildDefaultBlock(componentSlug)];
  updateValue(fieldName, blocks);
}

function removeComponentBlock(fieldName: string, index: number) {
  const blocks = getComponentBlocks(fieldName).filter((_, i) => i !== index);
  updateValue(fieldName, blocks);
}

function updateComponentBlockField(fieldName: string, blockIndex: number, subFieldName: string, value: unknown) {
  const blocks = [...getComponentBlocks(fieldName)];
  blocks[blockIndex] = { ...blocks[blockIndex], [subFieldName]: value };
  updateValue(fieldName, blocks);
}

function moveComponentBlock(fieldName: string, index: number, direction: 'up' | 'down') {
  const blocks = [...getComponentBlocks(fieldName)];
  const target = direction === 'up' ? index - 1 : index + 1;
  if (target < 0 || target >= blocks.length) return;
  [blocks[index], blocks[target]] = [blocks[target]!, blocks[index]!];
  updateValue(fieldName, blocks);
}

function getAllowedComponents(field: FieldDefinition): ComponentDef[] {
  const slugs = field.componentSlugs ?? [];
  return slugs.map((s) => componentMap.value.get(s)).filter(Boolean) as ComponentDef[];
}

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

// ─── Field groups / tabs ────────────────────────────────
const hasGroups = computed(() => props.fields.some((f) => f.group));

const groupNames = computed(() => {
  if (!hasGroups.value) return [];
  const seen = new Set<string>();
  const names: string[] = [];
  for (const f of props.fields) {
    const g = f.group || t('fieldBuilder.defaultGroup');
    if (!seen.has(g)) {
      seen.add(g);
      names.push(g);
    }
  }
  return names;
});

const fieldsByGroup = computed(() => {
  const map = new Map<string, FieldDefinition[]>();
  for (const f of props.fields) {
    const g = f.group || t('fieldBuilder.defaultGroup');
    if (!map.has(g)) map.set(g, []);
    map.get(g)!.push(f);
  }
  return map;
});

const tabItems = computed(() =>
  groupNames.value.map((name) => ({ label: name, value: name })),
);

const activeTab = ref(groupNames.value[0] ?? '');
watch(groupNames, (names) => {
  if (names.length && !names.includes(activeTab.value)) {
    activeTab.value = names[0]!;
  }
}, { immediate: true });
</script>

<template>
  <div class="space-y-4">
    <!-- Tabbed layout when groups exist -->
    <template v-if="hasGroups">
      <UTabs v-model="activeTab" :items="tabItems" class="w-full" />
    </template>

    <template v-for="field in (hasGroups ? (fieldsByGroup.get(activeTab) ?? []) : props.fields)" :key="field.name">
    <UFormField
      :label="field.label"
      :required="field.required"
      :error="props.errors[field.name]"
    >
      <UInput
        v-if="field.type === 'text' || field.type === 'email' || field.type === 'url'"
        :model-value="(model[field.name] as string) ?? ''"
        :type="field.type === 'email' ? 'email' : field.type === 'url' ? 'url' : 'text'"
        :required="field.required"
        :minlength="field.validation?.minLength"
        :maxlength="field.validation?.maxLength"
        :pattern="field.validation?.pattern"
        class="w-full"
        @update:model-value="(v: string) => updateValue(field.name, v)"
      />

      <UTextarea
        v-else-if="field.type === 'textarea'"
        :model-value="(model[field.name] as string) ?? ''"
        :required="field.required"
        :minlength="field.validation?.minLength"
        :maxlength="field.validation?.maxLength"
        :rows="4"
        class="w-full"
        @update:model-value="(v: string) => updateValue(field.name, v)"
      />

      <UInput
        v-else-if="field.type === 'number'"
        :model-value="(model[field.name] as number) ?? ''"
        type="number"
        :required="field.required"
        :min="field.validation?.min"
        :max="field.validation?.max"
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
        v-slot="{ editor }"
        :model-value="(model[field.name] as string) ?? ''"
        content-type="html"
        :placeholder="field.label"
        class="w-full min-h-48 border border-accented rounded-md"
        @update:model-value="(v: string) => updateValue(field.name, v)"
      >
        <UEditorToolbar :editor="editor" :items="editorToolbarItems" class="border-b border-accented" />
      </UEditor>

      <!-- Repeatable field -->
      <template v-else-if="field.type === 'repeatable' && field.subFields">
        <div class="space-y-3 w-full">
          <div
            v-for="(item, itemIndex) in getRepeatableItems(field.name)"
            :key="itemIndex"
            class="border rounded-lg p-4 space-y-3 bg-gray-50 dark:bg-gray-900"
          >
            <div class="flex items-center justify-between mb-2">
              <span class="text-sm font-medium text-gray-500 dark:text-gray-400">#{{ itemIndex + 1 }}</span>
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
                v-slot="{ editor: subEditor }"
                :model-value="(item[sub.name] as string) ?? ''"
                content-type="html"
                :placeholder="sub.label"
                class="w-full min-h-32 border border-accented rounded-md"
                @update:model-value="(v: string) => updateRepeatableItem(field.name, itemIndex, sub.name, v)"
              >
                <UEditorToolbar :editor="subEditor" :items="editorToolbarItems" class="border-b border-accented" />
              </UEditor>
            </UFormField>
          </div>

          <UButton variant="outline" size="sm" icon="i-lucide-plus" @click="addRepeatableItem(field.name)">
            {{ t('fieldBuilder.addItem') }}
          </UButton>
        </div>
      </template>

      <!-- Component blocks field -->
      <template v-else-if="field.type === 'component'">
        <div class="space-y-3 w-full">
          <div
            v-for="(block, blockIndex) in getComponentBlocks(field.name)"
            :key="blockIndex"
            class="border border-primary-200 dark:border-primary-800 rounded-lg overflow-hidden"
          >
            <div class="flex items-center justify-between px-4 py-2 bg-primary-50 dark:bg-primary-950">
              <span class="text-sm font-medium">
                {{ componentMap.get(block._component as string)?.name ?? block._component }}
              </span>
              <div class="flex gap-1">
                <UButton
                  icon="i-lucide-arrow-up"
                  variant="ghost"
                  size="xs"
                  :disabled="blockIndex === 0"
                  @click="moveComponentBlock(field.name, blockIndex, 'up')"
                />
                <UButton
                  icon="i-lucide-arrow-down"
                  variant="ghost"
                  size="xs"
                  :disabled="blockIndex === getComponentBlocks(field.name).length - 1"
                  @click="moveComponentBlock(field.name, blockIndex, 'down')"
                />
                <UButton
                  icon="i-lucide-trash-2"
                  variant="ghost"
                  color="error"
                  size="xs"
                  @click="removeComponentBlock(field.name, blockIndex)"
                />
              </div>
            </div>

            <div class="p-4 space-y-3">
              <template v-for="compField in (componentMap.get(block._component as string)?.fields ?? [])" :key="compField.name">
                <UFormField
                  :label="compField.label"
                  :required="compField.required"
                  :error="props.errors[`${field.name}.${blockIndex}.${compField.name}`]"
                >
                  <UInput
                    v-if="compField.type === 'text' || compField.type === 'email' || compField.type === 'url'"
                    :model-value="(block[compField.name] as string) ?? ''"
                    :type="compField.type === 'email' ? 'email' : compField.type === 'url' ? 'url' : 'text'"
                    :required="compField.required"
                    class="w-full"
                    @update:model-value="(v: string) => updateComponentBlockField(field.name, blockIndex, compField.name, v)"
                  />

                  <UTextarea
                    v-else-if="compField.type === 'textarea'"
                    :model-value="(block[compField.name] as string) ?? ''"
                    :required="compField.required"
                    :rows="3"
                    class="w-full"
                    @update:model-value="(v: string) => updateComponentBlockField(field.name, blockIndex, compField.name, v)"
                  />

                  <UInput
                    v-else-if="compField.type === 'number'"
                    :model-value="(block[compField.name] as number) ?? ''"
                    type="number"
                    :required="compField.required"
                    class="w-full"
                    @update:model-value="(v: number) => updateComponentBlockField(field.name, blockIndex, compField.name, v)"
                  />

                  <USwitch
                    v-else-if="compField.type === 'boolean'"
                    :model-value="(block[compField.name] as boolean) ?? false"
                    @update:model-value="(v: boolean) => updateComponentBlockField(field.name, blockIndex, compField.name, v)"
                  />

                  <UInput
                    v-else-if="compField.type === 'date'"
                    :model-value="(block[compField.name] as string) ?? ''"
                    type="date"
                    :required="compField.required"
                    class="w-full"
                    @update:model-value="(v: string) => updateComponentBlockField(field.name, blockIndex, compField.name, v)"
                  />

                  <USelect
                    v-else-if="compField.type === 'select'"
                    :model-value="(block[compField.name] as string) ?? ''"
                    :items="getSelectItems(compField)"
                    :required="compField.required"
                    class="w-full"
                    @update:model-value="(v: string) => updateComponentBlockField(field.name, blockIndex, compField.name, v)"
                  />

                  <MediaPicker
                    v-else-if="compField.type === 'media'"
                    :model-value="compField.multiple ? ((block[compField.name] as string[]) ?? []) : ((block[compField.name] as string) ?? null)"
                    :multiple="compField.multiple"
                    :accept="compField.accept"
                    @update:model-value="(v: any) => updateComponentBlockField(field.name, blockIndex, compField.name, v)"
                  />

                  <AuthorPicker
                    v-else-if="compField.type === 'author'"
                    :model-value="(block[compField.name] as string) ?? null"
                    @update:model-value="(v: string | null) => updateComponentBlockField(field.name, blockIndex, compField.name, v)"
                  />

                  <UEditor
                    v-else-if="compField.type === 'richtext'"
                    v-slot="{ editor: blockEditor }"
                    :model-value="(block[compField.name] as string) ?? ''"
                    content-type="html"
                    :placeholder="compField.label"
                    class="w-full min-h-32 border border-accented rounded-md"
                    @update:model-value="(v: string) => updateComponentBlockField(field.name, blockIndex, compField.name, v)"
                  >
                    <UEditorToolbar :editor="blockEditor" :items="editorToolbarItems" class="border-b border-accented" />
                  </UEditor>
                </UFormField>
              </template>
            </div>
          </div>

          <!-- Add block buttons -->
          <div v-if="getAllowedComponents(field).length === 1" class="flex">
            <UButton
              variant="outline"
              size="sm"
              icon="i-lucide-plus"
              @click="addComponentBlock(field.name, getAllowedComponents(field)[0]!.slug)"
            >
              {{ t('fieldBuilder.addBlock', { name: getAllowedComponents(field)[0]!.name }) }}
            </UButton>
          </div>
          <div v-else-if="getAllowedComponents(field).length > 1" class="flex flex-wrap gap-2">
            <UButton
              v-for="comp in getAllowedComponents(field)"
              :key="comp.slug"
              variant="outline"
              size="sm"
              icon="i-lucide-plus"
              @click="addComponentBlock(field.name, comp.slug)"
            >
              {{ comp.name }}
            </UButton>
          </div>
        </div>
      </template>
    </UFormField>
    </template>
  </div>
</template>
