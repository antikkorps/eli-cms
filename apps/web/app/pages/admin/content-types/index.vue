<script setup lang="ts">
import { h, resolveComponent } from 'vue';

definePageMeta({
  layout: 'admin',
  middleware: ['auth'],
});

const { t } = useI18n();
const { hasPermission } = useAuth();

interface ContentTypeItem {
  id: string;
  name: string;
  slug: string;
  isSingleton?: boolean;
  fields: unknown[];
  createdAt: string;
}

const {
  items: contentTypes,
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
} = useCrudList<ContentTypeItem>({ endpoint: '/content-types' });

const canManage = computed(() => hasPermission('content-types:update') || hasPermission('content-types:delete'));

const UBadge = resolveComponent('UBadge');
const UButton = resolveComponent('UButton');

const columns = computed(() => [
  {
    accessorKey: 'name',
    header: t('contentTypes.columnName'),
    cell: ({ row }: { row: { original: ContentTypeItem } }) => {
      const children: Array<string | ReturnType<typeof h>> = [row.original.name];
      if (row.original.isSingleton) {
        children.push(
          ' ',
          h(UBadge as ReturnType<typeof resolveComponent>, { variant: 'subtle', color: 'info', size: 'sm' }, () => t('contentTypes.singletonLabel')),
        );
      }
      return h('span', { class: 'flex items-center gap-1.5' }, children);
    },
  },
  { accessorKey: 'slug', header: t('contentTypes.columnSlug') },
  {
    accessorKey: 'fields',
    header: t('contentTypes.columnFields'),
    cell: ({ row }: { row: { original: ContentTypeItem } }) => {
      return h(UBadge as ReturnType<typeof resolveComponent>, { variant: 'subtle', size: 'sm' }, () => `${row.original.fields.length}`);
    },
  },
  {
    accessorKey: 'actions',
    header: '',
    cell: ({ row }: { row: { original: ContentTypeItem } }) => {
      if (!canManage.value) return '';
      return h('div', { class: 'flex gap-1 justify-end' }, [
        h(UButton as ReturnType<typeof resolveComponent>, {
          icon: 'i-lucide-pencil',
          variant: 'ghost',
          color: 'neutral',
          size: 'sm',
          to: `/admin/content-types/${row.original.id}`,
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
        <h1 class="text-2xl font-bold">{{ $t('contentTypes.title') }}</h1>
        <p class="text-sm text-muted mt-1">{{ $t('contentTypes.subtitle') }}</p>
      </div>
      <UButton v-if="canManage" to="/admin/content-types/new" icon="i-lucide-plus">
        {{ $t('contentTypes.create') }}
      </UButton>
    </div>

    <div v-if="loading && !contentTypes.length" class="space-y-3">
      <USkeleton class="h-10 w-full rounded" />
      <USkeleton v-for="i in 5" :key="i" class="h-14 w-full rounded" />
    </div>
    <div v-else-if="!loading && !contentTypes.length" class="flex flex-col items-center justify-center py-16">
      <UIcon name="i-lucide-blocks" class="size-12 text-muted" />
      <p class="mt-3 text-sm text-muted">{{ $t('common.noResults') }}</p>
    </div>
    <UTable v-else :data="contentTypes" :columns="columns" :loading="loading" />

    <div v-if="totalPages > 1" class="flex items-center justify-between">
      <p class="text-sm text-muted">
        {{ $t('common.showing', { from: (page - 1) * limit + 1, to: Math.min(page * limit, total), total }) }}
      </p>
      <UPagination v-model="page" :total="total" :items-per-page="limit" />
    </div>

    <UModal v-model:open="deleteOpen">
      <template #content>
        <div class="p-6 space-y-4">
          <h3 class="text-lg font-semibold">{{ $t('contentTypes.deleteTitle') }}</h3>
          <i18n-t keypath="contentTypes.deleteConfirm" tag="p" class="text-sm text-muted">
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
