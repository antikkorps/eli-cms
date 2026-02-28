<script setup lang="ts">
import { h, resolveComponent } from 'vue';

definePageMeta({
  layout: 'admin',
  middleware: ['auth'],
});

const { apiFetch, baseURL } = useApi();
const { t, locale } = useI18n();
const { hasPermission } = useAuth();

interface ContentItem {
  id: string;
  contentTypeId: string;
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

interface ContentTypeOption {
  id: string;
  name: string;
  slug: string;
  fields?: FieldDefinition[];
}

const search = ref('');
const contentTypeFilter = ref<string | null>(null);
const statusFilter = ref<string | null>(null);
const contentTypeOptions = ref<ContentTypeOption[]>([]);

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
} = useCrudList<ContentItem>({
  endpoint: '/contents',
  filters: { search, contentTypeId: contentTypeFilter, status: statusFilter },
});

const canCreate = computed(() => hasPermission('content:create'));
const canDelete = computed(() => hasPermission('content:delete'));

async function fetchContentTypes() {
  try {
    const res = await apiFetch<{ success: boolean; data: ContentTypeOption[] }>('/content-types?limit=100');
    contentTypeOptions.value = res.data;
  } catch {
    // ignore
  }
}

const typeFilterItems = computed(() =>
  contentTypeOptions.value.map((ct) => ({ label: ct.name, value: ct.id })),
);

const statusFilterItems = [
  { label: t('contents.draft'), value: 'draft' },
  { label: t('contents.published'), value: 'published' },
];

function getPreviewText(data: Record<string, unknown>): string {
  const first = Object.values(data).find((v) => typeof v === 'string' && v.length > 0);
  if (typeof first === 'string') return first.length > 60 ? first.substring(0, 60) + '...' : first;
  return JSON.stringify(data).substring(0, 60) + '...';
}

function getMediaPreviewId(item: ContentItem): string | null {
  const ct = contentTypeOptions.value.find((c) => c.id === item.contentTypeId);
  if (!ct?.fields) return null;
  const mediaField = ct.fields.find((f) => f.type === 'media');
  if (!mediaField) return null;
  const value = item.data[mediaField.name];
  if (mediaField.multiple && Array.isArray(value) && value.length > 0) return value[0] as string;
  if (typeof value === 'string' && value.length > 0) return value;
  return null;
}

const UBadge = resolveComponent('UBadge');
const UButton = resolveComponent('UButton');

const columns = computed(() => [
  {
    accessorKey: 'data',
    header: t('contents.columnTitle'),
    cell: ({ row }: { row: { original: ContentItem } }) => {
      const mediaId = getMediaPreviewId(row.original);
      const text = getPreviewText(row.original.data);
      if (mediaId) {
        return h('div', { class: 'flex items-center gap-2' }, [
          h('img', {
            src: `${baseURL}/uploads/${mediaId}/serve`,
            class: 'size-8 rounded object-cover shrink-0',
            alt: '',
          }),
          h('span', text),
        ]);
      }
      return text;
    },
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
    header: t('contents.columnStatus'),
    cell: ({ row }: { row: { original: ContentItem } }) => {
      const color = row.original.status === 'published' ? 'success' : 'warning';
      const label = row.original.status === 'published' ? t('contents.published') : t('contents.draft');
      return h(UBadge as ReturnType<typeof resolveComponent>, { variant: 'subtle', color, size: 'sm' }, () => label);
    },
  },
  {
    accessorKey: 'updatedAt',
    header: t('contents.columnUpdated'),
    cell: ({ row }: { row: { original: ContentItem } }) => new Date(row.original.updatedAt).toLocaleDateString(locale.value),
  },
  {
    accessorKey: 'actions',
    header: '',
    cell: ({ row }: { row: { original: ContentItem } }) => {
      const buttons = [
        h(UButton as ReturnType<typeof resolveComponent>, {
          icon: 'i-lucide-pencil',
          variant: 'ghost',
          color: 'neutral',
          size: 'sm',
          to: `/admin/contents/${row.original.id}`,
        }),
      ];
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

onMounted(fetchContentTypes);
</script>

<template>
  <div class="p-6 space-y-6">
    <div class="flex items-center justify-between">
      <div>
        <h1 class="text-2xl font-bold">{{ $t('contents.title') }}</h1>
        <p class="text-sm text-muted mt-1">{{ $t('contents.subtitle') }}</p>
      </div>
      <UButton v-if="canCreate" to="/admin/contents/new" icon="i-lucide-plus">
        {{ $t('contents.create') }}
      </UButton>
    </div>

    <div class="flex flex-wrap gap-3">
      <UInput v-model="search" :placeholder="$t('common.search')" icon="i-lucide-search" class="w-64" />
      <USelect v-model="contentTypeFilter" nullable :items="typeFilterItems" :placeholder="$t('contents.allTypes')" class="w-48" />
      <USelect v-model="statusFilter" nullable :items="statusFilterItems" :placeholder="$t('contents.allStatuses')" class="w-48" />
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
  </div>
</template>
