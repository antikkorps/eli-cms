<script setup lang="ts">
const { t } = useI18n();
const { apiFetch, uploadFile, baseURL } = useApi();
const { flatten: flattenFolders, fetch: fetchFoldersData } = useMediaFolders();

interface MediaItem {
  id: string;
  filename: string;
  originalName: string;
  mimeType: string;
  size: number;
  createdAt: string;
  alt: string | null;
  caption: string | null;
  width: number | null;
  height: number | null;
  folderId: string | null;
}

const props = withDefaults(defineProps<{
  multiple?: boolean;
  accept?: string[];
}>(), {
  multiple: false,
  accept: undefined,
});

const emit = defineEmits<{
  'update:modelValue': [value: string | null | string[]];
}>();

const modelValue = defineModel<string | null | string[]>({ default: null });

const open = ref(false);
const mediaItems = ref<MediaItem[]>([]);
const loadingMedia = ref(false);
const uploading = ref(false);
const page = ref(1);
const totalPages = ref(1);
const dragging = ref(false);
const search = ref('');
const pickerFolderId = ref<string | null>(null);
let searchDebounce: ReturnType<typeof setTimeout> | null = null;

// For single mode: resolved selected media
const selectedMedia = ref<MediaItem | null>(null);
// For multiple mode: resolved selected media list
const selectedMediaList = ref<MediaItem[]>([]);
// For multiple mode: pending selection in modal
const pendingSelection = ref<string[]>([]);

function isImage(mimeType: string): boolean {
  return mimeType.startsWith('image/');
}

function getServeUrl(id: string): string {
  return `${baseURL}/uploads/${id}/serve`;
}

function getThumbUrl(id: string, size = 128): string {
  return `${baseURL}/uploads/${id}/serve?w=${size}&h=${size}&format=webp`;
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

function matchMime(mimeType: string, patterns?: string[]): boolean {
  if (!patterns || patterns.length === 0) return true;
  return patterns.some((pattern) => {
    if (pattern.endsWith('/*')) {
      return mimeType.startsWith(pattern.slice(0, -1));
    }
    return mimeType === pattern;
  });
}

const filteredMediaItems = computed(() => {
  if (!props.accept || props.accept.length === 0) return mediaItems.value;
  return mediaItems.value.filter((item) => matchMime(item.mimeType, props.accept));
});

const acceptString = computed(() => props.accept?.join(', '));

async function fetchMedia() {
  loadingMedia.value = true;
  try {
    const params = new URLSearchParams({
      page: String(page.value),
      limit: '12',
    });
    if (search.value.trim()) {
      params.set('search', search.value.trim());
    }
    if (pickerFolderId.value) {
      params.set('folderId', pickerFolderId.value);
    }
    const res = await apiFetch<{
      success: boolean;
      data: MediaItem[];
      meta?: { total: number; totalPages: number };
    }>(`/uploads?${params.toString()}`);
    mediaItems.value = res.data;
    totalPages.value = res.meta?.totalPages ?? 1;
  } catch {
    mediaItems.value = [];
  } finally {
    loadingMedia.value = false;
  }
}

const flatPickerFolders = computed(() => flattenFolders());

async function fetchSelectedMedia() {
  if (props.multiple) {
    const ids = (modelValue.value as string[] | null) ?? [];
    if (ids.length === 0) return;
    const items: MediaItem[] = [];
    for (const id of ids) {
      try {
        const res = await apiFetch<{ success: boolean; data: MediaItem }>(`/uploads/${id}`);
        items.push(res.data);
      } catch {
        // skip missing
      }
    }
    selectedMediaList.value = items;
  } else {
    if (!modelValue.value) return;
    try {
      const res = await apiFetch<{ success: boolean; data: MediaItem }>(`/uploads/${modelValue.value}`);
      selectedMedia.value = res.data;
    } catch {
      selectedMedia.value = null;
    }
  }
}

function openPicker() {
  if (props.multiple) {
    pendingSelection.value = [...((modelValue.value as string[]) ?? [])];
  }
  search.value = '';
  pickerFolderId.value = null;
  open.value = true;
  fetchMedia();
  fetchFoldersData();
}

function selectMedia(item: MediaItem) {
  if (props.multiple) {
    const idx = pendingSelection.value.indexOf(item.id);
    if (idx >= 0) {
      pendingSelection.value = pendingSelection.value.filter((id) => id !== item.id);
    } else {
      pendingSelection.value = [...pendingSelection.value, item.id];
    }
  } else {
    modelValue.value = item.id;
    selectedMedia.value = item;
    open.value = false;
  }
}

function confirmSelection() {
  modelValue.value = [...pendingSelection.value];
  // Resolve items from the media list
  const allItems = mediaItems.value;
  selectedMediaList.value = pendingSelection.value
    .map((id) => allItems.find((m) => m.id === id) ?? selectedMediaList.value.find((m) => m.id === id))
    .filter(Boolean) as MediaItem[];
  open.value = false;
}

function removeMedia() {
  if (props.multiple) {
    modelValue.value = [];
    selectedMediaList.value = [];
  } else {
    modelValue.value = null;
    selectedMedia.value = null;
  }
}

function removeMediaItem(id: string) {
  const newIds = ((modelValue.value as string[]) ?? []).filter((v) => v !== id);
  modelValue.value = newIds;
  selectedMediaList.value = selectedMediaList.value.filter((m) => m.id !== id);
}

async function handleUpload(event: Event) {
  const input = event.target as HTMLInputElement;
  const file = input.files?.[0];
  if (!file) return;
  await doUpload(file);
  input.value = '';
}

async function doUpload(file: File) {
  uploading.value = true;
  try {
    const res = await uploadFile<{ success: boolean; data: MediaItem }>('/uploads', file);
    await fetchMedia();
    if (props.multiple) {
      pendingSelection.value = [...pendingSelection.value, res.data.id];
    } else {
      selectMedia(res.data);
    }
  } catch {
    // silently fail
  } finally {
    uploading.value = false;
  }
}

// Drag-and-drop handlers
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
  if (!file) return;
  await doUpload(file);
}

function isSelected(id: string): boolean {
  if (props.multiple) {
    return pendingSelection.value.includes(id);
  }
  return modelValue.value === id;
}

function onSearchInput() {
  if (searchDebounce) clearTimeout(searchDebounce);
  searchDebounce = setTimeout(() => {
    page.value = 1;
    fetchMedia();
  }, 300);
}

watch(page, fetchMedia);

onMounted(() => {
  if (modelValue.value) {
    fetchSelectedMedia();
  }
});
</script>

<template>
  <div>
    <!-- SINGLE MODE: Selected media preview -->
    <template v-if="!props.multiple">
      <div v-if="selectedMedia" class="flex items-center gap-3 rounded-lg border border-accented p-3">
        <img
          v-if="isImage(selectedMedia.mimeType)"
          :src="getThumbUrl(selectedMedia.id, 64)"
          :alt="selectedMedia.originalName"
          class="size-16 rounded object-cover"
        />
        <div v-else class="flex size-16 items-center justify-center rounded bg-muted">
          <UIcon name="i-lucide-file" class="size-6 text-muted" />
        </div>
        <div class="min-w-0 flex-1">
          <p class="truncate text-sm font-medium">{{ selectedMedia.originalName }}</p>
          <p v-if="selectedMedia.alt" class="truncate text-xs text-dimmed">{{ selectedMedia.alt }}</p>
          <p class="text-xs text-muted">{{ formatSize(selectedMedia.size) }}</p>
        </div>
        <div class="flex gap-1">
          <UButton variant="ghost" color="neutral" size="xs" icon="i-lucide-replace" @click="openPicker">
            {{ $t('mediaPicker.change') }}
          </UButton>
          <UButton variant="ghost" color="error" size="xs" icon="i-lucide-x" @click="removeMedia">
            {{ $t('mediaPicker.remove') }}
          </UButton>
        </div>
      </div>

      <!-- No media selected — dropzone -->
      <div
        v-else
        class="flex flex-col items-center justify-center rounded-lg border-2 border-dashed p-6 cursor-pointer transition-colors"
        :class="dragging ? 'border-primary bg-primary/5' : 'border-muted'"
        @click="openPicker"
        @dragover="onDragOver"
        @dragenter="onDragOver"
        @dragleave="onDragLeave"
        @drop="onDrop"
      >
        <UIcon name="i-lucide-image" class="size-8 text-muted mb-2" />
        <p class="text-sm text-muted">{{ $t('mediaPicker.selectMedia') }}</p>
        <p class="text-xs text-dimmed mt-1">{{ $t('mediaPicker.dropHereHint') }}</p>
      </div>
    </template>

    <!-- MULTIPLE MODE: Selected media list -->
    <template v-else>
      <div v-if="selectedMediaList.length > 0" class="space-y-2">
        <div v-for="item in selectedMediaList" :key="item.id" class="flex items-center gap-3 rounded-lg border border-accented p-2">
          <img
            v-if="isImage(item.mimeType)"
            :src="getThumbUrl(item.id, 40)"
            :alt="item.originalName"
            class="size-10 rounded object-cover"
          />
          <div v-else class="flex size-10 items-center justify-center rounded bg-muted">
            <UIcon name="i-lucide-file" class="size-4 text-muted" />
          </div>
          <div class="min-w-0 flex-1">
            <p class="truncate text-sm font-medium">{{ item.originalName }}</p>
            <p class="text-xs text-muted">{{ formatSize(item.size) }}</p>
          </div>
          <UButton variant="ghost" color="error" size="xs" icon="i-lucide-x" @click="removeMediaItem(item.id)" />
        </div>
      </div>

      <!-- Add media button / dropzone -->
      <div
        class="flex flex-col items-center justify-center rounded-lg border-2 border-dashed p-4 cursor-pointer transition-colors mt-2"
        :class="dragging ? 'border-primary bg-primary/5' : 'border-muted'"
        @click="openPicker"
        @dragover="onDragOver"
        @dragenter="onDragOver"
        @dragleave="onDragLeave"
        @drop="onDrop"
      >
        <UIcon name="i-lucide-plus" class="size-5 text-muted mb-1" />
        <p class="text-sm text-muted">{{ $t('mediaPicker.addMedia') }}</p>
        <p class="text-xs text-dimmed mt-1">{{ $t('mediaPicker.dropHereHint') }}</p>
      </div>
    </template>

    <!-- Picker modal -->
    <UModal v-model:open="open" :title="$t('mediaPicker.title')" :description="$t('mediaPicker.selectMedia')">
      <template #content>
        <div class="p-6 space-y-4">
          <div class="flex items-center justify-between">
            <h3 class="text-lg font-semibold">{{ $t('mediaPicker.title') }}</h3>
            <UButton variant="ghost" color="neutral" size="xs" icon="i-lucide-x" @click="open = false" />
          </div>

          <!-- Search + Upload row -->
          <div class="flex items-center gap-3">
            <UInput
              v-model="search"
              icon="i-lucide-search"
              :placeholder="$t('mediaPicker.searchPlaceholder')"
              size="sm"
              class="flex-1"
              @input="onSearchInput"
            />
            <span class="text-xs text-muted uppercase">{{ $t('common.or') }}</span>
            <label class="cursor-pointer shrink-0">
              <UButton as="span" size="sm" icon="i-lucide-upload" :loading="uploading">
                {{ $t('uploads.upload') }}
              </UButton>
              <input type="file" class="hidden" :accept="acceptString" @change="handleUpload" />
            </label>
          </div>

          <!-- Folder filter -->
          <div v-if="flatPickerFolders.length > 0">
            <USelect
              v-model="pickerFolderId"
              :items="[
                { label: $t('mediaFolders.allFiles'), value: null },
                ...flatPickerFolders.map(f => ({ label: '\u00A0\u00A0'.repeat(f.depth) + f.name, value: f.id })),
              ]"
              value-key="value"
              size="sm"
              class="w-48"
              @update:model-value="() => { page = 1; fetchMedia(); }"
            />
          </div>

          <!-- Drop zone inside modal -->
          <div
            class="rounded-lg border-2 border-dashed p-4 text-center transition-colors"
            :class="dragging ? 'border-primary bg-primary/5' : 'border-muted'"
            @dragover="onDragOver"
            @dragenter="onDragOver"
            @dragleave="onDragLeave"
            @drop="onDrop"
          >
            <p class="text-sm text-muted">{{ $t('mediaPicker.dropHere') }}</p>
          </div>

          <!-- Accepted types hint -->
          <p v-if="props.accept?.length" class="text-xs text-dimmed">
            {{ $t('mediaPicker.acceptedTypes') }}: {{ acceptString }}
          </p>

          <!-- Skeleton loading -->
          <div v-if="loadingMedia" class="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <USkeleton v-for="i in 8" :key="i" class="aspect-square w-full rounded-lg" />
          </div>

          <!-- Empty state -->
          <div v-else-if="!filteredMediaItems.length" class="flex flex-col items-center justify-center py-12">
            <UIcon name="i-lucide-image" class="size-12 text-muted" />
            <p class="mt-3 text-sm text-muted">{{ $t('mediaPicker.noMedia') }}</p>
          </div>

          <!-- Media grid -->
          <div v-else class="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <button
              v-for="item in filteredMediaItems"
              :key="item.id"
              class="group relative aspect-square overflow-hidden rounded-lg border transition-all hover:ring-2 hover:ring-primary focus:outline-none focus:ring-2 focus:ring-primary"
              :class="{ 'ring-2 ring-primary': isSelected(item.id) }"
              @click="selectMedia(item)"
            >
              <img
                v-if="isImage(item.mimeType)"
                :src="getThumbUrl(item.id, 200)"
                :alt="item.originalName"
                class="size-full object-cover"
                loading="lazy"
              />
              <div v-else class="flex size-full flex-col items-center justify-center gap-2 bg-muted">
                <UIcon name="i-lucide-file" class="size-8 text-muted" />
                <span class="px-2 text-xs text-muted truncate max-w-full">{{ item.originalName }}</span>
              </div>
              <!-- Selected checkmark for multi-select -->
              <div v-if="props.multiple && isSelected(item.id)" class="absolute top-1 right-1 rounded-full bg-primary p-0.5">
                <UIcon name="i-lucide-check" class="size-3 text-white" />
              </div>
              <div class="absolute inset-x-0 bottom-0 bg-black/50 px-2 py-1 opacity-0 transition-opacity group-hover:opacity-100">
                <p class="truncate text-xs text-white">{{ item.originalName }}</p>
              </div>
            </button>
          </div>

          <!-- Pagination -->
          <div v-if="totalPages > 1" class="flex justify-center">
            <UPagination v-model="page" :total="totalPages * 12" :items-per-page="12" />
          </div>

          <!-- Footer -->
          <div class="flex justify-end gap-2 pt-2 border-t">
            <UButton variant="ghost" color="neutral" @click="open = false">
              {{ $t('common.cancel') }}
            </UButton>
            <UButton v-if="props.multiple" @click="confirmSelection">
              {{ $t('mediaPicker.confirm') }} ({{ pendingSelection.length }})
            </UButton>
          </div>
        </div>
      </template>
    </UModal>
  </div>
</template>
