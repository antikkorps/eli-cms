<script setup lang="ts">
definePageMeta({
  layout: 'admin',
  middleware: ['auth'],
});

const route = useRoute();
const { apiFetch } = useApi();
const { t, locale } = useI18n();
const toast = useToast();
const router = useRouter();

interface FieldDefinition {
  name: string;
  type: string;
  required: boolean;
  label: string;
  options?: string[];
}

interface ContentVersion {
  id: string;
  versionNumber: number;
  data: Record<string, unknown>;
  status: string;
  editedBy: string;
  createdAt: string;
}

const form = reactive({
  status: 'draft' as 'draft' | 'published',
  data: {} as Record<string, unknown>,
});

const fields = ref<FieldDefinition[]>([]);
const loading = ref(true);
const saving = ref(false);
const activeTab = ref('content');
const versions = ref<ContentVersion[]>([]);
const loadingVersions = ref(false);

const statusItems = [
  { label: t('contents.draft'), value: 'draft' },
  { label: t('contents.published'), value: 'published' },
];

const tabs = computed(() => [
  { label: t('contents.contentTab'), value: 'content' },
  { label: t('contents.versionsTab'), value: 'versions' },
]);

async function fetchContent() {
  loading.value = true;
  try {
    const res = await apiFetch<{
      success: boolean;
      data: {
        id: string;
        contentTypeId: string;
        status: string;
        data: Record<string, unknown>;
        contentType?: { fields: FieldDefinition[] };
      };
    }>(`/contents/${route.params.id}`);
    form.status = res.data.status as 'draft' | 'published';
    form.data = res.data.data;
    fields.value = res.data.contentType?.fields ?? [];
  } catch {
    toast.add({ title: t('common.error'), color: 'error' });
    router.push('/admin/contents');
  } finally {
    loading.value = false;
  }
}

async function fetchVersions() {
  loadingVersions.value = true;
  try {
    const res = await apiFetch<{
      success: boolean;
      data: ContentVersion[];
    }>(`/contents/${route.params.id}/versions`);
    versions.value = res.data;
  } catch {
    // ignore
  } finally {
    loadingVersions.value = false;
  }
}

async function restoreVersion(version: ContentVersion) {
  try {
    await apiFetch(`/contents/${route.params.id}/versions/${version.versionNumber}/restore`, {
      method: 'POST',
    });
    toast.add({ title: t('contents.versionRestored'), color: 'success' });
    await fetchContent();
    activeTab.value = 'content';
  } catch {
    toast.add({ title: t('common.error'), color: 'error' });
  }
}

async function submit() {
  saving.value = true;
  try {
    await apiFetch(`/contents/${route.params.id}`, {
      method: 'PUT',
      body: {
        status: form.status,
        data: form.data,
      },
    });
    toast.add({ title: t('common.updated'), color: 'success' });
    router.push('/admin/contents');
  } catch {
    toast.add({ title: t('common.error'), color: 'error' });
  } finally {
    saving.value = false;
  }
}

watch(activeTab, (tab) => {
  if (tab === 'versions' && !versions.value.length) {
    fetchVersions();
  }
});

onMounted(fetchContent);
</script>

<template>
  <div class="p-6 space-y-6 max-w-3xl">
    <div class="flex items-center gap-3">
      <UButton to="/admin/contents" variant="ghost" icon="i-lucide-arrow-left" size="sm" />
      <div>
        <h1 class="text-2xl font-bold">{{ $t('contents.editTitle') }}</h1>
      </div>
    </div>

    <div v-if="loading" class="text-sm text-muted">{{ $t('common.loading') }}</div>

    <div v-else class="space-y-6">
      <UTabs v-model="activeTab" :items="tabs" />

      <form v-if="activeTab === 'content'" class="space-y-6" @submit.prevent="submit">
        <UFormField :label="$t('contents.statusLabel')">
          <USelect v-model="form.status" :items="statusItems" class="w-48" />
        </UFormField>

        <DynamicContentForm v-model="form.data" :fields="fields" />

        <div class="flex justify-end gap-2">
          <UButton to="/admin/contents" variant="ghost" color="neutral">
            {{ $t('common.cancel') }}
          </UButton>
          <UButton type="submit" :loading="saving">
            {{ $t('common.save') }}
          </UButton>
        </div>
      </form>

      <div v-else-if="activeTab === 'versions'" class="space-y-4">
        <div v-if="loadingVersions" class="text-sm text-muted">{{ $t('common.loading') }}</div>
        <div v-else-if="!versions.length" class="text-sm text-muted">{{ $t('common.noResults') }}</div>
        <div v-for="version in versions" :key="version.id" class="border rounded-lg p-4">
          <div class="flex items-center justify-between">
            <div>
              <span class="font-medium">{{ $t('contents.versionNumber', { n: version.versionNumber }) }}</span>
              <span class="text-sm text-muted ml-2">
                {{ new Date(version.createdAt).toLocaleString(locale) }}
              </span>
            </div>
            <UButton size="sm" variant="outline" @click="restoreVersion(version)">
              {{ $t('contents.restoreVersion') }}
            </UButton>
          </div>
          <UBadge variant="subtle" :color="version.status === 'published' ? 'success' : 'warning'" size="sm" class="mt-2">
            {{ version.status }}
          </UBadge>
        </div>
      </div>
    </div>
  </div>
</template>
