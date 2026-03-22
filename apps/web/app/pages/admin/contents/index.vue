<script setup lang="ts">
import { h, resolveComponent } from 'vue';

definePageMeta({
  layout: 'admin',
  middleware: ['auth'],
});

const { apiFetch, baseURL } = useApi();
const { t, locale } = useI18n();
const { hasPermission } = useAuth();
const route = useRoute();
const router = useRouter();
const { items: contentTypeItems, fetch: fetchContentTypes, invalidate: invalidateContentTypes } = useContentTypes();
const { invalidate: invalidateTrashCount } = useTrashCount();

interface ContentItem {
  id: string;
  contentTypeId: string;
  slug: string | null;
  status: string;
  data: Record<string, unknown>;
  contentType?: { name: string; slug: string };
  createdAt: string;
  updatedAt: string;
}

interface FieldDefinition {
  name: string;
  type: string;
  required: boolean;
  label: string;
  multiple?: boolean;
}

const search = ref('');
const contentTypeFilter = ref('');
const statusFilter = ref('');
const bulkOpen = ref(false);
const bulkActionType = ref('');

const {
  items: contents,
  loading,
  page,
  total,
  limit,
  totalPages,
  deleteOpen,
  deleteTarget,
  deleting,
  confirmDelete,
  handleDelete,
  sortBy,
  sortOrder,
  toggleSort,
  selectedIds,
  allSelected,
  toggleSelect,
  selectAll,
  bulkAction,
} = useCrudList<ContentItem>({
  endpoint: '/contents',
  filters: { search, contentTypeId: contentTypeFilter, status: statusFilter },
});

const canCreate = computed(() => hasPermission('content:create'));
const canDelete = computed(() => hasPermission('content:delete'));
const canUpdate = computed(() => hasPermission('content:update'));

// Duplicate via API
const toast = useToast();
async function duplicateContent(id: string) {
  try {
    const res = await apiFetch<{ success: boolean; data: { id: string } }>(`/contents/${id}/duplicate`, {
      method: 'POST',
    });
    toast.add({ title: t('contents.duplicated'), color: 'success' });
    router.push(`/admin/contents/${res.data.id}`);
  } catch {
    toast.add({ title: t('common.error'), color: 'error' });
  }
}

// Image preview lightbox
const previewMediaId = ref<string | null>(null);
const previewOpen = computed({
  get: () => previewMediaId.value !== null,
  set: (v) => {
    if (!v) previewMediaId.value = null;
  },
});

// Export/Import
const exportFormat = ref<'json' | 'csv' | 'xml'>('json');
const importOpen = ref(false);

const exportFormatItems = [
  { label: 'JSON', value: 'json' },
  { label: 'CSV', value: 'csv' },
  { label: 'XML', value: 'xml' },
];

async function handleExport() {
  if (!contentTypeFilter.value) return;
  try {
    const params = new URLSearchParams({
      contentTypeId: contentTypeFilter.value,
      format: exportFormat.value,
    });
    if (statusFilter.value) params.set('status', statusFilter.value);

    const data = await apiFetch<Blob>(`/contents/export?${params}`, {
      responseType: 'blob',
    });
    const blob = data instanceof Blob ? data : new Blob([JSON.stringify(data)]);
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `export.${exportFormat.value}`;
    a.click();
    URL.revokeObjectURL(url);
  } catch {
    // ignore
  }
}

const typeFilterItems = computed(() => [
  { label: t('contents.allTypes'), value: '' },
  ...contentTypeItems.value.map((ct) => ({ label: ct.name, value: ct.id })),
]);

const statusFilterItems = [
  { label: t('contents.allStatuses'), value: '' },
  { label: t('contents.draft'), value: 'draft' },
  { label: t('contents.inReview'), value: 'in-review' },
  { label: t('contents.approved'), value: 'approved' },
  { label: t('contents.scheduled'), value: 'scheduled' },
  { label: t('contents.published'), value: 'published' },
];

function stripHtml(html: string): string {
  const doc = new DOMParser().parseFromString(html, 'text/html');
  return (doc.body.textContent || '').trim();
}

function getPreviewText(data: Record<string, unknown>): string {
  const first = Object.values(data).find((v) => typeof v === 'string' && v.length > 0);
  if (typeof first === 'string') {
    const plain = stripHtml(first);
    return plain.length > 60 ? plain.substring(0, 60) + '...' : plain;
  }
  return JSON.stringify(data).substring(0, 60) + '...';
}

function highlightVNodes(text: string) {
  const q = search.value.trim();
  if (!q) return [text];
  const escaped = q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const regex = new RegExp(`(${escaped})`, 'gi');
  const parts = text.split(regex);
  return parts.map((part) =>
    regex.test(part) ? h('mark', { class: 'bg-yellow-300/50 dark:bg-yellow-500/30 rounded-sm px-0.5' }, part) : part,
  );
}

function getMediaPreviewId(item: ContentItem): string | null {
  const ct = contentTypeItems.value.find((c) => c.id === item.contentTypeId);
  if (!ct?.fields) return null;
  const mediaField = ct.fields.find((f) => f.type === 'media');
  if (!mediaField) return null;
  const value = item.data[mediaField.name];
  if (mediaField.multiple && Array.isArray(value) && value.length > 0) return value[0] as string;
  if (typeof value === 'string' && value.length > 0) return value;
  return null;
}

function sortIcon(col: string): string {
  if (sortBy.value !== col) return 'i-lucide-arrow-up-down';
  return sortOrder.value === 'asc' ? 'i-lucide-arrow-up' : 'i-lucide-arrow-down';
}

function confirmBulk(action: string) {
  bulkActionType.value = action;
  bulkOpen.value = true;
}

async function executeBulk() {
  bulkOpen.value = false;
  await bulkAction(bulkActionType.value);
}

const UBadge = resolveComponent('UBadge');
const UButton = resolveComponent('UButton');
const UCheckbox = resolveComponent('UCheckbox');

const columns = computed(() => [
  {
    accessorKey: 'select',
    header: () =>
      h(UCheckbox as ReturnType<typeof resolveComponent>, {
        modelValue: allSelected.value,
        'onUpdate:modelValue': () => selectAll(),
      }),
    cell: ({ row }: { row: { original: ContentItem } }) =>
      h(UCheckbox as ReturnType<typeof resolveComponent>, {
        modelValue: selectedIds.value.has(row.original.id),
        'onUpdate:modelValue': () => toggleSelect(row.original.id),
      }),
  },
  {
    accessorKey: 'data',
    header: () =>
      h('button', { class: 'flex items-center gap-1 font-medium', onClick: () => toggleSort('createdAt') }, [
        t('contents.columnTitle'),
      ]),
    cell: ({ row }: { row: { original: ContentItem } }) => {
      const mediaId = getMediaPreviewId(row.original);
      const text = getPreviewText(row.original.data);
      const highlighted = highlightVNodes(text);
      if (mediaId) {
        return h('div', { class: 'flex items-center gap-2' }, [
          h('img', {
            src: `${baseURL}/uploads/${mediaId}/serve?w=64&format=webp`,
            class:
              'size-8 rounded object-cover shrink-0 cursor-pointer hover:ring-2 hover:ring-primary transition-shadow',
            alt: '',
            onClick: (e: Event) => {
              e.stopPropagation();
              previewMediaId.value = mediaId;
            },
          }),
          h('span', highlighted),
        ]);
      }
      return h('span', highlighted);
    },
  },
  {
    accessorKey: 'slug',
    header: () =>
      h('button', { class: 'flex items-center gap-1 font-medium', onClick: () => toggleSort('slug') }, [
        t('contents.columnSlug'),
        h('span', {
          class: `${sortBy.value === 'slug' ? 'opacity-100' : 'opacity-40'} i-lucide-${sortBy.value === 'slug' ? (sortOrder.value === 'asc' ? 'arrow-up' : 'arrow-down') : 'arrow-up-down'} size-3.5`,
        }),
      ]),
    cell: ({ row }: { row: { original: ContentItem } }) =>
      row.original.slug
        ? h(
            'code',
            { class: 'text-xs bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded' },
            highlightVNodes(row.original.slug),
          )
        : h('span', { class: 'text-muted text-xs' }, '—'),
  },
  {
    accessorKey: 'contentType',
    header: t('contents.columnType'),
    cell: ({ row }: { row: { original: ContentItem } }) => {
      const name = row.original.contentType?.name ?? '—';
      return h(UBadge as ReturnType<typeof resolveComponent>, { variant: 'subtle', size: 'sm' }, () => name);
    },
  },
  {
    accessorKey: 'status',
    header: () =>
      h('button', { class: 'flex items-center gap-1 font-medium', onClick: () => toggleSort('status') }, [
        t('contents.columnStatus'),
        h('span', {
          class: `${sortBy.value === 'status' ? 'opacity-100' : 'opacity-40'} i-lucide-${sortBy.value === 'status' ? (sortOrder.value === 'asc' ? 'arrow-up' : 'arrow-down') : 'arrow-up-down'} size-3.5`,
        }),
      ]),
    cell: ({ row }: { row: { original: ContentItem } }) => {
      const statusMap: Record<string, { color: string; label: string }> = {
        draft: { color: 'neutral', label: t('contents.draft') },
        'in-review': { color: 'warning', label: t('contents.inReview') },
        approved: { color: 'info', label: t('contents.approved') },
        scheduled: { color: 'primary', label: t('contents.scheduled') },
        published: { color: 'success', label: t('contents.published') },
      };
      const cfg = statusMap[row.original.status] ?? statusMap.draft!;
      return h(
        UBadge as ReturnType<typeof resolveComponent>,
        { variant: 'subtle', color: cfg!.color, size: 'sm' },
        () => cfg!.label,
      );
    },
  },
  {
    accessorKey: 'updatedAt',
    header: () =>
      h('button', { class: 'flex items-center gap-1 font-medium', onClick: () => toggleSort('updatedAt') }, [
        t('contents.columnUpdated'),
        h('span', {
          class: `${sortBy.value === 'updatedAt' ? 'opacity-100' : 'opacity-40'} i-lucide-${sortBy.value === 'updatedAt' ? (sortOrder.value === 'asc' ? 'arrow-up' : 'arrow-down') : 'arrow-up-down'} size-3.5`,
        }),
      ]),
    cell: ({ row }: { row: { original: ContentItem } }) =>
      new Date(row.original.updatedAt).toLocaleDateString(locale.value),
  },
  {
    accessorKey: 'actions',
    header: '',
    cell: ({ row }: { row: { original: ContentItem } }) => {
      const buttons = [];
      const isSingleton = contentTypeItems.value.find((c) => c.id === row.original.contentTypeId)?.isSingleton;
      if (canCreate.value && !isSingleton) {
        buttons.push(
          h(UButton as ReturnType<typeof resolveComponent>, {
            icon: 'i-lucide-copy',
            variant: 'ghost',
            color: 'neutral',
            size: 'sm',
            title: t('contents.duplicate'),
            onClick: () => duplicateContent(row.original.id),
          }),
        );
      }
      buttons.push(
        h(UButton as ReturnType<typeof resolveComponent>, {
          icon: 'i-lucide-pencil',
          variant: 'ghost',
          color: 'neutral',
          size: 'sm',
          to: `/admin/contents/${row.original.id}`,
        }),
      );
      if (canDelete.value) {
        buttons.push(
          h(UButton as ReturnType<typeof resolveComponent>, {
            icon: 'i-lucide-trash-2',
            variant: 'ghost',
            color: 'error',
            size: 'sm',
            onClick: () => confirmDelete(row.original),
          }),
        );
      }
      return h('div', { class: 'flex gap-1 justify-end' }, buttons);
    },
  },
]);

// Invalidate content type counts and trash count after delete/bulk actions
watch(deleteOpen, (open, wasOpen) => {
  if (wasOpen && !open) {
    invalidateContentTypes();
    invalidateTrashCount();
  }
});

// Track whether the filter change originates from URL (avoid circular updates)
let syncingFromUrl = false;

// URL → filter: watch route.query.type and resolve slug → ID
watch(
  () => route.query.type as string | undefined,
  (slug) => {
    if (!contentTypeItems.value.length) return;
    syncingFromUrl = true;
    if (slug) {
      const ct = contentTypeItems.value.find((c) => c.slug === slug);
      contentTypeFilter.value = ct ? ct.id : '';
    } else {
      contentTypeFilter.value = '';
    }
    nextTick(() => {
      syncingFromUrl = false;
    });
  },
);

// Filter → URL: sync contentTypeFilter changes back to query params
watch(contentTypeFilter, (id) => {
  if (syncingFromUrl) return;
  const ct = id ? contentTypeItems.value.find((c) => c.id === id) : null;
  const query = { ...route.query };
  if (ct) {
    query.type = ct.slug;
  } else {
    delete query.type;
  }
  router.replace({ query });
});

onMounted(async () => {
  await fetchContentTypes();
  // Resolve initial ?type=slug from URL
  const typeSlug = route.query.type as string | undefined;
  if (typeSlug) {
    const ct = contentTypeItems.value.find((c) => c.slug === typeSlug);
    if (ct) {
      // Singleton auto-redirect: go directly to edit or create
      if (ct.isSingleton) {
        try {
          const res = await apiFetch<{ success: boolean; data: Array<{ id: string }> }>(
            `/contents?contentTypeId=${ct.id}&limit=1`,
          );
          if (res.data.length > 0) {
            return navigateTo(`/admin/contents/${res.data[0]!.id}`, { replace: true });
          } else {
            return navigateTo(`/admin/contents/new?type=${ct.slug}`, { replace: true });
          }
        } catch {
          // fall through to normal list view
        }
      }
      contentTypeFilter.value = ct.id;
    }
  }
});
</script>

<template>
  <div class="p-6 space-y-6">
    <div class="flex items-center justify-between">
      <div>
        <h1 class="text-2xl font-bold">
          {{
            contentTypeFilter
              ? (contentTypeItems.find((c) => c.id === contentTypeFilter)?.name ?? $t('contents.title'))
              : $t('contents.title')
          }}
        </h1>
        <p class="text-sm text-muted mt-1">{{ $t('contents.subtitle') }}</p>
      </div>
      <div class="flex gap-2">
        <UButton to="/admin/contents/calendar" variant="outline" icon="i-lucide-calendar" :title="$t('nav.calendar')" />
        <UButton v-if="canCreate" variant="outline" icon="i-lucide-upload" @click="importOpen = true">
          {{ $t('export.import') }}
        </UButton>
        <UButton v-if="canCreate" to="/admin/contents/new" icon="i-lucide-plus">
          {{ $t('contents.create') }}
        </UButton>
      </div>
    </div>

    <div class="flex flex-wrap gap-3 items-center">
      <UInput v-model="search" :placeholder="$t('common.search')" icon="i-lucide-search" class="w-64" />
      <USelect v-model="contentTypeFilter" :items="typeFilterItems" class="w-48" />
      <USelect v-model="statusFilter" :items="statusFilterItems" class="w-48" />

      <template v-if="contentTypeFilter">
        <USelect v-model="exportFormat" :items="exportFormatItems" class="w-24" />
        <UButton size="sm" variant="outline" icon="i-lucide-download" @click="handleExport">
          {{ $t('export.export') }}
        </UButton>
      </template>

      <template v-if="selectedIds.size > 0">
        <span class="text-sm text-muted">{{ $t('contents.selected', { count: selectedIds.size }) }}</span>
        <UButton v-if="canUpdate" size="sm" variant="outline" @click="confirmBulk('publish')">
          {{ $t('contents.bulkPublish') }}
        </UButton>
        <UButton v-if="canUpdate" size="sm" variant="outline" @click="confirmBulk('unpublish')">
          {{ $t('contents.bulkUnpublish') }}
        </UButton>
        <UButton v-if="canDelete" size="sm" variant="outline" color="error" @click="confirmBulk('delete')">
          {{ $t('contents.bulkDelete') }}
        </UButton>
      </template>
    </div>

    <div v-if="loading && !contents.length" class="space-y-3">
      <USkeleton class="h-10 w-full rounded" />
      <USkeleton v-for="i in 5" :key="i" class="h-14 w-full rounded" />
    </div>
    <div v-else-if="!loading && !contents.length" class="flex flex-col items-center justify-center py-16">
      <UIcon name="i-lucide-file-text" class="size-12 text-muted" />
      <p class="mt-3 text-sm text-muted">{{ $t('common.noResults') }}</p>
    </div>
    <UTable v-else :data="contents" :columns="columns" :loading="loading" />

    <div v-if="totalPages > 1" class="flex items-center justify-between">
      <p class="text-sm text-muted">
        {{ $t('common.showing', { from: (page - 1) * limit + 1, to: Math.min(page * limit, total), total }) }}
      </p>
      <UPagination v-model="page" :total="total" :items-per-page="limit" />
    </div>

    <!-- Delete modal -->
    <UModal v-model:open="deleteOpen">
      <template #content>
        <div class="p-6 space-y-4">
          <h3 class="text-lg font-semibold">{{ $t('contents.deleteTitle') }}</h3>
          <p class="text-sm text-muted">{{ $t('contents.deleteConfirm') }}</p>
          <div class="flex justify-end gap-2">
            <UButton variant="ghost" color="neutral" @click="deleteOpen = false">
              {{ $t('common.cancel') }}
            </UButton>
            <UButton color="error" :loading="deleting" @click="handleDelete">
              {{ $t('common.delete') }}
            </UButton>
          </div>
        </div>
      </template>
    </UModal>

    <!-- Bulk action confirmation modal -->
    <UModal v-model:open="bulkOpen">
      <template #content>
        <div class="p-6 space-y-4">
          <h3 class="text-lg font-semibold">{{ $t('contents.bulkConfirmTitle') }}</h3>
          <p class="text-sm text-muted">
            {{ $t('contents.bulkConfirmMessage', { action: bulkActionType, count: selectedIds.size }) }}
          </p>
          <div class="flex justify-end gap-2">
            <UButton variant="ghost" color="neutral" @click="bulkOpen = false">
              {{ $t('common.cancel') }}
            </UButton>
            <UButton :color="bulkActionType === 'delete' ? 'error' : 'primary'" @click="executeBulk">
              {{ $t('common.confirm') }}
            </UButton>
          </div>
        </div>
      </template>
    </UModal>

    <!-- Import modal -->
    <ImportModal v-model:open="importOpen" :content-types="contentTypeItems" @imported="page = 1" />

    <!-- Image preview lightbox -->
    <UModal v-model:open="previewOpen">
      <template #content>
        <div class="flex items-center justify-center p-2" @click="previewOpen = false">
          <img
            v-if="previewMediaId"
            :src="`${baseURL}/uploads/${previewMediaId}/serve?w=1024&format=webp`"
            class="max-h-[80vh] max-w-full rounded-lg object-contain"
            alt=""
          />
        </div>
      </template>
    </UModal>
  </div>
</template>
