const PALETTE = [
  'linear-gradient(135deg, #14a37f, #0f8f9a)',
  'linear-gradient(135deg, #ff7a59, #ff9c6b)',
  'linear-gradient(135deg, #7c5cff, #4f7cff)',
  'linear-gradient(135deg, #d4a72c, #b8860b)',
  'linear-gradient(135deg, #06b6d4, #0891b2)',
  'linear-gradient(135deg, #ec4899, #db2777)',
  'linear-gradient(135deg, #22c55e, #16a34a)',
  'linear-gradient(135deg, #f97316, #ea580c)'
];

export function avatarGradient(seed: string): string {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) | 0;
  return PALETTE[Math.abs(h) % PALETTE.length];
}
