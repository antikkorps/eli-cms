interface ContentTypeItem {
  id: string;
  name: string;
  slug: string;
  fields?: Array<{
    name: string;
    type: string;
    required: boolean;
    label: string;
    options?: string[];
    multiple?: boolean;
  }>;
  contentCount?: number;
}

const state = reactive({
  items: [] as ContentTypeItem[],
  loaded: false,
  loading: false,
});

export function useContentTypes() {
  const { apiFetch } = useApi();

  async function fetch() {
    if (state.loaded || state.loading) return;
    state.loading = true;
    try {
      const res = await apiFetch<{ success: boolean; data: ContentTypeItem[] }>(
        '/content-types?limit=100&includeCounts=true',
      );
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
