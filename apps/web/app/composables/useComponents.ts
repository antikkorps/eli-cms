interface ComponentItem {
  id: string;
  name: string;
  slug: string;
  icon?: string | null;
  fields: Array<{
    name: string;
    type: string;
    required: boolean;
    label: string;
    options?: string[];
    multiple?: boolean;
  }>;
}

const state = reactive({
  items: [] as ComponentItem[],
  loaded: false,
  loading: false,
});

export function useComponents() {
  const { apiFetch } = useApi();

  async function fetch() {
    if (state.loaded || state.loading) return;
    state.loading = true;
    try {
      const res = await apiFetch<{ success: boolean; data: ComponentItem[] }>('/components?limit=100');
      state.items = res.data;
      state.loaded = true;
    } catch {
      // ignore
    } finally {
      state.loading = false;
    }
  }

  function invalidate() {
    state.loaded = false;
  }

  return {
    items: toRef(state, 'items'),
    loading: toRef(state, 'loading'),
    loaded: toRef(state, 'loaded'),
    fetch,
    invalidate,
  };
}
