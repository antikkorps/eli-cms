<script setup lang="ts">
const { apiFetch } = useApi();
const { setToken } = useAuth();

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
    error.value = 'Passwords do not match';
    return;
  }

  if (form.password.length < 6) {
    error.value = 'Password must be at least 6 characters';
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
      body: JSON.stringify(form),
    });

    setToken(res.data.tokens.accessToken);
    navigateTo('/');
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Setup failed';
    error.value = message;
  } finally {
    loading.value = false;
  }
}
</script>

<template>
  <div class="flex items-center justify-center min-h-screen bg-gray-50 dark:bg-gray-950">
    <UCard class="w-full max-w-md">
      <template #header>
        <div class="text-center">
          <h1 class="text-2xl font-bold">Eli CMS</h1>
          <p class="text-sm text-gray-500 mt-1">Create your admin account to get started</p>
        </div>
      </template>

      <form class="space-y-4" @submit.prevent="handleSubmit">
        <UFormField label="Email">
          <UInput
            v-model="form.email"
            type="email"
            placeholder="admin@example.com"
            required
            autofocus
          />
        </UFormField>

        <UFormField label="Password">
          <UInput
            v-model="form.password"
            type="password"
            placeholder="At least 6 characters"
            required
          />
        </UFormField>

        <UFormField label="Confirm password">
          <UInput
            v-model="form.confirmPassword"
            type="password"
            placeholder="Confirm your password"
            required
          />
        </UFormField>

        <UAlert v-if="error" color="error" variant="subtle" :title="error" />

        <UButton type="submit" block :loading="loading">
          Create admin account
        </UButton>
      </form>
    </UCard>
  </div>
</template>
