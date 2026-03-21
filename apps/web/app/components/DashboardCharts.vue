<script setup lang="ts">
import { Line, Doughnut, Bar } from 'vue-chartjs';

const { t } = useI18n();
const colorMode = useColorMode();

interface TimeSeriesPoint {
  date: string;
  count: number;
}
interface StatusCount {
  status: string;
  count: number;
}
interface TypeCount {
  name: string;
  count: number;
}
interface StorageCategory {
  category: string;
  totalSize: number;
  fileCount: number;
}

const props = defineProps<{
  contentOverTime: TimeSeriesPoint[];
  contentByStatus: StatusCount[];
  contentByType: TypeCount[];
  storageUsage: StorageCategory[];
  activityOverTime: TimeSeriesPoint[];
}>();

const isDark = computed(() => colorMode.value === 'dark');

const gridColor = computed(() => (isDark.value ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'));
const textColor = computed(() => (isDark.value ? '#a1a1aa' : '#71717a'));

const statusColors: Record<string, string> = {
  draft: '#a1a1aa',
  'in-review': '#f59e0b',
  approved: '#3b82f6',
  scheduled: '#8b5cf6',
  published: '#22c55e',
};

const storageColors: Record<string, string> = {
  image: '#3b82f6',
  video: '#8b5cf6',
  audio: '#f59e0b',
  document: '#22c55e',
  other: '#a1a1aa',
};

// ─── Content over time (line chart) ────────────────────
const contentOverTimeData = computed(() => ({
  labels: props.contentOverTime.map((p) => formatShortDate(p.date)),
  datasets: [
    {
      label: t('dashboard.contents'),
      data: props.contentOverTime.map((p) => p.count),
      borderColor: '#6366f1',
      backgroundColor: 'rgba(99,102,241,0.1)',
      fill: true,
      tension: 0.3,
      pointRadius: 0,
      pointHitRadius: 10,
    },
  ],
}));

// ─── Content by status (doughnut) ──────────────────────
const contentByStatusData = computed(() => ({
  labels: props.contentByStatus.map((s) => s.status),
  datasets: [
    {
      data: props.contentByStatus.map((s) => s.count),
      backgroundColor: props.contentByStatus.map((s) => statusColors[s.status] ?? '#a1a1aa'),
    },
  ],
}));

// ─── Content by type (bar) ─────────────────────────────
const contentByTypeData = computed(() => ({
  labels: props.contentByType.map((t) => t.name),
  datasets: [
    {
      label: t('dashboard.contents'),
      data: props.contentByType.map((t) => t.count),
      backgroundColor: '#6366f1',
      borderRadius: 4,
    },
  ],
}));

// ─── Storage usage (doughnut) ──────────────────────────
const storageUsageData = computed(() => ({
  labels: props.storageUsage.map((s) => t(`dashboard.storageCategories.${s.category}`, s.category)),
  datasets: [
    {
      data: props.storageUsage.map((s) => s.totalSize),
      backgroundColor: props.storageUsage.map((s) => storageColors[s.category] ?? '#a1a1aa'),
    },
  ],
}));

// ─── Activity over time (line chart) ───────────────────
const activityOverTimeData = computed(() => ({
  labels: props.activityOverTime.map((p) => formatShortDate(p.date)),
  datasets: [
    {
      label: t('dashboard.activityOverTime'),
      data: props.activityOverTime.map((p) => p.count),
      borderColor: '#22c55e',
      backgroundColor: 'rgba(34,197,94,0.1)',
      fill: true,
      tension: 0.3,
      pointRadius: 0,
      pointHitRadius: 10,
    },
  ],
}));

// ─── Chart options ─────────────────────────────────────
const lineOptions = computed(() => ({
  responsive: true,
  maintainAspectRatio: false,
  plugins: { legend: { display: false } },
  scales: {
    x: {
      grid: { color: gridColor.value },
      ticks: { color: textColor.value, maxTicksLimit: 8 },
    },
    y: {
      beginAtZero: true,
      grid: { color: gridColor.value },
      ticks: { color: textColor.value, precision: 0 },
    },
  },
}));

const doughnutOptions = computed(() => ({
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      position: 'bottom' as const,
      labels: { color: textColor.value, padding: 16 },
    },
  },
}));

const barOptions = computed(() => ({
  responsive: true,
  maintainAspectRatio: false,
  indexAxis: 'y' as const,
  plugins: { legend: { display: false } },
  scales: {
    x: {
      beginAtZero: true,
      grid: { color: gridColor.value },
      ticks: { color: textColor.value, precision: 0 },
    },
    y: {
      grid: { display: false },
      ticks: { color: textColor.value },
    },
  },
}));

const storageDoughnutOptions = computed(() => ({
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      position: 'bottom' as const,
      labels: { color: textColor.value, padding: 16 },
    },
    tooltip: {
      callbacks: {
        label: (ctx: { label: string; raw: unknown }) => {
          const bytes = ctx.raw as number;
          return `${ctx.label}: ${formatBytes(bytes)}`;
        },
      },
    },
  },
}));

function formatShortDate(iso: string) {
  const d = new Date(iso);
  return `${d.getDate()}/${d.getMonth() + 1}`;
}

function formatBytes(bytes: number) {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`;
}

const totalStorage = computed(() => formatBytes(props.storageUsage.reduce((sum, s) => sum + s.totalSize, 0)));

const hasContent = computed(() => props.contentOverTime.some((p) => p.count > 0));
const hasActivity = computed(() => props.activityOverTime.some((p) => p.count > 0));
</script>

<template>
  <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
    <!-- Content over time -->
    <UCard>
      <template #header>
        <h3 class="font-semibold text-sm">{{ $t('dashboard.contentOverTime') }}</h3>
      </template>
      <div v-if="hasContent" class="h-56">
        <Line :data="contentOverTimeData" :options="lineOptions" />
      </div>
      <div v-else class="h-56 flex items-center justify-center text-muted text-sm">
        {{ $t('dashboard.noData') }}
      </div>
    </UCard>

    <!-- Content by status -->
    <UCard>
      <template #header>
        <h3 class="font-semibold text-sm">{{ $t('dashboard.contentByStatus') }}</h3>
      </template>
      <div v-if="contentByStatus.length" class="h-56">
        <Doughnut :data="contentByStatusData" :options="doughnutOptions" />
      </div>
      <div v-else class="h-56 flex items-center justify-center text-muted text-sm">
        {{ $t('dashboard.noData') }}
      </div>
    </UCard>

    <!-- Content by type -->
    <UCard>
      <template #header>
        <h3 class="font-semibold text-sm">{{ $t('dashboard.contentByType') }}</h3>
      </template>
      <div v-if="contentByType.length" class="h-56">
        <Bar :data="contentByTypeData" :options="barOptions" />
      </div>
      <div v-else class="h-56 flex items-center justify-center text-muted text-sm">
        {{ $t('dashboard.noData') }}
      </div>
    </UCard>

    <!-- Storage usage -->
    <UCard>
      <template #header>
        <div class="flex items-center justify-between">
          <h3 class="font-semibold text-sm">{{ $t('dashboard.storageUsage') }}</h3>
          <UBadge v-if="storageUsage.length" variant="subtle" size="sm">{{ totalStorage }}</UBadge>
        </div>
      </template>
      <div v-if="storageUsage.length" class="h-56">
        <Doughnut :data="storageUsageData" :options="storageDoughnutOptions" />
      </div>
      <div v-else class="h-56 flex items-center justify-center text-muted text-sm">
        {{ $t('dashboard.noData') }}
      </div>
    </UCard>

    <!-- Activity over time (full width) -->
    <UCard class="lg:col-span-2">
      <template #header>
        <h3 class="font-semibold text-sm">{{ $t('dashboard.activityOverTime') }}</h3>
      </template>
      <div v-if="hasActivity" class="h-56">
        <Line :data="activityOverTimeData" :options="lineOptions" />
      </div>
      <div v-else class="h-56 flex items-center justify-center text-muted text-sm">
        {{ $t('dashboard.noData') }}
      </div>
    </UCard>
  </div>
</template>
