<script setup lang="ts">
const { t } = useI18n();

const model = defineModel<string>({ default: '' });

const AUTO = '__auto__';
const CUSTOM = '__custom__';

const presets = [
  { label: t('slugPattern.auto'), value: AUTO, pattern: '', example: 'mon-article' },
  { label: '{slug}', value: '{slug}', pattern: '{slug}', example: 'mon-article' },
  { label: '{year}/{slug}', value: '{year}/{slug}', pattern: '{year}/{slug}', example: '2026/mon-article' },
  {
    label: '{year}/{month}/{slug}',
    value: '{year}/{month}/{slug}',
    pattern: '{year}/{month}/{slug}',
    example: '2026/03/mon-article',
  },
];

const selected = ref(AUTO);
const isCustom = ref(false);

// Sync from parent model → local state
watch(
  model,
  (v) => {
    if (!v) {
      selected.value = AUTO;
      isCustom.value = false;
      return;
    }
    const match = presets.find((p) => p.pattern === v);
    if (match) {
      selected.value = match.value;
      isCustom.value = false;
    } else {
      selected.value = CUSTOM;
      isCustom.value = true;
    }
  },
  { immediate: true },
);

const selectItems = computed(() => [
  ...presets.map((p) => ({ label: p.label, value: p.value })),
  { label: t('slugPattern.custom'), value: CUSTOM },
]);

function onSelectChange(val: string) {
  selected.value = val;
  if (val === CUSTOM) {
    isCustom.value = true;
  } else {
    isCustom.value = false;
    const preset = presets.find((p) => p.value === val);
    model.value = preset?.pattern ?? '';
  }
}
</script>

<template>
  <div class="space-y-2">
    <USelect :model-value="selected" :items="selectItems" class="w-full" @update:model-value="onSelectChange" />

    <p v-if="!isCustom" class="text-xs text-muted">
      {{ t('slugPattern.example') }} {{ presets.find((p) => p.value === selected)?.example || 'mon-article' }}
    </p>

    <UInput
      v-if="isCustom"
      :model-value="model"
      placeholder="{year}/{category}/{slug}"
      class="w-full"
      @update:model-value="(v: string) => (model = v)"
    />
    <p v-if="isCustom" class="text-xs text-muted">Tokens: {year}, {month}, {day}, {fieldName}</p>
  </div>
</template>
