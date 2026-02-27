<script setup lang="ts">
import { h, resolveComponent } from 'vue';

definePageMeta({
  layout: 'admin',
  middleware: ['auth'],
});

const { apiFetch } = useApi();
const { t, locale } = useI18n();

interface ApiKey {
  id: string;
  name: string;
  keyPrefix: string;
  permissions: string[];
  isActive: boolean;
  lastUsedAt: string | null;
  expiresAt: string | null;
  createdAt: string;
}

const keys = ref<ApiKey[]>([]);
const loading = ref(true);
const page = ref(1);
const limit = 20;
const total = ref(0);

const deleteTarget = ref<ApiKey | null>(null);
const deleteOpen = ref(false);
const deleting = ref(false);

const UBadge = resolveComponent('UBadge');

const columns = computed(() => [
  {
    accessorKey: 'name',
    header: t('apiKeys.columnName'),
  },
  {
    accessorKey: 'keyPrefix',
    header: t('apiKeys.columnKeyPrefix'),
    cell: ({ row }: { row: { original: ApiKey } }) => {
      return `${row.original.keyPrefix}...`;
    },
  },
  {
    accessorKey: 'permissions',
    header: t('apiKeys.columnPermissions'),
    cell: ({ row }: { row: { original: ApiKey } }) => {
      const perms = row.original.permissions;
      if (!perms.length) return '—';
      const displayed = perms.slice(0, 3);
      const remaining = perms.length - 3;
      const badges = displayed.map((p: string) =>
        h(UBadge as ReturnType<typeof resolveComponent>, {
          variant: 'subtle',
          size: 'sm',
          class: 'mr-1',
        }, () => p),
      );
      if (remaining > 0) {
        badges.push(
          h(UBadge as ReturnType<typeof resolveComponent>, {
            variant: 'subtle',
            color: 'neutral',
            size: 'sm',
          }, () => `+${remaining}`),
        );
      }
      return h('div', { class: 'flex flex-wrap gap-1' }, badges);
    },
  },
  {
    accessorKey: 'isActive',
    header: t('apiKeys.columnStatus'),
    cell: ({ row }: { row: { original: ApiKey } }) => {
      return h(UBadge as ReturnType<typeof resolveComponent>, {
        variant: 'subtle',
        color: row.original.isActive ? 'success' : 'neutral',
        size: 'sm',
      }, () => row.original.isActive ? t('apiKeys.statusActive') : t('apiKeys.statusInactive'));
    },
  },
  {
    accessorKey: 'lastUsedAt',
    header: t('apiKeys.columnLastUsed'),
    cell: ({ row }: { row: { original: ApiKey } }) => {
      return row.original.lastUsedAt
        ? new Date(row.original.lastUsedAt).toLocaleString(locale.value)
        : t('apiKeys.never');
    },
  },
  {
    accessorKey: 'expiresAt',
    header: t('apiKeys.columnExpires'),
    cell: ({ row }: { row: { original: ApiKey } }) => {
      if (!row.original.expiresAt) return t('apiKeys.never');
      const date = new Date(row.original.expiresAt);
      const isExpired = date < new Date();
      return h('span', {
        class: isExpired ? 'text-error' : '',
      }, isExpired
        ? t('apiKeys.expired', { date: date.toLocaleDateString(locale.value) })
        : date.toLocaleDateString(locale.value));
    },
  },
  {
    accessorKey: 'actions',
    header: '',
    cell: ({ row }: { row: { original: ApiKey } }) => {
      const UButton = resolveComponent('UButton');
      return h('div', { class: 'flex gap-1 justify-end' }, [
        h(UButton as ReturnType<typeof resolveComponent>, {
          icon: row.original.isActive ? 'i-lucide-pause' : 'i-lucide-play',
          variant: 'ghost',
          color: 'neutral',
          size: 'sm',
          onClick: () => toggleActive(row.original),
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

async function fetchKeys() {
  loading.value = true;
  try {
    const params = new URLSearchParams({
      page: String(page.value),
      limit: String(limit),
    });
    const res = await apiFetch<{
      success: boolean;
      data: ApiKey[];
      meta?: { total: number };
    }>(`/api-keys?${params}`);
    keys.value = res.data;
    total.value = res.meta?.total ?? 0;
  } catch {
    keys.value = [];
  } finally {
    loading.value = false;
  }
}

async function toggleActive(key: ApiKey) {
  try {
    await apiFetch(`/api-keys/${key.id}`, {
      method: 'PUT',
      body: { isActive: !key.isActive },
    });
    await fetchKeys();
  } catch {
    // Silently fail
  }
}

function confirmDelete(key: ApiKey) {
  deleteTarget.value = key;
  deleteOpen.value = true;
}

async function handleDelete() {
  if (!deleteTarget.value) return;
  deleting.value = true;
  try {
    await apiFetch(`/api-keys/${deleteTarget.value.id}`, { method: 'DELETE' });
    deleteOpen.value = false;
    deleteTarget.value = null;
    await fetchKeys();
  } catch {
    // Silently fail
  } finally {
    deleting.value = false;
  }
}

watch(page, fetchKeys);
onMounted(fetchKeys);

const totalPages = computed(() => Math.ceil(total.value / limit));
</script>

<template>
  <div class="p-6 space-y-6">
    <div class="flex items-center justify-between">
      <div>
        <h1 class="text-2xl font-bold">{{ $t('apiKeys.title') }}</h1>
        <p class="text-sm text-muted mt-1">{{ $t('apiKeys.subtitle') }}</p>
      </div>
      <UButton to="/admin/api-keys/new" icon="i-lucide-plus">
        {{ $t('apiKeys.create') }}
      </UButton>
    </div>

    <UTable
      :data="keys"
      :columns="columns"
      :loading="loading"
    />

    <div v-if="totalPages > 1" class="flex items-center justify-between">
      <p class="text-sm text-muted">
        {{ $t('common.showing', { from: (page - 1) * limit + 1, to: Math.min(page * limit, total), total }) }}
      </p>
      <UPagination v-model="page" :total="total" :items-per-page="limit" />
    </div>

    <UModal v-model:open="deleteOpen">
      <template #content>
        <div class="p-6 space-y-4">
          <h3 class="text-lg font-semibold">{{ $t('apiKeys.deleteTitle') }}</h3>
          <i18n-t keypath="apiKeys.deleteConfirm" tag="p" class="text-sm text-muted">
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
