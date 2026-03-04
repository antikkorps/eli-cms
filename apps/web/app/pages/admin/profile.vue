<script setup lang="ts">
import type { DiceBearStyle } from '@eli-cms/shared';

definePageMeta({
  layout: 'admin',
  middleware: ['auth'],
});

const { user, updateProfile } = useAuth();
const { apiFetch } = useApi();
const { userAvatarUrl } = useAvatar();
const { t, d } = useI18n();
const toast = useToast();

// Avatar picker
const pickerOpen = ref(false);
const savingAvatar = ref(false);

async function onAvatarConfirm(style: DiceBearStyle, seed: string) {
  savingAvatar.value = true;
  try {
    await updateProfile({ avatarStyle: style, avatarSeed: seed });
    toast.add({ title: t('common.updated'), color: 'success' });
  } catch (err: unknown) {
    const msg = (err as { data?: { error?: string } })?.data?.error || t('common.error');
    toast.add({ title: msg, color: 'error' });
  } finally {
    savingAvatar.value = false;
  }
}

// Email form
const email = ref(user.value?.email ?? '');
const savingEmail = ref(false);

watch(() => user.value?.email, (val) => {
  if (val) email.value = val;
});

async function submitEmail() {
  savingEmail.value = true;
  try {
    await updateProfile({ email: email.value });
    toast.add({ title: t('common.updated'), color: 'success' });
  } catch (err: unknown) {
    const msg = (err as { data?: { error?: string } })?.data?.error || t('common.error');
    toast.add({ title: msg, color: 'error' });
  } finally {
    savingEmail.value = false;
  }
}

// Password form
const passwordForm = reactive({
  currentPassword: '',
  newPassword: '',
  confirmPassword: '',
});
const savingPassword = ref(false);

async function submitPassword() {
  if (passwordForm.newPassword !== passwordForm.confirmPassword) {
    toast.add({ title: t('profile.passwordMismatch'), color: 'error' });
    return;
  }
  savingPassword.value = true;
  try {
    await apiFetch('/auth/change-password', {
      method: 'PUT',
      body: {
        currentPassword: passwordForm.currentPassword,
        newPassword: passwordForm.newPassword,
      },
    });
    toast.add({ title: t('profile.passwordChanged'), color: 'success' });
    passwordForm.currentPassword = '';
    passwordForm.newPassword = '';
    passwordForm.confirmPassword = '';
  } catch (err: unknown) {
    const msg = (err as { data?: { error?: string } })?.data?.error || t('common.error');
    toast.add({ title: msg, color: 'error' });
  } finally {
    savingPassword.value = false;
  }
}

const memberSince = computed(() => {
  if (!user.value?.createdAt) return '';
  return d(new Date(user.value.createdAt), 'short');
});
</script>

<template>
  <div class="p-6 space-y-6 max-w-2xl">
    <div>
      <h1 class="text-2xl font-bold">{{ $t('profile.title') }}</h1>
      <p class="text-sm text-muted mt-1">{{ $t('profile.subtitle') }}</p>
    </div>

    <!-- Avatar Card -->
    <UCard>
      <div class="flex items-center gap-5">
        <div class="relative group">
          <img
            v-if="user"
            :src="userAvatarUrl(user, 128)"
            alt=""
            class="size-24 rounded-full ring-2 ring-default"
          />
          <button
            class="absolute inset-0 flex items-center justify-center rounded-full bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
            :disabled="savingAvatar"
            @click="pickerOpen = true"
          >
            <UIcon name="i-lucide-camera" class="text-white text-xl" />
          </button>
        </div>
        <div class="min-w-0">
          <p class="font-semibold text-lg truncate">{{ user?.email }}</p>
          <p class="text-sm text-muted">{{ user?.role?.name }}</p>
          <p class="text-xs text-muted mt-1">{{ $t('profile.memberSince') }} {{ memberSince }}</p>
        </div>
      </div>
      <template #footer>
        <UButton variant="soft" icon="i-lucide-palette" :loading="savingAvatar" @click="pickerOpen = true">
          {{ $t('profile.changeAvatar') }}
        </UButton>
      </template>
    </UCard>

    <!-- Email Card -->
    <UCard>
      <template #header>
        <div>
          <h2 class="font-semibold">{{ $t('profile.emailSection') }}</h2>
          <p class="text-sm text-muted">{{ $t('profile.emailSubtitle') }}</p>
        </div>
      </template>
      <form class="space-y-4" @submit.prevent="submitEmail">
        <UFormField :label="$t('profile.emailLabel')">
          <UInput v-model="email" type="email" required class="w-full max-w-sm" />
        </UFormField>
        <UButton type="submit" :loading="savingEmail" :disabled="email === user?.email">
          {{ $t('common.save') }}
        </UButton>
      </form>
    </UCard>

    <!-- Password Card -->
    <UCard>
      <template #header>
        <div>
          <h2 class="font-semibold">{{ $t('profile.passwordSection') }}</h2>
          <p class="text-sm text-muted">{{ $t('profile.passwordSubtitle') }}</p>
        </div>
      </template>
      <form class="space-y-4" @submit.prevent="submitPassword">
        <UFormField :label="$t('profile.currentPassword')">
          <UInput v-model="passwordForm.currentPassword" type="password" required class="w-full max-w-sm" />
        </UFormField>
        <UFormField :label="$t('profile.newPassword')">
          <UInput v-model="passwordForm.newPassword" type="password" required minlength="6" class="w-full max-w-sm" />
        </UFormField>
        <UFormField :label="$t('profile.confirmPassword')">
          <UInput v-model="passwordForm.confirmPassword" type="password" required minlength="6" class="w-full max-w-sm" />
        </UFormField>
        <UButton type="submit" :loading="savingPassword" :disabled="!passwordForm.currentPassword || !passwordForm.newPassword || !passwordForm.confirmPassword">
          {{ $t('profile.changePassword') }}
        </UButton>
      </form>
    </UCard>

    <!-- Avatar Picker Modal -->
    <AvatarPicker
      :open="pickerOpen"
      :current-style="user?.avatarStyle ?? null"
      :current-seed="user?.avatarSeed ?? null"
      :email="user?.email ?? ''"
      @update:open="pickerOpen = $event"
      @confirm="onAvatarConfirm"
    />
  </div>
</template>
