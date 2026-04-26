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

const saving = ref(false);

function generateSlug() {
  form.slug = form.name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

watch(() => form.name, generateSlug);

// Optional clone-from query param: prefills form from another template/CT
async function maybeCloneFrom() {
  const fromTemplateId = route.query.cloneFromTemplate as string | undefined;
  const fromContentTypeId = route.query.cloneFromContentType as string | undefined;

  if (fromTemplateId) {
    try {
      const res = await apiFetch<{
        success: boolean;
        data: { name: string; description: string | null; icon: string | null; fields: FieldDefinition[] };
      }>(`/content-type-templates/${fromTemplateId}`);
      form.name = `${res.data.name} Copy`;
      form.description = res.data.description ?? '';
      form.icon = res.data.icon ?? '';
      form.fields = JSON.parse(JSON.stringify(res.data.fields));
    } catch {
      toast.add({ title: t('common.error'), color: 'error' });
    }
  } else if (fromContentTypeId) {
    try {
      const res = await apiFetch<{ success: boolean; data: { name: string; fields: FieldDefinition[] } }>(
        `/content-types/${fromContentTypeId}`,
      );
      form.name = res.data.name;
      // Strip _seo* injected fields
      form.fields = JSON.parse(JSON.stringify(res.data.fields)).filter(
        (f: FieldDefinition) => !f.name.startsWith('_seo'),
      );
    } catch {
      toast.add({ title: t('common.error'), color: 'error' });
    }
  }
}

onMounted(maybeCloneFrom);

async function submit() {
  saving.value = true;
  try {
    await apiFetch('/content-type-templates', {
      method: 'POST',
      body: {
        name: form.name,
        slug: form.slug,
        description: form.description || null,
        icon: form.icon || null,
        fields: form.fields,
      },
    });
    invalidateTemplates();
    toast.add({ title: t('common.created'), color: 'success' });
    router.push('/admin/content-type-templates');
  } catch (err: unknown) {
    const msg = (err as { data?: { error?: string } })?.data?.error || t('common.error');
    toast.add({ title: msg, color: 'error' });
  } finally {
    saving.value = false;
  }
}
</script>

<template>
  <div class="p-6 space-y-6 max-w-3xl">
    <div class="flex items-center gap-3">
      <UButton to="/admin/content-type-templates" variant="ghost" icon="i-lucide-arrow-left" size="sm" />
      <div>
        <h1 class="text-2xl font-bold">{{ $t('contentTypeTemplates.newTitle') }}</h1>
      </div>
    </div>

    <form class="space-y-6" @submit.prevent="submit">
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <UFormField :label="$t('contentTypeTemplates.nameLabel')">
          <UInput
            v-model="form.name"
            :placeholder="$t('contentTypeTemplates.namePlaceholder')"
            required
            class="w-full"
          />
        </UFormField>

        <UFormField :label="$t('contentTypeTemplates.slugLabel')">
          <UInput
            v-model="form.slug"
            :placeholder="$t('contentTypeTemplates.slugPlaceholder')"
            required
            class="w-full"
          />
        </UFormField>
      </div>

      <UFormField :label="$t('contentTypeTemplates.descriptionLabel')">
        <UTextarea
          v-model="form.description"
          :placeholder="$t('contentTypeTemplates.descriptionPlaceholder')"
          :rows="2"
          class="w-full"
        />
      </UFormField>

      <UFormField :label="$t('contentTypeTemplates.iconLabel')">
        <IconPicker v-model="form.icon" />
      </UFormField>

      <UFormField :label="$t('contentTypeTemplates.fieldsLabel')">
        <FieldBuilder v-model="form.fields" />
      </UFormField>

      <div class="flex justify-end gap-2">
        <UButton to="/admin/content-type-templates" variant="ghost" color="neutral">
          {{ $t('common.cancel') }}
        </UButton>
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
          {{ $t('common.create') }}
        </UButton>
      </div>
    </form>
  </div>
</template>
