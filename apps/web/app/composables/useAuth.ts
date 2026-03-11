interface AuthRole {
  name: string;
  slug: string;
  permissions: string[];
}

interface AuthUser {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  roleId: string;
  avatarStyle: string | null;
  avatarSeed: string | null;
  role: AuthRole;
  createdAt: string;
  updatedAt: string;
}

interface AuthState {
  user: AuthUser | null;
  isAuthenticated: boolean;
}

const state = reactive<AuthState>({
  user: null,
  isAuthenticated: false,
});

function getCsrfToken(): string | undefined {
  if (import.meta.server) return undefined;
  const match = document.cookie.match(/(?:^|;\s*)eli_csrf=([^;]+)/);
  return match?.[1];
}

export function useAuth() {
  const tokenCookie = useCookie('eli_token', { maxAge: 60 * 15 });
  const refreshCookie = useCookie('eli_refresh_token', { maxAge: 60 * 60 * 24 * 7 });
  const config = useRuntimeConfig();
  const baseURL = config.public.apiBase as string;

  function setTokens(accessToken: string, refresh?: string) {
    tokenCookie.value = accessToken;
    if (refresh) {
      refreshCookie.value = refresh;
    }
    state.isAuthenticated = true;
  }

  function clearTokens() {
    tokenCookie.value = null;
    refreshCookie.value = null;
    state.user = null;
    state.isAuthenticated = false;
  }

  const permissions = computed<string[]>(() => {
    return state.user?.role?.permissions ?? [];
  });

  const role = computed<string>(() => {
    return state.user?.role?.slug ?? '';
  });

  function hasPermission(perm: string): boolean {
    const perms = state.user?.role?.permissions ?? [];
    return perms.includes('*') || perms.includes(perm);
  }

  async function login(email: string, password: string) {
    const csrf = getCsrfToken();
    const res = await $fetch<{
      success: boolean;
      data: { accessToken: string; refreshToken: string };
    }>(`${baseURL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...(csrf ? { 'X-CSRF-Token': csrf } : {}) },
      body: { email, password },
    });
    setTokens(res.data.accessToken, res.data.refreshToken);
    await fetchUser();
  }

  async function fetchUser() {
    if (!tokenCookie.value) {
      clearTokens();
      return;
    }
    try {
      const res = await $fetch<{ success: boolean; data: AuthUser }>(`${baseURL}/auth/me`, {
        headers: {
          Authorization: `Bearer ${tokenCookie.value}`,
        },
      });
      state.user = res.data;
      state.isAuthenticated = true;
    } catch {
      clearTokens();
    }
  }

  async function updateProfile(input: { email?: string; firstName?: string | null; lastName?: string | null; avatarStyle?: string | null; avatarSeed?: string | null }) {
    const csrf = getCsrfToken();
    const res = await $fetch<{ success: boolean; data: AuthUser }>(`${baseURL}/auth/profile`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenCookie.value}`,
        ...(csrf ? { 'X-CSRF-Token': csrf } : {}),
      },
      body: input,
    });
    state.user = res.data;
    return res.data;
  }

  async function logout() {
    try {
      if (tokenCookie.value) {
        const csrf = getCsrfToken();
        await $fetch(`${baseURL}/auth/logout`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${tokenCookie.value}`,
            ...(csrf ? { 'X-CSRF-Token': csrf } : {}),
          },
          body: { refreshToken: refreshCookie.value },
        });
      }
    } catch {
      // Ignore logout API errors
    }
    clearTokens();
    navigateTo('/login');
  }

  return {
    user: toRef(state, 'user'),
    isAuthenticated: toRef(state, 'isAuthenticated'),
    permissions,
    role,
    token: tokenCookie,
    setTokens,
    clearTokens,
    hasPermission,
    login,
    fetchUser,
    updateProfile,
    logout,
  };
}
