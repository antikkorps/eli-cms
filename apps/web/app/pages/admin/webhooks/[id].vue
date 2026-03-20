<script setup lang="ts">
import { h, resolveComponent } from 'vue';

definePageMeta({
  layout: 'admin',
  middleware: ['auth'],
});

const route = useRoute();
const { apiFetch } = useApi();
const { t, locale } = useI18n();
const toast = useToast();
const router = useRouter();

const webhookEvents = [
  'content.created',
  'content.updated',
  'content.deleted',
  'content.published',
  'content_type.created',
  'content_type.updated',
  'content_type.deleted',
  'media.uploaded',
  'media.deleted',
];

interface WebhookDelivery {
  id: string;
  event: string;
  status: string;
  responseStatus: number | null;
  attempts: number;
  nextRetryAt: string | null;
  payload: Record<string, unknown>;
  createdAt: string;
}

const form = reactive({
  name: '',
  url: '',
  secret: '',
  events: [] as string[],
  isActive: true,
});

const loading = ref(true);
const saving = ref(false);
const testing = ref(false);
const activeTab = ref('settings');
const deliveries = ref<WebhookDelivery[]>([]);
const loadingDeliveries = ref(false);
const deliveryPage = ref(1);
const deliveryTotal = ref(0);
const statusFilter = ref<string | undefined>(undefined);
const retryingId = ref<string | null>(null);
const detailDelivery = ref<WebhookDelivery | null>(null);
const showDetailModal = ref(false);

const eventOptions = webhookEvents.map((e) => ({ label: e, value: e }));

const statusOptions = computed(() => [
  { label: t('common.all'), value: undefined },
  { label: t('webhooks.success'), value: 'success' },
  { label: t('webhooks.failed'), value: 'failed' },
  { label: t('webhooks.pending'), value: 'pending' },
]);

const tabs = computed(() => [
  { label: t('webhooks.settingsTab'), value: 'settings' },
  { label: t('webhooks.deliveriesTab'), value: 'deliveries' },
]);

function generateSecret() {
  const array = new Uint8Array(24);
  crypto.getRandomValues(array);
  form.secret = Array.from(array, (b) => b.toString(16).padStart(2, '0')).join('');
}

async function fetchWebhook() {
  loading.value = true;
  try {
    const res = await apiFetch<{
      success: boolean;
      data: { id: string; name: string; url: string; secret: string; events: string[]; isActive: boolean };
    }>(`/webhooks/${route.params.id}`);
    form.name = res.data.name;
    form.url = res.data.url;
    form.secret = '';
    form.events = res.data.events;
    form.isActive = res.data.isActive;
  } catch {
    toast.add({ title: t('common.error'), color: 'error' });
    router.push('/admin/webhooks');
  } finally {
    loading.value = false;
  }
}

async function fetchDeliveries() {
  loadingDeliveries.value = true;
  try {
    const params = new URLSearchParams({
      page: String(deliveryPage.value),
      limit: '20',
    });
    if (statusFilter.value) params.set('status', statusFilter.value);
    const res = await apiFetch<{
      success: boolean;
      data: WebhookDelivery[];
      meta?: { total: number };
    }>(`/webhooks/${route.params.id}/deliveries?${params}`);
    deliveries.value = res.data;
    deliveryTotal.value = res.meta?.total ?? 0;
  } catch {
    // ignore
  } finally {
    loadingDeliveries.value = false;
  }
}

async function submit() {
  saving.value = true;
  try {
    const body: Record<string, unknown> = {
      name: form.name,
      url: form.url,
      events: form.events,
      isActive: form.isActive,
    };
    if (form.secret) body.secret = form.secret;
    await apiFetch(`/webhooks/${route.params.id}`, { method: 'PUT', body });
    toast.add({ title: t('common.updated'), color: 'success' });
    router.push('/admin/webhooks');
  } catch {
    toast.add({ title: t('common.error'), color: 'error' });
  } finally {
    saving.value = false;
  }
}

async function testWebhook() {
  testing.value = true;
  try {
    const res = await apiFetch<{
      success: boolean;
      data: { delivery: { status: string }; responseStatus: number | null; errorMessage: string | null };
    }>(`/webhooks/${route.params.id}/test`, { method: 'POST' });
    const { delivery, responseStatus, errorMessage } = res.data;
    if (delivery.status === 'success') {
      toast.add({ title: t('webhooks.testSuccess', { status: responseStatus }), color: 'success' });
    } else {
      toast.add({
        title: t('webhooks.testFailed', { error: errorMessage || `HTTP ${responseStatus}` }),
        color: 'error',
      });
    }
    // Refresh deliveries if on that tab
    if (activeTab.value === 'deliveries') await fetchDeliveries();
  } catch {
    toast.add({ title: t('common.error'), color: 'error' });
  } finally {
    testing.value = false;
  }
}

async function retryDelivery(delivery: WebhookDelivery) {
  retryingId.value = delivery.id;
  try {
    const res = await apiFetch<{
      success: boolean;
      data: WebhookDelivery;
    }>(`/webhooks/${route.params.id}/deliveries/${delivery.id}/retry`, { method: 'POST' });
    // Update the delivery in the list
    const idx = deliveries.value.findIndex((d) => d.id === delivery.id);
    if (idx !== -1) deliveries.value[idx] = res.data;
    const statusMsg = res.data.status === 'success' ? t('webhooks.retrySuccess') : t('webhooks.retryFailed');
    toast.add({
      title: statusMsg,
      color: res.data.status === 'success' ? 'success' : 'error',
    });
  } catch {
    toast.add({ title: t('common.error'), color: 'error' });
  } finally {
    retryingId.value = null;
  }
}

function openDetail(delivery: WebhookDelivery) {
  detailDelivery.value = delivery;
  showDetailModal.value = true;
}

const UBadge = resolveComponent('UBadge');
const UButton = resolveComponent('UButton');

const deliveryColumns = computed(() => [
  {
    accessorKey: 'event',
    header: t('webhooks.deliveryEvent'),
    cell: ({ row }: { row: { original: WebhookDelivery } }) => {
      return h(
        UBadge as ReturnType<typeof resolveComponent>,
        { variant: 'subtle', size: 'sm' },
        () => row.original.event,
      );
    },
  },
  {
    accessorKey: 'status',
    header: t('webhooks.deliveryStatus'),
    cell: ({ row }: { row: { original: WebhookDelivery } }) => {
      const colors: Record<string, string> = { success: 'success', failed: 'error', pending: 'warning' };
      const labels: Record<string, string> = {
        success: t('webhooks.success'),
        failed: t('webhooks.failed'),
        pending: t('webhooks.pending'),
      };
      return h(
        UBadge as ReturnType<typeof resolveComponent>,
        {
          variant: 'subtle',
          color: (colors[row.original.status] || 'neutral') as 'success' | 'error' | 'warning' | 'neutral',
          size: 'sm',
        },
        () => labels[row.original.status] || row.original.status,
      );
    },
  },
  {
    accessorKey: 'responseStatus',
    header: t('webhooks.deliveryResponseStatus'),
    cell: ({ row }: { row: { original: WebhookDelivery } }) => {
      const code = row.original.responseStatus;
      if (!code) return '—';
      const color = code >= 200 && code < 300 ? 'success' : 'error';
      return h(UBadge as ReturnType<typeof resolveComponent>, { variant: 'subtle', color, size: 'sm' }, () =>
        String(code),
      );
    },
  },
  {
    accessorKey: 'attempts',
    header: t('webhooks.deliveryAttempts'),
    cell: ({ row }: { row: { original: WebhookDelivery } }) => `${row.original.attempts}/3`,
  },
  {
    accessorKey: 'createdAt',
    header: t('webhooks.deliveryDate'),
    cell: ({ row }: { row: { original: WebhookDelivery } }) =>
      new Date(row.original.createdAt).toLocaleString(locale.value),
  },
  {
    id: 'actions',
    header: '',
    cell: ({ row }: { row: { original: WebhookDelivery } }) => {
      const buttons = [];
      buttons.push(
        h(UButton as ReturnType<typeof resolveComponent>, {
          variant: 'ghost',
          color: 'neutral',
          icon: 'i-lucide-eye',
          size: 'xs',
          onClick: () => openDetail(row.original),
        }),
      );
      if (row.original.status === 'failed') {
        buttons.push(
          h(UButton as ReturnType<typeof resolveComponent>, {
            variant: 'ghost',
            color: 'primary',
            icon: 'i-lucide-refresh-cw',
            size: 'xs',
            loading: retryingId.value === row.original.id,
            onClick: () => retryDelivery(row.original),
          }),
        );
      }
      return h('div', { class: 'flex gap-1' }, buttons);
    },
  },
]);

watch(activeTab, (tab) => {
  if (tab === 'deliveries' && !deliveries.value.length) {
    fetchDeliveries();
  }
});

watch(deliveryPage, fetchDeliveries);
watch(statusFilter, () => {
  deliveryPage.value = 1;
  fetchDeliveries();
});

onMounted(fetchWebhook);
</script>

<template>
  <div class="p-6 space-y-6 max-w-3xl">
    <div class="flex items-center gap-3">
      <UButton to="/admin/webhooks" variant="ghost" icon="i-lucide-arrow-left" size="sm" />
      <div>
        <h1 class="text-2xl font-bold">{{ $t('webhooks.editTitle') }}</h1>
      </div>
    </div>

    <div v-if="loading" class="text-sm text-muted">{{ $t('common.loading') }}</div>

    <div v-else class="space-y-6">
      <UTabs v-model="activeTab" :items="tabs" />

      <form v-if="activeTab === 'settings'" class="space-y-4" @submit.prevent="submit">
        <UFormField :label="$t('webhooks.nameLabel')">
          <UInput v-model="form.name" :placeholder="$t('webhooks.namePlaceholder')" required class="w-full" />
        </UFormField>

        <UFormField :label="$t('webhooks.urlLabel')" :hint="$t('webhooks.urlHint')">
          <UInput v-model="form.url" :placeholder="$t('webhooks.urlPlaceholder')" type="url" required class="w-full" />
        </UFormField>

        <UFormField :label="$t('webhooks.secretLabel')">
          <div class="flex gap-2">
            <UInput v-model="form.secret" :placeholder="$t('webhooks.secretPlaceholder')" class="flex-1" />
            <UButton type="button" variant="outline" @click="generateSecret">
              {{ $t('webhooks.generateSecret') }}
            </UButton>
          </div>
        </UFormField>

        <UFormField :label="$t('webhooks.eventsLabel')">
          <USelectMenu
            v-model="form.events"
            :items="eventOptions"
            multiple
            value-key="value"
            :placeholder="$t('webhooks.eventsPlaceholder')"
            class="w-full"
          />
        </UFormField>

        <UFormField :label="$t('webhooks.activeLabel')">
          <USwitch v-model="form.isActive" />
        </UFormField>

        <div class="flex justify-end gap-2">
          <UButton to="/admin/webhooks" variant="ghost" color="neutral">
            {{ $t('common.cancel') }}
          </UButton>
          <UButton type="button" variant="outline" icon="i-lucide-send" :loading="testing" @click="testWebhook">
            {{ $t('webhooks.testDelivery') }}
          </UButton>
          <UButton type="submit" :loading="saving" :disabled="!form.name || !form.url || !form.events.length">
            {{ $t('common.save') }}
          </UButton>
        </div>
      </form>

      <div v-else-if="activeTab === 'deliveries'" class="space-y-4">
        <div class="flex items-center justify-between gap-4">
          <USelectMenu
            v-model="statusFilter"
            :items="statusOptions"
            value-key="value"
            class="w-48"
            :placeholder="$t('webhooks.filterByStatus')"
          />
          <UButton variant="outline" icon="i-lucide-send" :loading="testing" size="sm" @click="testWebhook">
            {{ $t('webhooks.testDelivery') }}
          </UButton>
        </div>

        <UTable :data="deliveries" :columns="deliveryColumns" :loading="loadingDeliveries" />

        <div v-if="Math.ceil(deliveryTotal / 20) > 1" class="flex justify-end">
          <UPagination v-model="deliveryPage" :total="deliveryTotal" :items-per-page="20" />
        </div>
      </div>
    </div>

    <!-- Delivery Detail Modal -->
    <UModal v-model:open="showDetailModal">
      <template #content>
        <div v-if="detailDelivery" class="p-6 space-y-4">
          <div class="flex items-center justify-between">
            <h2 class="text-lg font-semibold">{{ $t('webhooks.deliveryDetail') }}</h2>
            <UButton variant="ghost" icon="i-lucide-x" size="xs" @click="showDetailModal = false" />
          </div>

          <div class="grid grid-cols-2 gap-3 text-sm">
            <div>
              <span class="text-gray-500 dark:text-gray-400">{{ $t('webhooks.deliveryEvent') }}</span>
              <div class="mt-1">
                <UBadge variant="subtle" size="sm">{{ detailDelivery.event }}</UBadge>
              </div>
            </div>
            <div>
              <span class="text-gray-500 dark:text-gray-400">{{ $t('webhooks.deliveryStatus') }}</span>
              <div class="mt-1">
                <UBadge
                  variant="subtle"
                  size="sm"
                  :color="
                    detailDelivery.status === 'success'
                      ? 'success'
                      : detailDelivery.status === 'failed'
                        ? 'error'
                        : 'warning'
                  "
                >
                  {{
                    detailDelivery.status === 'success'
                      ? $t('webhooks.success')
                      : detailDelivery.status === 'failed'
                        ? $t('webhooks.failed')
                        : $t('webhooks.pending')
                  }}
                </UBadge>
              </div>
            </div>
            <div>
              <span class="text-gray-500 dark:text-gray-400">{{ $t('webhooks.deliveryResponseStatus') }}</span>
              <div class="mt-1 font-mono">{{ detailDelivery.responseStatus ?? '—' }}</div>
            </div>
            <div>
              <span class="text-gray-500 dark:text-gray-400">{{ $t('webhooks.deliveryAttempts') }}</span>
              <div class="mt-1">{{ detailDelivery.attempts }}/3</div>
            </div>
            <div>
              <span class="text-gray-500 dark:text-gray-400">{{ $t('webhooks.deliveryDate') }}</span>
              <div class="mt-1">{{ new Date(detailDelivery.createdAt).toLocaleString(locale) }}</div>
            </div>
            <div v-if="detailDelivery.nextRetryAt">
              <span class="text-gray-500 dark:text-gray-400">{{ $t('webhooks.nextRetry') }}</span>
              <div class="mt-1">{{ new Date(detailDelivery.nextRetryAt).toLocaleString(locale) }}</div>
            </div>
          </div>

          <div>
            <span class="text-sm text-gray-500 dark:text-gray-400">{{ $t('webhooks.payload') }}</span>
            <pre class="mt-1 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg text-xs overflow-auto max-h-64 font-mono">{{
              JSON.stringify(detailDelivery.payload, null, 2)
            }}</pre>
          </div>

          <div v-if="detailDelivery.status === 'failed'" class="flex justify-end">
            <UButton
              icon="i-lucide-refresh-cw"
              :loading="retryingId === detailDelivery.id"
              @click="retryDelivery(detailDelivery)"
            >
              {{ $t('webhooks.retry') }}
            </UButton>
          </div>
        </div>
      </template>
    </UModal>
  </div>
</template>
