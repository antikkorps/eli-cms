<script setup lang="ts">
definePageMeta({
  layout: 'admin',
  middleware: ['auth'],
});

const { apiFetch } = useApi();
const { t } = useI18n();
const toast = useToast();
const router = useRouter();
const route = useRoute();

interface FieldDefinition {
  name: string;
  type: string;
  required: boolean;
  label: string;
  options?: string[];
}

interface ContentTypeOption {
  id: string;
  name: string;
  slug: string;
  fields: FieldDefinition[];
}

const contentTypes = ref<ContentTypeOption[]>([]);
const selectedTypeId = ref('');
const slug = ref('');
const status = ref<'draft' | 'published'>('draft');
const data = ref<Record<string, unknown>>({});
const saving = ref(false);
const loadingTypes = ref(true);

const selectedType = computed(() =>
  contentTypes.value.find((ct) => ct.id === selectedTypeId.value),
);

const typeItems = computed(() =>
  contentTypes.value.map((ct) => ({ label: ct.name, value: ct.id })),
);

const statusItems = [
  { label: t('contents.draft'), value: 'draft' },
  { label: t('contents.published'), value: 'published' },
];

watch(selectedTypeId, () => {
  if (!route.query.duplicate) data.value = {};
});

async function fetchContentTypes() {
  loadingTypes.value = true;
  try {
    const res = await apiFetch<{ success: boolean; data: ContentTypeOption[] }>('/content-types?limit=100');
    contentTypes.value = res.data;
  } catch {
    // ignore
  } finally {
    loadingTypes.value = false;
  }
}

async function loadDuplicate() {
  const duplicateId = route.query.duplicate as string | undefined;
  if (!duplicateId) return;
  try {
    const res = await apiFetch<{
      success: boolean;
      data: { contentTypeId: string; status: string; data: Record<string, unknown> };
    }>(`/contents/${duplicateId}`);
    selectedTypeId.value = res.data.contentTypeId;
    status.value = 'draft';
    data.value = { ...res.data.data };
  } catch {
    // ignore — just start fresh
  }
}

async function submit() {
  saving.value = true;
  try {
    await apiFetch('/contents', {
      method: 'POST',
      body: {
        contentTypeId: selectedTypeId.value,
        slug: slug.value || undefined,
        status: status.value,
        data: data.value,
      },
    });
    toast.add({ title: t('common.created'), color: 'success' });
    router.push('/admin/contents');
  } catch {
    toast.add({ title: t('common.error'), color: 'error' });
  } finally {
    saving.value = false;
  }
}

onMounted(async () => {
  await fetchContentTypes();
  await loadDuplicate();
});
</script>

<template>
  <div class="p-6 space-y-6 max-w-3xl">
    <div class="flex items-center gap-3">
      <UButton to="/admin/contents" variant="ghost" icon="i-lucide-arrow-left" size="sm" />
      <div>
        <h1 class="text-2xl font-bold">{{ $t('contents.newTitle') }}</h1>
      </div>
    </div>

    <form class="space-y-6" @submit.prevent="submit">
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <UFormField :label="$t('contents.contentTypeLabel')">
          <USelect
            v-model="selectedTypeId"
            :items="typeItems"
            :placeholder="$t('contents.selectContentType')"
            :loading="loadingTypes"
            required
            class="w-full"
          />
        </UFormField>

        <UFormField :label="$t('contents.statusLabel')">
          <USelect v-model="status" :items="statusItems" class="w-full" />
        </UFormField>
      </div>

      <UFormField :label="$t('contents.slugLabel')" :hint="$t('contents.slugHint')">
        <UInput v-model="slug" :placeholder="$t('contents.slugPlaceholder')" class="w-full" />
      </UFormField>

      <template v-if="selectedType">
        <DynamicContentForm v-model="data" :fields="selectedType.fields" />
      </template>

      <div class="flex justify-end gap-2">
        <UButton to="/admin/contents" variant="ghost" color="neutral">
          {{ $t('common.cancel') }}
        </UButton>
        <UButton type="submit" :loading="saving" :disabled="!selectedTypeId">
          {{ $t('common.create') }}
        </UButton>
      </div>
    </form>
  </div>
</template>
