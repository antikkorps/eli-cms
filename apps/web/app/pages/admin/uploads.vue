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
  alt: string | null;
  caption: string | null;
  width: number | null;
  height: number | null;
  folderId: string | null;
}

interface FolderNode {
  id: string;
  name: string;
  slug: string;
  parentId: string | null;
  children: FolderNode[];
}

// Folder state
const folderTree = ref<FolderNode[]>([]);
const selectedFolderId = ref<string | null>(null);
const folderCreateOpen = ref(false);
const folderRenameOpen = ref(false);
const folderDeleteOpen = ref(false);
const folderName = ref('');
const folderTarget = ref<FolderNode | null>(null);
const folderSaving = ref(false);

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

// Edit media state (replaces old rename)
const editOpen = ref(false);
const editTarget = ref<MediaItem | null>(null);
const editOriginalName = ref('');
const editAlt = ref('');
const editCaption = ref('');
const editFolderId = ref<string | null>(null);
const saving = ref(false);

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

function getThumbUrl(item: MediaItem): string {
  return `${baseURL}/uploads/${item.id}/serve?w=80&h=80&format=webp`;
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
  } catch {
    toast.add({ title: t('common.error'), color: 'error' });
  } finally {
    saving.value = false;
  }
}

// ─── Folder management ─────────────────────────────────
async function fetchFolderTree() {
  try {
    const res = await apiFetch<{ success: boolean; data: FolderNode[] }>('/media-folders/tree');
    folderTree.value = res.data;
  } catch {
    folderTree.value = [];
  }
}

function flattenFolders(nodes: FolderNode[], depth = 0): Array<{ id: string; name: string; depth: number }> {
  const result: Array<{ id: string; name: string; depth: number }> = [];
  for (const n of nodes) {
    result.push({ id: n.id, name: n.name, depth });
    if (n.children.length > 0) {
      result.push(...flattenFolders(n.children, depth + 1));
    }
  }
  return result;
}

const flatFolders = computed(() => flattenFolders(folderTree.value));

function selectFolder(id: string | null) {
  selectedFolderId.value = id;
}

function openCreateFolder() {
  folderName.value = '';
  folderCreateOpen.value = true;
}

async function handleCreateFolder() {
  if (!folderName.value.trim()) return;
  folderSaving.value = true;
  try {
    await apiFetch('/media-folders', {
      method: 'POST',
      body: {
        name: folderName.value.trim(),
        parentId: selectedFolderId.value,
      },
    });
    toast.add({ title: t('mediaFolders.created'), color: 'success' });
    folderCreateOpen.value = false;
    await fetchFolderTree();
  } catch {
    toast.add({ title: t('common.error'), color: 'error' });
  } finally {
    folderSaving.value = false;
  }
}

function findFolder(nodes: FolderNode[], id: string): FolderNode | null {
  for (const n of nodes) {
    if (n.id === id) return n;
    const found = findFolder(n.children, id);
    if (found) return found;
  }
  return null;
}

function openRenameFolder() {
  if (!selectedFolderId.value) return;
  const folder = findFolder(folderTree.value, selectedFolderId.value);
  if (!folder) return;
  folderTarget.value = folder;
  folderName.value = folder.name;
  folderRenameOpen.value = true;
}

async function handleRenameFolder() {
  if (!folderTarget.value || !folderName.value.trim()) return;
  folderSaving.value = true;
  try {
    await apiFetch(`/media-folders/${folderTarget.value.id}`, {
      method: 'PUT',
      body: { name: folderName.value.trim() },
    });
    toast.add({ title: t('mediaFolders.renamed'), color: 'success' });
    folderRenameOpen.value = false;
    await fetchFolderTree();
  } catch {
    toast.add({ title: t('common.error'), color: 'error' });
  } finally {
    folderSaving.value = false;
  }
}

function openDeleteFolder() {
  if (!selectedFolderId.value) return;
  const folder = findFolder(folderTree.value, selectedFolderId.value);
  if (!folder) return;
  folderTarget.value = folder;
  folderDeleteOpen.value = true;
}

async function handleDeleteFolder() {
  if (!folderTarget.value) return;
  folderSaving.value = true;
  try {
    await apiFetch(`/media-folders/${folderTarget.value.id}`, { method: 'DELETE' });
    toast.add({ title: t('mediaFolders.deleted'), color: 'success' });
    folderDeleteOpen.value = false;
    selectedFolderId.value = null;
    await fetchFolderTree();
    await fetchItems();
  } catch {
    toast.add({ title: t('common.error'), color: 'error' });
  } finally {
    folderSaving.value = false;
  }
}

onMounted(() => {
  fetchFolderTree();
});

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

    <div class="flex gap-6">
      <!-- Folder sidebar -->
      <div class="w-56 shrink-0 space-y-2">
        <div class="flex items-center justify-between">
          <span class="text-xs font-semibold uppercase text-muted">{{ $t('mediaFolders.title') }}</span>
          <div class="flex gap-0.5">
            <UButton
              v-if="canUpload"
              icon="i-lucide-folder-plus"
              variant="ghost"
              color="neutral"
              size="xs"
              @click="openCreateFolder"
            />
            <UButton
              v-if="selectedFolderId && canUpload"
              icon="i-lucide-pencil"
              variant="ghost"
              color="neutral"
              size="xs"
              @click="openRenameFolder"
            />
            <UButton
              v-if="selectedFolderId && canDelete"
              icon="i-lucide-trash-2"
              variant="ghost"
              color="error"
              size="xs"
              @click="openDeleteFolder"
            />
          </div>
        </div>

        <button
          class="flex items-center gap-1 w-full text-left px-2 py-1.5 rounded text-sm transition-colors hover:bg-elevated"
          :class="{ 'bg-primary/10 text-primary font-medium': !selectedFolderId, 'text-muted': selectedFolderId }"
          @click="selectFolder(null)"
        >
          <UIcon name="i-lucide-folder" class="size-4 shrink-0" />
          <span>{{ $t('mediaFolders.allFiles') }}</span>
        </button>

        <FolderTree
          :folders="folderTree"
          :selected="selectedFolderId"
          @select="selectFolder"
        />
      </div>

      <!-- Main content -->
      <div class="flex-1 min-w-0 space-y-4">
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
      </div>
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
    <UModal v-model:open="editOpen" :title="$t('uploads.editMediaTitle')" :description="$t('uploads.altLabel')">
      <template #content>
        <div class="p-6 space-y-4">
          <h3 class="text-lg font-semibold">{{ $t('uploads.editMediaTitle') }}</h3>
          <UFormField :label="$t('uploads.renameLabel')">
            <UInput v-model="editOriginalName" />
          </UFormField>
          <UFormField :label="$t('uploads.altLabel')">
            <UInput v-model="editAlt" :placeholder="$t('uploads.altPlaceholder')" />
          </UFormField>
          <UFormField :label="$t('uploads.captionLabel')">
            <UTextarea v-model="editCaption" :placeholder="$t('uploads.captionPlaceholder')" :rows="3" />
          </UFormField>
          <UFormField v-if="flatFolders.length > 0" :label="$t('mediaFolders.moveToFolder')">
            <USelect
              v-model="editFolderId"
              :items="[
                { label: $t('mediaFolders.rootFolder'), value: null },
                ...flatFolders.map(f => ({ label: '  '.repeat(f.depth) + f.name, value: f.id })),
              ]"
              value-key="value"
            />
          </UFormField>
          <div class="flex justify-end gap-2">
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

    <!-- Create folder modal -->
    <UModal v-model:open="folderCreateOpen" :title="$t('mediaFolders.createTitle')" :description="$t('mediaFolders.nameLabel')">
      <template #content>
        <div class="p-6 space-y-4">
          <h3 class="text-lg font-semibold">{{ $t('mediaFolders.createTitle') }}</h3>
          <UFormField :label="$t('mediaFolders.nameLabel')">
            <UInput v-model="folderName" :placeholder="$t('mediaFolders.namePlaceholder')" autofocus @keydown.enter="handleCreateFolder" />
          </UFormField>
          <div class="flex justify-end gap-2">
            <UButton variant="ghost" color="neutral" @click="folderCreateOpen = false">
              {{ $t('common.cancel') }}
            </UButton>
            <UButton :loading="folderSaving" :disabled="!folderName.trim()" @click="handleCreateFolder">
              {{ $t('common.create') }}
            </UButton>
          </div>
        </div>
      </template>
    </UModal>

    <!-- Rename folder modal -->
    <UModal v-model:open="folderRenameOpen" :title="$t('mediaFolders.renameTitle')" :description="$t('mediaFolders.nameLabel')">
      <template #content>
        <div class="p-6 space-y-4">
          <h3 class="text-lg font-semibold">{{ $t('mediaFolders.renameTitle') }}</h3>
          <UFormField :label="$t('mediaFolders.nameLabel')">
            <UInput v-model="folderName" autofocus @keydown.enter="handleRenameFolder" />
          </UFormField>
          <div class="flex justify-end gap-2">
            <UButton variant="ghost" color="neutral" @click="folderRenameOpen = false">
              {{ $t('common.cancel') }}
            </UButton>
            <UButton :loading="folderSaving" :disabled="!folderName.trim()" @click="handleRenameFolder">
              {{ $t('common.save') }}
            </UButton>
          </div>
        </div>
      </template>
    </UModal>

    <!-- Delete folder modal -->
    <UModal v-model:open="folderDeleteOpen" :title="$t('mediaFolders.deleteTitle')" :description="$t('mediaFolders.deleteConfirm')">
      <template #content>
        <div class="p-6 space-y-4">
          <h3 class="text-lg font-semibold">{{ $t('mediaFolders.deleteTitle') }}</h3>
          <p class="text-sm text-muted">{{ $t('mediaFolders.deleteConfirm') }}</p>
          <div class="flex justify-end gap-2">
            <UButton variant="ghost" color="neutral" @click="folderDeleteOpen = false">
              {{ $t('common.cancel') }}
            </UButton>
            <UButton color="error" :loading="folderSaving" @click="handleDeleteFolder">
              {{ $t('common.delete') }}
            </UButton>
          </div>
        </div>
      </template>
    </UModal>
  </div>
</template>
