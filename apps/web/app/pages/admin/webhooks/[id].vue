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
  attempts: number;
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

const eventOptions = webhookEvents.map((e) => ({ label: e, value: e }));

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
      toast.add({ title: t('webhooks.testFailed', { error: errorMessage || `HTTP ${responseStatus}` }), color: 'error' });
    }
    // Refresh deliveries if on that tab
    if (activeTab.value === 'deliveries') await fetchDeliveries();
  } catch {
    toast.add({ title: t('common.error'), color: 'error' });
  } finally {
    testing.value = false;
  }
}

const UBadge = resolveComponent('UBadge');

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
    accessorKey: 'attempts',
    header: t('webhooks.deliveryAttempts'),
  },
  {
    accessorKey: 'createdAt',
    header: t('webhooks.deliveryDate'),
    cell: ({ row }: { row: { original: WebhookDelivery } }) =>
      new Date(row.original.createdAt).toLocaleString(locale.value),
  },
]);

watch(activeTab, (tab) => {
  if (tab === 'deliveries' && !deliveries.value.length) {
    fetchDeliveries();
  }
});

watch(deliveryPage, fetchDeliveries);

onMounted(fetchWebhook);
</script>

<template>
  <div class="p-6 space-y-6 max-w-2xl">
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
          <UButton
            type="button"
            variant="outline"
            icon="i-lucide-send"
            :loading="testing"
            @click="testWebhook"
          >
            {{ $t('webhooks.testDelivery') }}
          </UButton>
          <UButton type="submit" :loading="saving" :disabled="!form.name || !form.url || !form.events.length">
            {{ $t('common.save') }}
          </UButton>
        </div>
      </form>

      <div v-else-if="activeTab === 'deliveries'" class="space-y-4">
        <UTable :data="deliveries" :columns="deliveryColumns" :loading="loadingDeliveries" />

        <div v-if="Math.ceil(deliveryTotal / 20) > 1" class="flex justify-end">
          <UPagination v-model="deliveryPage" :total="deliveryTotal" :items-per-page="20" />
        </div>
      </div>
    </div>
  </div>
</template>
