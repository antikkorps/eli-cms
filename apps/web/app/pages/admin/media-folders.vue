<script setup lang="ts">
definePageMeta({
  layout: 'admin',
  middleware: ['auth'],
});

const { apiFetch } = useApi();
const { t } = useI18n();
const { hasPermission } = useAuth();
const toast = useToast();
const { tree: folderTree, fetch: fetchFolders, invalidate: invalidateFolders } = useMediaFolders();

interface FolderNode {
  id: string;
  name: string;
  slug: string;
  parentId: string | null;
  children: FolderNode[];
}

const canCreate = computed(() => hasPermission('uploads:create'));
const canDelete = computed(() => hasPermission('uploads:delete'));

// Expanded state
const expanded = ref<Set<string>>(new Set());

function toggle(id: string) {
  const next = new Set(expanded.value);
  if (next.has(id)) next.delete(id);
  else next.add(id);
  expanded.value = next;
}

// Create folder
const createOpen = ref(false);
const createName = ref('');
const createParentId = ref<string | null>(null);
const creating = ref(false);

function openCreate(parentId: string | null = null) {
  createParentId.value = parentId;
  createName.value = '';
  createOpen.value = true;
}

async function handleCreate() {
  if (!createName.value.trim()) return;
  creating.value = true;
  try {
    await apiFetch('/media-folders', {
      method: 'POST',
      body: {
        name: createName.value.trim(),
        parentId: createParentId.value,
      },
    });
    toast.add({ title: t('mediaFolders.created'), color: 'success' });
    createOpen.value = false;
    invalidateFolders();
    await fetchFolders();
    // Auto-expand parent
    if (createParentId.value) {
      expanded.value = new Set([...expanded.value, createParentId.value]);
    }
  } catch {
    toast.add({ title: t('common.error'), color: 'error' });
  } finally {
    creating.value = false;
  }
}

// Rename folder
const renameOpen = ref(false);
const renameTarget = ref<FolderNode | null>(null);
const renameName = ref('');
const renaming = ref(false);

function openRename(folder: FolderNode) {
  renameTarget.value = folder;
  renameName.value = folder.name;
  renameOpen.value = true;
}

async function handleRename() {
  if (!renameTarget.value || !renameName.value.trim()) return;
  renaming.value = true;
  try {
    await apiFetch(`/media-folders/${renameTarget.value.id}`, {
      method: 'PUT',
      body: { name: renameName.value.trim() },
    });
    toast.add({ title: t('mediaFolders.renamed'), color: 'success' });
    renameOpen.value = false;
    invalidateFolders();
    await fetchFolders();
  } catch {
    toast.add({ title: t('common.error'), color: 'error' });
  } finally {
    renaming.value = false;
  }
}

// Delete folder
const deleteOpen = ref(false);
const deleteTarget = ref<FolderNode | null>(null);
const deleting = ref(false);

function openDelete(folder: FolderNode) {
  deleteTarget.value = folder;
  deleteOpen.value = true;
}

async function handleDelete() {
  if (!deleteTarget.value) return;
  deleting.value = true;
  try {
    await apiFetch(`/media-folders/${deleteTarget.value.id}`, { method: 'DELETE' });
    toast.add({ title: t('mediaFolders.deleted'), color: 'success' });
    deleteOpen.value = false;
    invalidateFolders();
    await fetchFolders();
  } catch {
    toast.add({ title: t('common.error'), color: 'error' });
  } finally {
    deleting.value = false;
  }
}

onMounted(() => {
  invalidateFolders();
  fetchFolders();
});
</script>

<template>
  <div class="p-6 space-y-6">
    <div class="flex items-center justify-between">
      <div>
        <h1 class="text-2xl font-bold">{{ $t('mediaFolders.pageTitle') }}</h1>
        <p class="text-sm text-muted mt-1">{{ $t('mediaFolders.pageSubtitle') }}</p>
      </div>
      <UButton v-if="canCreate" icon="i-lucide-folder-plus" @click="openCreate(null)">
        {{ $t('mediaFolders.createTitle') }}
      </UButton>
    </div>

    <!-- Empty state -->
    <div v-if="!folderTree.length" class="flex flex-col items-center justify-center py-16">
      <UIcon name="i-lucide-folder" class="size-12 text-muted" />
      <p class="mt-3 text-sm text-muted">{{ $t('mediaFolders.empty') }}</p>
    </div>

    <!-- Folder tree as accordion list -->
    <div v-else class="space-y-1">
      <template v-for="folder in folderTree" :key="folder.id">
        <FolderRow
          :folder="folder"
          :expanded="expanded"
          :depth="0"
          :can-create="canCreate"
          :can-delete="canDelete"
          @toggle="toggle"
          @create="openCreate"
          @rename="openRename"
          @delete="openDelete"
        />
      </template>
    </div>

    <!-- Create folder modal -->
    <UModal v-model:open="createOpen" :title="$t('mediaFolders.createTitle')" :description="$t('mediaFolders.nameLabel')">
      <template #content>
        <div class="p-6 space-y-4">
          <h3 class="text-lg font-semibold">{{ $t('mediaFolders.createTitle') }}</h3>
          <UFormField :label="$t('mediaFolders.nameLabel')">
            <UInput v-model="createName" :placeholder="$t('mediaFolders.namePlaceholder')" autofocus @keydown.enter="handleCreate" />
          </UFormField>
          <div class="flex justify-end gap-2">
            <UButton variant="ghost" color="neutral" @click="createOpen = false">
              {{ $t('common.cancel') }}
            </UButton>
            <UButton :loading="creating" :disabled="!createName.trim()" @click="handleCreate">
              {{ $t('common.create') }}
            </UButton>
          </div>
        </div>
      </template>
    </UModal>

    <!-- Rename folder modal -->
    <UModal v-model:open="renameOpen" :title="$t('mediaFolders.renameTitle')" :description="$t('mediaFolders.nameLabel')">
      <template #content>
        <div class="p-6 space-y-4">
          <h3 class="text-lg font-semibold">{{ $t('mediaFolders.renameTitle') }}</h3>
          <UFormField :label="$t('mediaFolders.nameLabel')">
            <UInput v-model="renameName" autofocus @keydown.enter="handleRename" />
          </UFormField>
          <div class="flex justify-end gap-2">
            <UButton variant="ghost" color="neutral" @click="renameOpen = false">
              {{ $t('common.cancel') }}
            </UButton>
            <UButton :loading="renaming" :disabled="!renameName.trim()" @click="handleRename">
              {{ $t('common.save') }}
            </UButton>
          </div>
        </div>
      </template>
    </UModal>

    <!-- Delete folder modal -->
    <UModal v-model:open="deleteOpen" :title="$t('mediaFolders.deleteTitle')" :description="$t('mediaFolders.deleteConfirm')">
      <template #content>
        <div class="p-6 space-y-4">
          <h3 class="text-lg font-semibold">{{ $t('mediaFolders.deleteTitle') }}</h3>
          <p class="text-sm text-muted">{{ $t('mediaFolders.deleteConfirm') }}</p>
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
