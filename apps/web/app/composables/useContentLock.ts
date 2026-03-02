interface LockStatus {
  id: string;
  contentId: string;
  lockedBy: string;
  expiresAt: string;
  createdAt: string;
  email: string;
}

const HEARTBEAT_INTERVAL = 30_000; // 30 seconds

export function useContentLock() {
  const { apiFetch } = useApi();
  const { t } = useI18n();
  const toast = useToast();

  const lock = ref<LockStatus | null>(null);
  const isLockedByOther = ref(false);
  const lockerEmail = ref('');

  let heartbeatTimer: ReturnType<typeof setInterval> | null = null;
  let currentContentId: string | null = null;

  function stopHeartbeat() {
    if (heartbeatTimer) {
      clearInterval(heartbeatTimer);
      heartbeatTimer = null;
    }
  }

  function startHeartbeat(contentId: string) {
    stopHeartbeat();
    heartbeatTimer = setInterval(async () => {
      try {
        await apiFetch(`/contents/${contentId}/lock/heartbeat`, { method: 'PUT' });
      } catch {
        // Lock lost — stop heartbeat
        stopHeartbeat();
      }
    }, HEARTBEAT_INTERVAL);
  }

  async function acquire(contentId: string) {
    currentContentId = contentId;
    try {
      const res = await apiFetch<{ success: boolean; data: LockStatus }>(`/contents/${contentId}/lock`, {
        method: 'POST',
      });
      lock.value = res.data;
      isLockedByOther.value = false;
      lockerEmail.value = '';
      startHeartbeat(contentId);
      return true;
    } catch (err: unknown) {
      const fetchError = err as { status?: number; data?: { error?: string } };
      if (fetchError.status === 423) {
        // Locked by another user — fetch status to get email
        await fetchStatus(contentId);
        isLockedByOther.value = true;
        toast.add({
          title: t('lock.lockFailed', { email: lockerEmail.value }),
          color: 'warning',
        });
        return false;
      }
      throw err;
    }
  }

  async function release(contentId?: string) {
    const id = contentId ?? currentContentId;
    if (!id) return;
    stopHeartbeat();
    try {
      await apiFetch(`/contents/${id}/lock`, { method: 'DELETE' });
    } catch {
      // Ignore release errors (lock may have already expired)
    }
    lock.value = null;
    currentContentId = null;
  }

  async function fetchStatus(contentId: string) {
    try {
      const res = await apiFetch<{ success: boolean; data: LockStatus | null }>(`/contents/${contentId}/lock`);
      if (res.data) {
        lockerEmail.value = res.data.email;
        isLockedByOther.value = true;
      } else {
        isLockedByOther.value = false;
        lockerEmail.value = '';
      }
      return res.data;
    } catch {
      return null;
    }
  }

  function onSaveSuccess() {
    // Lock auto-released server-side on save, just clean up client state
    stopHeartbeat();
    lock.value = null;
    currentContentId = null;
  }

  onBeforeUnmount(() => {
    release();
  });

  return {
    lock: readonly(lock),
    isLockedByOther: readonly(isLockedByOther),
    lockerEmail: readonly(lockerEmail),
    acquire,
    release,
    fetchStatus,
    onSaveSuccess,
  };
}
