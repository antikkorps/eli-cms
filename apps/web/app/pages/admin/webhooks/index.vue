<script setup lang="ts">
import { h, resolveComponent } from 'vue';

definePageMeta({
  layout: 'admin',
  middleware: ['auth'],
});

const { apiFetch } = useApi();
const { t } = useI18n();
const toast = useToast();

interface WebhookItem {
  id: string;
  name: string;
  url: string;
  events: string[];
  isActive: boolean;
  createdAt: string;
}

const {
  items: webhooks,
  loading,
  page,
  total,
  limit,
  totalPages,
  fetchItems,
  deleteOpen,
  deleteTarget,
  deleting,
  confirmDelete,
  handleDelete,
} = useCrudList<WebhookItem>({ endpoint: '/webhooks' });

async function toggleActive(webhook: WebhookItem) {
  try {
    await apiFetch(`/webhooks/${webhook.id}`, {
      method: 'PUT',
      body: { isActive: !webhook.isActive },
    });
    await fetchItems();
  } catch {
    toast.add({ title: t('common.error'), color: 'error' });
  }
}

const UBadge = resolveComponent('UBadge');
const UButton = resolveComponent('UButton');
const UTooltip = resolveComponent('UTooltip');

const columns = computed(() => [
  { accessorKey: 'name', header: t('webhooks.columnName') },
  {
    accessorKey: 'url',
    header: t('webhooks.columnUrl'),
    cell: ({ row }: { row: { original: WebhookItem } }) => {
      const url = row.original.url;
      return url.length > 50 ? url.substring(0, 50) + '...' : url;
    },
  },
  {
    accessorKey: 'events',
    header: t('webhooks.columnEvents'),
    cell: ({ row }: { row: { original: WebhookItem } }) => {
      const events = row.original.events;
      const displayed = events.slice(0, 2);
      const remaining = events.length - 2;
      const badges = displayed.map((e: string) =>
        h(UBadge as ReturnType<typeof resolveComponent>, { variant: 'subtle', size: 'sm', class: 'mr-1' }, () => e),
      );
      if (remaining > 0) {
        const tooltipText = events.slice(2).join(', ');
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
    accessorKey: 'isActive',
    header: t('webhooks.columnActive'),
    cell: ({ row }: { row: { original: WebhookItem } }) => {
      return h(UBadge as ReturnType<typeof resolveComponent>, {
        variant: 'subtle',
        color: row.original.isActive ? 'success' : 'neutral',
        size: 'sm',
      }, () => row.original.isActive ? t('common.active') : t('common.inactive'));
    },
  },
  {
    accessorKey: 'actions',
    header: '',
    cell: ({ row }: { row: { original: WebhookItem } }) => {
      return h('div', { class: 'flex gap-1 justify-end' }, [
        h(UButton as ReturnType<typeof resolveComponent>, {
          icon: row.original.isActive ? 'i-lucide-pause' : 'i-lucide-play',
          variant: 'ghost',
          color: 'neutral',
          size: 'sm',
          onClick: () => toggleActive(row.original),
        }),
        h(UButton as ReturnType<typeof resolveComponent>, {
          icon: 'i-lucide-pencil',
          variant: 'ghost',
          color: 'neutral',
          size: 'sm',
          to: `/admin/webhooks/${row.original.id}`,
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
        <h1 class="text-2xl font-bold">{{ $t('webhooks.title') }}</h1>
        <p class="text-sm text-muted mt-1">{{ $t('webhooks.subtitle') }}</p>
      </div>
      <UButton to="/admin/webhooks/new" icon="i-lucide-plus">
        {{ $t('webhooks.create') }}
      </UButton>
    </div>

    <div v-if="loading && !webhooks.length" class="space-y-3">
      <USkeleton class="h-10 w-full rounded" />
      <USkeleton v-for="i in 5" :key="i" class="h-14 w-full rounded" />
    </div>
    <div v-else-if="!loading && !webhooks.length" class="flex flex-col items-center justify-center py-16">
      <UIcon name="i-lucide-webhook" class="size-12 text-muted" />
      <p class="mt-3 text-sm text-muted">{{ $t('common.noResults') }}</p>
    </div>
    <UTable v-else :data="webhooks" :columns="columns" :loading="loading" />

    <div v-if="totalPages > 1" class="flex items-center justify-between">
      <p class="text-sm text-muted">
        {{ $t('common.showing', { from: (page - 1) * limit + 1, to: Math.min(page * limit, total), total }) }}
      </p>
      <UPagination v-model="page" :total="total" :items-per-page="limit" />
    </div>

    <UModal v-model:open="deleteOpen">
      <template #content>
        <div class="p-6 space-y-4">
          <h3 class="text-lg font-semibold">{{ $t('webhooks.deleteTitle') }}</h3>
          <i18n-t keypath="webhooks.deleteConfirm" tag="p" class="text-sm text-muted">
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
