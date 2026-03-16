<script setup lang="ts">
definePageMeta({
  layout: 'admin',
  middleware: ['auth'],
});

const { apiFetch } = useApi();
const { t } = useI18n();
const toast = useToast();
const router = useRouter();
const route = useRoute();
const {
  items: contentTypeItems,
  fetch: fetchContentTypes,
  loading: loadingTypes,
  invalidate: invalidateContentTypes,
} = useContentTypes();
const { errors: validationErrors, validate, clearErrors } = useContentValidation();

const selectedTypeId = ref('');
const slug = ref('');
const status = ref('draft');
const data = ref<Record<string, unknown>>({});
const saving = ref(false);

const selectedType = computed(() => contentTypeItems.value.find((ct) => ct.id === selectedTypeId.value));

const typeItems = computed(() => contentTypeItems.value.map((ct) => ({ label: ct.name, value: ct.id })));

const statusItems = [
  { label: t('contents.draft'), value: 'draft' },
  { label: t('contents.published'), value: 'published' },
];

watch(data, () => clearErrors(), { deep: true });

function buildDefaults(fields: Array<{ name: string; defaultValue?: unknown }>): Record<string, unknown> {
  const defaults: Record<string, unknown> = {};
  for (const field of fields) {
    if (field.defaultValue !== undefined && field.defaultValue !== null) {
      defaults[field.name] = field.defaultValue;
    }
  }
  return defaults;
}

watch(selectedTypeId, async () => {
  if (!route.query.duplicate) {
    const ct = contentTypeItems.value.find((c) => c.id === selectedTypeId.value);
    data.value = ct?.fields ? buildDefaults(ct.fields) : {};
  }

  // If singleton type is selected, check if content already exists
  if (selectedTypeId.value) {
    const ct = contentTypeItems.value.find((c) => c.id === selectedTypeId.value);
    if (ct?.isSingleton) {
      try {
        const res = await apiFetch<{ success: boolean; data: Array<{ id: string }> }>(
          `/contents?contentTypeId=${ct.id}&limit=1`,
        );
        if (res.data.length > 0) {
          navigateTo(`/admin/contents/${res.data[0]!.id}`, { replace: true });
        }
      } catch {
        // ignore
      }
    }
  }
});

async function loadDuplicate() {
  const duplicateId = route.query.duplicate as string | undefined;
  if (!duplicateId) return;
  try {
    const res = await apiFetch<{
      success: boolean;
      data: { contentTypeId: string; status: string; data: Record<string, unknown> };
    }>(`/contents/${duplicateId}`);
    selectedTypeId.value = res.data.contentTypeId;
    status.value = 'draft';
    data.value = { ...res.data.data };
  } catch {
    // ignore — just start fresh
  }
}

async function submit() {
  if (selectedType.value?.fields) {
    const { valid } = validate(selectedType.value.fields as import('@eli-cms/shared').FieldDefinition[], data.value);
    if (!valid) return;
  }
  saving.value = true;
  try {
    await apiFetch('/contents', {
      method: 'POST',
      body: {
        contentTypeId: selectedTypeId.value,
        slug: slug.value || undefined,
        status: status.value,
        data: data.value,
      },
    });
    invalidateContentTypes();
    toast.add({ title: t('common.created'), color: 'success' });
    router.push('/admin/contents');
  } catch (err: unknown) {
    const msg = (err as { data?: { error?: string } })?.data?.error || t('common.error');
    toast.add({ title: msg, color: 'error' });
  } finally {
    saving.value = false;
  }
}

defineShortcuts({
  meta_s: {
    usingInput: true,
    handler: () => {
      if (selectedTypeId.value && !saving.value) submit();
    },
  },
});

onMounted(async () => {
  await fetchContentTypes();
  // Pre-select type from URL ?type=slug
  const typeSlug = route.query.type as string | undefined;
  if (typeSlug && !route.query.duplicate) {
    const ct = contentTypeItems.value.find((c) => c.slug === typeSlug);
    if (ct) selectedTypeId.value = ct.id;
  }
  await loadDuplicate();
});
</script>

<template>
  <div class="p-6 space-y-6 max-w-3xl">
    <div class="flex items-center gap-3">
      <UButton to="/admin/contents" variant="ghost" icon="i-lucide-arrow-left" size="sm" />
      <div>
        <h1 class="text-2xl font-bold">{{ $t('contents.newTitle') }}</h1>
      </div>
    </div>

    <form class="space-y-6" @submit.prevent="submit">
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <UFormField :label="$t('contents.contentTypeLabel')">
          <USelect
            v-model="selectedTypeId"
            :items="typeItems"
            :placeholder="$t('contents.selectContentType')"
            :loading="loadingTypes"
            required
            class="w-full"
          />
        </UFormField>

        <UFormField :label="$t('contents.statusLabel')">
          <USelect v-model="status" :items="statusItems" :placeholder="$t('contents.statusLabel')" class="w-full" />
        </UFormField>
      </div>

      <UFormField :label="$t('contents.slugLabel')" :hint="$t('contents.slugHint')">
        <UInput v-model="slug" :placeholder="$t('contents.slugPlaceholder')" class="w-full" />
      </UFormField>

      <template v-if="selectedType">
        <DynamicContentForm v-model="data" :fields="selectedType.fields ?? []" :errors="validationErrors" />
      </template>

      <div class="flex justify-end gap-2">
        <UButton to="/admin/contents" variant="ghost" color="neutral">
          {{ $t('common.cancel') }}
        </UButton>
        <UButton type="submit" :loading="saving" :disabled="!selectedTypeId">
          {{ $t('common.create') }}
        </UButton>
      </div>
    </form>
  </div>
</template>
