<script setup lang="ts">
import { h, resolveComponent } from 'vue';

definePageMeta({
  layout: 'admin',
  middleware: ['auth'],
});

const { apiFetch, baseURL } = useApi();
const { t, locale } = useI18n();
const { hasPermission } = useAuth();
const toast = useToast();
const route = useRoute();
const { flatten: flattenFolders, fetch: fetchFolders, invalidate: invalidateFolders } = useMediaFolders();

interface MediaItem {
  id: string;
  filename: string;
  originalName: string;
  mimeType: string;
  size: number;
  storageKey: string;
  createdAt: string;
  alt: string | null;
  caption: string | null;
  width: number | null;
  height: number | null;
  folderId: string | null;
}

// Read folder filter from route query
const selectedFolderId = ref<string | null>((route.query.folder as string) ?? null);

// Sync with route changes
watch(() => route.query.folder, (val) => {
  selectedFolderId.value = (val as string) ?? null;
});

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
} = useCrudList<MediaItem>({
  endpoint: '/uploads',
  filters: {
    folderId: selectedFolderId as Ref<string | null>,
  },
});

const canUpload = computed(() => hasPermission('uploads:create'));
const canUpdate = computed(() => hasPermission('uploads:update'));
const canDelete = computed(() => hasPermission('uploads:delete'));
const uploading = ref(false);
const dragging = ref(false);

// Edit media state
const editOpen = ref(false);
const editTarget = ref<MediaItem | null>(null);
const editOriginalName = ref('');
const editAlt = ref('');
const editCaption = ref('');
const editFolderId = ref<string | null>(null);
const saving = ref(false);

const flatFolderList = computed(() => flattenFolders());

function formatSize(bytes: number): string {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

function isImage(mimeType: string): boolean {
  return mimeType.startsWith('image/');
}

function getThumbUrl(item: MediaItem): string {
  return `${baseURL}/uploads/${item.id}/serve?w=80&h=80&format=webp`;
}

function getPreviewUrl(item: MediaItem): string {
  return `${baseURL}/uploads/${item.id}/serve?w=400&h=400&format=webp`;
}

async function handleUpload(event: Event) {
  const input = event.target as HTMLInputElement;
  const file = input.files?.[0];
  if (!file) return;

  uploading.value = true;
  try {
    const formData = new FormData();
    formData.append('file', file);
    if (selectedFolderId.value) {
      formData.append('folderId', selectedFolderId.value);
    }
    await apiFetch('/uploads', { method: 'POST', body: formData });
    toast.add({ title: t('uploads.uploaded'), color: 'success' });
    await fetchItems();
  } catch {
    toast.add({ title: t('common.error'), color: 'error' });
  } finally {
    uploading.value = false;
    input.value = '';
  }
}

function onDragOver(e: DragEvent) {
  e.preventDefault();
  dragging.value = true;
}

function onDragLeave() {
  dragging.value = false;
}

async function onDrop(e: DragEvent) {
  e.preventDefault();
  dragging.value = false;
  const file = e.dataTransfer?.files?.[0];
  if (!file || !canUpload.value) return;
  uploading.value = true;
  try {
    const formData = new FormData();
    formData.append('file', file);
    if (selectedFolderId.value) {
      formData.append('folderId', selectedFolderId.value);
    }
    await apiFetch('/uploads', { method: 'POST', body: formData });
    toast.add({ title: t('uploads.uploaded'), color: 'success' });
    await fetchItems();
  } catch {
    toast.add({ title: t('common.error'), color: 'error' });
  } finally {
    uploading.value = false;
  }
}

function openEdit(item: MediaItem) {
  editTarget.value = item;
  editOriginalName.value = item.originalName;
  editAlt.value = item.alt ?? '';
  editCaption.value = item.caption ?? '';
  editFolderId.value = item.folderId;
  editOpen.value = true;
}

async function handleEdit() {
  if (!editTarget.value || !editOriginalName.value.trim()) return;
  saving.value = true;
  try {
    const body: Record<string, unknown> = {
      originalName: editOriginalName.value.trim(),
      alt: editAlt.value.trim() || null,
      caption: editCaption.value.trim() || null,
    };
    if (editFolderId.value !== editTarget.value.folderId) {
      body.folderId = editFolderId.value;
    }
    await apiFetch(`/uploads/${editTarget.value.id}`, {
      method: 'PATCH',
      body,
    });
    toast.add({ title: t('uploads.updated'), color: 'success' });
    editOpen.value = false;
    await fetchItems();
    // Refresh sidebar folder counts if folder changed
    if (body.folderId !== undefined) {
      invalidateFolders();
      fetchFolders();
    }
  } catch {
    toast.add({ title: t('common.error'), color: 'error' });
  } finally {
    saving.value = false;
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
          src: getThumbUrl(row.original),
          class: 'w-10 h-10 rounded object-cover',
          alt: row.original.alt || row.original.originalName,
          loading: 'lazy',
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
    accessorKey: 'dimensions',
    header: t('uploads.columnDimensions'),
    cell: ({ row }: { row: { original: MediaItem } }) => {
      if (row.original.width && row.original.height) {
        return `${row.original.width} × ${row.original.height}`;
      }
      return '—';
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
      const buttons = [];
      if (canUpdate.value) {
        buttons.push(
          h(UButton as ReturnType<typeof resolveComponent>, {
            icon: 'i-lucide-pencil',
            variant: 'ghost',
            color: 'neutral',
            size: 'sm',
            onClick: () => openEdit(row.original),
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
            onClick: () => confirmDelete(row.original),
          }),
        );
      }
      if (buttons.length === 0) return '';
      return h('div', { class: 'flex gap-1 justify-end' }, buttons);
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

    <div
      v-if="canUpload"
      class="flex items-center justify-center rounded-lg border-2 border-dashed p-6 transition-colors"
      :class="dragging ? 'border-primary bg-primary/5' : 'border-muted'"
      @dragover="onDragOver"
      @dragenter="onDragOver"
      @dragleave="onDragLeave"
      @drop="onDrop"
    >
      <div class="text-center">
        <UIcon name="i-lucide-upload-cloud" class="size-8 text-muted mb-2" />
        <p class="text-sm text-muted">{{ $t('uploads.dropzone') }}</p>
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

    <!-- Delete modal -->
    <UModal v-model:open="deleteOpen" :title="$t('uploads.deleteTitle')" :description="$t('uploads.deleteConfirm', { name: deleteTarget?.originalName })">
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

    <!-- Edit media modal -->
    <UModal v-model:open="editOpen" :title="$t('uploads.editMediaTitle')" :description="$t('uploads.editMediaDescription')">
      <template #content>
        <div class="p-4 sm:p-6">
          <h3 class="text-lg font-semibold mb-4">{{ $t('uploads.editMediaTitle') }}</h3>

          <div v-if="editTarget" class="flex flex-col sm:flex-row gap-4 sm:gap-6">
            <!-- Left: Preview + file info (stacks on top on mobile) -->
            <div class="flex flex-row sm:flex-col items-center sm:items-start gap-3 sm:w-40 shrink-0">
              <img
                v-if="isImage(editTarget.mimeType)"
                :src="getPreviewUrl(editTarget)"
                :alt="editTarget.originalName"
                class="size-20 sm:w-40 sm:h-32 rounded-lg object-cover bg-muted"
              />
              <div v-else class="flex size-20 sm:w-40 sm:h-32 items-center justify-center rounded-lg bg-muted">
                <UIcon name="i-lucide-file" class="size-8 text-muted" />
              </div>
              <div class="flex flex-col gap-1 sm:w-full min-w-0">
                <div class="flex flex-wrap items-center gap-1.5">
                  <UBadge variant="subtle" size="xs">{{ editTarget.mimeType }}</UBadge>
                  <span class="text-xs text-muted">{{ formatSize(editTarget.size) }}</span>
                </div>
                <span v-if="editTarget.width && editTarget.height" class="text-xs text-muted">
                  {{ editTarget.width }} × {{ editTarget.height }} px
                </span>
              </div>
            </div>

            <!-- Right: Form fields -->
            <div class="flex-1 min-w-0 space-y-4">
              <UFormField :label="$t('uploads.renameLabel')">
                <UInput v-model="editOriginalName" class="w-full" />
              </UFormField>

              <UFormField :label="$t('uploads.altLabel')" :hint="$t('uploads.altHint')">
                <UInput v-model="editAlt" :placeholder="$t('uploads.altPlaceholder')" class="w-full" />
              </UFormField>

              <UFormField :label="$t('uploads.captionLabel')">
                <UTextarea v-model="editCaption" :placeholder="$t('uploads.captionPlaceholder')" :rows="2" autoresize />
              </UFormField>

              <UFormField v-if="flatFolderList.length > 0" :label="$t('mediaFolders.moveToFolder')">
                <USelect
                  v-model="editFolderId"
                  icon="i-lucide-folder"
                  :items="[
                    { label: $t('mediaFolders.rootFolder'), value: null },
                    ...flatFolderList.map(f => ({ label: '\u00A0\u00A0'.repeat(f.depth) + f.name, value: f.id })),
                  ]"
                  value-key="value"
                />
              </UFormField>
            </div>
          </div>

          <!-- Actions -->
          <div class="flex justify-end gap-2 mt-5 pt-4 border-t">
            <UButton variant="ghost" color="neutral" @click="editOpen = false">
              {{ $t('common.cancel') }}
            </UButton>
            <UButton :loading="saving" :disabled="!editOriginalName.trim()" @click="handleEdit">
              {{ $t('common.save') }}
            </UButton>
          </div>
        </div>
      </template>
    </UModal>
  </div>
</template>
