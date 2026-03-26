<script setup lang="ts">
const props = defineProps<{ disabled?: boolean }>();
const model = defineModel<string[] | null>({ default: null });

const { apiFetch } = useApi();
const { t } = useI18n();

interface ContentTypeItem {
  id: string;
  name: string;
  slug: string;
}

const contentTypes = ref<ContentTypeItem[]>([]);
const restricted = ref(false);

async function fetchContentTypes() {
  try {
    const res = await apiFetch<{ success: boolean; data: ContentTypeItem[] }>('/content-types?limit=100');
    contentTypes.value = res.data;
  } catch {
    // ignore
  }
}

function toggle(id: string) {
  if (props.disabled) return;
  const current = model.value ?? [];
  if (current.includes(id)) {
    model.value = current.filter((v) => v !== id);
  } else {
    model.value = [...current, id];
  }
}

watch(restricted, (val) => {
  if (!val) {
    model.value = null;
  } else {
    model.value = model.value ?? [];
  }
});

// Sync restricted toggle from model
watch(
  model,
  (val) => {
    restricted.value = Array.isArray(val);
  },
  { immediate: true },
);

onMounted(fetchContentTypes);
</script>

<template>
  <div class="space-y-3">
    <label class="flex items-center gap-2 cursor-pointer">
      <UToggle v-model="restricted" :disabled="disabled" />
      <span class="text-sm">{{ t('roles.restrictContentTypes') }}</span>
    </label>

    <div v-if="restricted" class="grid grid-cols-2 lg:grid-cols-3 gap-2">
      <label
        v-for="ct in contentTypes"
        :key="ct.id"
        class="flex items-center gap-2 p-2 border rounded-lg cursor-pointer hover:bg-(--ui-bg-elevated) transition-colors"
        :class="{
          'border-(--ui-primary) bg-(--ui-primary)/5': (model ?? []).includes(ct.id),
          'opacity-50 pointer-events-none': disabled,
        }"
      >
        <UCheckbox :model-value="(model ?? []).includes(ct.id)" @update:model-value="toggle(ct.id)" />
        <div>
          <span class="text-sm font-medium">{{ ct.name }}</span>
          <span class="text-xs text-(--ui-text-muted) ml-1">({{ ct.slug }})</span>
        </div>
      </label>
    </div>
  </div>
</template>
