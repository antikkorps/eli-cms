<script setup lang="ts">
const { user, logout } = useAuth();
const { t } = useI18n();
</script>

<template>
  <div class="flex items-center justify-between gap-2">
    <div class="flex items-center gap-2 min-w-0">
      <UAvatar :label="user?.email?.charAt(0).toUpperCase()" size="xs" />
      <span class="text-sm truncate">{{ user?.email }}</span>
    </div>

    <div class="flex items-center shrink-0">
      <LocaleSwitcher />
      <UButton
        icon="i-lucide-log-out"
        variant="ghost"
        color="neutral"
        size="xs"
        :aria-label="t('nav.logout')"
        @click="logout"
      />
    </div>
  </div>
</template>
