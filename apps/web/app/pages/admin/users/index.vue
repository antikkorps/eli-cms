<script setup lang="ts">
import { h, resolveComponent } from 'vue';

definePageMeta({
  layout: 'admin',
  middleware: ['auth'],
});

const { apiFetch } = useApi();
const { t, locale } = useI18n();
const { user: currentUser, hasPermission } = useAuth();
const toast = useToast();

interface UserItem {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  roleId: string;
  roleName: string;
  roleSlug: string;
  createdAt: string;
}

interface RoleOption {
  id: string;
  name: string;
}

const search = ref('');
const roleFilter = ref<string | undefined>(undefined);
const roleOptions = ref<RoleOption[]>([]);

const {
  items: users,
  loading,
  page,
  total,
  limit,
  totalPages,
  deleteOpen,
  deleteTarget,
  deleting,
  confirmDelete,
  handleDelete,
} = useCrudList<UserItem>({
  endpoint: '/users',
  filters: { search, roleId: roleFilter },
});

const canCreate = computed(() => hasPermission('users:create'));
const canEdit = computed(() => hasPermission('users:update'));
const canDelete = computed(() => hasPermission('users:delete'));

async function fetchRoles() {
  try {
    const res = await apiFetch<{ success: boolean; data: RoleOption[] }>('/roles?limit=100');
    roleOptions.value = res.data;
  } catch {
    // ignore
  }
}

const roleFilterItems = computed(() => roleOptions.value.map((r) => ({ label: r.name, value: r.id })));

function tryDelete(user: UserItem) {
  if (user.id === currentUser.value?.id) {
    toast.add({ title: t('users.cannotDeleteSelf'), color: 'warning' });
    return;
  }
  confirmDelete(user);
}

function displayName(user: UserItem) {
  const parts = [user.firstName, user.lastName].filter(Boolean);
  return parts.length > 0 ? parts.join(' ') : null;
}

const UBadge = resolveComponent('UBadge');
const UButton = resolveComponent('UButton');

const columns = computed(() => [
  {
    accessorKey: 'email',
    header: t('users.columnEmail'),
    cell: ({ row }: { row: { original: UserItem } }) => {
      const name = displayName(row.original);
      if (name) {
        return h('div', {}, [
          h('div', { class: 'font-medium' }, name),
          h('div', { class: 'text-sm text-muted' }, row.original.email),
        ]);
      }
      return row.original.email;
    },
  },
  {
    accessorKey: 'roleName',
    header: t('users.columnRole'),
    cell: ({ row }: { row: { original: UserItem } }) => {
      return h(
        UBadge as ReturnType<typeof resolveComponent>,
        { variant: 'subtle', size: 'sm' },
        () => row.original.roleName,
      );
    },
  },
  {
    accessorKey: 'createdAt',
    header: t('users.columnCreated'),
    cell: ({ row }: { row: { original: UserItem } }) => {
      return new Date(row.original.createdAt).toLocaleDateString(locale.value);
    },
  },
  {
    accessorKey: 'actions',
    header: '',
    cell: ({ row }: { row: { original: UserItem } }) => {
      const buttons = [];
      if (canEdit.value) {
        buttons.push(
          h(UButton as ReturnType<typeof resolveComponent>, {
            icon: 'i-lucide-pencil',
            variant: 'ghost',
            color: 'neutral',
            size: 'sm',
            to: `/admin/users/${row.original.id}`,
          }),
        );
      }
      if (canDelete.value) {
        buttons.push(
          h(UButton as ReturnType<typeof resolveComponent>, {
            icon: 'i-lucide-trash-2',
            variant: 'ghost',
            color: 'error',
            size: 'sm',
            onClick: () => tryDelete(row.original),
          }),
        );
      }
      if (buttons.length === 0) return '';
      return h('div', { class: 'flex gap-1 justify-end' }, buttons);
    },
  },
]);

onMounted(fetchRoles);
</script>

<template>
  <div class="p-6 space-y-6">
    <div class="flex items-center justify-between">
      <div>
        <h1 class="text-2xl font-bold">{{ $t('users.title') }}</h1>
        <p class="text-sm text-muted mt-1">{{ $t('users.subtitle') }}</p>
      </div>
      <UButton v-if="canCreate" to="/admin/users/new" icon="i-lucide-plus">
        {{ $t('users.create') }}
      </UButton>
    </div>

    <div class="flex flex-wrap gap-3">
      <UInput v-model="search" :placeholder="$t('common.search')" icon="i-lucide-search" class="w-64" />
      <div class="flex items-center gap-1">
        <USelect
          v-model="roleFilter"
          nullable
          :items="roleFilterItems"
          :placeholder="$t('users.allRoles')"
          class="w-48"
        />
        <UButton
          v-if="roleFilter"
          icon="i-lucide-x"
          variant="ghost"
          color="neutral"
          size="xs"
          @click="roleFilter = undefined"
        />
      </div>
    </div>

    <div v-if="loading && !users.length" class="space-y-3">
      <USkeleton class="h-10 w-full rounded" />
      <USkeleton v-for="i in 5" :key="i" class="h-14 w-full rounded" />
    </div>
    <div v-else-if="!loading && !users.length" class="flex flex-col items-center justify-center py-16">
      <UIcon name="i-lucide-users" class="size-12 text-muted" />
      <p class="mt-3 text-sm text-muted">{{ $t('common.noResults') }}</p>
    </div>
    <UTable v-else :data="users" :columns="columns" :loading="loading" />

    <div v-if="totalPages > 1" class="flex items-center justify-between">
      <p class="text-sm text-muted">
        {{ $t('common.showing', { from: (page - 1) * limit + 1, to: Math.min(page * limit, total), total }) }}
      </p>
      <UPagination v-model="page" :total="total" :items-per-page="limit" />
    </div>

    <UModal v-model:open="deleteOpen">
      <template #content>
        <div class="p-6 space-y-4">
          <h3 class="text-lg font-semibold">{{ $t('users.deleteTitle') }}</h3>
          <i18n-t keypath="users.deleteConfirm" tag="p" class="text-sm text-muted">
            <template #name>
              <strong>{{ deleteTarget?.email }}</strong>
            </template>
          </i18n-t>
          <div class="flex justify-end gap-2">
            <UButton variant="ghost" color="neutral" @click="deleteOpen = false">
              {{ $t('common.cancel') }}
            </UButton>
            <UButton color="error" :loading="deleting" @click="handleDelete">
              {{ $t('common.delete') }}
            </UButton>
          </div>
        </div>
      </template>
    </UModal>
  </div>
</template>
