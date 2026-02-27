<script setup lang="ts">
definePageMeta({
  layout: 'admin',
  middleware: ['auth'],
});

const { apiFetch } = useApi();
const { hasPermission } = useAuth();
const { t, locale } = useI18n();

interface StatsData {
  contentCount: number;
  contentTypeCount: number;
  userCount: number;
  recentLogs: Array<{
    id: string;
    action: string;
    resourceType: string;
    actorType: string;
    ipAddress: string | null;
    createdAt: string;
  }>;
}

const stats = reactive<StatsData>({
  contentCount: 0,
  contentTypeCount: 0,
  userCount: 0,
  recentLogs: [],
});
const loading = ref(true);

onMounted(async () => {
  try {
    const [contents, contentTypes, users] = await Promise.all([
      apiFetch<{ success: boolean; meta?: { total: number } }>('/contents?limit=1'),
      apiFetch<{ success: boolean; meta?: { total: number } }>('/content-types?limit=1'),
      hasPermission('users:read')
        ? apiFetch<{ success: boolean; meta?: { total: number } }>('/users?limit=1')
        : Promise.resolve({ success: true, meta: { total: 0 } }),
    ]);

    stats.contentCount = contents.meta?.total ?? 0;
    stats.contentTypeCount = contentTypes.meta?.total ?? 0;
    stats.userCount = users.meta?.total ?? 0;

    if (hasPermission('audit-logs:read')) {
      const logs = await apiFetch<{
        success: boolean;
        data: StatsData['recentLogs'];
      }>('/audit-logs?limit=5');
      stats.recentLogs = logs.data;
    }
  } catch {
    // Stats are non-critical
  } finally {
    loading.value = false;
  }
});

const statCards = computed(() => [
  { label: t('dashboard.contents'), value: stats.contentCount, icon: 'i-lucide-file-text', color: 'primary' as const },
  { label: t('dashboard.contentTypes'), value: stats.contentTypeCount, icon: 'i-lucide-blocks', color: 'info' as const },
  { label: t('dashboard.users'), value: stats.userCount, icon: 'i-lucide-users', color: 'success' as const },
]);

function formatDate(date: string) {
  return new Date(date).toLocaleString(locale.value);
}
</script>

<template>
  <div class="p-6 space-y-6">
    <div>
      <h1 class="text-2xl font-bold">{{ $t('dashboard.title') }}</h1>
      <p class="text-sm text-muted mt-1">{{ $t('dashboard.subtitle') }}</p>
    </div>

    <div v-if="loading" class="flex justify-center py-12">
      <UIcon name="i-lucide-loader-circle" class="size-8 animate-spin text-muted" />
    </div>

    <template v-else>
      <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
        <UCard v-for="card in statCards" :key="card.label">
          <div class="flex items-center gap-4">
            <div class="flex size-10 items-center justify-center rounded-lg bg-primary/10">
              <UIcon :name="card.icon" class="size-5 text-primary" />
            </div>
            <div>
              <p class="text-sm text-muted">{{ card.label }}</p>
              <p class="text-2xl font-bold">{{ card.value }}</p>
            </div>
          </div>
        </UCard>
      </div>

      <UCard v-if="hasPermission('audit-logs:read')">
        <template #header>
          <div class="flex items-center justify-between">
            <h2 class="font-semibold">{{ $t('dashboard.recentActivity') }}</h2>
            <UButton to="/admin/audit-logs" variant="link" size="sm" trailing-icon="i-lucide-arrow-right">
              {{ $t('dashboard.viewAll') }}
            </UButton>
          </div>
        </template>

        <div v-if="stats.recentLogs.length === 0" class="text-center py-6 text-muted text-sm">
          {{ $t('dashboard.noActivity') }}
        </div>

        <div v-else class="divide-y divide-default">
          <div v-for="log in stats.recentLogs" :key="log.id" class="flex items-center justify-between py-3">
            <div class="flex items-center gap-3">
              <UBadge variant="subtle" size="sm">{{ log.action }}</UBadge>
              <span class="text-sm">{{ log.resourceType }}</span>
            </div>
            <span class="text-xs text-muted">{{ formatDate(log.createdAt) }}</span>
          </div>
        </div>
      </UCard>
    </template>
  </div>
</template>
