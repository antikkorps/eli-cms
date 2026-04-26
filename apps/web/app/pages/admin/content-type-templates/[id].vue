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
const { invalidate: invalidateTemplates } = useContentTypeTemplates();

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
  description: '',
  icon: '',
  fields: [] as FieldDefinition[],
});

const isSystem = ref(false);
const loading = ref(true);
const saving = ref(false);

async function fetchTemplate() {
  loading.value = true;
  try {
    const res = await apiFetch<{
      success: boolean;
      data: {
        id: string;
        name: string;
        slug: string;
        description: string | null;
        icon: string | null;
        fields: FieldDefinition[];
        isSystem: boolean;
      };
    }>(`/content-type-templates/${route.params.id}`);
    form.name = res.data.name;
    form.slug = res.data.slug;
    form.description = res.data.description ?? '';
    form.icon = res.data.icon ?? '';
    form.fields = res.data.fields;
    isSystem.value = res.data.isSystem;
  } catch {
    toast.add({ title: t('common.error'), color: 'error' });
    router.push('/admin/content-type-templates');
  } finally {
    loading.value = false;
  }
}

async function submit() {
  if (isSystem.value) return;
  saving.value = true;
  try {
    await apiFetch(`/content-type-templates/${route.params.id}`, {
      method: 'PUT',
      body: {
        name: form.name,
        slug: form.slug,
        description: form.description || null,
        icon: form.icon || null,
        fields: form.fields,
      },
    });
    invalidateTemplates();
    toast.add({ title: t('common.updated'), color: 'success' });
    router.push('/admin/content-type-templates');
  } catch (err: unknown) {
    const msg = (err as { data?: { error?: string } })?.data?.error || t('common.error');
    toast.add({ title: msg, color: 'error' });
  } finally {
    saving.value = false;
  }
}

function clone() {
  router.push(`/admin/content-type-templates/new?cloneFromTemplate=${route.params.id}`);
}

onMounted(fetchTemplate);
</script>

<template>
  <div class="p-6 space-y-6 max-w-3xl">
    <div class="flex items-center gap-3">
      <UButton to="/admin/content-type-templates" variant="ghost" icon="i-lucide-arrow-left" size="sm" />
      <div class="flex items-center gap-2">
        <h1 class="text-2xl font-bold">{{ $t('contentTypeTemplates.editTitle') }}</h1>
        <UBadge v-if="isSystem" color="neutral" variant="subtle">{{ $t('contentTypeTemplates.systemBadge') }}</UBadge>
      </div>
    </div>

    <div v-if="loading" class="text-sm text-muted">{{ $t('common.loading') }}</div>

    <UAlert
      v-else-if="isSystem"
      icon="i-lucide-lock"
      color="neutral"
      variant="soft"
      :title="$t('contentTypeTemplates.systemReadOnly')"
    >
      <template #actions>
        <UButton variant="solid" icon="i-lucide-copy" @click="clone">
          {{ $t('contentTypeTemplates.clone') }}
        </UButton>
      </template>
    </UAlert>

    <form
      v-if="!loading"
      class="space-y-6"
      :class="{ 'pointer-events-none opacity-70': isSystem }"
      @submit.prevent="submit"
    >
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <UFormField :label="$t('contentTypeTemplates.nameLabel')">
          <UInput v-model="form.name" :disabled="isSystem" required class="w-full" />
        </UFormField>

        <UFormField :label="$t('contentTypeTemplates.slugLabel')">
          <UInput v-model="form.slug" :disabled="isSystem" required class="w-full" />
        </UFormField>
      </div>

      <UFormField :label="$t('contentTypeTemplates.descriptionLabel')">
        <UTextarea v-model="form.description" :disabled="isSystem" :rows="2" class="w-full" />
      </UFormField>

      <UFormField :label="$t('contentTypeTemplates.iconLabel')">
        <IconPicker v-model="form.icon" :disabled="isSystem" />
      </UFormField>

      <UFormField :label="$t('contentTypeTemplates.fieldsLabel')">
        <FieldBuilder v-model="form.fields" />
      </UFormField>

      <div v-if="!isSystem" class="flex justify-end gap-2">
        <UButton to="/admin/content-type-templates" variant="ghost" color="neutral">{{ $t('common.cancel') }}</UButton>
        <UButton
          type="submit"
          :loading="saving"
          :disabled="
            !form.name ||
            !form.slug ||
            !form.fields.length ||
            form.fields.some((f) => !f.name || !f.label || !/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(f.name))
          "
        >
          {{ $t('common.save') }}
        </UButton>
      </div>
    </form>
  </div>
</template>
