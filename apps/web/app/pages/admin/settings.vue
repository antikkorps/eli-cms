<script setup lang="ts">
definePageMeta({
  layout: 'admin',
  middleware: ['auth'],
});

const { apiFetch } = useApi();
const { t } = useI18n();
const toast = useToast();

const form = reactive({
  activeStorage: 'local' as 'local' | 's3',
  s3: {
    bucket: '',
    region: '',
    accessKeyId: '',
    secretAccessKey: '',
    endpoint: '',
  },
});

const loading = ref(true);
const saving = ref(false);

const storageOptions = [
  { label: t('settings.local'), value: 'local' },
  { label: t('settings.s3'), value: 's3' },
];

async function fetchSettings() {
  loading.value = true;
  try {
    const res = await apiFetch<{
      success: boolean;
      data: { activeStorage: 'local' | 's3'; s3?: { bucket: string; region: string; accessKeyId: string; secretAccessKey: string; endpoint?: string } };
    }>('/settings/storage');
    form.activeStorage = res.data.activeStorage;
    if (res.data.s3) {
      form.s3.bucket = res.data.s3.bucket;
      form.s3.region = res.data.s3.region;
      form.s3.accessKeyId = res.data.s3.accessKeyId;
      form.s3.secretAccessKey = res.data.s3.secretAccessKey;
      form.s3.endpoint = res.data.s3.endpoint ?? '';
    }
  } catch {
    // defaults ok
  } finally {
    loading.value = false;
  }
}

async function submit() {
  saving.value = true;
  try {
    const body: Record<string, unknown> = { activeStorage: form.activeStorage };
    if (form.activeStorage === 's3') {
      const s3: Record<string, string> = {
        bucket: form.s3.bucket,
        region: form.s3.region,
        accessKeyId: form.s3.accessKeyId,
        secretAccessKey: form.s3.secretAccessKey,
      };
      if (form.s3.endpoint) s3.endpoint = form.s3.endpoint;
      body.s3 = s3;
    }
    await apiFetch('/settings/storage', { method: 'PUT', body });
    toast.add({ title: t('common.saved'), color: 'success' });
  } catch {
    toast.add({ title: t('common.error'), color: 'error' });
  } finally {
    saving.value = false;
  }
}

onMounted(fetchSettings);
</script>

<template>
  <div class="p-6 space-y-6 max-w-2xl">
    <div>
      <h1 class="text-2xl font-bold">{{ $t('settings.title') }}</h1>
      <p class="text-sm text-muted mt-1">{{ $t('settings.subtitle') }}</p>
    </div>

    <div v-if="loading" class="text-sm text-muted">{{ $t('common.loading') }}</div>

    <form v-else class="space-y-6" @submit.prevent="submit">
      <UCard>
        <template #header>
          <h2 class="font-semibold">{{ $t('settings.storageTitle') }}</h2>
        </template>

        <div class="space-y-4">
          <UFormField :label="$t('settings.activeStorageLabel')">
            <USelect v-model="form.activeStorage" :items="storageOptions" class="w-full" />
          </UFormField>

          <template v-if="form.activeStorage === 's3'">
            <UFormField :label="$t('settings.s3BucketLabel')">
              <UInput v-model="form.s3.bucket" required class="w-full" />
            </UFormField>

            <UFormField :label="$t('settings.s3RegionLabel')">
              <UInput v-model="form.s3.region" required class="w-full" />
            </UFormField>

            <UFormField :label="$t('settings.s3AccessKeyLabel')">
              <UInput v-model="form.s3.accessKeyId" required class="w-full" />
            </UFormField>

            <UFormField :label="$t('settings.s3SecretKeyLabel')">
              <UInput v-model="form.s3.secretAccessKey" type="password" required class="w-full" />
            </UFormField>

            <UFormField :label="$t('settings.s3EndpointLabel')" :hint="$t('settings.s3EndpointHint')">
              <UInput v-model="form.s3.endpoint" class="w-full" />
            </UFormField>
          </template>
        </div>
      </UCard>

      <div class="flex justify-end">
        <UButton type="submit" :loading="saving">
          {{ $t('common.save') }}
        </UButton>
      </div>
    </form>
  </div>
</template>
