import { describe, it, expect } from 'vitest';
import { useAvatar } from '~/composables/useAvatar.js';

describe('useAvatar', () => {
  it('generates avatar URL with defaults', () => {
    const { avatarUrl } = useAvatar();
    const url = avatarUrl('john');
    expect(url).toBe('https://api.dicebear.com/9.x/initials/svg?seed=john&size=64');
  });

  it('generates avatar URL with custom style and size', () => {
    const { avatarUrl } = useAvatar();
    const url = avatarUrl('jane', 'adventurer', 128);
    expect(url).toBe('https://api.dicebear.com/9.x/adventurer/svg?seed=jane&size=128');
  });

  it('encodes special characters in seed', () => {
    const { avatarUrl } = useAvatar();
    const url = avatarUrl('hello world');
    expect(url).toContain('seed=hello%20world');
  });

  it('userAvatarUrl uses email as fallback seed', () => {
    const { userAvatarUrl } = useAvatar();
    const url = userAvatarUrl({ email: 'test@example.com' });
    expect(url).toContain('seed=test%40example.com');
    expect(url).toContain('initials');
  });

  it('userAvatarUrl uses custom style and seed when set', () => {
    const { userAvatarUrl } = useAvatar();
    const url = userAvatarUrl({
      email: 'test@example.com',
      avatarStyle: 'adventurer',
      avatarSeed: 'myseed',
    });
    expect(url).toContain('adventurer');
    expect(url).toContain('seed=myseed');
  });

  it('randomSeeds returns the requested count', () => {
    const { randomSeeds } = useAvatar();
    const seeds = randomSeeds(5);
    expect(seeds).toHaveLength(5);
    seeds.forEach((s) => expect(typeof s).toBe('string'));
  });

  it('randomSeeds returns unique values', () => {
    const { randomSeeds } = useAvatar();
    const seeds = randomSeeds(8);
    expect(new Set(seeds).size).toBe(8);
  });
});
