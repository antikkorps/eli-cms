import { DICEBEAR_STYLES, type DiceBearStyle } from '@eli-cms/shared';

export function useAvatar() {
  function avatarUrl(seed: string, style: DiceBearStyle = 'initials', size = 64): string {
    return `https://api.dicebear.com/9.x/${style}/svg?seed=${encodeURIComponent(seed)}&size=${size}`;
  }

  function userAvatarUrl(
    user: { email: string; avatarStyle?: string | null; avatarSeed?: string | null },
    size = 64,
  ): string {
    const style = (user.avatarStyle as DiceBearStyle) || 'initials';
    const seed = user.avatarSeed || user.email;
    return avatarUrl(seed, style, size);
  }

  const SEED_WORDS = [
    'aurora',
    'nebula',
    'crystal',
    'ember',
    'frost',
    'shadow',
    'breeze',
    'coral',
    'dusk',
    'echo',
    'fern',
    'glow',
    'haze',
    'iris',
    'jade',
    'luna',
    'maple',
    'nova',
    'opal',
    'pearl',
    'quartz',
    'rain',
    'sage',
    'tide',
    'vine',
    'wave',
    'zenith',
    'bloom',
    'cedar',
    'delta',
    'flint',
    'grove',
  ];

  function randomSeeds(count = 8): string[] {
    const shuffled = [...SEED_WORDS].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, count);
  }

  return { avatarUrl, userAvatarUrl, randomSeeds, DICEBEAR_STYLES };
}
