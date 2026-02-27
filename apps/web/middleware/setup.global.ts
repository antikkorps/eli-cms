let setupChecked = false;
let needsSetup = false;

export default defineNuxtRouteMiddleware(async (to) => {
  // Only run on client side
  if (import.meta.server) return;

  // Don't redirect if already on setup page
  if (to.path === '/setup') return;

  // Cache the check to avoid repeated API calls
  if (!setupChecked) {
    try {
      const res = await $fetch<{ success: boolean; data: { needsSetup: boolean } }>(
        'http://localhost:8080/api/v1/setup/status',
      );
      needsSetup = res.data.needsSetup;
      setupChecked = true;
    } catch {
      // If API is not reachable, don't block navigation
      return;
    }
  }

  if (needsSetup) {
    return navigateTo('/setup');
  }
});
