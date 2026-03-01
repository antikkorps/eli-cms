<script setup lang="ts">
const props = defineProps<{
  current: Record<string, unknown>;
  version: Record<string, unknown>;
  versionNumber: number;
  fields: { name: string; label: string; type: string }[];
}>();

const { t } = useI18n();

interface DiffEntry {
  field: string;
  label: string;
  currentValue: string;
  versionValue: string;
  changed: boolean;
}

const diffs = computed<DiffEntry[]>(() => {
  return props.fields.map((f) => {
    const currentVal = formatValue(props.current[f.name]);
    const versionVal = formatValue(props.version[f.name]);
    return {
      field: f.name,
      label: f.label,
      currentValue: currentVal,
      versionValue: versionVal,
      changed: currentVal !== versionVal,
    };
  });
});

const hasChanges = computed(() => diffs.value.some((d) => d.changed));

function formatValue(val: unknown): string {
  if (val === undefined || val === null) return '';
  if (typeof val === 'object') return JSON.stringify(val, null, 2);
  return String(val);
}
</script>

<template>
  <div class="space-y-4">
    <h3 class="font-semibold text-lg">
      {{ t('contents.diffTitle') }} — {{ t('contents.diffVersion', { n: versionNumber }) }}
    </h3>

    <p v-if="!hasChanges" class="text-sm text-muted">{{ t('contents.diffNoChanges') }}</p>

    <div v-for="diff in diffs" :key="diff.field" class="border rounded-lg overflow-hidden">
      <div class="px-3 py-2 bg-gray-50 dark:bg-gray-800 text-sm font-medium flex items-center gap-2">
        {{ diff.label }}
        <UBadge v-if="diff.changed" variant="subtle" color="warning" size="xs">changed</UBadge>
      </div>
      <div v-if="diff.changed" class="grid grid-cols-2 divide-x">
        <div class="p-3">
          <div class="text-xs text-muted mb-1">{{ t('contents.diffVersion', { n: versionNumber }) }}</div>
          <pre class="text-sm whitespace-pre-wrap bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-300 p-2 rounded">{{ diff.versionValue || '(empty)' }}</pre>
        </div>
        <div class="p-3">
          <div class="text-xs text-muted mb-1">{{ t('contents.diffCurrent') }}</div>
          <pre class="text-sm whitespace-pre-wrap bg-green-50 dark:bg-green-950/30 text-green-700 dark:text-green-300 p-2 rounded">{{ diff.currentValue || '(empty)' }}</pre>
        </div>
      </div>
      <div v-else class="p-3 text-sm text-muted">
        {{ diff.currentValue || '(empty)' }}
      </div>
    </div>
  </div>
</template>
