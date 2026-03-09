<script setup lang="ts">
import { h, resolveComponent } from 'vue';

definePageMeta({
  layout: 'admin',
  middleware: ['auth'],
});

const { apiFetch } = useApi();
const { t, locale } = useI18n();
const { hasPermission } = useAuth();
const toast = useToast();
const { items: contentTypeItems, fetch: fetchContentTypes } = useContentTypes();
const { invalidate: invalidateTrashCount } = useTrashCount();

interface ContentItem {
  id: string;
  contentTypeId: string;
  slug: string | null;
  status: string;
  data: Record<string, unknown>;
  deletedAt: string;
  createdAt: string;
  updatedAt: string;
}

const search = ref('');
const contentTypeFilter = ref<string | undefined>(undefined);

const {
  items: contents,
  loading,
  page,
  total,
  limit,
  totalPages,
  sortBy,
  sortOrder,
  toggleSort,
  selectedIds,
  allSelected,
  toggleSelect,
  selectAll,
  fetchItems,
} = useCrudList<ContentItem>({
  endpoint: '/contents/trash',
  filters: { search, contentTypeId: contentTypeFilter },
  defaultSortBy: 'deletedAt',
});

const canUpdate = computed(() => hasPermission('content:update'));
const canDelete = computed(() => hasPermission('content:delete'));

// Restore
const restoreOpen = ref(false);
const restoreTarget = ref<ContentItem | null>(null);
const restoring = ref(false);

function confirmRestore(item: ContentItem) {
  restoreTarget.value = item;
  restoreOpen.value = true;
}

async function handleRestore() {
  if (!restoreTarget.value) return;
  restoring.value = true;
  try {
    await apiFetch(`/contents/trash/${restoreTarget.value.id}/restore`, { method: 'POST' });
    restoreOpen.value = false;
    restoreTarget.value = null;
    toast.add({ title: t('trash.restored'), color: 'success' });
    invalidateTrashCount();
    useContentTypes().invalidate();
    await fetchItems();
  } catch {
    toast.add({ title: t('common.error'), color: 'error' });
  } finally {
    restoring.value = false;
  }
}

// Permanent delete
const permanentDeleteOpen = ref(false);
const permanentDeleteTarget = ref<ContentItem | null>(null);
const permanentDeleting = ref(false);

function confirmPermanentDelete(item: ContentItem) {
  permanentDeleteTarget.value = item;
  permanentDeleteOpen.value = true;
}

async function handlePermanentDelete() {
  if (!permanentDeleteTarget.value) return;
  permanentDeleting.value = true;
  try {
    await apiFetch(`/contents/trash/${permanentDeleteTarget.value.id}`, { method: 'DELETE' });
    permanentDeleteOpen.value = false;
    permanentDeleteTarget.value = null;
    toast.add({ title: t('trash.permanentlyDeleted'), color: 'success' });
    invalidateTrashCount();
    await fetchItems();
  } catch {
    toast.add({ title: t('common.error'), color: 'error' });
  } finally {
    permanentDeleting.value = false;
  }
}

// Bulk actions
const bulkOpen = ref(false);
const bulkActionType = ref('');

function confirmBulk(action: string) {
  bulkActionType.value = action;
  bulkOpen.value = true;
}

async function executeBulk() {
  bulkOpen.value = false;
  const ids = [...selectedIds.value];
  try {
    await apiFetch('/contents/bulk-action', {
      method: 'POST',
      body: { ids, action: bulkActionType.value },
    });
    toast.add({ title: t('contents.bulkSuccess'), color: 'success' });
    invalidateTrashCount();
    if (bulkActionType.value === 'restore') {
      useContentTypes().invalidate();
    }
    await fetchItems();
  } catch {
    toast.add({ title: t('common.error'), color: 'error' });
  }
}

const typeFilterItems = computed(() =>
  contentTypeItems.value.map((ct) => ({ label: ct.name, value: ct.id })),
);

function getPreviewText(data: Record<string, unknown>): string {
  const first = Object.values(data).find((v) => typeof v === 'string' && v.length > 0);
  if (typeof first === 'string') return first.length > 60 ? first.substring(0, 60) + '...' : first;
  return JSON.stringify(data).substring(0, 60) + '...';
}

function getContentTypeName(contentTypeId: string): string {
  return contentTypeItems.value.find((c) => c.id === contentTypeId)?.name ?? '—';
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
    header: t('contents.columnTitle'),
    cell: ({ row }: { row: { original: ContentItem } }) => getPreviewText(row.original.data),
  },
  {
    accessorKey: 'contentType',
    header: t('contents.columnType'),
    cell: ({ row }: { row: { original: ContentItem } }) =>
      h(UBadge as ReturnType<typeof resolveComponent>, { variant: 'subtle', size: 'sm' }, () => getContentTypeName(row.original.contentTypeId)),
  },
  {
    accessorKey: 'status',
    header: t('contents.columnStatus'),
    cell: ({ row }: { row: { original: ContentItem } }) => {
      const statusMap: Record<string, { color: string; label: string }> = {
        draft: { color: 'neutral', label: t('contents.draft') },
        'in-review': { color: 'warning', label: t('contents.inReview') },
        approved: { color: 'info', label: t('contents.approved') },
        scheduled: { color: 'primary', label: t('contents.scheduled') },
        published: { color: 'success', label: t('contents.published') },
      };
      const cfg = statusMap[row.original.status] ?? statusMap.draft!;
      return h(UBadge as ReturnType<typeof resolveComponent>, { variant: 'subtle', color: cfg!.color, size: 'sm' }, () => cfg!.label);
    },
  },
  {
    accessorKey: 'deletedAt',
    header: () =>
      h('button', { class: 'flex items-center gap-1 font-medium', onClick: () => toggleSort('deletedAt') }, [
        t('trash.columnDeletedAt'),
        h('span', { class: `${sortBy.value === 'deletedAt' ? 'opacity-100' : 'opacity-40'} i-lucide-${sortBy.value === 'deletedAt' ? (sortOrder.value === 'asc' ? 'arrow-up' : 'arrow-down') : 'arrow-up-down'} size-3.5` }),
      ]),
    cell: ({ row }: { row: { original: ContentItem } }) =>
      row.original.deletedAt ? new Date(row.original.deletedAt).toLocaleDateString(locale.value) : '—',
  },
  {
    accessorKey: 'actions',
    header: '',
    cell: ({ row }: { row: { original: ContentItem } }) => {
      const buttons = [];
      if (canUpdate.value) {
        buttons.push(
          h(UButton as ReturnType<typeof resolveComponent>, {
            icon: 'i-lucide-rotate-ccw',
            variant: 'ghost',
            color: 'neutral',
            size: 'sm',
            title: t('trash.restore'),
            onClick: () => confirmRestore(row.original),
          }),
        );
      }
      if (canDelete.value) {
        buttons.push(
          h(UButton as ReturnType<typeof resolveComponent>, {
            icon: 'i-lucide-trash-2',
            variant: 'ghost',
            color: 'error',
            size: 'sm',
            title: t('trash.permanentDelete'),
            onClick: () => confirmPermanentDelete(row.original),
          }),
        );
      }
      return h('div', { class: 'flex gap-1 justify-end' }, buttons);
    },
  },
]);

onMounted(() => {
  fetchContentTypes();
});
</script>

<template>
  <div class="p-6 space-y-6">
    <div>
      <h1 class="text-2xl font-bold">{{ $t('trash.title') }}</h1>
      <p class="text-sm text-muted mt-1">{{ $t('trash.subtitle') }}</p>
    </div>

    <UAlert
      icon="i-lucide-info"
      color="neutral"
      variant="subtle"
      :title="$t('trash.autoPurgeNotice')"
    />

    <div class="flex flex-wrap gap-3 items-center">
      <UInput v-model="search" :placeholder="$t('common.search')" icon="i-lucide-search" class="w-64" />
      <USelect v-model="contentTypeFilter" nullable :items="typeFilterItems" :placeholder="$t('contents.allTypes')" class="w-48" />

      <template v-if="selectedIds.size > 0">
        <span class="text-sm text-muted">{{ $t('contents.selected', { count: selectedIds.size }) }}</span>
        <UButton v-if="canUpdate" size="sm" variant="outline" @click="confirmBulk('restore')">
          {{ $t('trash.bulkRestore') }}
        </UButton>
        <UButton v-if="canDelete" size="sm" variant="outline" color="error" @click="confirmBulk('permanent-delete')">
          {{ $t('trash.bulkPermanentDelete') }}
        </UButton>
      </template>
    </div>

    <div v-if="loading && !contents.length" class="space-y-3">
      <USkeleton class="h-10 w-full rounded" />
      <USkeleton v-for="i in 5" :key="i" class="h-14 w-full rounded" />
    </div>
    <div v-else-if="!loading && !contents.length" class="flex flex-col items-center justify-center py-16">
      <UIcon name="i-lucide-trash-2" class="size-12 text-muted" />
      <p class="mt-3 text-sm text-muted">{{ $t('trash.empty') }}</p>
    </div>
    <UTable v-else :data="contents" :columns="columns" :loading="loading" />

    <div v-if="totalPages > 1" class="flex items-center justify-between">
      <p class="text-sm text-muted">
        {{ $t('common.showing', { from: (page - 1) * limit + 1, to: Math.min(page * limit, total), total }) }}
      </p>
      <UPagination v-model="page" :total="total" :items-per-page="limit" />
    </div>

    <!-- Restore modal -->
    <UModal v-model:open="restoreOpen">
      <template #content>
        <div class="p-6 space-y-4">
          <h3 class="text-lg font-semibold">{{ $t('trash.restore') }}</h3>
          <p class="text-sm text-muted">{{ $t('trash.restoreConfirm') }}</p>
          <div class="flex justify-end gap-2">
            <UButton variant="ghost" color="neutral" @click="restoreOpen = false">
              {{ $t('common.cancel') }}
            </UButton>
            <UButton color="primary" :loading="restoring" @click="handleRestore">
              {{ $t('trash.restore') }}
            </UButton>
          </div>
        </div>
      </template>
    </UModal>

    <!-- Permanent delete modal -->
    <UModal v-model:open="permanentDeleteOpen">
      <template #content>
        <div class="p-6 space-y-4">
          <h3 class="text-lg font-semibold">{{ $t('trash.permanentDelete') }}</h3>
          <p class="text-sm text-muted">{{ $t('trash.permanentDeleteConfirm') }}</p>
          <div class="flex justify-end gap-2">
            <UButton variant="ghost" color="neutral" @click="permanentDeleteOpen = false">
              {{ $t('common.cancel') }}
            </UButton>
            <UButton color="error" :loading="permanentDeleting" @click="handlePermanentDelete">
              {{ $t('trash.permanentDelete') }}
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
            <UButton :color="bulkActionType === 'permanent-delete' ? 'error' : 'primary'" @click="executeBulk">
              {{ $t('common.confirm') }}
            </UButton>
          </div>
        </div>
      </template>
    </UModal>
  </div>
</template>
