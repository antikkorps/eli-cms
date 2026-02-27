export default defineNuxtRouteMiddleware(async () => {
  const { isAuthenticated, fetchUser, token } = useAuth();

  if (!token.value) {
    return navigateTo('/login');
  }

  if (!isAuthenticated.value) {
    await fetchUser();
  }

  if (!isAuthenticated.value) {
    return navigateTo('/login');
  }
});
