const UNITS: Record<string, number> = {
  s: 1_000,
  m: 60_000,
  h: 3_600_000,
  d: 86_400_000,
};

/**
 * Parse a human-readable duration string (e.g. '15m', '7d', '2h') into milliseconds.
 * Returns undefined if the format is invalid.
 */
export function parseDuration(input: string): number | undefined {
  const match = /^(\d+)([smhd])$/.exec(input);
  if (!match) return undefined;
  const value = parseInt(match[1], 10);
  const unit = UNITS[match[2]];
  return value * unit;
}

/**
 * Parse duration string into seconds (for jwt expiresIn).
 */
export function parseDurationSec(input: string): number {
  const ms = parseDuration(input);
  if (ms === undefined) {
    throw new Error(`Invalid duration format: "${input}". Expected e.g. 15m, 7d, 2h`);
  }
  return Math.floor(ms / 1_000);
}
