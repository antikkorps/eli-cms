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
const { isLockedByOther, lockerEmail, acquire: acquireLock, release: releaseLock, onSaveSuccess } = useContentLock();
const { errors: validationErrors, validate, clearErrors } = useContentValidation();

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

// Autosave
const AUTOSAVE_DELAY = 30_000; // 30 seconds
const autosaveStatus = ref<'idle' | 'saving' | 'saved' | 'failed'>('idle');
let autosaveTimer: ReturnType<typeof setTimeout> | null = null;
let formLoaded = false; // skip initial watch trigger

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
  { label: t('contents.commentsTab'), value: 'comments' },
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
    await Promise.all([fetchContent(), fetchVersions()]);
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
    onSaveSuccess();
    await acquireLock(route.params.id as string);
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
    onSaveSuccess();
    await acquireLock(route.params.id as string);
    toast.add({ title: t('common.updated'), color: 'success' });
  } catch {
    toast.add({ title: t('common.error'), color: 'error' });
  } finally {
    saving.value = false;
  }
}

async function submit() {
  if (isLockedByOther.value) return;
  if (fields.value.length) {
    const { valid } = validate(fields.value as import('@eli-cms/shared').FieldDefinition[], form.data);
    if (!valid) return;
  }
  clearAutosaveTimer();
  saving.value = true;
  try {
    await apiFetch(`/contents/${route.params.id}`, {
      method: 'PUT',
      body: {
        slug: form.slug || null,
        data: form.data,
      },
    });
    onSaveSuccess();
    toast.add({ title: t('common.updated'), color: 'success' });
    router.push('/admin/contents');
  } catch (err: unknown) {
    const msg = (err as { data?: { error?: string } })?.data?.error || t('common.error');
    toast.add({ title: msg, color: 'error' });
  } finally {
    saving.value = false;
  }
}

function clearAutosaveTimer() {
  if (autosaveTimer) {
    clearTimeout(autosaveTimer);
    autosaveTimer = null;
  }
}

function scheduleAutosave() {
  // Only autosave drafts / in-review — not published content
  if (isLockedByOther.value) return;
  if (!['draft', 'in-review'].includes(form.status)) return;

  clearAutosaveTimer();
  autosaveTimer = setTimeout(performAutosave, AUTOSAVE_DELAY);
}

async function performAutosave() {
  if (saving.value || isLockedByOther.value) return;

  autosaveStatus.value = 'saving';
  try {
    await apiFetch(`/contents/${route.params.id}`, {
      method: 'PUT',
      body: {
        slug: form.slug || null,
        data: form.data,
      },
    });
    // PUT auto-releases the lock server-side, re-acquire it
    await acquireLock(route.params.id as string);
    autosaveStatus.value = 'saved';
    // Reset to idle after 3s
    setTimeout(() => {
      if (autosaveStatus.value === 'saved') autosaveStatus.value = 'idle';
    }, 3000);
  } catch {
    autosaveStatus.value = 'failed';
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
      if (activeTab.value === 'content' && !saving.value && !isLockedByOther.value) submit();
    },
  },
});

watch(
  () => form.data,
  () => {
    clearErrors();
    if (formLoaded) scheduleAutosave();
  },
  { deep: true },
);

watch(
  () => form.slug,
  () => {
    if (formLoaded) scheduleAutosave();
  },
);

watch(activeTab, (tab) => {
  if (tab === 'versions' && !versions.value.length) fetchVersions();
  if (tab === 'relations' && !relations.value.length) fetchRelations();
});

onMounted(async () => {
  await fetchContent();
  if (!loading.value) {
    await acquireLock(route.params.id as string);
    // Enable autosave after initial data is loaded
    nextTick(() => {
      formLoaded = true;
    });
  }
  // Support ?tab=comments navigation from notifications
  const tabQuery = route.query.tab as string | undefined;
  if (tabQuery && ['content', 'versions', 'relations', 'comments'].includes(tabQuery)) {
    activeTab.value = tabQuery;
  }
});

onBeforeUnmount(() => {
  clearAutosaveTimer();
});
</script>

<template>
  <div class="p-6 space-y-6 max-w-3xl">
    <div class="flex items-center gap-3">
      <UButton to="/admin/contents" variant="ghost" icon="i-lucide-arrow-left" size="sm" />
      <div>
        <h1 class="text-2xl font-bold">{{ $t('contents.editTitle') }}</h1>
      </div>
      <span v-if="autosaveStatus === 'saving'" class="text-sm text-muted flex items-center gap-1">
        <UIcon name="i-lucide-loader-2" class="animate-spin" />
        {{ $t('contents.autosaving') }}
      </span>
      <span v-else-if="autosaveStatus === 'saved'" class="text-sm text-green-500 flex items-center gap-1">
        <UIcon name="i-lucide-check" />
        {{ $t('contents.autosaved') }}
      </span>
      <span v-else-if="autosaveStatus === 'failed'" class="text-sm text-red-500 flex items-center gap-1">
        <UIcon name="i-lucide-alert-circle" />
        {{ $t('contents.autosaveFailed') }}
      </span>
    </div>

    <div v-if="loading" class="text-sm text-muted">{{ $t('common.loading') }}</div>

    <div v-else class="space-y-6">
      <UAlert
        v-if="isLockedByOther"
        icon="i-lucide-lock"
        color="warning"
        :title="$t('lock.lockedBy', { email: lockerEmail })"
        :description="$t('lock.readOnly')"
      />

      <UTabs v-model="activeTab" :items="tabs" />

      <!-- Content tab -->
      <fieldset v-if="activeTab === 'content'" :disabled="isLockedByOther">
        <form class="space-y-6" @submit.prevent="submit">
          <WorkflowActions
            v-if="!isLockedByOther"
            :status="form.status"
            @transition="handleTransition"
            @schedule="scheduleOpen = true"
          />

          <UFormField :label="$t('contents.slugLabel')" :hint="$t('contents.slugHint')">
            <UInput v-model="form.slug" :placeholder="$t('contents.slugPlaceholder')" class="w-full" />
          </UFormField>

          <DynamicContentForm v-model="form.data" :fields="fields" :errors="validationErrors" />

          <div class="flex justify-end gap-2">
            <UButton to="/admin/contents" variant="ghost" color="neutral">
              {{ $t('common.cancel') }}
            </UButton>
            <UButton type="submit" :loading="saving" :disabled="isLockedByOther">
              {{ $t('common.save') }}
            </UButton>
          </div>
        </form>
      </fieldset>

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
            <UBadge
              variant="subtle"
              :color="version.status === 'published' ? 'success' : 'warning'"
              size="sm"
              class="mt-2"
            >
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
            <span v-if="rel.target?.contentType?.name" class="text-xs text-muted"
              >({{ rel.target.contentType.name }})</span
            >
          </div>
          <UButton icon="i-lucide-trash-2" variant="ghost" color="error" size="sm" @click="removeRelation(rel.id)" />
        </div>
      </div>

      <!-- Comments tab -->
      <div v-else-if="activeTab === 'comments'">
        <ContentComments :content-id="route.params.id as string" />
      </div>

      <ScheduleModal v-model:open="scheduleOpen" @confirm="handleSchedule" />
    </div>
  </div>
</template>
