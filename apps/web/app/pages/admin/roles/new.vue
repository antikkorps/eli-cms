<script setup lang="ts">
definePageMeta({
  layout: 'admin',
  middleware: ['auth'],
});

const { hasPermission } = useAuth();
if (!hasPermission('roles:create')) {
  navigateTo('/admin/roles');
}

const { apiFetch } = useApi();
const { t } = useI18n();
const toast = useToast();
const router = useRouter();

const form = reactive({
  name: '',
  slug: '',
  description: '',
  permissions: [] as string[],
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
    await apiFetch('/roles', {
      method: 'POST',
      body: {
        name: form.name,
        slug: form.slug,
        description: form.description || null,
        permissions: form.permissions,
      },
    });
    toast.add({ title: t('common.created'), color: 'success' });
    router.push('/admin/roles');
  } catch {
    toast.add({ title: t('common.error'), color: 'error' });
  } finally {
    saving.value = false;
  }
}
</script>

<template>
  <div class="p-6 pb-12 space-y-6">
    <div class="flex items-center gap-3">
      <UButton to="/admin/roles" variant="ghost" icon="i-lucide-arrow-left" size="sm" />
      <div>
        <h1 class="text-2xl font-bold">{{ $t('roles.newTitle') }}</h1>
      </div>
    </div>

    <form class="space-y-4" @submit.prevent="submit">
      <UFormField :label="$t('roles.nameLabel')">
        <UInput v-model="form.name" :placeholder="$t('roles.namePlaceholder')" required class="w-full" />
      </UFormField>

      <UFormField :label="$t('roles.slugLabel')">
        <UInput v-model="form.slug" :placeholder="$t('roles.slugPlaceholder')" required class="w-full" />
      </UFormField>

      <UFormField :label="$t('roles.descriptionLabel')">
        <UTextarea v-model="form.description" :placeholder="$t('roles.descriptionPlaceholder')" class="w-full" />
      </UFormField>

      <UFormField :label="$t('roles.permissionsLabel')">
        <PermissionPicker v-model="form.permissions" />
      </UFormField>

      <div class="flex justify-end gap-2">
        <UButton to="/admin/roles" variant="ghost" color="neutral">
          {{ $t('common.cancel') }}
        </UButton>
        <UButton type="submit" :loading="saving" :disabled="!form.name || !form.slug || !form.permissions.length">
          {{ $t('common.create') }}
        </UButton>
      </div>
    </form>
  </div>
</template>
