<script setup lang="ts">
import { resetSetupCheck } from '~/middleware/setup.global';

const { apiFetch } = useApi();
const { setTokens, fetchUser } = useAuth();
const { t } = useI18n();

const loading = ref(false);
const error = ref('');
const form = reactive({
  email: '',
  password: '',
  confirmPassword: '',
});

// Check if setup is still needed
onMounted(async () => {
  try {
    const res = await apiFetch<{ success: boolean; data: { needsSetup: boolean } }>('/setup/status');
    if (!res.data.needsSetup) {
      navigateTo('/');
    }
  } catch {
    // If API is down, stay on the page
  }
});

async function handleSubmit() {
  error.value = '';

  if (form.password !== form.confirmPassword) {
    error.value = t('setup.errorPasswordMismatch');
    return;
  }

  if (form.password.length < 6) {
    error.value = t('setup.errorPasswordLength');
    return;
  }

  loading.value = true;
  try {
    const res = await apiFetch<{
      success: boolean;
      data: {
        user: { id: string; email: string };
        tokens: { accessToken: string; refreshToken: string };
      };
    }>('/setup', {
      method: 'POST',
      body: { email: form.email, password: form.password, confirmPassword: form.confirmPassword },
    });

    setTokens(res.data.tokens.accessToken, res.data.tokens.refreshToken);
    await fetchUser();
    resetSetupCheck();
    navigateTo('/onboarding');
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : t('setup.errorGeneric');
    error.value = message;
  } finally {
    loading.value = false;
  }
}
</script>

<template>
  <div class="flex items-center justify-center min-h-screen bg-gray-50 dark:bg-gray-950 relative">
    <div class="absolute top-4 right-4">
      <LocaleSwitcher />
    </div>

    <UCard class="w-full max-w-md">
      <template #header>
        <div class="text-center">
          <h1 class="text-2xl font-bold">{{ $t('common.appName') }}</h1>
          <p class="text-sm text-gray-500 dark:text-gray-400 mt-1">{{ $t('setup.subtitle') }}</p>
        </div>
      </template>

      <form class="space-y-4" @submit.prevent="handleSubmit">
        <UFormField :label="$t('setup.emailLabel')">
          <UInput
            v-model="form.email"
            type="email"
            :placeholder="$t('setup.emailPlaceholder')"
            required
            autofocus
          />
        </UFormField>

        <UFormField :label="$t('setup.passwordLabel')">
          <UInput
            v-model="form.password"
            type="password"
            :placeholder="$t('setup.passwordPlaceholder')"
            required
          />
        </UFormField>

        <UFormField :label="$t('setup.confirmPasswordLabel')">
          <UInput
            v-model="form.confirmPassword"
            type="password"
            :placeholder="$t('setup.confirmPasswordPlaceholder')"
            required
          />
        </UFormField>

        <UAlert v-if="error" color="error" variant="subtle" :title="error" />

        <UButton type="submit" block :loading="loading">
          {{ $t('setup.submit') }}
        </UButton>
      </form>
    </UCard>
  </div>
</template>
