<script setup lang="ts">
import { h, resolveComponent } from 'vue';

definePageMeta({
  layout: 'admin',
  middleware: ['auth'],
});

const { t } = useI18n();
const { hasPermission } = useAuth();

interface ComponentItem {
  id: string;
  name: string;
  slug: string;
  icon?: string | null;
  fields: unknown[];
  createdAt: string;
}

const {
  items: components,
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
} = useCrudList<ComponentItem>({ endpoint: '/components' });

const canManage = computed(() => hasPermission('components:update') || hasPermission('components:delete'));

const UBadge = resolveComponent('UBadge');
const UButton = resolveComponent('UButton');

const columns = computed(() => [
  {
    accessorKey: 'name',
    header: t('components.columnName'),
  },
  { accessorKey: 'slug', header: t('components.columnSlug') },
  {
    accessorKey: 'fields',
    header: t('components.columnFields'),
    cell: ({ row }: { row: { original: ComponentItem } }) => {
      return h(
        UBadge as ReturnType<typeof resolveComponent>,
        { variant: 'subtle', size: 'sm' },
        () => `${row.original.fields.length}`,
      );
    },
  },
  {
    accessorKey: 'actions',
    header: '',
    cell: ({ row }: { row: { original: ComponentItem } }) => {
      if (!canManage.value) return '';
      return h('div', { class: 'flex gap-1 justify-end' }, [
        h(UButton as ReturnType<typeof resolveComponent>, {
          icon: 'i-lucide-pencil',
          variant: 'ghost',
          color: 'neutral',
          size: 'sm',
          to: `/admin/components/${row.original.id}`,
        }),
        h(UButton as ReturnType<typeof resolveComponent>, {
          icon: 'i-lucide-trash-2',
          variant: 'ghost',
          color: 'error',
          size: 'sm',
          onClick: () => confirmDelete(row.original),
        }),
      ]);
    },
  },
]);
</script>

<template>
  <div class="p-6 space-y-6">
    <div class="flex items-center justify-between">
      <div>
        <h1 class="text-2xl font-bold">{{ $t('components.title') }}</h1>
        <p class="text-sm text-muted mt-1">{{ $t('components.subtitle') }}</p>
      </div>
      <UButton v-if="canManage" to="/admin/components/new" icon="i-lucide-plus">
        {{ $t('components.create') }}
      </UButton>
    </div>

    <div v-if="loading && !components.length" class="space-y-3">
      <USkeleton class="h-10 w-full rounded" />
      <USkeleton v-for="i in 5" :key="i" class="h-14 w-full rounded" />
    </div>
    <div v-else-if="!loading && !components.length" class="flex flex-col items-center justify-center py-16">
      <UIcon name="i-lucide-component" class="size-12 text-muted" />
      <p class="mt-3 text-sm text-muted">{{ $t('common.noResults') }}</p>
    </div>
    <UTable v-else :data="components" :columns="columns" :loading="loading" />

    <div v-if="totalPages > 1" class="flex items-center justify-between">
      <p class="text-sm text-muted">
        {{ $t('common.showing', { from: (page - 1) * limit + 1, to: Math.min(page * limit, total), total }) }}
      </p>
      <UPagination v-model="page" :total="total" :items-per-page="limit" />
    </div>

    <UModal v-model:open="deleteOpen">
      <template #content>
        <div class="p-6 space-y-4">
          <h3 class="text-lg font-semibold">{{ $t('components.deleteTitle') }}</h3>
          <i18n-t keypath="components.deleteConfirm" tag="p" class="text-sm text-muted">
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
