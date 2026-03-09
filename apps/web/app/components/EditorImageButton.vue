<script setup lang="ts">
const { t } = useI18n();
const { apiFetch, uploadFile, baseURL } = useApi();

interface MediaItem {
  id: string;
  filename: string;
  originalName: string;
  mimeType: string;
  size: number;
  alt: string | null;
}

const props = defineProps<{
  editor: any;
}>();

const open = ref(false);
const items = ref<MediaItem[]>([]);
const loading = ref(false);
const uploading = ref(false);
const search = ref('');
const page = ref(1);
const totalPages = ref(1);
let searchDebounce: ReturnType<typeof setTimeout> | null = null;

function getThumbUrl(id: string, size = 128): string {
  return `${baseURL}/uploads/${id}/serve?w=${size}&h=${size}&format=webp`;
}

function getServeUrl(id: string): string {
  return `${baseURL}/uploads/${id}/serve`;
}

async function fetchMedia() {
  loading.value = true;
  try {
    const params = new URLSearchParams({
      page: String(page.value),
      limit: '12',
    });
    if (search.value.trim()) {
      params.set('search', search.value.trim());
    }
    // Only show images
    const res = await apiFetch<{
      success: boolean;
      data: MediaItem[];
      meta?: { total: number; totalPages: number };
    }>(`/uploads?${params.toString()}`);
    items.value = res.data.filter((m) => m.mimeType.startsWith('image/'));
    totalPages.value = res.meta?.totalPages ?? 1;
  } catch {
    items.value = [];
  } finally {
    loading.value = false;
  }
}

function openPicker() {
  // Blur the editor DOM element before opening the modal to avoid aria-hidden conflict
  props.editor?.commands.blur();
  (document.activeElement as HTMLElement)?.blur();
  search.value = '';
  page.value = 1;
  open.value = true;
  fetchMedia();
}

function insertImage(item: MediaItem) {
  if (!props.editor) return;
  const src = getServeUrl(item.id);
  props.editor.chain().focus().setImage({ src, alt: item.alt || item.originalName }).run();
  open.value = false;
}

async function handleUpload(event: Event) {
  const input = event.target as HTMLInputElement;
  const file = input.files?.[0];
  if (!file) return;
  input.value = '';
  uploading.value = true;
  try {
    const res = await uploadFile<{ success: boolean; data: MediaItem }>('/uploads', file);
    insertImage(res.data);
  } catch {
    // silently fail
  } finally {
    uploading.value = false;
  }
}

function onSearchInput() {
  if (searchDebounce) clearTimeout(searchDebounce);
  searchDebounce = setTimeout(() => {
    page.value = 1;
    fetchMedia();
  }, 300);
}

watch(page, fetchMedia);
</script>

<template>
  <div>
    <UButton
      variant="ghost"
      size="xs"
      icon="i-lucide-image"
      :title="t('editor.insertImage')"
      @click="openPicker"
    />

  <UModal v-model:open="open" :title="t('editor.insertImage')" :description="t('editor.insertImageDescription')">
    <template #content>
      <div class="p-6 space-y-4">
        <div class="flex items-center justify-between">
          <h3 class="text-lg font-semibold">{{ t('editor.insertImage') }}</h3>
          <UButton variant="ghost" color="neutral" size="xs" icon="i-lucide-x" @click="open = false" />
        </div>

        <!-- Search + Upload -->
        <div class="flex items-center gap-3">
          <UInput
            v-model="search"
            icon="i-lucide-search"
            :placeholder="t('mediaPicker.searchPlaceholder')"
            size="sm"
            class="flex-1"
            @input="onSearchInput"
          />
          <span class="text-xs text-muted uppercase">{{ t('common.or') }}</span>
          <label class="cursor-pointer shrink-0">
            <UButton as="span" size="sm" icon="i-lucide-upload" :loading="uploading">
              {{ t('uploads.upload') }}
            </UButton>
            <input type="file" class="hidden" accept="image/*" @change="handleUpload" />
          </label>
        </div>

        <!-- Loading -->
        <div v-if="loading" class="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <USkeleton v-for="i in 8" :key="i" class="aspect-square w-full rounded-lg" />
        </div>

        <!-- Empty -->
        <div v-else-if="!items.length" class="flex flex-col items-center justify-center py-12">
          <UIcon name="i-lucide-image" class="size-12 text-muted" />
          <p class="mt-3 text-sm text-muted">{{ t('mediaPicker.noMedia') }}</p>
        </div>

        <!-- Grid -->
        <div v-else class="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <button
            v-for="item in items"
            :key="item.id"
            class="group relative aspect-square overflow-hidden rounded-lg border transition-all hover:ring-2 hover:ring-primary focus:outline-none focus:ring-2 focus:ring-primary"
            @click="insertImage(item)"
          >
            <img
              :src="getThumbUrl(item.id, 200)"
              :alt="item.originalName"
              class="size-full object-cover"
              loading="lazy"
            />
            <div class="absolute inset-x-0 bottom-0 bg-black/50 px-2 py-1 opacity-0 transition-opacity group-hover:opacity-100">
              <p class="truncate text-xs text-white">{{ item.originalName }}</p>
            </div>
          </button>
        </div>

        <!-- Pagination -->
        <div v-if="totalPages > 1" class="flex justify-center">
          <UPagination v-model="page" :total="totalPages * 12" :items-per-page="12" />
        </div>

        <!-- Close -->
        <div class="flex justify-end pt-2 border-t">
          <UButton variant="ghost" color="neutral" @click="open = false">
            {{ t('common.cancel') }}
          </UButton>
        </div>
      </div>
    </template>
  </UModal>
  </div>
</template>
