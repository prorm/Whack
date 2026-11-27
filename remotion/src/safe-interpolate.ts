import { interpolate as rInterpolate } from "remotion";

/**
 * Same as Remotion's interpolate, but scene timings authored for a longer voiceover are repaired:
 * if inner keys overrun the final key, they are compressed proportionally; any remaining ties are nudged apart.
 */
export const interpolate = (input: number, inputRange: readonly number[], outputRange: readonly number[], options?: Parameters<typeof rInterpolate>[3]): number => {
  let r = [...inputRange];
  const ok = r.every((v, i) => i === 0 || v > r[i - 1]);
  if (!ok && r.length > 2) {
    const last = r[r.length - 1];
    const innerMax = Math.max(...r.slice(0, -1));
    if (innerMax >= last && last > r[0]) {
      const base = r[0];
      const k = ((last - base) * 0.85) / (innerMax - base || 1);
      r = r.map((v, i) => (i === 0 || i === r.length - 1 ? v : base + (v - base) * k));
    }
  }
  for (let i = 1; i < r.length; i++) if (r[i] <= r[i - 1]) r[i] = r[i - 1] + 0.01;
  return rInterpolate(input, r, outputRange, options) as number;
};
