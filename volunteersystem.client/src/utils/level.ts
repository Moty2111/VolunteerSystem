export interface VolunteerLevel {
  key: 'novice' | 'activist' | 'mentor' | 'hero';
  label: string;
  minHours: number;
  nextAt: number | null;
  progress: number;
}

const LEVELS: { key: VolunteerLevel['key']; label: string; minHours: number }[] = [
  { key: 'novice',   label: 'Новичок',   minHours: 0 },
  { key: 'activist', label: 'Активист',  minHours: 10 },
  { key: 'mentor',   label: 'Наставник', minHours: 50 },
  { key: 'hero',     label: 'Герой',     minHours: 100 }
];

export function getLevel(hours: number): VolunteerLevel {
  let current = LEVELS[0];
  for (const l of LEVELS) {
    if (hours >= l.minHours) current = l;
  }
  const idx = LEVELS.indexOf(current);
  const next = LEVELS[idx + 1] ?? null;
  const progress = next
    ? Math.min(1, Math.max(0, (hours - current.minHours) / (next.minHours - current.minHours)))
    : 1;
  return {
    key: current.key,
    label: current.label,
    minHours: current.minHours,
    nextAt: next ? next.minHours : null,
    progress
  };
}

export function getBadges(hours: number): string[] {
  const b: string[] = [];
  if (hours >= 10) b.push('10 часов');
  if (hours >= 50) b.push('50 часов');
  if (hours >= 100) b.push('100 часов');
  return b;
}
