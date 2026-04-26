import { reactive, readonly } from 'vue';

interface I18nConfigState {
  defaultLocale: string;
  locales: string[];
  loaded: boolean;
}

const state = reactive<I18nConfigState>({
  defaultLocale: 'en',
  locales: ['en'],
  loaded: false,
});

let inflight: Promise<void> | null = null;

export function useI18nConfig() {
  const { apiFetch } = useApi();

  async function fetch(force = false): Promise<void> {
    if (state.loaded && !force) return;
    if (inflight) return inflight;
    inflight = (async () => {
      try {
        const res = await apiFetch<{ success: boolean; data: { defaultLocale: string; locales: string[] } }>(
          '/settings/i18n',
        );
        if (res.data) {
          state.defaultLocale = res.data.defaultLocale;
          state.locales = [...res.data.locales];
        }
      } catch {
        // fall back to defaults
      } finally {
        state.loaded = true;
        inflight = null;
      }
    })();
    return inflight;
  }

  function invalidate(): void {
    state.loaded = false;
  }

  return { state: readonly(state), fetch, invalidate };
}
