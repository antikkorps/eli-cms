/**
 * Vitest global setup — runs before every test file.
 *
 * - Stubs Nuxt auto-imports globally so composables resolve
 *   useRuntimeConfig, useCookie, navigateTo, etc.
 * - Provides a global $fetch mock.
 */
import { vi } from 'vitest';
import {
  ref,
  reactive,
  computed,
  toRef,
  readonly,
  watch,
  onMounted,
  onBeforeUnmount,
  unref,
} from 'vue';
import {
  useRuntimeConfig,
  useCookie,
  navigateTo,
  useI18n,
  useToast,
  useColorMode,
  $fetch as $fetchStub,
  __resetCookies,
  __resetToasts,
} from './nuxt-stubs.js';

// ⚠️ Globals MUST be set BEFORE importing composables,
// because composables like useAuth have module-level `reactive()` calls
// that run immediately on import.
Object.assign(globalThis, {
  ref,
  reactive,
  computed,
  toRef,
  readonly,
  watch,
  onMounted,
  onBeforeUnmount,
  unref,
  useRuntimeConfig,
  useCookie,
  navigateTo,
  useI18n,
  useToast,
  useColorMode,
  $fetch: $fetchStub,
});

// Now safe to import composables that use Nuxt auto-imports at module level
const { useApi } = await import('~/composables/useApi.js');
const { useAuth } = await import('~/composables/useAuth.js');

Object.assign(globalThis, {
  useApi,
  useAuth,
});

// Stub import.meta.server / import.meta.client
Object.defineProperty(import.meta, 'server', { value: false, writable: true });
Object.defineProperty(import.meta, 'client', { value: true, writable: true });

// Reset state between tests
beforeEach(() => {
  vi.clearAllMocks();
  __resetCookies();
  __resetToasts();
});
