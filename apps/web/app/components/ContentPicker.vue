<script setup lang="ts">
const props = defineProps<{
  modelValue: string;
  excludeId?: string;
}>();

const emit = defineEmits<{
  'update:modelValue': [value: string];
}>();

const { apiFetch } = useApi();
const { t } = useI18n();

interface ContentOption {
  id: string;
  data: Record<string, unknown>;
  contentType?: { name: string };
}

const searchQuery = ref('');
const options = ref<ContentOption[]>([]);
const loading = ref(false);
let debounceTimer: ReturnType<typeof setTimeout>;

const items = computed(() =>
  options.value
    .filter((o) => o.id !== props.excludeId)
    .map((o) => ({
      label: getLabel(o),
      value: o.id,
    })),
);

function getLabel(item: ContentOption): string {
  const first = Object.values(item.data).find((v) => typeof v === 'string' && v.length > 0);
  const label = typeof first === 'string' ? (first.length > 50 ? first.substring(0, 50) + '...' : first) : item.id.substring(0, 8);
  return item.contentType?.name ? `${label} (${item.contentType.name})` : label;
}

async function fetchOptions(search?: string) {
  loading.value = true;
  try {
    const params = new URLSearchParams({ limit: '20' });
    if (search) params.set('search', search);
    const res = await apiFetch<{ success: boolean; data: ContentOption[] }>(`/contents?${params}`);
    options.value = res.data;
  } catch {
    options.value = [];
  } finally {
    loading.value = false;
  }
}

function onSearch(val: string) {
  searchQuery.value = val;
  clearTimeout(debounceTimer);
  debounceTimer = setTimeout(() => fetchOptions(val), 300);
}

function onUpdate(val: string) {
  emit('update:modelValue', val);
}

onMounted(() => fetchOptions());
onBeforeUnmount(() => clearTimeout(debounceTimer));
</script>

<template>
  <USelect
    :model-value="modelValue"
    :items="items"
    :loading="loading"
    :placeholder="t('contents.selectContent')"
    :searchable="true"
    class="w-full"
    @update:model-value="onUpdate"
    @update:search-term="onSearch"
  />
</template>
