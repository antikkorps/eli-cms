export const DICEBEAR_STYLES = [
  'initials',
  'avataaars',
  'bottts',
  'fun-emoji',
  'pixel-art',
  'lorelei',
  'adventurer',
  'micah',
  'thumbs',
  'shapes',
  'rings',
  'identicon',
] as const;

export type DiceBearStyle = (typeof DICEBEAR_STYLES)[number];
