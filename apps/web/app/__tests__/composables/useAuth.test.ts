import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useAuth } from '~/composables/useAuth.js';

describe('useAuth', () => {
  beforeEach(() => {
    const auth = useAuth();
    auth.clearTokens();
  });

  it('starts unauthenticated', () => {
    const { isAuthenticated, user } = useAuth();
    expect(isAuthenticated.value).toBe(false);
    expect(user.value).toBeNull();
  });

  it('setTokens marks as authenticated', () => {
    const { setTokens, isAuthenticated, token } = useAuth();
    setTokens('access-123', 'refresh-456');
    expect(isAuthenticated.value).toBe(true);
    expect(token.value).toBe('access-123');
  });

  it('clearTokens resets everything', () => {
    const { setTokens, clearTokens, isAuthenticated, user, token } = useAuth();
    setTokens('access-123', 'refresh-456');
    clearTokens();
    expect(isAuthenticated.value).toBe(false);
    expect(user.value).toBeNull();
    expect(token.value).toBeNull();
  });

  it('hasPermission returns false when no user', () => {
    const { hasPermission } = useAuth();
    expect(hasPermission('content:read')).toBe(false);
  });

  it('hasPermission checks user permissions', () => {
    const auth = useAuth();
    // Simulate a logged-in user by directly setting state
    auth.setTokens('tok');
    // @ts-expect-error -- accessing internal for testing
    auth.user.value = {
      id: '1',
      email: 'test@test.com',
      firstName: null,
      lastName: null,
      roleId: 'r1',
      avatarStyle: null,
      avatarSeed: null,
      role: { name: 'Editor', slug: 'editor', permissions: ['content:read', 'content:create'] },
      createdAt: '',
      updatedAt: '',
    };

    expect(auth.hasPermission('content:read')).toBe(true);
    expect(auth.hasPermission('content:delete')).toBe(false);
  });

  it('hasPermission returns true for wildcard *', () => {
    const auth = useAuth();
    auth.setTokens('tok');
    // @ts-expect-error -- accessing internal for testing
    auth.user.value = {
      id: '1',
      email: 'admin@test.com',
      firstName: null,
      lastName: null,
      roleId: 'r1',
      avatarStyle: null,
      avatarSeed: null,
      role: { name: 'Super Admin', slug: 'super-admin', permissions: ['*'] },
      createdAt: '',
      updatedAt: '',
    };

    expect(auth.hasPermission('anything:here')).toBe(true);
  });

  it('permissions computed returns role permissions', () => {
    const auth = useAuth();
    auth.setTokens('tok');
    // @ts-expect-error -- accessing internal for testing
    auth.user.value = {
      id: '1',
      email: 'test@test.com',
      firstName: null,
      lastName: null,
      roleId: 'r1',
      avatarStyle: null,
      avatarSeed: null,
      role: { name: 'Editor', slug: 'editor', permissions: ['content:read'] },
      createdAt: '',
      updatedAt: '',
    };

    expect(auth.permissions.value).toEqual(['content:read']);
    expect(auth.role.value).toBe('editor');
  });

  it('login calls API and sets tokens', async () => {
    const mockFetch = vi.mocked($fetch);
    mockFetch.mockResolvedValueOnce({
      success: true,
      data: { accessToken: 'new-access', refreshToken: 'new-refresh' },
    });
    // Mock fetchUser call
    mockFetch.mockResolvedValueOnce({
      success: true,
      data: {
        id: '1',
        email: 'test@test.com',
        firstName: null,
        lastName: null,
        roleId: 'r1',
        avatarStyle: null,
        avatarSeed: null,
        role: { name: 'Editor', slug: 'editor', permissions: [] },
        createdAt: '',
        updatedAt: '',
      },
    });

    const auth = useAuth();
    await auth.login('test@test.com', 'password123');

    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('/auth/login'),
      expect.objectContaining({ method: 'POST' }),
    );
    expect(auth.isAuthenticated.value).toBe(true);
    expect(auth.token.value).toBe('new-access');
  });

  it('fetchUser clears tokens when no token present', async () => {
    const auth = useAuth();
    await auth.fetchUser();
    expect(auth.isAuthenticated.value).toBe(false);
  });

  it('fetchUser clears tokens on API error', async () => {
    const auth = useAuth();
    auth.setTokens('bad-token');

    const mockFetch = vi.mocked($fetch);
    mockFetch.mockRejectedValueOnce(new Error('401'));

    await auth.fetchUser();
    expect(auth.isAuthenticated.value).toBe(false);
    expect(auth.token.value).toBeNull();
  });

  it('logout calls API and clears state', async () => {
    const auth = useAuth();
    auth.setTokens('access', 'refresh');

    const mockFetch = vi.mocked($fetch);
    mockFetch.mockResolvedValueOnce({ success: true });

    await auth.logout();
    expect(auth.isAuthenticated.value).toBe(false);
    expect(auth.token.value).toBeNull();
  });
});
