<script setup lang="ts">
const { t } = useI18n();
const { apiFetch, uploadFile, baseURL } = useApi();

interface MediaItem {
  id: string;
  filename: string;
  originalName: string;
  mimeType: string;
  size: number;
  createdAt: string;
}

const model = defineModel<string | null>({ default: null });
const open = ref(false);
const mediaItems = ref<MediaItem[]>([]);
const loadingMedia = ref(false);
const uploading = ref(false);
const selectedMedia = ref<MediaItem | null>(null);
const page = ref(1);
const totalPages = ref(1);

function isImage(mimeType: string): boolean {
  return mimeType.startsWith('image/');
}

function getServeUrl(id: string): string {
  return `${baseURL}/uploads/${id}/serve`;
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

async function fetchMedia() {
  loadingMedia.value = true;
  try {
    const res = await apiFetch<{
      success: boolean;
      data: MediaItem[];
      meta?: { total: number; totalPages: number };
    }>(`/uploads?page=${page.value}&limit=12`);
    mediaItems.value = res.data;
    totalPages.value = res.meta?.totalPages ?? 1;
  } catch {
    mediaItems.value = [];
  } finally {
    loadingMedia.value = false;
  }
}

async function fetchSelectedMedia() {
  if (!model.value) return;
  try {
    const res = await apiFetch<{ success: boolean; data: MediaItem }>(`/uploads/${model.value}`);
    selectedMedia.value = res.data;
  } catch {
    selectedMedia.value = null;
  }
}

function openPicker() {
  open.value = true;
  fetchMedia();
}

function selectMedia(item: MediaItem) {
  model.value = item.id;
  selectedMedia.value = item;
  open.value = false;
}

function removeMedia() {
  model.value = null;
  selectedMedia.value = null;
}

async function handleUpload(event: Event) {
  const input = event.target as HTMLInputElement;
  const file = input.files?.[0];
  if (!file) return;

  uploading.value = true;
  try {
    const res = await uploadFile<{ success: boolean; data: MediaItem }>('/uploads', file);
    await fetchMedia();
    selectMedia(res.data);
  } catch {
    // silently fail
  } finally {
    uploading.value = false;
    input.value = '';
  }
}

watch(page, fetchMedia);

onMounted(() => {
  if (model.value) {
    fetchSelectedMedia();
  }
});
</script>

<template>
  <div>
    <!-- Selected media preview -->
    <div v-if="selectedMedia" class="flex items-center gap-3 rounded-lg border p-3">
      <img
        v-if="isImage(selectedMedia.mimeType)"
        :src="getServeUrl(selectedMedia.id)"
        :alt="selectedMedia.originalName"
        class="size-16 rounded object-cover"
      />
      <div v-else class="flex size-16 items-center justify-center rounded bg-muted">
        <UIcon name="i-lucide-file" class="size-6 text-muted" />
      </div>
      <div class="min-w-0 flex-1">
        <p class="truncate text-sm font-medium">{{ selectedMedia.originalName }}</p>
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

    <!-- No media selected -->
    <UButton v-else variant="outline" icon="i-lucide-image" @click="openPicker">
      {{ $t('mediaPicker.selectMedia') }}
    </UButton>

    <!-- Picker modal -->
    <UModal v-model:open="open">
      <template #content>
        <div class="p-6 space-y-4">
          <div class="flex items-center justify-between">
            <h3 class="text-lg font-semibold">{{ $t('mediaPicker.title') }}</h3>
            <label class="cursor-pointer">
              <UButton as="span" size="sm" icon="i-lucide-upload" :loading="uploading">
                {{ $t('uploads.upload') }}
              </UButton>
              <input type="file" class="hidden" @change="handleUpload" />
            </label>
          </div>

          <!-- Skeleton loading -->
          <div v-if="loadingMedia" class="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <USkeleton v-for="i in 8" :key="i" class="aspect-square w-full rounded-lg" />
          </div>

          <!-- Empty state -->
          <div v-else-if="!mediaItems.length" class="flex flex-col items-center justify-center py-12">
            <UIcon name="i-lucide-image" class="size-12 text-muted" />
            <p class="mt-3 text-sm text-muted">{{ $t('mediaPicker.noMedia') }}</p>
          </div>

          <!-- Media grid -->
          <div v-else class="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <button
              v-for="item in mediaItems"
              :key="item.id"
              class="group relative aspect-square overflow-hidden rounded-lg border transition-all hover:ring-2 hover:ring-primary focus:outline-none focus:ring-2 focus:ring-primary"
              :class="{ 'ring-2 ring-primary': model === item.id }"
              @click="selectMedia(item)"
            >
              <img
                v-if="isImage(item.mimeType)"
                :src="getServeUrl(item.id)"
                :alt="item.originalName"
                class="size-full object-cover"
              />
              <div v-else class="flex size-full flex-col items-center justify-center gap-2 bg-muted">
                <UIcon name="i-lucide-file" class="size-8 text-muted" />
                <span class="px-2 text-xs text-muted truncate max-w-full">{{ item.originalName }}</span>
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
        </div>
      </template>
    </UModal>
  </div>
</template>
