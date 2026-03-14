<script setup lang="ts">
import DOMPurify from 'dompurify';

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
  type: string;
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
      type: f.type,
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

function sanitize(html: string): string {
  return DOMPurify.sanitize(html);
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
          <!-- Richtext: render as formatted HTML -->
          <div
            v-if="diff.type === 'richtext' && diff.versionValue"
            class="diff-richtext text-sm bg-red-50 dark:bg-red-950/30 p-2 rounded overflow-hidden break-words"
            v-html="sanitize(diff.versionValue)"
          />
          <pre v-else class="text-sm whitespace-pre-wrap break-words bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-300 p-2 rounded">{{ diff.versionValue || '(empty)' }}</pre>
        </div>
        <div class="p-3">
          <div class="text-xs text-muted mb-1">{{ t('contents.diffCurrent') }}</div>
          <div
            v-if="diff.type === 'richtext' && diff.currentValue"
            class="diff-richtext text-sm bg-green-50 dark:bg-green-950/30 p-2 rounded overflow-hidden break-words"
            v-html="sanitize(diff.currentValue)"
          />
          <pre v-else class="text-sm whitespace-pre-wrap break-words bg-green-50 dark:bg-green-950/30 text-green-700 dark:text-green-300 p-2 rounded">{{ diff.currentValue || '(empty)' }}</pre>
        </div>
      </div>
      <div v-else class="p-3 text-sm text-muted">
        <div
          v-if="diff.type === 'richtext' && diff.currentValue"
          class="diff-richtext"
          v-html="sanitize(diff.currentValue)"
        />
        <template v-else>{{ diff.currentValue || '(empty)' }}</template>
      </div>
    </div>
  </div>
</template>

<style scoped>
.diff-richtext :deep(p) {
  margin: 0.25em 0;
}
.diff-richtext :deep(h1),
.diff-richtext :deep(h2),
.diff-richtext :deep(h3),
.diff-richtext :deep(h4) {
  font-weight: 700;
  margin: 0.5em 0 0.25em;
}
.diff-richtext :deep(h1) { font-size: 1.5em; }
.diff-richtext :deep(h2) { font-size: 1.25em; }
.diff-richtext :deep(h3) { font-size: 1.1em; }
.diff-richtext :deep(ul) {
  list-style: disc;
  padding-left: 1.5em;
}
.diff-richtext :deep(ol) {
  list-style: decimal;
  padding-left: 1.5em;
}
.diff-richtext :deep(blockquote) {
  border-left: 3px solid var(--ui-border-accented);
  padding-left: 0.75em;
  font-style: italic;
}
.diff-richtext :deep(img) {
  max-width: 100%;
  border-radius: 0.375rem;
  margin: 0.5em 0;
}
.diff-richtext :deep(a) {
  text-decoration: underline;
}
.diff-richtext :deep(pre) {
  background: var(--ui-bg-muted);
  padding: 0.5em;
  border-radius: 0.375rem;
  overflow-x: auto;
  font-size: 0.85em;
}
.diff-richtext :deep(code) {
  font-size: 0.85em;
  background: var(--ui-bg-muted);
  padding: 0.1em 0.3em;
  border-radius: 0.25rem;
}
</style>
