interface MediaFolderItem {
  id: string;
  name: string;
  slug: string;
  parentId: string | null;
  children: MediaFolderItem[];
}

const state = reactive({
  tree: [] as MediaFolderItem[],
  loaded: false,
  loading: false,
});

export function useMediaFolders() {
  const { apiFetch } = useApi();

  async function fetch() {
    if (state.loaded || state.loading) return;
    state.loading = true;
    try {
      const res = await apiFetch<{ success: boolean; data: MediaFolderItem[] }>('/media-folders/tree');
      state.tree = res.data;
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

  /** Flatten tree into a list for dropdowns */
  function flatten(nodes?: MediaFolderItem[], depth = 0): Array<{ id: string; name: string; depth: number }> {
    const result: Array<{ id: string; name: string; depth: number }> = [];
    for (const n of nodes ?? state.tree) {
      result.push({ id: n.id, name: n.name, depth });
      if (n.children.length > 0) {
        result.push(...flatten(n.children, depth + 1));
      }
    }
    return result;
  }

  return {
    tree: toRef(state, 'tree'),
    loading: toRef(state, 'loading'),
    loaded: toRef(state, 'loaded'),
    fetch,
    invalidate,
    flatten,
  };
}
