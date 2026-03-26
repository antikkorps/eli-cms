<script setup lang="ts">
const { t } = useI18n();
const router = useRouter();
const { unreadCount, notifications, loading, fetchNotifications, markRead, markAllRead } = useNotifications();

const open = ref(false);

watch(open, (isOpen) => {
  if (isOpen) fetchNotifications();
});

function timeAgo(dateStr: string): string {
  const now = Date.now();
  const diff = now - new Date(dateStr).getTime();
  const seconds = Math.floor(diff / 1000);
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  return `${days}d`;
}

async function handleClick(notif: (typeof notifications.value)[0]) {
  if (!notif.isRead) await markRead(notif.id);
  if (notif.link) {
    open.value = false;
    router.push(notif.link);
  }
}
</script>

<template>
  <UPopover v-model:open="open">
    <UButton variant="ghost" color="neutral" size="xs" class="relative">
      <UIcon name="i-lucide-bell" class="size-4" />
      <span
        v-if="unreadCount > 0"
        class="absolute -top-0.5 -right-0.5 min-w-4 h-4 flex items-center justify-center rounded-full bg-(--ui-primary) text-white text-[10px] font-bold px-1"
      >
        {{ unreadCount > 99 ? '99+' : unreadCount }}
      </span>
    </UButton>

    <template #content>
      <div class="w-80 max-h-96 flex flex-col">
        <!-- Header -->
        <div class="flex items-center justify-between px-3 py-2 border-b border-(--ui-border)">
          <span class="font-medium text-sm">{{ t('notifications.title') }}</span>
          <UButton v-if="unreadCount > 0" size="xs" variant="ghost" @click="markAllRead">
            {{ t('notifications.markAllRead') }}
          </UButton>
        </div>

        <!-- List -->
        <div class="overflow-y-auto flex-1">
          <div v-if="loading && !notifications.length" class="p-4 text-center text-sm text-(--ui-text-muted)">
            {{ t('common.loading') }}
          </div>
          <div v-else-if="!notifications.length" class="p-4 text-center text-sm text-(--ui-text-muted)">
            {{ t('notifications.noNotifications') }}
          </div>
          <button
            v-for="notif in notifications"
            :key="notif.id"
            type="button"
            class="flex items-start gap-2 w-full px-3 py-2.5 text-left hover:bg-(--ui-bg-elevated) transition-colors border-b border-(--ui-border) last:border-0"
            :class="{ 'bg-(--ui-bg-elevated)/50': !notif.isRead }"
            @click="handleClick(notif)"
          >
            <span v-if="!notif.isRead" class="mt-1.5 w-2 h-2 rounded-full bg-(--ui-primary) shrink-0" />
            <span v-else class="mt-1.5 w-2 h-2 shrink-0" />
            <div class="min-w-0 flex-1">
              <p class="text-sm" :class="{ 'font-medium': !notif.isRead }">
                {{ notif.title }}
              </p>
              <p class="text-xs text-(--ui-text-muted) mt-0.5">
                {{ timeAgo(notif.createdAt) }}
              </p>
            </div>
          </button>
        </div>
      </div>
    </template>
  </UPopover>
</template>
