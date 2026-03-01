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
const { invalidate: invalidateContentTypes } = useContentTypes();

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

interface ContentRelation {
  id: string;
  sourceId: string;
  targetId: string;
  relationType: string;
  target?: { id: string; data: Record<string, unknown>; contentType?: { name: string } };
}

const form = reactive({
  slug: '' as string,
  status: 'draft' as string,
  data: {} as Record<string, unknown>,
});

const contentTypeId = ref('');
const fields = ref<FieldDefinition[]>([]);
const loading = ref(true);
const saving = ref(false);
const activeTab = ref('content');

// Versions
const versions = ref<ContentVersion[]>([]);
const loadingVersions = ref(false);
const diffVersion = ref<ContentVersion | null>(null);

// Relations
const relations = ref<ContentRelation[]>([]);
const loadingRelations = ref(false);
const newRelationType = ref('reference');
const newRelationTargetId = ref('');
const addingRelation = ref(false);

const scheduleOpen = ref(false);

const relationTypeItems = [
  { label: 'Reference', value: 'reference' },
  { label: 'Parent', value: 'parent' },
  { label: 'Related', value: 'related' },
];

const tabs = computed(() => [
  { label: t('contents.contentTab'), value: 'content' },
  { label: t('contents.versionsTab'), value: 'versions' },
  { label: t('contents.relationsTab'), value: 'relations' },
]);

async function fetchContent() {
  loading.value = true;
  try {
    const res = await apiFetch<{
      success: boolean;
      data: {
        id: string;
        contentTypeId: string;
        slug: string | null;
        status: string;
        data: Record<string, unknown>;
        contentType?: { fields: FieldDefinition[] };
      };
    }>(`/contents/${route.params.id}`);
    contentTypeId.value = res.data.contentTypeId;
    form.slug = res.data.slug ?? '';
    form.status = res.data.status;
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

async function fetchRelations() {
  loadingRelations.value = true;
  try {
    const res = await apiFetch<{
      success: boolean;
      data: ContentRelation[];
    }>(`/contents/${route.params.id}/relations`);
    relations.value = res.data;
  } catch {
    // ignore
  } finally {
    loadingRelations.value = false;
  }
}

async function restoreVersion(version: ContentVersion) {
  try {
    await apiFetch(`/contents/${route.params.id}/versions/${version.versionNumber}/restore`, {
      method: 'POST',
    });
    toast.add({ title: t('contents.versionRestored'), color: 'success' });
    diffVersion.value = null;
    await fetchContent();
    activeTab.value = 'content';
  } catch {
    toast.add({ title: t('common.error'), color: 'error' });
  }
}

async function addRelation() {
  if (!newRelationTargetId.value) return;
  addingRelation.value = true;
  try {
    await apiFetch(`/contents/${route.params.id}/relations`, {
      method: 'POST',
      body: {
        targetId: newRelationTargetId.value,
        relationType: newRelationType.value,
      },
    });
    toast.add({ title: t('contents.relationAdded'), color: 'success' });
    newRelationTargetId.value = '';
    await fetchRelations();
  } catch {
    toast.add({ title: t('common.error'), color: 'error' });
  } finally {
    addingRelation.value = false;
  }
}

async function removeRelation(relationId: string) {
  try {
    await apiFetch(`/contents/${route.params.id}/relations/${relationId}`, {
      method: 'DELETE',
    });
    toast.add({ title: t('contents.relationRemoved'), color: 'success' });
    await fetchRelations();
  } catch {
    toast.add({ title: t('common.error'), color: 'error' });
  }
}

async function handleTransition(newStatus: string) {
  saving.value = true;
  try {
    await apiFetch(`/contents/${route.params.id}`, {
      method: 'PUT',
      body: { status: newStatus },
    });
    form.status = newStatus;
    toast.add({ title: t('common.updated'), color: 'success' });
  } catch {
    toast.add({ title: t('common.error'), color: 'error' });
  } finally {
    saving.value = false;
  }
}

async function handleSchedule(date: string) {
  saving.value = true;
  try {
    await apiFetch(`/contents/${route.params.id}`, {
      method: 'PUT',
      body: { status: 'scheduled', publishedAt: date },
    });
    form.status = 'scheduled';
    toast.add({ title: t('common.updated'), color: 'success' });
  } catch {
    toast.add({ title: t('common.error'), color: 'error' });
  } finally {
    saving.value = false;
  }
}

async function submit() {
  saving.value = true;
  try {
    await apiFetch(`/contents/${route.params.id}`, {
      method: 'PUT',
      body: {
        slug: form.slug || null,
        data: form.data,
      },
    });
    toast.add({ title: t('common.updated'), color: 'success' });
    router.push('/admin/contents');
  } catch (err: unknown) {
    const msg = (err as { data?: { error?: string } })?.data?.error || t('common.error');
    toast.add({ title: msg, color: 'error' });
  } finally {
    saving.value = false;
  }
}

function getRelationPreview(relation: ContentRelation): string {
  const data = relation.target?.data;
  if (!data) return relation.targetId;
  const first = Object.values(data).find((v) => typeof v === 'string' && v.length > 0);
  return typeof first === 'string' ? (first.length > 50 ? first.substring(0, 50) + '...' : first) : relation.targetId;
}

defineShortcuts({
  meta_s: {
    usingInput: true,
    handler: () => {
      if (activeTab.value === 'content' && !saving.value) submit();
    },
  },
});

watch(activeTab, (tab) => {
  if (tab === 'versions' && !versions.value.length) fetchVersions();
  if (tab === 'relations' && !relations.value.length) fetchRelations();
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

      <!-- Content tab -->
      <form v-if="activeTab === 'content'" class="space-y-6" @submit.prevent="submit">
        <WorkflowActions
          :status="form.status"
          @transition="handleTransition"
          @schedule="scheduleOpen = true"
        />

        <UFormField :label="$t('contents.slugLabel')" :hint="$t('contents.slugHint')">
          <UInput v-model="form.slug" :placeholder="$t('contents.slugPlaceholder')" class="w-full" />
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

      <!-- Versions tab -->
      <div v-else-if="activeTab === 'versions'" class="space-y-4">
        <!-- Diff view -->
        <template v-if="diffVersion">
          <UButton size="sm" variant="ghost" icon="i-lucide-arrow-left" @click="diffVersion = null">
            {{ $t('common.back') }}
          </UButton>
          <VersionDiff
            :current="form.data"
            :version="diffVersion.data"
            :version-number="diffVersion.versionNumber"
            :fields="fields"
          />
        </template>

        <!-- Version list -->
        <template v-else>
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
              <div class="flex gap-2">
                <UButton size="sm" variant="outline" @click="diffVersion = version">
                  {{ $t('contents.compareVersion') }}
                </UButton>
                <UButton size="sm" variant="outline" @click="restoreVersion(version)">
                  {{ $t('contents.restoreVersion') }}
                </UButton>
              </div>
            </div>
            <UBadge variant="subtle" :color="version.status === 'published' ? 'success' : 'warning'" size="sm" class="mt-2">
              {{ version.status }}
            </UBadge>
          </div>
        </template>
      </div>

      <!-- Relations tab -->
      <div v-else-if="activeTab === 'relations'" class="space-y-4">
        <div class="flex gap-2 items-end">
          <UFormField :label="$t('contents.relationType')" class="w-40">
            <USelect v-model="newRelationType" :items="relationTypeItems" class="w-full" />
          </UFormField>
          <UFormField :label="$t('contents.selectContent')" class="flex-1">
            <ContentPicker v-model="newRelationTargetId" :exclude-id="route.params.id as string" />
          </UFormField>
          <UButton :loading="addingRelation" :disabled="!newRelationTargetId" @click="addRelation">
            {{ $t('contents.addRelation') }}
          </UButton>
        </div>

        <div v-if="loadingRelations" class="text-sm text-muted">{{ $t('common.loading') }}</div>
        <div v-else-if="!relations.length" class="text-sm text-muted">{{ $t('contents.noRelations') }}</div>
        <div v-for="rel in relations" :key="rel.id" class="flex items-center justify-between border rounded-lg p-3">
          <div class="flex items-center gap-2">
            <UBadge variant="subtle" size="sm">{{ rel.relationType }}</UBadge>
            <span class="text-sm">{{ getRelationPreview(rel) }}</span>
            <span v-if="rel.target?.contentType?.name" class="text-xs text-muted">({{ rel.target.contentType.name }})</span>
          </div>
          <UButton icon="i-lucide-trash-2" variant="ghost" color="error" size="sm" @click="removeRelation(rel.id)" />
        </div>
      </div>

      <ScheduleModal v-model:open="scheduleOpen" @confirm="handleSchedule" />
    </div>
  </div>
</template>
