<script setup lang="ts">
import { h, resolveComponent } from 'vue';

definePageMeta({
  layout: 'admin',
  middleware: ['auth'],
});

const { apiFetch, uploadFile, baseURL } = useApi();
const { t, locale } = useI18n();
const { hasPermission } = useAuth();
const toast = useToast();

interface MediaItem {
  id: string;
  filename: string;
  originalName: string;
  mimeType: string;
  size: number;
  storageKey: string;
  createdAt: string;
}

const {
  items: uploads,
  loading,
  page,
  total,
  limit,
  totalPages,
  fetchItems,
  deleteOpen,
  deleteTarget,
  deleting,
  confirmDelete,
  handleDelete,
} = useCrudList<MediaItem>({ endpoint: '/uploads' });

const canUpload = computed(() => hasPermission('uploads:create'));
const canDelete = computed(() => hasPermission('uploads:delete'));
const uploading = ref(false);

function formatSize(bytes: number): string {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

function isImage(mimeType: string): boolean {
  return mimeType.startsWith('image/');
}

function getServeUrl(item: MediaItem): string {
  return `${baseURL}/uploads/${item.id}/serve`;
}

async function handleUpload(event: Event) {
  const input = event.target as HTMLInputElement;
  const file = input.files?.[0];
  if (!file) return;

  uploading.value = true;
  try {
    await uploadFile('/uploads', file);
    toast.add({ title: t('uploads.uploaded'), color: 'success' });
    await fetchItems();
  } catch {
    toast.add({ title: t('common.error'), color: 'error' });
  } finally {
    uploading.value = false;
    input.value = '';
  }
}

const UBadge = resolveComponent('UBadge');
const UButton = resolveComponent('UButton');

const columns = computed(() => [
  {
    accessorKey: 'preview',
    header: t('uploads.columnPreview'),
    cell: ({ row }: { row: { original: MediaItem } }) => {
      if (isImage(row.original.mimeType)) {
        return h('img', {
          src: getServeUrl(row.original),
          class: 'w-10 h-10 rounded object-cover',
          alt: row.original.originalName,
        });
      }
      return h('div', { class: 'w-10 h-10 rounded bg-muted flex items-center justify-center' }, [
        h('span', { class: 'i-lucide-file text-lg' }),
      ]);
    },
  },
  {
    accessorKey: 'originalName',
    header: t('uploads.columnName'),
    cell: ({ row }: { row: { original: MediaItem } }) => row.original.originalName,
  },
  {
    accessorKey: 'mimeType',
    header: t('uploads.columnType'),
    cell: ({ row }: { row: { original: MediaItem } }) => {
      return h(UBadge as ReturnType<typeof resolveComponent>, { variant: 'subtle', size: 'sm' }, () => row.original.mimeType);
    },
  },
  {
    accessorKey: 'size',
    header: t('uploads.columnSize'),
    cell: ({ row }: { row: { original: MediaItem } }) => formatSize(row.original.size),
  },
  {
    accessorKey: 'createdAt',
    header: t('uploads.columnCreated'),
    cell: ({ row }: { row: { original: MediaItem } }) => new Date(row.original.createdAt).toLocaleDateString(locale.value),
  },
  {
    accessorKey: 'actions',
    header: '',
    cell: ({ row }: { row: { original: MediaItem } }) => {
      if (!canDelete.value) return '';
      return h('div', { class: 'flex gap-1 justify-end' }, [
        h(UButton as ReturnType<typeof resolveComponent>, {
          icon: 'i-lucide-trash-2',
          variant: 'ghost',
          color: 'error',
          size: 'sm',
          onClick: () => confirmDelete(row.original),
        }),
      ]);
    },
  },
]);
</script>

<template>
  <div class="p-6 space-y-6">
    <div class="flex items-center justify-between">
      <div>
        <h1 class="text-2xl font-bold">{{ $t('uploads.title') }}</h1>
        <p class="text-sm text-muted mt-1">{{ $t('uploads.subtitle') }}</p>
      </div>
      <div v-if="canUpload">
        <label class="cursor-pointer">
          <UButton as="span" icon="i-lucide-upload" :loading="uploading">
            {{ $t('uploads.upload') }}
          </UButton>
          <input type="file" class="hidden" @change="handleUpload" />
        </label>
      </div>
    </div>

    <div v-if="loading && !uploads.length" class="space-y-3">
      <USkeleton class="h-10 w-full rounded" />
      <USkeleton v-for="i in 5" :key="i" class="h-14 w-full rounded" />
    </div>
    <div v-else-if="!loading && !uploads.length" class="flex flex-col items-center justify-center py-16">
      <UIcon name="i-lucide-image" class="size-12 text-muted" />
      <p class="mt-3 text-sm text-muted">{{ $t('common.noResults') }}</p>
    </div>
    <UTable v-else :data="uploads" :columns="columns" :loading="loading" />

    <div v-if="totalPages > 1" class="flex items-center justify-between">
      <p class="text-sm text-muted">
        {{ $t('common.showing', { from: (page - 1) * limit + 1, to: Math.min(page * limit, total), total }) }}
      </p>
      <UPagination v-model="page" :total="total" :items-per-page="limit" />
    </div>

    <UModal v-model:open="deleteOpen">
      <template #content>
        <div class="p-6 space-y-4">
          <h3 class="text-lg font-semibold">{{ $t('uploads.deleteTitle') }}</h3>
          <i18n-t keypath="uploads.deleteConfirm" tag="p" class="text-sm text-muted">
            <template #name>
              <strong>{{ deleteTarget?.originalName }}</strong>
            </template>
          </i18n-t>
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
