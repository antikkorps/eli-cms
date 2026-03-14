<script setup lang="ts">
definePageMeta({
  layout: 'admin',
  middleware: ['auth'],
});

const { hasPermission, user: currentUser } = useAuth();
if (!hasPermission('users:update')) {
  navigateTo('/admin/users');
}

const { apiFetch } = useApi();
const { t } = useI18n();
const toast = useToast();
const route = useRoute();

interface UserData {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  roleId: string;
  roleName: string;
  roleSlug: string;
  createdAt: string;
  updatedAt: string;
}

interface RoleOption {
  id: string;
  name: string;
}

const userId = route.params.id as string;
const loading = ref(true);
const saving = ref(false);
const roleOptions = ref<RoleOption[]>([]);

const form = reactive({
  email: '',
  firstName: '',
  lastName: '',
  roleId: '',
  password: '',
});

const isSelf = computed(() => currentUser.value?.id === userId);

async function fetchUser() {
  try {
    const res = await apiFetch<{ success: boolean; data: UserData }>(`/users/${userId}`);
    form.email = res.data.email;
    form.firstName = res.data.firstName || '';
    form.lastName = res.data.lastName || '';
    form.roleId = res.data.roleId;
  } catch {
    toast.add({ title: t('common.error'), color: 'error' });
    navigateTo('/admin/users');
  } finally {
    loading.value = false;
  }
}

async function fetchRoles() {
  try {
    const res = await apiFetch<{ success: boolean; data: RoleOption[] }>('/roles?limit=100');
    roleOptions.value = res.data;
  } catch {
    // ignore
  }
}

const roleItems = computed(() => roleOptions.value.map((r) => ({ label: r.name, value: r.id })));

async function submit() {
  saving.value = true;
  try {
    const body: Record<string, unknown> = {
      email: form.email,
      firstName: form.firstName || null,
      lastName: form.lastName || null,
      roleId: form.roleId,
    };
    if (form.password) {
      body.password = form.password;
    }
    await apiFetch(`/users/${userId}`, {
      method: 'PUT',
      body,
    });
    toast.add({ title: t('common.updated'), color: 'success' });
    navigateTo('/admin/users');
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : t('common.error');
    toast.add({ title: message, color: 'error' });
  } finally {
    saving.value = false;
  }
}

onMounted(() => {
  fetchUser();
  fetchRoles();
});
</script>

<template>
  <div class="p-6 pb-12 space-y-6">
    <div class="flex items-center gap-3">
      <UButton to="/admin/users" variant="ghost" icon="i-lucide-arrow-left" size="sm" />
      <div>
        <h1 class="text-2xl font-bold">{{ $t('users.editTitle') }}</h1>
      </div>
    </div>

    <div v-if="loading" class="space-y-4 max-w-xl">
      <USkeleton class="h-10 w-full rounded" />
      <USkeleton class="h-10 w-full rounded" />
      <USkeleton class="h-10 w-full rounded" />
    </div>

    <form v-else class="space-y-4 max-w-xl" @submit.prevent="submit">
      <div class="grid grid-cols-2 gap-4">
        <UFormField :label="$t('users.firstNameLabel')">
          <UInput v-model="form.firstName" :placeholder="$t('users.firstNamePlaceholder')" class="w-full" />
        </UFormField>

        <UFormField :label="$t('users.lastNameLabel')">
          <UInput v-model="form.lastName" :placeholder="$t('users.lastNamePlaceholder')" class="w-full" />
        </UFormField>
      </div>

      <UFormField :label="$t('users.emailLabel')">
        <UInput v-model="form.email" type="email" :placeholder="$t('users.emailPlaceholder')" required class="w-full" />
      </UFormField>

      <UFormField :label="$t('users.roleLabel')">
        <USelect
          v-model="form.roleId"
          :items="roleItems"
          :placeholder="$t('users.rolePlaceholder')"
          required
          :disabled="isSelf"
          class="w-full"
        />
        <p v-if="isSelf" class="text-xs text-muted mt-1">{{ $t('users.cannotChangeOwnRole') }}</p>
      </UFormField>

      <UFormField :label="$t('users.newPasswordLabel')">
        <UInput
          v-model="form.password"
          type="password"
          :placeholder="$t('users.newPasswordPlaceholder')"
          class="w-full"
        />
        <p class="text-xs text-muted mt-1">{{ $t('users.newPasswordHint') }}</p>
      </UFormField>

      <div class="flex justify-end gap-2">
        <UButton to="/admin/users" variant="ghost" color="neutral">
          {{ $t('common.cancel') }}
        </UButton>
        <UButton type="submit" :loading="saving" :disabled="!form.email || !form.roleId">
          {{ $t('common.save') }}
        </UButton>
      </div>
    </form>
  </div>
</template>
