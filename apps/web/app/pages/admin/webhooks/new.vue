<script setup lang="ts">
definePageMeta({
  layout: 'admin',
  middleware: ['auth'],
});

const { apiFetch } = useApi();
const { t } = useI18n();
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

const form = reactive({
  name: '',
  url: '',
  secret: '',
  events: [] as string[],
  isActive: true,
});

const saving = ref(false);

const eventOptions = webhookEvents.map((e) => ({ label: e, value: e }));

function generateSecret() {
  const array = new Uint8Array(24);
  crypto.getRandomValues(array);
  form.secret = Array.from(array, (b) => b.toString(16).padStart(2, '0')).join('');
}

async function submit() {
  saving.value = true;
  try {
    await apiFetch('/webhooks', {
      method: 'POST',
      body: {
        name: form.name,
        url: form.url,
        secret: form.secret,
        events: form.events,
        isActive: form.isActive,
      },
    });
    toast.add({ title: t('common.created'), color: 'success' });
    router.push('/admin/webhooks');
  } catch {
    toast.add({ title: t('common.error'), color: 'error' });
  } finally {
    saving.value = false;
  }
}
</script>

<template>
  <div class="p-6 space-y-6 max-w-2xl">
    <div class="flex items-center gap-3">
      <UButton to="/admin/webhooks" variant="ghost" icon="i-lucide-arrow-left" size="sm" />
      <div>
        <h1 class="text-2xl font-bold">{{ $t('webhooks.newTitle') }}</h1>
      </div>
    </div>

    <form class="space-y-4" @submit.prevent="submit">
      <UFormField :label="$t('webhooks.nameLabel')">
        <UInput v-model="form.name" :placeholder="$t('webhooks.namePlaceholder')" required class="w-full" />
      </UFormField>

      <UFormField :label="$t('webhooks.urlLabel')" :hint="$t('webhooks.urlHint')">
        <UInput v-model="form.url" :placeholder="$t('webhooks.urlPlaceholder')" type="url" required class="w-full" />
      </UFormField>

      <UFormField :label="$t('webhooks.secretLabel')">
        <div class="flex gap-2">
          <UInput v-model="form.secret" :placeholder="$t('webhooks.secretPlaceholder')" required class="flex-1" />
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
        <UButton type="submit" :loading="saving" :disabled="!form.name || !form.url || !form.secret || !form.events.length">
          {{ $t('common.create') }}
        </UButton>
      </div>
    </form>
  </div>
</template>
