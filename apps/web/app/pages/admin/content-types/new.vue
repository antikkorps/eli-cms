<script setup lang="ts">
definePageMeta({
  layout: 'admin',
  middleware: ['auth'],
});

const { apiFetch } = useApi();
const { t } = useI18n();
const toast = useToast();
const router = useRouter();
const { invalidate: invalidateContentTypes } = useContentTypes();
const { items: templates, fetch: fetchTemplates } = useContentTypeTemplates();

onMounted(fetchTemplates);

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
  isSingleton: false,
  slugPattern: '',
  fields: [] as FieldDefinition[],
});

const saving = ref(false);
const templateSelected = ref(false);

function generateSlug() {
  form.slug = form.name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

watch(() => form.name, generateSlug);

function pickTemplate(tplId: string | null) {
  if (tplId === null) {
    // Blank
    form.name = '';
    form.slug = '';
    form.fields = [];
  } else {
    const tpl = templates.value.find((t) => t.id === tplId);
    if (!tpl) return;
    form.name = tpl.name;
    // generateSlug() will fire via watch
    form.fields = JSON.parse(JSON.stringify(tpl.fields));
  }
  templateSelected.value = true;
}

function resetTemplateChoice() {
  templateSelected.value = false;
}

async function submit() {
  saving.value = true;
  try {
    await apiFetch('/content-types', {
      method: 'POST',
      body: {
        name: form.name,
        slug: form.slug,
        isSingleton: form.isSingleton,
        slugPattern: form.slugPattern || null,
        fields: form.fields,
      },
    });
    invalidateContentTypes();
    toast.add({ title: t('common.created'), color: 'success' });
    router.push('/admin/content-types');
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
      <UButton to="/admin/content-types" variant="ghost" icon="i-lucide-arrow-left" size="sm" />
      <div>
        <h1 class="text-2xl font-bold">{{ $t('contentTypes.newTitle') }}</h1>
      </div>
    </div>

    <!-- Template picker (shown until a choice is made) -->
    <div v-if="!templateSelected" class="space-y-4">
      <div>
        <h2 class="text-base font-semibold">{{ $t('contentTypeTemplates.pickerTitle') }}</h2>
        <p class="text-xs text-muted">{{ $t('contentTypeTemplates.pickerSubtitle') }}</p>
      </div>

      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        <button
          type="button"
          class="flex flex-col gap-2 rounded-lg border border-dashed border-accented bg-default p-4 hover:border-primary-500 hover:shadow-sm transition text-left"
          @click="pickTemplate(null)"
        >
          <div class="flex size-10 items-center justify-center rounded-lg bg-gray-50 dark:bg-gray-900">
            <UIcon name="i-lucide-file-plus" class="size-5 text-gray-500" />
          </div>
          <p class="font-medium text-sm">{{ $t('contentTypeTemplates.pickerBlank') }}</p>
          <p class="text-xs text-muted">{{ $t('contentTypeTemplates.pickerBlankDescription') }}</p>
        </button>

        <button
          v-for="tpl in templates"
          :key="tpl.id"
          type="button"
          class="flex flex-col gap-2 rounded-lg border border-accented bg-default p-4 hover:border-primary-500 hover:shadow-sm transition text-left"
          @click="pickTemplate(tpl.id)"
        >
          <div class="flex items-start justify-between">
            <div class="flex size-10 items-center justify-center rounded-lg bg-primary-50 dark:bg-primary-950">
              <UIcon
                :name="tpl.icon || 'i-lucide-layout-template'"
                class="size-5 text-primary-600 dark:text-primary-400"
              />
            </div>
            <UBadge v-if="tpl.isSystem" color="neutral" variant="subtle" size="xs">
              {{ $t('contentTypeTemplates.systemBadge') }}
            </UBadge>
          </div>
          <p class="font-medium text-sm">{{ tpl.name }}</p>
          <p v-if="tpl.description" class="text-xs text-muted line-clamp-2">{{ tpl.description }}</p>
        </button>
      </div>
    </div>

    <UButton
      v-if="templateSelected"
      variant="ghost"
      color="neutral"
      icon="i-lucide-arrow-left"
      size="sm"
      @click="resetTemplateChoice"
    >
      {{ $t('contentTypeTemplates.pickerTitle') }}
    </UButton>

    <form v-if="templateSelected" class="space-y-6" @submit.prevent="submit">
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <UFormField :label="$t('contentTypes.nameLabel')">
          <UInput v-model="form.name" :placeholder="$t('contentTypes.namePlaceholder')" required class="w-full" />
        </UFormField>

        <UFormField :label="$t('contentTypes.slugLabel')">
          <UInput v-model="form.slug" :placeholder="$t('contentTypes.slugPlaceholder')" required class="w-full" />
        </UFormField>
      </div>

      <UFormField>
        <div class="flex items-center gap-3">
          <USwitch v-model="form.isSingleton" />
          <div>
            <span class="text-sm font-medium">{{ $t('contentTypes.singletonLabel') }}</span>
            <p class="text-xs text-muted">{{ $t('contentTypes.singletonHint') }}</p>
          </div>
        </div>
      </UFormField>

      <UFormField :label="$t('contentTypes.slugPatternLabel')">
        <SlugPatternPicker v-model="form.slugPattern" />
      </UFormField>

      <UFormField :label="$t('contentTypes.fieldsLabel')">
        <FieldBuilder v-model="form.fields" />
      </UFormField>

      <div class="flex justify-end gap-2">
        <UButton to="/admin/content-types" variant="ghost" color="neutral">
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
