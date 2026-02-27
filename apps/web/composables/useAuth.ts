interface AuthUser {
  id: string;
  email: string;
  roleId: string;
}

interface AuthState {
  user: AuthUser | null;
  isAuthenticated: boolean;
}

const state = reactive<AuthState>({
  user: null,
  isAuthenticated: false,
});

export function useAuth() {
  const token = useCookie('eli_token', { maxAge: 60 * 60 * 24 * 7 });
  const { apiFetch } = useApi();

  function setToken(newToken: string) {
    token.value = newToken;
    state.isAuthenticated = true;
  }

  function clearToken() {
    token.value = null;
    state.user = null;
    state.isAuthenticated = false;
  }

  async function login(email: string, password: string) {
    const res = await apiFetch<{ success: boolean; data: { accessToken: string; refreshToken: string } }>(
      '/auth/login',
      { method: 'POST', body: JSON.stringify({ email, password }) },
    );
    setToken(res.data.accessToken);
    await fetchUser();
  }

  async function fetchUser() {
    try {
      const res = await apiFetch<{ success: boolean; data: AuthUser }>('/auth/me');
      state.user = res.data;
      state.isAuthenticated = true;
    } catch {
      clearToken();
    }
  }

  function logout() {
    clearToken();
    navigateTo('/');
  }

  return {
    user: toRef(state, 'user'),
    isAuthenticated: toRef(state, 'isAuthenticated'),
    token,
    setToken,
    clearToken,
    login,
    fetchUser,
    logout,
  };
}
