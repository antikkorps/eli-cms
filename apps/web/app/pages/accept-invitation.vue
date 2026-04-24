<script setup lang="ts">
definePageMeta({ layout: false });

const { t } = useI18n();
const { apiFetch } = useApi();
const route = useRoute();

const token = computed(() => route.query.token as string | undefined);

const verifying = ref(true);
const verifyError = ref('');
const invitation = ref<{ email: string; roleName: string } | null>(null);

const submitting = ref(false);
const submitError = ref('');
const success = ref(false);
const showPassword = ref(false);

const form = reactive({
  firstName: '',
  lastName: '',
  password: '',
});

async function verify() {
  if (!token.value) {
    verifyError.value = t('invitations.accept.invalid');
    verifying.value = false;
    return;
  }
  try {
    const res = await apiFetch<{ success: boolean; data: { email: string; roleName: string } }>(
      `/invitations/verify?token=${encodeURIComponent(token.value)}`,
    );
    invitation.value = res.data;
  } catch {
    verifyError.value = t('invitations.accept.invalid');
  } finally {
    verifying.value = false;
  }
}

async function handleSubmit() {
  submitError.value = '';
  if (!token.value) {
    submitError.value = t('invitations.accept.invalid');
    return;
  }
  submitting.value = true;
  try {
    await apiFetch('/invitations/accept', {
      method: 'POST',
      body: {
        token: token.value,
        password: form.password,
        firstName: form.firstName || undefined,
        lastName: form.lastName || undefined,
      },
    });
    success.value = true;
  } catch (err: unknown) {
    const msg = (err as { data?: { error?: string } }).data?.error;
    submitError.value = msg || t('invitations.accept.invalid');
  } finally {
    submitting.value = false;
  }
}

onMounted(verify);
</script>

<template>
  <div class="flex min-h-screen">
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
          <h1 class="text-2xl font-bold tracking-tight">{{ $t('invitations.accept.title') }}</h1>
          <p class="text-sm text-muted mt-1">{{ $t('invitations.accept.subtitle') }}</p>
        </div>

        <div v-if="verifying" class="flex items-center gap-2 text-sm text-muted">
          <UIcon name="i-lucide-loader-2" class="animate-spin" />
          {{ $t('invitations.accept.verifying') }}
        </div>

        <UAlert
          v-else-if="verifyError"
          color="error"
          variant="subtle"
          :title="verifyError"
          icon="i-lucide-circle-alert"
        />

        <template v-else-if="success">
          <UAlert
            color="success"
            variant="subtle"
            :title="$t('invitations.accept.success')"
            icon="i-lucide-check-circle"
          />
          <div class="text-center">
            <NuxtLink to="/login" class="text-sm text-primary hover:underline">
              {{ $t('resetPassword.backToLogin') }}
            </NuxtLink>
          </div>
        </template>

        <template v-else-if="invitation">
          <div class="rounded-lg border border-default p-3 text-sm">
            <div class="font-medium">{{ invitation.email }}</div>
            <div class="text-muted">
              {{ $t('invitations.accept.roleHint', { role: invitation.roleName }) }}
            </div>
          </div>

          <form class="space-y-5" @submit.prevent="handleSubmit">
            <div class="grid grid-cols-2 gap-3">
              <UFormField :label="$t('invitations.accept.firstNameLabel')">
                <UInput
                  v-model="form.firstName"
                  :placeholder="$t('invitations.accept.firstNamePlaceholder')"
                  size="xl"
                  class="w-full"
                />
              </UFormField>
              <UFormField :label="$t('invitations.accept.lastNameLabel')">
                <UInput
                  v-model="form.lastName"
                  :placeholder="$t('invitations.accept.lastNamePlaceholder')"
                  size="xl"
                  class="w-full"
                />
              </UFormField>
            </div>

            <UFormField :label="$t('invitations.accept.passwordLabel')">
              <UInput
                v-model="form.password"
                :type="showPassword ? 'text' : 'password'"
                :placeholder="$t('invitations.accept.passwordPlaceholder')"
                icon="i-lucide-lock"
                size="xl"
                required
                minlength="6"
                autofocus
                class="w-full"
              >
                <template #trailing>
                  <UButton
                    :icon="showPassword ? 'i-lucide-eye-off' : 'i-lucide-eye'"
                    variant="link"
                    color="neutral"
                    size="xs"
                    :padded="false"
                    @click="showPassword = !showPassword"
                  />
                </template>
              </UInput>
            </UFormField>

            <UAlert
              v-if="submitError"
              color="error"
              variant="subtle"
              :title="submitError"
              icon="i-lucide-circle-alert"
            />

            <UButton type="submit" block size="xl" :loading="submitting" :disabled="form.password.length < 6">
              {{ $t('invitations.accept.submit') }}
            </UButton>
          </form>
        </template>
      </div>
    </div>
  </div>
</template>
