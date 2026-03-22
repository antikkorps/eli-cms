<script setup lang="ts">
definePageMeta({
  layout: 'admin',
  middleware: ['auth'],
});

const { apiFetch } = useApi();
const { t, locale } = useI18n();
const { items: contentTypeItems, fetch: fetchContentTypes } = useContentTypes();

interface CalendarContent {
  id: string;
  contentTypeId: string;
  slug: string | null;
  status: string;
  data: Record<string, unknown>;
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
  contentType?: { name: string; slug: string };
}

const ALL = '_all';
const contentTypeFilter = ref(ALL);
const statusFilter = ref(ALL);
const loading = ref(false);
const contents = ref<CalendarContent[]>([]);

// Current month view
const currentDate = ref(new Date());

const currentYear = computed(() => currentDate.value.getFullYear());
const currentMonth = computed(() => currentDate.value.getMonth());

const monthLabel = computed(() => {
  return currentDate.value.toLocaleDateString(locale.value, { month: 'long', year: 'numeric' });
});

// Calendar grid
const calendarDays = computed(() => {
  const year = currentYear.value;
  const month = currentMonth.value;
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);

  // Start from Monday (1) instead of Sunday (0)
  let startOffset = firstDay.getDay() - 1;
  if (startOffset < 0) startOffset = 6;

  const days: Array<{ date: Date; isCurrentMonth: boolean; isToday: boolean; items: CalendarContent[] }> = [];

  // Previous month padding
  for (let i = startOffset - 1; i >= 0; i--) {
    const d = new Date(year, month, -i);
    days.push({ date: d, isCurrentMonth: false, isToday: false, items: [] });
  }

  // Current month days
  const today = new Date();
  for (let d = 1; d <= lastDay.getDate(); d++) {
    const date = new Date(year, month, d);
    const isToday =
      date.getDate() === today.getDate() &&
      date.getMonth() === today.getMonth() &&
      date.getFullYear() === today.getFullYear();
    days.push({ date, isCurrentMonth: true, isToday, items: [] });
  }

  // Next month padding to fill grid (6 rows max)
  const remaining = 7 - (days.length % 7);
  if (remaining < 7) {
    for (let i = 1; i <= remaining; i++) {
      const d = new Date(year, month + 1, i);
      days.push({ date: d, isCurrentMonth: false, isToday: false, items: [] });
    }
  }

  // Place content items on their dates
  for (const item of contents.value) {
    const itemDate = item.publishedAt ? new Date(item.publishedAt) : new Date(item.createdAt);
    const day = days.find(
      (d) =>
        d.date.getDate() === itemDate.getDate() &&
        d.date.getMonth() === itemDate.getMonth() &&
        d.date.getFullYear() === itemDate.getFullYear(),
    );
    if (day) {
      day.items.push(item);
    }
  }

  return days;
});

const weekDays = computed(() => {
  const formatter = new Intl.DateTimeFormat(locale.value, { weekday: 'short' });
  // Generate Mon-Sun
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(2024, 0, i + 1); // Jan 1 2024 is Monday
    return formatter.format(d);
  });
});

function prevMonth() {
  const d = new Date(currentDate.value);
  d.setMonth(d.getMonth() - 1);
  currentDate.value = d;
}

function nextMonth() {
  const d = new Date(currentDate.value);
  d.setMonth(d.getMonth() + 1);
  currentDate.value = d;
}

function goToToday() {
  currentDate.value = new Date();
}

const statusColors: Record<string, string> = {
  draft: 'bg-gray-400',
  'in-review': 'bg-yellow-500',
  approved: 'bg-blue-500',
  scheduled: 'bg-primary',
  published: 'bg-green-500',
};

function getPreviewText(data: Record<string, unknown>): string {
  const first = Object.values(data).find((v) => typeof v === 'string' && v.length > 0);
  if (typeof first === 'string') {
    const doc = new DOMParser().parseFromString(first, 'text/html');
    const plain = (doc.body.textContent || '').trim();
    return plain.length > 40 ? plain.substring(0, 40) + '...' : plain;
  }
  return '';
}

function getEffectiveDate(item: CalendarContent): Date {
  return item.publishedAt ? new Date(item.publishedAt) : new Date(item.createdAt);
}

async function fetchAllForMonth() {
  loading.value = true;
  try {
    const year = currentYear.value;
    const month = currentMonth.value;
    const monthStart = new Date(year, month, 1);
    const monthEnd = new Date(year, month + 1, 0, 23, 59, 59);

    const params = new URLSearchParams({ limit: '100', sortBy: 'createdAt', sortOrder: 'asc' });
    if (contentTypeFilter.value !== ALL) params.set('contentTypeId', contentTypeFilter.value);
    if (statusFilter.value !== ALL) params.set('status', statusFilter.value);

    const res = await apiFetch<{ data: CalendarContent[] }>(`/contents?${params}`);

    // Filter client-side by effective date (publishedAt or createdAt) within current month
    contents.value = res.data.filter((item) => {
      const d = getEffectiveDate(item);
      return d >= monthStart && d <= monthEnd;
    });
  } catch {
    contents.value = [];
  } finally {
    loading.value = false;
  }
}

const typeFilterItems = computed(() => [
  { label: t('contents.allTypes'), value: ALL },
  ...contentTypeItems.value.map((ct) => ({ label: ct.name, value: ct.id })),
]);

const statusFilterItems = [
  { label: t('contents.allStatuses'), value: ALL },
  { label: t('contents.draft'), value: 'draft' },
  { label: t('contents.inReview'), value: 'in-review' },
  { label: t('contents.approved'), value: 'approved' },
  { label: t('contents.scheduled'), value: 'scheduled' },
  { label: t('contents.published'), value: 'published' },
];

// Watch for changes and refetch
watch([currentDate, contentTypeFilter, statusFilter], () => {
  fetchAllForMonth();
});

onMounted(async () => {
  await fetchContentTypes();
  fetchAllForMonth();
});
</script>

<template>
  <div class="p-6 space-y-6">
    <!-- Header -->
    <div class="flex items-center justify-between">
      <div>
        <h1 class="text-2xl font-bold">{{ $t('contents.calendarTitle') }}</h1>
        <p class="text-sm text-muted mt-1">{{ $t('contents.calendarSubtitle') }}</p>
      </div>
      <UButton to="/admin/contents" variant="outline" icon="i-lucide-list" :title="$t('nav.allContents')" />
    </div>

    <!-- Filters + Month navigation -->
    <div class="flex flex-wrap gap-3 items-center justify-between">
      <div class="flex gap-3 items-center">
        <USelect v-model="contentTypeFilter" :items="typeFilterItems" class="w-48" />
        <USelect v-model="statusFilter" :items="statusFilterItems" class="w-48" />
      </div>

      <div class="flex items-center gap-2">
        <UButton variant="ghost" icon="i-lucide-chevron-left" size="sm" @click="prevMonth" />
        <h2 class="text-lg font-semibold min-w-[180px] text-center capitalize">{{ monthLabel }}</h2>
        <UButton variant="ghost" icon="i-lucide-chevron-right" size="sm" @click="nextMonth" />
        <UButton variant="outline" size="sm" @click="goToToday">
          {{ $t('contents.calendarToday') }}
        </UButton>
      </div>
    </div>

    <!-- Calendar grid -->
    <div class="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
      <!-- Week day headers -->
      <div class="grid grid-cols-7 bg-gray-50 dark:bg-gray-800/50">
        <div
          v-for="day in weekDays"
          :key="day"
          class="px-2 py-2 text-center text-xs font-medium text-muted uppercase tracking-wide border-b border-gray-200 dark:border-gray-700"
        >
          {{ day }}
        </div>
      </div>

      <!-- Day cells -->
      <div class="grid grid-cols-7">
        <div
          v-for="(day, idx) in calendarDays"
          :key="idx"
          class="min-h-[120px] border-b border-r border-gray-200 dark:border-gray-700 p-1.5 transition-colors"
          :class="{
            'bg-white dark:bg-gray-900': day.isCurrentMonth,
            'bg-gray-50/50 dark:bg-gray-800/30': !day.isCurrentMonth,
            'ring-2 ring-primary ring-inset': day.isToday,
          }"
        >
          <!-- Day number -->
          <div class="flex items-center justify-between mb-1">
            <span
              class="text-sm font-medium leading-6 inline-flex items-center justify-center size-6 rounded-full"
              :class="{
                'text-gray-900 dark:text-gray-100': day.isCurrentMonth && !day.isToday,
                'text-gray-400 dark:text-gray-600': !day.isCurrentMonth,
                'bg-primary text-white': day.isToday,
              }"
            >
              {{ day.date.getDate() }}
            </span>
            <span v-if="day.items.length > 0" class="text-xs text-muted">
              {{ day.items.length }}
            </span>
          </div>

          <!-- Content items -->
          <div class="space-y-0.5 overflow-y-auto max-h-[80px]">
            <NuxtLink
              v-for="item in day.items.slice(0, 3)"
              :key="item.id"
              :to="`/admin/contents/${item.id}`"
              class="block px-1.5 py-0.5 rounded text-xs truncate cursor-pointer transition-opacity hover:opacity-80"
              :class="[statusColors[item.status] || 'bg-gray-400', 'text-white']"
              :title="`${getPreviewText(item.data) || item.slug || item.id} — ${item.contentType?.name || ''}`"
            >
              {{ getPreviewText(item.data) || item.slug || '—' }}
            </NuxtLink>
            <div v-if="day.items.length > 3" class="text-xs text-muted px-1.5">+{{ day.items.length - 3 }}</div>
          </div>
        </div>
      </div>
    </div>

    <!-- Legend -->
    <div class="flex flex-wrap gap-4 text-xs">
      <div v-for="(color, status) in statusColors" :key="status" class="flex items-center gap-1.5">
        <span class="inline-block size-3 rounded-full" :class="color" />
        <span class="text-muted capitalize">{{ status.replace('-', ' ') }}</span>
      </div>
    </div>

    <!-- Loading overlay -->
    <div v-if="loading" class="flex justify-center py-4">
      <USkeleton class="h-4 w-32 rounded" />
    </div>

    <!-- Day detail modal -->
    <!-- Empty state -->
    <div v-if="!loading && contents.length === 0" class="flex flex-col items-center justify-center py-8">
      <UIcon name="i-lucide-calendar-x" class="size-12 text-muted" />
      <p class="mt-3 text-sm text-muted">{{ $t('contents.calendarNoItems') }}</p>
    </div>
  </div>
</template>
