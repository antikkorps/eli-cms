/**
 * Stubs for Nuxt auto-imports used by composables.
 * These replace #imports / #app at test time.
 */
import { ref, reactive, computed, toRef, readonly, watch, onMounted, onBeforeUnmount, unref, type Ref } from 'vue';

// Re-export Vue reactivity primitives (Nuxt auto-imports these)
export {
  ref,
  reactive,
  computed,
  toRef,
  readonly,
  watch,
  onMounted,
  onBeforeUnmount,
  unref,
  type Ref,
};

// --- Nuxt runtime stubs ---

const _runtimeConfig = {
  public: {
    apiBase: 'http://localhost:8080/api/v1',
  },
};

export function useRuntimeConfig() {
  return _runtimeConfig;
}

const _cookies: Record<string, Ref<string | null>> = {};

export function useCookie(name: string, _opts?: unknown): Ref<string | null> {
  if (!_cookies[name]) {
    _cookies[name] = ref(null);
  }
  return _cookies[name];
}

/** Reset all cookies between tests */
export function __resetCookies() {
  for (const key of Object.keys(_cookies)) {
    delete _cookies[key];
  }
}

export function navigateTo(_path: string) {
  return _path;
}

export function defineNuxtRouteMiddleware(fn: (...args: unknown[]) => unknown) {
  return fn;
}

export function useColorMode() {
  const value = ref<'light' | 'dark'>('light');
  return {
    value: value.value,
    preference: value.value,
  };
}

// --- i18n stub ---
export function useI18n() {
  return {
    t: (key: string, params?: Record<string, unknown>) => {
      if (params) {
        let result = key;
        for (const [k, v] of Object.entries(params)) {
          result = result.replace(`{${k}}`, String(v));
        }
        return result;
      }
      return key;
    },
    locale: ref('en'),
  };
}

// --- Toast stub ---
const _toasts: Array<{ title: string; color?: string }> = [];

export function useToast() {
  return {
    add: (toast: { title: string; color?: string }) => {
      _toasts.push(toast);
    },
  };
}

export function __getToasts() {
  return _toasts;
}

export function __resetToasts() {
  _toasts.length = 0;
}

// --- $fetch stub (will be mocked per-test) ---
export const $fetch = vi.fn();
