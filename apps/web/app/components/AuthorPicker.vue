<script setup lang="ts">
const props = defineProps<{
  modelValue: string | null;
}>();

const emit = defineEmits<{
  'update:modelValue': [value: string | null];
}>();

const { apiFetch } = useApi();
const { t } = useI18n();

interface UserOption {
  id: string;
  email: string;
  roleName?: string;
}

const searchQuery = ref('');
const options = ref<UserOption[]>([]);
const loading = ref(false);
let debounceTimer: ReturnType<typeof setTimeout>;

const items = computed(() =>
  options.value.map((u) => ({
    label: u.roleName ? `${u.email} (${u.roleName})` : u.email,
    value: u.id,
  })),
);

async function fetchOptions(search?: string) {
  loading.value = true;
  try {
    const params = new URLSearchParams({ limit: '20' });
    if (search) params.set('search', search);
    const res = await apiFetch<{ success: boolean; data: UserOption[] }>(`/users?${params}`);
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
  emit('update:modelValue', val || null);
}

onMounted(() => fetchOptions());
</script>

<template>
  <USelect
    :model-value="modelValue ?? ''"
    :items="items"
    :loading="loading"
    :placeholder="t('authorPicker.selectAuthor')"
    :searchable="true"
    class="w-full"
    @update:model-value="onUpdate"
    @update:search-term="onSearch"
  />
</template>
