<script setup lang="ts">
definePageMeta({
  layout: 'admin',
  middleware: ['auth'],
});

const { hasPermission } = useAuth();
if (!hasPermission('users:create')) {
  navigateTo('/admin/users');
}

const { apiFetch } = useApi();
const { t } = useI18n();
const toast = useToast();
const router = useRouter();

interface RoleOption {
  id: string;
  name: string;
}

const form = reactive({
  email: '',
  password: '',
  firstName: '',
  lastName: '',
  roleId: '',
});

const saving = ref(false);
const roleOptions = ref<RoleOption[]>([]);

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
    await apiFetch('/users', {
      method: 'POST',
      body: {
        email: form.email,
        password: form.password,
        firstName: form.firstName || undefined,
        lastName: form.lastName || undefined,
        roleId: form.roleId,
      },
    });
    toast.add({ title: t('common.created'), color: 'success' });
    router.push('/admin/users');
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : t('common.error');
    toast.add({ title: message, color: 'error' });
  } finally {
    saving.value = false;
  }
}

onMounted(fetchRoles);
</script>

<template>
  <div class="p-6 pb-12 space-y-6">
    <div class="flex items-center gap-3">
      <UButton to="/admin/users" variant="ghost" icon="i-lucide-arrow-left" size="sm" />
      <div>
        <h1 class="text-2xl font-bold">{{ $t('users.newTitle') }}</h1>
      </div>
    </div>

    <form class="space-y-4 max-w-xl" @submit.prevent="submit">
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

      <UFormField :label="$t('users.passwordLabel')">
        <UInput
          v-model="form.password"
          type="password"
          :placeholder="$t('users.passwordPlaceholder')"
          required
          class="w-full"
        />
      </UFormField>

      <UFormField :label="$t('users.roleLabel')">
        <USelect
          v-model="form.roleId"
          :items="roleItems"
          :placeholder="$t('users.rolePlaceholder')"
          required
          class="w-full"
        />
      </UFormField>

      <div class="flex justify-end gap-2">
        <UButton to="/admin/users" variant="ghost" color="neutral">
          {{ $t('common.cancel') }}
        </UButton>
        <UButton type="submit" :loading="saving" :disabled="!form.email || !form.password || !form.roleId">
          {{ $t('common.create') }}
        </UButton>
      </div>
    </form>
  </div>
</template>
