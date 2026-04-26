interface ContentTypeTemplate {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  icon: string | null;
  fields: Array<Record<string, unknown>>;
  isSystem: boolean;
  createdAt: string;
  updatedAt: string;
}

const state = reactive({
  items: [] as ContentTypeTemplate[],
  loaded: false,
  loading: false,
});

export function useContentTypeTemplates() {
  const { apiFetch } = useApi();

  async function fetch(force = false) {
    if ((state.loaded || state.loading) && !force) return;
    state.loading = true;
    try {
      const res = await apiFetch<{ success: boolean; data: ContentTypeTemplate[] }>(
        '/content-type-templates?limit=100',
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

export type { ContentTypeTemplate };
