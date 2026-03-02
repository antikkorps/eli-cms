const state = reactive({
  count: 0,
  loaded: false,
  loading: false,
});

export function useTrashCount() {
  const { apiFetch } = useApi();

  async function fetch() {
    if (state.loaded || state.loading) return;
    state.loading = true;
    try {
      const res = await apiFetch<{ success: boolean; data: { count: number } }>(
        '/contents/trash/count',
      );
      state.count = res.data.count;
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
    count: toRef(state, 'count'),
    loading: toRef(state, 'loading'),
    fetch,
    invalidate,
  };
}
