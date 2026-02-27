interface UseCrudListOptions {
  endpoint: string;
  limit?: number;
  filters?: Record<string, Ref<string> | Ref<string | null> | Ref<string | undefined>>;
}

export function useCrudList<T extends { id: string }>(options: UseCrudListOptions) {
  const { apiFetch } = useApi();
  const toast = useToast();
  const { t } = useI18n();

  const items = ref<T[]>([]) as Ref<T[]>;
  const loading = ref(true);
  const page = ref(1);
  const total = ref(0);
  const limit = options.limit ?? 20;

  const deleteTarget = ref<T | null>(null) as Ref<T | null>;
  const deleteOpen = ref(false);
  const deleting = ref(false);

  const totalPages = computed(() => Math.ceil(total.value / limit));

  let active = true;
  onBeforeUnmount(() => {
    active = false;
  });

  async function fetchItems() {
    loading.value = true;
    try {
      const params = new URLSearchParams({
        page: String(page.value),
        limit: String(limit),
      });
      if (options.filters) {
        for (const [key, valRef] of Object.entries(options.filters)) {
          const val = unref(valRef);
          if (val) params.set(key, val);
        }
      }
      const res = await apiFetch<{
        success: boolean;
        data: T[];
        meta?: { total: number };
      }>(`${options.endpoint}?${params}`);
      if (!active) return;
      items.value = res.data;
      total.value = res.meta?.total ?? 0;
    } catch {
      if (!active) return;
      items.value = [];
    } finally {
      if (active) loading.value = false;
    }
  }

  function confirmDelete(item: T) {
    deleteTarget.value = item;
    deleteOpen.value = true;
  }

  async function handleDelete() {
    if (!deleteTarget.value) return;
    deleting.value = true;
    try {
      await apiFetch(`${options.endpoint}/${deleteTarget.value.id}`, { method: 'DELETE' });
      if (!active) return;
      deleteOpen.value = false;
      deleteTarget.value = null;
      toast.add({ title: t('common.deleted'), color: 'success' });
      await fetchItems();
    } catch {
      if (active) toast.add({ title: t('common.error'), color: 'error' });
    } finally {
      if (active) deleting.value = false;
    }
  }

  // Watch page changes
  watch(page, fetchItems);

  // Watch filter changes — reset page; if page was already 1, fetch directly
  if (options.filters) {
    const filterRefs = Object.values(options.filters);
    watch(filterRefs, () => {
      if (page.value !== 1) {
        page.value = 1; // triggers the page watcher → fetchItems
      } else {
        fetchItems();
      }
    });
  }

  onMounted(fetchItems);

  return {
    items,
    loading,
    page,
    total,
    limit,
    totalPages,
    fetchItems,
    deleteTarget,
    deleteOpen,
    deleting,
    confirmDelete,
    handleDelete,
  };
}
