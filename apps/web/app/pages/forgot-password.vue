<script setup lang="ts">
definePageMeta({ layout: false });

const { t } = useI18n();
const { apiFetch } = useApi();

const loading = ref(false);
const sent = ref(false);
const error = ref('');
const email = ref('');

async function handleSubmit() {
  error.value = '';
  loading.value = true;

  try {
    await apiFetch('/auth/forgot-password', {
      method: 'POST',
      body: { email: email.value },
    });
    sent.value = true;
  } catch {
    // Always show success to avoid leaking user existence
    sent.value = true;
  } finally {
    loading.value = false;
  }
}
</script>

<template>
  <div class="flex min-h-screen">
    <!-- Left panel — branding -->
    <div class="hidden lg:flex lg:w-1/2 bg-primary items-center justify-center relative overflow-hidden">
      <div
        class="absolute inset-0 bg-gradient-to-br from-primary/90 to-indigo-900 dark:from-primary/80 dark:to-indigo-950"
      />
      <div class="relative z-10 text-center text-white px-12 max-w-md">
        <div class="flex justify-center mb-6">
          <div
            class="flex size-16 items-center justify-center rounded-2xl bg-white/15 backdrop-blur font-bold text-3xl"
          >
            E
          </div>
        </div>
        <h2 class="text-3xl font-bold mb-3">{{ $t('common.appName') }}</h2>
        <p class="text-white/70 text-lg leading-relaxed">
          {{ $t('login.tagline') }}
        </p>
      </div>
      <div class="absolute -top-24 -right-24 size-96 rounded-full bg-white/5" />
      <div class="absolute -bottom-32 -left-32 size-112 rounded-full bg-white/5" />
    </div>

    <!-- Right panel — form -->
    <div class="flex w-full lg:w-1/2 items-center justify-center p-6 bg-gray-50 dark:bg-gray-950 relative">
      <div class="absolute top-4 right-4">
        <LocaleSwitcher />
      </div>

      <div class="w-full max-w-sm space-y-8">
        <div class="text-center lg:hidden">
          <div class="flex justify-center mb-4">
            <div class="flex size-14 items-center justify-center rounded-2xl bg-primary font-bold text-white text-2xl">
              E
            </div>
          </div>
        </div>

        <div>
          <h1 class="text-2xl font-bold tracking-tight">{{ $t('forgotPassword.title') }}</h1>
          <p class="text-sm text-muted mt-1">{{ $t('forgotPassword.subtitle') }}</p>
        </div>

        <template v-if="sent">
          <UAlert color="success" variant="subtle" :title="$t('forgotPassword.success')" icon="i-lucide-mail-check" />
          <div class="text-center">
            <NuxtLink to="/login" class="text-sm text-primary hover:underline">
              {{ $t('forgotPassword.backToLogin') }}
            </NuxtLink>
          </div>
        </template>

        <template v-else>
          <form class="space-y-5" @submit.prevent="handleSubmit">
            <UFormField :label="$t('forgotPassword.emailLabel')">
              <UInput
                v-model="email"
                type="email"
                :placeholder="$t('forgotPassword.emailPlaceholder')"
                icon="i-lucide-mail"
                size="xl"
                required
                autofocus
                class="w-full"
              />
            </UFormField>

            <UAlert v-if="error" color="error" variant="subtle" :title="error" icon="i-lucide-circle-alert" />

            <UButton type="submit" block size="xl" :loading="loading">{{ $t('forgotPassword.submit') }}</UButton>

            <div class="text-center">
              <NuxtLink to="/login" class="text-sm text-primary hover:underline">
                {{ $t('forgotPassword.backToLogin') }}
              </NuxtLink>
            </div>
          </form>
        </template>
      </div>
    </div>
  </div>
</template>
