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
const { invalidate: invalidateComponents } = useComponents();

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
  icon: '',
  fields: [] as FieldDefinition[],
});

const loading = ref(true);
const saving = ref(false);

async function fetchComponent() {
  loading.value = true;
  try {
    const res = await apiFetch<{
      success: boolean;
      data: { id: string; name: string; slug: string; icon?: string | null; fields: FieldDefinition[] };
    }>(`/components/${route.params.id}`);
    form.name = res.data.name;
    form.slug = res.data.slug;
    form.icon = res.data.icon ?? '';
    form.fields = res.data.fields;
  } catch {
    toast.add({ title: t('common.error'), color: 'error' });
    router.push('/admin/components');
  } finally {
    loading.value = false;
  }
}

async function submit() {
  saving.value = true;
  try {
    await apiFetch(`/components/${route.params.id}`, {
      method: 'PUT',
      body: {
        name: form.name,
        slug: form.slug,
        icon: form.icon || null,
        fields: form.fields,
      },
    });
    invalidateComponents();
    toast.add({ title: t('common.updated'), color: 'success' });
    router.push('/admin/components');
  } catch (err: unknown) {
    const msg = (err as { data?: { error?: string } })?.data?.error || t('common.error');
    toast.add({ title: msg, color: 'error' });
  } finally {
    saving.value = false;
  }
}

onMounted(fetchComponent);
</script>

<template>
  <div class="p-6 space-y-6 max-w-3xl">
    <div class="flex items-center gap-3">
      <UButton to="/admin/components" variant="ghost" icon="i-lucide-arrow-left" size="sm" />
      <div>
        <h1 class="text-2xl font-bold">{{ $t('components.editTitle') }}</h1>
      </div>
    </div>

    <div v-if="loading" class="text-sm text-muted">{{ $t('common.loading') }}</div>

    <form v-else class="space-y-6" @submit.prevent="submit">
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <UFormField :label="$t('components.nameLabel')">
          <UInput v-model="form.name" :placeholder="$t('components.namePlaceholder')" required class="w-full" />
        </UFormField>

        <UFormField :label="$t('components.slugLabel')">
          <UInput v-model="form.slug" :placeholder="$t('components.slugPlaceholder')" required class="w-full" />
        </UFormField>
      </div>

      <UFormField :label="$t('components.iconLabel')">
        <UInput v-model="form.icon" :placeholder="$t('components.iconPlaceholder')" class="w-full" />
      </UFormField>

      <UFormField :label="$t('components.fieldsLabel')">
        <FieldBuilder v-model="form.fields" />
      </UFormField>

      <div class="flex justify-end gap-2">
        <UButton to="/admin/components" variant="ghost" color="neutral">
          {{ $t('common.cancel') }}
        </UButton>
        <UButton type="submit" :loading="saving" :disabled="!form.name || !form.slug || !form.fields.length || form.fields.some(f => !f.name || !f.label || !/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(f.name))">
          {{ $t('common.save') }}
        </UButton>
      </div>
    </form>
  </div>
</template>
