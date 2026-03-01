<script setup lang="ts">
definePageMeta({
  layout: 'admin',
  middleware: ['auth'],
});

const route = useRoute();
const { apiFetch } = useApi();
const { t } = useI18n();
const toast = useToast();
const router = useRouter();
const { invalidate: invalidateContentTypes } = useContentTypes();

interface FieldDefinition {
  name: string;
  type: string;
  required: boolean;
  label: string;
  options?: string[];
}

const form = reactive({
  name: '',
  slug: '',
  fields: [] as FieldDefinition[],
});

const loading = ref(true);
const saving = ref(false);

async function fetchContentType() {
  loading.value = true;
  try {
    const res = await apiFetch<{
      success: boolean;
      data: { id: string; name: string; slug: string; fields: FieldDefinition[] };
    }>(`/content-types/${route.params.id}`);
    form.name = res.data.name;
    form.slug = res.data.slug;
    form.fields = res.data.fields;
  } catch {
    toast.add({ title: t('common.error'), color: 'error' });
    router.push('/admin/content-types');
  } finally {
    loading.value = false;
  }
}

async function submit() {
  saving.value = true;
  try {
    await apiFetch(`/content-types/${route.params.id}`, {
      method: 'PUT',
      body: {
        name: form.name,
        slug: form.slug,
        fields: form.fields,
      },
    });
    invalidateContentTypes();
    toast.add({ title: t('common.updated'), color: 'success' });
    router.push('/admin/content-types');
  } catch (err: unknown) {
    const msg = (err as { data?: { error?: string } })?.data?.error || t('common.error');
    toast.add({ title: msg, color: 'error' });
  } finally {
    saving.value = false;
  }
}

onMounted(fetchContentType);
</script>

<template>
  <div class="p-6 space-y-6 max-w-3xl">
    <div class="flex items-center gap-3">
      <UButton to="/admin/content-types" variant="ghost" icon="i-lucide-arrow-left" size="sm" />
      <div>
        <h1 class="text-2xl font-bold">{{ $t('contentTypes.editTitle') }}</h1>
      </div>
    </div>

    <div v-if="loading" class="text-sm text-muted">{{ $t('common.loading') }}</div>

    <form v-else class="space-y-6" @submit.prevent="submit">
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <UFormField :label="$t('contentTypes.nameLabel')">
          <UInput v-model="form.name" :placeholder="$t('contentTypes.namePlaceholder')" required class="w-full" />
        </UFormField>

        <UFormField :label="$t('contentTypes.slugLabel')">
          <UInput v-model="form.slug" :placeholder="$t('contentTypes.slugPlaceholder')" required class="w-full" />
        </UFormField>
      </div>

      <UFormField :label="$t('contentTypes.fieldsLabel')">
        <FieldBuilder v-model="form.fields" />
      </UFormField>

      <div class="flex justify-end gap-2">
        <UButton to="/admin/content-types" variant="ghost" color="neutral">
          {{ $t('common.cancel') }}
        </UButton>
        <UButton type="submit" :loading="saving" :disabled="!form.name || !form.slug || !form.fields.length || form.fields.some(f => !f.name || !f.label || !/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(f.name))">
          {{ $t('common.save') }}
        </UButton>
      </div>
    </form>
  </div>
</template>
