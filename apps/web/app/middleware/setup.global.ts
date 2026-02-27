let setupChecked = false;
let needsSetup = false;

export default defineNuxtRouteMiddleware(async (to) => {
  if (import.meta.server) return;

  if (to.path === '/setup') return;

  if (!setupChecked) {
    try {
      const config = useRuntimeConfig();
      const baseURL = config.public.apiBase as string;
      const res = await $fetch<{ success: boolean; data: { needsSetup: boolean } }>(
        `${baseURL}/setup/status`,
      );
      needsSetup = res.data.needsSetup;
      setupChecked = true;
    } catch {
      return;
    }
  }

  if (needsSetup) {
    return navigateTo('/setup');
  }
});
