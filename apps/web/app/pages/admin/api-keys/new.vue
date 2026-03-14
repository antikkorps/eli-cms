<script setup lang="ts">
definePageMeta({
  layout: 'admin',
  middleware: ['auth'],
});

const { apiFetch } = useApi();
const { t } = useI18n();

const loading = ref(false);
const error = ref('');
const createdKey = ref('');

const form = reactive({
  name: '',
  permissions: [] as string[],
  expiresAt: '',
});

const permissionOptions = [
  'content:create',
  'content:read',
  'content:update',
  'content:delete',
  'content:publish',
  'content-types:create',
  'content-types:read',
  'content-types:update',
  'content-types:delete',
  'users:read',
  'users:delete',
  'uploads:create',
  'uploads:read',
  'uploads:delete',
  'settings:read',
  'settings:update',
  'webhooks:create',
  'webhooks:read',
  'webhooks:update',
  'webhooks:delete',
  'roles:create',
  'roles:read',
  'roles:update',
  'roles:delete',
  'audit-logs:read',
  'api-keys:create',
  'api-keys:read',
  'api-keys:update',
  'api-keys:delete',
];

const copied = ref(false);

async function handleSubmit() {
  error.value = '';

  if (!form.name.trim()) {
    error.value = t('apiKeysNew.errorNameRequired');
    return;
  }
  if (form.permissions.length === 0) {
    error.value = t('apiKeysNew.errorPermissionRequired');
    return;
  }

  loading.value = true;
  try {
    const body: Record<string, unknown> = {
      name: form.name,
      permissions: form.permissions,
    };
    if (form.expiresAt) {
      body.expiresAt = new Date(form.expiresAt).toISOString();
    }

    const res = await apiFetch<{
      success: boolean;
      data: { rawKey: string };
    }>('/api-keys', {
      method: 'POST',
      body,
    });

    createdKey.value = res.data.rawKey;
  } catch (err: unknown) {
    const fetchErr = err as { data?: { error?: string } };
    error.value = fetchErr.data?.error || t('apiKeysNew.errorGeneric');
  } finally {
    loading.value = false;
  }
}

async function copyKey() {
  await navigator.clipboard.writeText(createdKey.value);
  copied.value = true;
  setTimeout(() => {
    copied.value = false;
  }, 2000);
}
</script>

<template>
  <div class="p-6 max-w-2xl space-y-6">
    <div>
      <UButton to="/admin/api-keys" variant="link" icon="i-lucide-arrow-left" size="sm" class="mb-2">
        {{ $t('apiKeysNew.back') }}
      </UButton>
      <h1 class="text-2xl font-bold">{{ $t('apiKeysNew.title') }}</h1>
      <p class="text-sm text-muted mt-1">{{ $t('apiKeysNew.subtitle') }}</p>
    </div>

    <template v-if="createdKey">
      <UAlert
        color="success"
        variant="subtle"
        :title="$t('apiKeysNew.successTitle')"
        :description="$t('apiKeysNew.successDescription')"
        icon="i-lucide-check-circle"
      />

      <UCard>
        <div class="space-y-3">
          <p class="text-sm font-medium">{{ $t('apiKeysNew.yourApiKey') }}</p>
          <div class="flex items-center gap-2">
            <code class="flex-1 p-3 bg-gray-100 dark:bg-gray-800 rounded text-sm font-mono break-all select-all">
              {{ createdKey }}
            </code>
            <UButton
              :icon="copied ? 'i-lucide-check' : 'i-lucide-copy'"
              variant="outline"
              :color="copied ? 'success' : 'neutral'"
              @click="copyKey"
            />
          </div>
        </div>
      </UCard>

      <UButton to="/admin/api-keys" block variant="outline">
        {{ $t('apiKeysNew.back') }}
      </UButton>
    </template>

    <template v-else>
      <form class="space-y-5" @submit.prevent="handleSubmit">
        <UCard>
          <div class="space-y-5">
            <UFormField :label="$t('apiKeysNew.nameLabel')" required>
              <UInput v-model="form.name" :placeholder="$t('apiKeysNew.namePlaceholder')" class="w-full" autofocus />
            </UFormField>

            <UFormField :label="$t('apiKeysNew.permissionsLabel')" required>
              <USelectMenu
                v-model="form.permissions"
                :items="permissionOptions"
                multiple
                :placeholder="$t('apiKeysNew.permissionsPlaceholder')"
                class="w-full max-w-full [&>div]:max-h-24 [&>div]:overflow-y-auto"
              />
            </UFormField>

            <UFormField :label="$t('apiKeysNew.expirationLabel')" :hint="$t('apiKeysNew.expirationHint')">
              <UInput v-model="form.expiresAt" type="date" class="w-full" />
            </UFormField>
          </div>
        </UCard>

        <UAlert v-if="error" color="error" variant="subtle" :title="error" />

        <div class="flex gap-3">
          <UButton type="submit" :loading="loading" icon="i-lucide-key">
            {{ $t('apiKeysNew.submit') }}
          </UButton>
          <UButton to="/admin/api-keys" variant="outline" color="neutral">
            {{ $t('common.cancel') }}
          </UButton>
        </div>
      </form>
    </template>
  </div>
</template>
