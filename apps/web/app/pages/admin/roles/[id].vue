<script setup lang="ts">
definePageMeta({
  layout: 'admin',
  middleware: ['auth'],
});

const { hasPermission } = useAuth();
if (!hasPermission('roles:update')) {
  navigateTo('/admin/roles');
}

const route = useRoute();
const { apiFetch } = useApi();
const { t } = useI18n();
const toast = useToast();
const router = useRouter();

const form = reactive({
  name: '',
  slug: '',
  description: '',
  permissions: [] as string[],
  allowedContentTypes: null as string[] | null,
});

const { user } = useAuth();

const loading = ref(true);
const saving = ref(false);
const isSystem = ref(false);
const isOwnRole = computed(() => user.value?.role?.slug === form.slug);

async function fetchRole() {
  loading.value = true;
  try {
    const res = await apiFetch<{
      success: boolean;
      data: {
        id: string;
        name: string;
        slug: string;
        description: string | null;
        permissions: string[];
        allowedContentTypes: string[] | null;
        isSystem: boolean;
      };
    }>(`/roles/${route.params.id}`);
    form.name = res.data.name;
    form.slug = res.data.slug;
    form.description = res.data.description ?? '';
    form.permissions = res.data.permissions;
    form.allowedContentTypes = res.data.allowedContentTypes;
    isSystem.value = res.data.isSystem;
  } catch {
    toast.add({ title: t('common.error'), color: 'error' });
    router.push('/admin/roles');
  } finally {
    loading.value = false;
  }
}

async function submit() {
  saving.value = true;
  try {
    const body: Record<string, unknown> = {
      name: form.name,
      description: form.description || null,
      permissions: form.permissions,
      allowedContentTypes: form.allowedContentTypes,
    };
    if (!isSystem.value) {
      body.slug = form.slug;
    }
    await apiFetch(`/roles/${route.params.id}`, { method: 'PUT', body });
    toast.add({ title: t('common.updated'), color: 'success' });
    router.push('/admin/roles');
  } catch {
    toast.add({ title: t('common.error'), color: 'error' });
  } finally {
    saving.value = false;
  }
}

onMounted(fetchRole);
</script>

<template>
  <div class="p-6 pb-12 space-y-6 mb-5">
    <div class="flex items-center gap-3">
      <UButton to="/admin/roles" variant="ghost" icon="i-lucide-arrow-left" size="sm" />
      <div>
        <h1 class="text-2xl font-bold">{{ $t('roles.editTitle') }}</h1>
      </div>
    </div>

    <div v-if="loading" class="text-sm text-muted">{{ $t('common.loading') }}</div>

    <form v-else class="space-y-4" @submit.prevent="submit">
      <UFormField :label="$t('roles.nameLabel')">
        <UInput v-model="form.name" :placeholder="$t('roles.namePlaceholder')" required class="w-full" />
      </UFormField>

      <UFormField :label="$t('roles.slugLabel')">
        <UInput
          v-model="form.slug"
          :placeholder="$t('roles.slugPlaceholder')"
          required
          :disabled="isSystem"
          class="w-full"
        />
      </UFormField>

      <UFormField :label="$t('roles.descriptionLabel')">
        <UTextarea v-model="form.description" :placeholder="$t('roles.descriptionPlaceholder')" class="w-full" />
      </UFormField>

      <UAlert
        v-if="isOwnRole"
        icon="i-lucide-shield-alert"
        color="warning"
        :title="$t('roles.ownRolePermissionsHint')"
      />

      <UFormField :label="$t('roles.permissionsLabel')">
        <PermissionPicker v-model="form.permissions" :disabled="isOwnRole" />
      </UFormField>

      <UFormField :label="$t('roles.contentTypeScopeLabel')">
        <ContentTypeScopePicker v-model="form.allowedContentTypes" :disabled="isOwnRole" />
      </UFormField>

      <div v-if="!isOwnRole" class="flex justify-end gap-2">
        <UButton to="/admin/roles" variant="ghost" color="neutral">
          {{ $t('common.cancel') }}
        </UButton>
        <UButton type="submit" :loading="saving" :disabled="!form.name || !form.slug || !form.permissions.length">
          {{ $t('common.save') }}
        </UButton>
      </div>
    </form>
  </div>
</template>
