<script setup lang="ts">
const open = defineModel<boolean>('open', { default: false });

const props = defineProps<{
  contentTypes: Array<{ id: string; name: string }>;
}>();

const emit = defineEmits<{
  imported: [];
}>();

const { apiFetch } = useApi();
const { t } = useI18n();
const toast = useToast();

const selectedTypeId = ref('');
const file = ref<File | null>(null);
const importing = ref(false);
const result = ref<{ imported: number; failed: number; errors: string[] } | null>(null);

const typeItems = computed(() =>
  props.contentTypes.map((ct) => ({ label: ct.name, value: ct.id })),
);

function onFileChange(event: Event) {
  const input = event.target as HTMLInputElement;
  file.value = input.files?.[0] ?? null;
}

async function handleImport() {
  if (!file.value || !selectedTypeId.value) return;

  importing.value = true;
  result.value = null;

  try {
    const formData = new FormData();
    formData.append('file', file.value);
    formData.append('contentTypeId', selectedTypeId.value);

    const res = await apiFetch<{ success: boolean; data: { imported: number; failed: number; errors: string[] } }>('/contents/import', {
      method: 'POST',
      body: formData,
    });

    result.value = res.data;
    if (res.data.imported > 0) {
      toast.add({ title: t('export.importSuccess', { count: res.data.imported }), color: 'success' });
      emit('imported');
    }
  } catch {
    toast.add({ title: t('common.error'), color: 'error' });
  } finally {
    importing.value = false;
  }
}

function reset() {
  selectedTypeId.value = '';
  file.value = null;
  result.value = null;
  open.value = false;
}
</script>

<template>
  <UModal v-model:open="open" @close="reset">
    <template #content>
      <div class="p-6 space-y-4">
        <h3 class="text-lg font-semibold">{{ $t('export.importTitle') }}</h3>

        <UFormField :label="$t('contents.contentTypeLabel')">
          <USelect
            v-model="selectedTypeId"
            :items="typeItems"
            :placeholder="$t('contents.selectContentType')"
            required
            class="w-full"
          />
        </UFormField>

        <UFormField :label="$t('export.file')">
          <input
            type="file"
            accept=".json,.csv,.xml"
            class="block w-full text-sm file:mr-4 file:rounded file:border-0 file:bg-primary/10 file:px-4 file:py-2 file:text-sm file:font-medium file:text-primary hover:file:bg-primary/20"
            @change="onFileChange"
          />
        </UFormField>

        <div v-if="result" class="rounded-lg border p-4 space-y-2">
          <p class="text-sm font-medium">{{ $t('export.importResult') }}</p>
          <p class="text-sm text-green-600 dark:text-green-400">{{ $t('export.imported') }}: {{ result.imported }}</p>
          <p v-if="result.failed > 0" class="text-sm text-red-600 dark:text-red-400">{{ $t('export.failed') }}: {{ result.failed }}</p>
          <div v-if="result.errors.length > 0" class="max-h-40 overflow-y-auto">
            <p v-for="(err, i) in result.errors" :key="i" class="text-xs text-red-500">{{ err }}</p>
          </div>
        </div>

        <div class="flex justify-end gap-2">
          <UButton variant="ghost" color="neutral" @click="reset">
            {{ $t('common.cancel') }}
          </UButton>
          <UButton :loading="importing" :disabled="!selectedTypeId || !file" @click="handleImport">
            {{ $t('export.import') }}
          </UButton>
        </div>
      </div>
    </template>
  </UModal>
</template>
