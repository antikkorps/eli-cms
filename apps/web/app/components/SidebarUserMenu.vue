<script setup lang="ts">
defineProps<{ collapsed?: boolean }>();

const { user, logout } = useAuth();
const { userAvatarUrl } = useAvatar();
const { t } = useI18n();
</script>

<template>
  <div v-if="collapsed" class="flex flex-col items-center gap-2 w-full">
    <NuxtLink to="/admin/profile">
      <UAvatar v-if="user?.email" :src="userAvatarUrl(user, 32)" size="xs" />
    </NuxtLink>
    <UButton
      icon="i-lucide-log-out"
      variant="ghost"
      color="error"
      size="xs"
      :aria-label="t('nav.logout')"
      @click="logout"
    />
  </div>

  <div v-else class="space-y-2 w-full">
    <NuxtLink to="/admin/profile" class="flex items-center gap-2 min-w-0 hover:opacity-80 transition-opacity">
      <UAvatar v-if="user?.email" :src="userAvatarUrl(user, 32)" size="xs" class="shrink-0" />
      <span class="text-xs truncate">{{ user?.email }}</span>
    </NuxtLink>
    <div class="flex items-center justify-between">
      <div class="flex items-center gap-1">
        <DarkModeToggle />
        <LocaleSwitcher />
      </div>
      <UButton
        icon="i-lucide-log-out"
        variant="ghost"
        color="error"
        size="xs"
        :aria-label="t('nav.logout')"
        @click="logout"
      />
    </div>
  </div>
</template>
