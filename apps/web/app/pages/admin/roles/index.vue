<script setup lang="ts">
import { h, resolveComponent } from 'vue';

definePageMeta({
  layout: 'admin',
  middleware: ['auth'],
});

const { t } = useI18n();
const { hasPermission } = useAuth();

interface Role {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  permissions: string[];
  isSystem: boolean;
  createdAt: string;
}

const {
  items: roles,
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
} = useCrudList<Role>({ endpoint: '/roles' });

const canCreate = computed(() => hasPermission('roles:create'));
const canEdit = computed(() => hasPermission('roles:update'));
const canDelete = computed(() => hasPermission('roles:delete'));

const UBadge = resolveComponent('UBadge');
const UButton = resolveComponent('UButton');
const UTooltip = resolveComponent('UTooltip');

const columns = computed(() => [
  { accessorKey: 'name', header: t('roles.columnName') },
  { accessorKey: 'slug', header: t('roles.columnSlug') },
  {
    accessorKey: 'permissions',
    header: t('roles.columnPermissions'),
    cell: ({ row }: { row: { original: Role } }) => {
      const perms = row.original.permissions;
      if (perms.includes('*')) {
        return h(UBadge as ReturnType<typeof resolveComponent>, { variant: 'subtle', color: 'warning', size: 'sm' }, () => 'All (*)');
      }
      const displayed = perms.slice(0, 3);
      const remaining = perms.length - 3;
      const badges = displayed.map((p: string) =>
        h(UBadge as ReturnType<typeof resolveComponent>, { variant: 'subtle', size: 'sm', class: 'mr-1' }, () => p),
      );
      if (remaining > 0) {
        const tooltipText = perms.slice(3).join(', ');
        badges.push(
          h(UTooltip as ReturnType<typeof resolveComponent>, { text: tooltipText }, () =>
            h(UBadge as ReturnType<typeof resolveComponent>, { variant: 'subtle', color: 'neutral', size: 'sm', class: 'cursor-help' }, () => `+${remaining}`),
          ),
        );
      }
      return h('div', { class: 'flex flex-wrap gap-1 max-w-sm' }, badges);
    },
  },
  {
    accessorKey: 'isSystem',
    header: t('roles.columnSystem'),
    cell: ({ row }: { row: { original: Role } }) => {
      if (!row.original.isSystem) return '';
      return h(UBadge as ReturnType<typeof resolveComponent>, { variant: 'subtle', color: 'info', size: 'sm' }, () => t('roles.systemRole'));
    },
  },
  {
    accessorKey: 'actions',
    header: '',
    cell: ({ row }: { row: { original: Role } }) => {
      const buttons = [];
      if (canEdit.value) {
        buttons.push(
          h(UButton as ReturnType<typeof resolveComponent>, {
            icon: 'i-lucide-pencil',
            variant: 'ghost',
            color: 'neutral',
            size: 'sm',
            to: `/admin/roles/${row.original.id}`,
          }),
        );
      }
      if (canDelete.value && !row.original.isSystem) {
        buttons.push(
          h(UButton as ReturnType<typeof resolveComponent>, {
            icon: 'i-lucide-trash-2',
            variant: 'ghost',
            color: 'error',
            size: 'sm',
            onClick: () => confirmDelete(row.original),
          }),
        );
      }
      if (!buttons.length) return '';
      return h('div', { class: 'flex gap-1 justify-end' }, buttons);
    },
  },
]);
</script>

<template>
  <div class="p-6 space-y-6">
    <div class="flex items-center justify-between">
      <div>
        <h1 class="text-2xl font-bold">{{ $t('roles.title') }}</h1>
        <p class="text-sm text-muted mt-1">{{ $t('roles.subtitle') }}</p>
      </div>
      <UButton v-if="canCreate" to="/admin/roles/new" icon="i-lucide-plus">
        {{ $t('roles.create') }}
      </UButton>
    </div>

    <div v-if="loading && !roles.length" class="space-y-3">
      <USkeleton class="h-10 w-full rounded" />
      <USkeleton v-for="i in 5" :key="i" class="h-14 w-full rounded" />
    </div>
    <div v-else-if="!loading && !roles.length" class="flex flex-col items-center justify-center py-16">
      <UIcon name="i-lucide-shield" class="size-12 text-muted" />
      <p class="mt-3 text-sm text-muted">{{ $t('common.noResults') }}</p>
    </div>
    <UTable v-else :data="roles" :columns="columns" :loading="loading" />

    <div v-if="totalPages > 1" class="flex items-center justify-between">
      <p class="text-sm text-muted">
        {{ $t('common.showing', { from: (page - 1) * limit + 1, to: Math.min(page * limit, total), total }) }}
      </p>
      <UPagination v-model="page" :total="total" :items-per-page="limit" />
    </div>

    <UModal v-model:open="deleteOpen">
      <template #content>
        <div class="p-6 space-y-4">
          <h3 class="text-lg font-semibold">{{ $t('roles.deleteTitle') }}</h3>
          <i18n-t keypath="roles.deleteConfirm" tag="p" class="text-sm text-muted">
            <template #name>
              <strong>{{ deleteTarget?.name }}</strong>
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
