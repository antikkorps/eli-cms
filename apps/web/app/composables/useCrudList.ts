interface UseCrudListOptions {
  endpoint: string;
  limit?: number;
  filters?: Record<string, Ref<string> | Ref<string | null> | Ref<string | undefined>>;
  defaultSortBy?: string;
  defaultSortOrder?: 'asc' | 'desc';
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

  // Sorting
  const sortBy = ref(options.defaultSortBy ?? 'createdAt');
  const sortOrder = ref<'asc' | 'desc'>(options.defaultSortOrder ?? 'desc');

  // Selection (for bulk actions)
  const selectedIds = ref<Set<string>>(new Set());

  // Delete
  const deleteTarget = ref<T | null>(null) as Ref<T | null>;
  const deleteOpen = ref(false);
  const deleting = ref(false);

  const totalPages = computed(() => Math.ceil(total.value / limit));
  const allSelected = computed(() => items.value.length > 0 && items.value.every((i) => selectedIds.value.has(i.id)));

  let active = true;
  onBeforeUnmount(() => {
    active = false;
  });

  function toggleSort(column: string) {
    if (sortBy.value === column) {
      sortOrder.value = sortOrder.value === 'asc' ? 'desc' : 'asc';
    } else {
      sortBy.value = column;
      sortOrder.value = 'desc';
    }
  }

  function toggleSelect(id: string) {
    const next = new Set(selectedIds.value);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    selectedIds.value = next;
  }

  function selectAll() {
    if (allSelected.value) {
      selectedIds.value = new Set();
    } else {
      selectedIds.value = new Set(items.value.map((i) => i.id));
    }
  }

  function clearSelection() {
    selectedIds.value = new Set();
  }

  async function fetchItems() {
    loading.value = true;
    try {
      const params = new URLSearchParams({
        page: String(page.value),
        limit: String(limit),
        sortBy: sortBy.value,
        sortOrder: sortOrder.value,
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
      clearSelection();
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

  async function bulkAction(action: string, ids?: string[]) {
    const targetIds = ids ?? [...selectedIds.value];
    if (targetIds.length === 0) return;
    try {
      await apiFetch(`${options.endpoint}/bulk-action`, {
        method: 'POST',
        body: { ids: targetIds, action },
      });
      if (!active) return;
      toast.add({ title: t('contents.bulkSuccess'), color: 'success' });
      await fetchItems();
    } catch {
      if (active) toast.add({ title: t('common.error'), color: 'error' });
    }
  }

  // Watch page changes
  watch(page, fetchItems);

  // Watch sort changes — reset page
  watch([sortBy, sortOrder], () => {
    if (page.value !== 1) {
      page.value = 1;
    } else {
      fetchItems();
    }
  });

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
    // Sorting
    sortBy,
    sortOrder,
    toggleSort,
    // Selection
    selectedIds,
    allSelected,
    toggleSelect,
    selectAll,
    clearSelection,
    bulkAction,
  };
}
