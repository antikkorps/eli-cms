<script setup lang="ts">
import { h, resolveComponent } from 'vue';

definePageMeta({
  layout: 'admin',
  middleware: ['auth'],
});

const { apiFetch } = useApi();
const { t, locale } = useI18n();

interface AuditLog {
  id: string;
  actorId: string;
  actorType: string;
  action: string;
  resourceType: string;
  resourceId: string | null;
  metadata: Record<string, unknown> | null;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: string;
}

const logs = ref<AuditLog[]>([]);
const loading = ref(true);
const page = ref(1);
const limit = 20;
const total = ref(0);

const filters = reactive({
  action: undefined as string | undefined,
  resourceType: undefined as string | undefined,
});

const actionOptions = [
  { label: t('auditLogs.actionCreate'), value: 'create' },
  { label: t('auditLogs.actionUpdate'), value: 'update' },
  { label: t('auditLogs.actionDelete'), value: 'delete' },
  { label: t('auditLogs.actionLogin'), value: 'login' },
  { label: t('auditLogs.actionLogout'), value: 'logout' },
];

const resourceTypeOptions = [
  { label: t('auditLogs.resourceContent'), value: 'content' },
  { label: t('auditLogs.resourceContentType'), value: 'content_type' },
  { label: t('auditLogs.resourceUser'), value: 'user' },
  { label: t('auditLogs.resourceRole'), value: 'role' },
  { label: t('auditLogs.resourceWebhook'), value: 'webhook' },
  { label: t('auditLogs.resourceApiKey'), value: 'api_key' },
  { label: t('auditLogs.resourceSetting'), value: 'setting' },
  { label: t('auditLogs.resourceMedia'), value: 'media' },
];

const UBadge = resolveComponent('UBadge');

const columns = computed(() => [
  {
    accessorKey: 'createdAt',
    header: t('auditLogs.columnDate'),
    cell: ({ row }: { row: { original: AuditLog } }) => {
      return new Date(row.original.createdAt).toLocaleString(locale.value);
    },
  },
  {
    accessorKey: 'actorType',
    header: t('auditLogs.columnActor'),
    cell: ({ row }: { row: { original: AuditLog } }) => {
      return h(UBadge as ReturnType<typeof resolveComponent>, {
        variant: 'subtle',
        color: row.original.actorType === 'system' ? 'neutral' : 'primary',
        size: 'sm',
      }, () => row.original.actorType);
    },
  },
  {
    accessorKey: 'action',
    header: t('auditLogs.columnAction'),
    cell: ({ row }: { row: { original: AuditLog } }) => {
      const colors: Record<string, string> = {
        create: 'success',
        update: 'info',
        delete: 'error',
        login: 'primary',
        logout: 'neutral',
      };
      return h(UBadge as ReturnType<typeof resolveComponent>, {
        variant: 'subtle',
        color: (colors[row.original.action] || 'neutral') as 'success' | 'info' | 'error' | 'primary' | 'neutral',
        size: 'sm',
      }, () => row.original.action);
    },
  },
  {
    accessorKey: 'resourceType',
    header: t('auditLogs.columnResource'),
  },
  {
    accessorKey: 'resourceId',
    header: t('auditLogs.columnResourceId'),
    cell: ({ row }: { row: { original: AuditLog } }) => {
      return row.original.resourceId
        ? row.original.resourceId.substring(0, 8) + '...'
        : '—';
    },
  },
  {
    accessorKey: 'ipAddress',
    header: t('auditLogs.columnIp'),
    cell: ({ row }: { row: { original: AuditLog } }) => {
      return row.original.ipAddress || '—';
    },
  },
]);

async function fetchLogs() {
  loading.value = true;
  try {
    const params = new URLSearchParams({
      page: String(page.value),
      limit: String(limit),
    });
    if (filters.action) params.set('action', filters.action);
    if (filters.resourceType) params.set('resourceType', filters.resourceType);

    const res = await apiFetch<{
      success: boolean;
      data: AuditLog[];
      meta?: { total: number };
    }>(`/audit-logs?${params}`);

    logs.value = res.data;
    total.value = res.meta?.total ?? 0;
  } catch {
    logs.value = [];
  } finally {
    loading.value = false;
  }
}

watch([() => filters.action, () => filters.resourceType], () => {
  page.value = 1;
  fetchLogs();
});

watch(page, fetchLogs);

onMounted(fetchLogs);

const totalPages = computed(() => Math.ceil(total.value / limit));
</script>

<template>
  <div class="p-6 space-y-6">
    <div>
      <h1 class="text-2xl font-bold">{{ $t('auditLogs.title') }}</h1>
      <p class="text-sm text-muted mt-1">{{ $t('auditLogs.subtitle') }}</p>
    </div>

    <div class="flex flex-wrap gap-3">
      <USelect
        v-model="filters.action"
        nullable
        :items="actionOptions"
        :placeholder="$t('auditLogs.allActions')"
        class="w-48"
      />
      <USelect
        v-model="filters.resourceType"
        nullable
        :items="resourceTypeOptions"
        :placeholder="$t('auditLogs.allResources')"
        class="w-48"
      />
    </div>

    <div v-if="loading && !logs.length" class="space-y-3">
      <USkeleton class="h-10 w-full rounded" />
      <USkeleton v-for="i in 5" :key="i" class="h-14 w-full rounded" />
    </div>
    <div v-else-if="!loading && !logs.length" class="flex flex-col items-center justify-center py-16">
      <UIcon name="i-lucide-scroll-text" class="size-12 text-muted" />
      <p class="mt-3 text-sm text-muted">{{ $t('common.noResults') }}</p>
    </div>
    <UTable
      v-else
      :data="logs"
      :columns="columns"
      :loading="loading"
    />

    <div v-if="totalPages > 1" class="flex items-center justify-between">
      <p class="text-sm text-muted">
        {{ $t('common.showing', { from: (page - 1) * limit + 1, to: Math.min(page * limit, total), total }) }}
      </p>
      <UPagination v-model="page" :total="total" :items-per-page="limit" />
    </div>
  </div>
</template>
