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

function generateSlug() {
  form.slug = form.name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

watch(() => form.name, generateSlug);

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

    <form class="space-y-6" @submit.prevent="submit">
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

      <UFormField>
        <template #label>
          <span class="flex items-center gap-1">
            {{ $t('contentTypes.slugPatternLabel') }}
            <UTooltip :text="$t('contentTypes.slugPatternHint')">
              <UIcon name="i-lucide-info" class="size-3.5 text-gray-400 dark:text-gray-500" />
            </UTooltip>
          </span>
        </template>
        <UInput v-model="form.slugPattern" :placeholder="$t('contentTypes.slugPatternPlaceholder')" class="w-full" />
      </UFormField>

      <UFormField :label="$t('contentTypes.fieldsLabel')">
        <FieldBuilder v-model="form.fields" />
      </UFormField>

      <div class="flex justify-end gap-2">
        <UButton to="/admin/content-types" variant="ghost" color="neutral">
          {{ $t('common.cancel') }}
        </UButton>
        <UButton type="submit" :loading="saving" :disabled="!form.name || !form.slug || !form.fields.length || form.fields.some(f => !f.name || !f.label || !/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(f.name))">
          {{ $t('common.create') }}
        </UButton>
      </div>
    </form>
  </div>
</template>
