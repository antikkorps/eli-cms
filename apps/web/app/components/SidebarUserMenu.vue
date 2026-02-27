<script setup lang="ts">
defineProps<{ collapsed?: boolean }>();

const { user, logout } = useAuth();
const { t } = useI18n();
</script>

<template>
  <div v-if="collapsed" class="flex flex-col items-center gap-2 w-full">
    <UAvatar :text="user?.email?.charAt(0).toUpperCase()" size="xs" />
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
    <div class="flex items-center gap-2 min-w-0">
      <UAvatar :text="user?.email?.charAt(0).toUpperCase()" size="xs" class="shrink-0" />
      <span class="text-xs truncate">{{ user?.email }}</span>
    </div>
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
