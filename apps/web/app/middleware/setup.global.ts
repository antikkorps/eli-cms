let setupChecked = false;
let needsSetup = false;
let onboardingCompleted = false;

export default defineNuxtRouteMiddleware(async (to) => {
  if (import.meta.server) return;

  if (to.path === '/setup' || to.path === '/onboarding') return;

  if (!setupChecked) {
    try {
      const config = useRuntimeConfig();
      const baseURL = config.public.apiBase as string;
      const res = await $fetch<{ success: boolean; data: { needsSetup: boolean; onboardingCompleted: boolean } }>(
        `${baseURL}/setup/status`,
      );
      needsSetup = res.data.needsSetup;
      onboardingCompleted = res.data.onboardingCompleted;
      setupChecked = true;
    } catch {
      return;
    }
  }

  if (needsSetup) {
    return navigateTo('/setup');
  }

  if (!onboardingCompleted) {
    return navigateTo('/onboarding');
  }
});

export function resetSetupCheck() {
  setupChecked = false;
  needsSetup = false;
  onboardingCompleted = false;
}
