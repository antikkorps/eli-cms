interface NotificationItem {
  id: string;
  userId: string;
  type: string;
  title: string;
  body: string | null;
  resourceType: string | null;
  resourceId: string | null;
  isRead: boolean;
  link: string | null;
  createdAt: string;
}

const state = reactive({
  unreadCount: 0,
  notifications: [] as NotificationItem[],
  loading: false,
});

let pollTimer: ReturnType<typeof setInterval> | null = null;
let initialized = false;

export function useNotifications() {
  const { apiFetch } = useApi();
  const { isAuthenticated } = useAuth();

  async function fetchUnreadCount() {
    if (!isAuthenticated.value) return;
    try {
      const res = await apiFetch<{ success: boolean; data: { count: number } }>('/notifications/unread-count');
      state.unreadCount = res.data.count;
    } catch {
      // ignore
    }
  }

  async function fetchNotifications() {
    state.loading = true;
    try {
      const res = await apiFetch<{ success: boolean; data: NotificationItem[] }>('/notifications?limit=20');
      state.notifications = res.data;
    } catch {
      // ignore
    } finally {
      state.loading = false;
    }
  }

  async function markRead(id: string) {
    try {
      await apiFetch(`/notifications/${id}/read`, { method: 'PATCH' });
      const notif = state.notifications.find((n) => n.id === id);
      if (notif && !notif.isRead) {
        notif.isRead = true;
        state.unreadCount = Math.max(0, state.unreadCount - 1);
      }
    } catch {
      // ignore
    }
  }

  async function markAllRead() {
    try {
      await apiFetch('/notifications/read-all', { method: 'PATCH' });
      state.notifications.forEach((n) => (n.isRead = true));
      state.unreadCount = 0;
    } catch {
      // ignore
    }
  }

  function startPolling() {
    if (pollTimer || !import.meta.client) return;
    fetchUnreadCount();
    pollTimer = setInterval(() => {
      if (document.visibilityState === 'visible') {
        fetchUnreadCount();
      }
    }, 30_000);
  }

  function stopPolling() {
    if (pollTimer) {
      clearInterval(pollTimer);
      pollTimer = null;
    }
  }

  // Auto-start polling on first use (client-side only)
  if (import.meta.client && !initialized) {
    initialized = true;
    startPolling();
  }

  return {
    unreadCount: toRef(state, 'unreadCount'),
    notifications: toRef(state, 'notifications'),
    loading: toRef(state, 'loading'),
    fetchUnreadCount,
    fetchNotifications,
    markRead,
    markAllRead,
    startPolling,
    stopPolling,
  };
}
