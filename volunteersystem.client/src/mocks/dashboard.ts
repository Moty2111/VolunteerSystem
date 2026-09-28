export type ActivityKind = 'assignment' | 'confirm' | 'event' | 'partner' | 'volunteer';

export interface ActivityItem {
  id: number;
  kind: ActivityKind;
  actor: string;
  text: string;
  at: string;
}

/* демо-лента: события «от сегодня», чтобы лента не выглядела устаревшей */
const hoursAgo = (h: number) => new Date(Date.now() - h * 3600_000).toISOString();

export const MOCK_RECENT_ACTIVITY: ActivityItem[] = [
  { id: 1, kind: 'assignment', actor: 'Иванов Иван', text: 'Иванов Иван назначен на «Субботник в парке»', at: hoursAgo(2) },
  { id: 2, kind: 'confirm', actor: 'Петрова Анна', text: 'Петрова Анна подтвердила 5 ч участия', at: hoursAgo(5) },
  { id: 3, kind: 'event', actor: 'Сидоров Пётр', text: 'Создано мероприятие «Благотворительный концерт»', at: hoursAgo(20) },
  { id: 4, kind: 'partner', actor: 'ООО Добро', text: 'Новый партнёр «ООО Добро»', at: hoursAgo(31) },
  { id: 5, kind: 'volunteer', actor: 'Кузнецова Мария', text: 'Кузнецова Мария зарегистрировалась', at: hoursAgo(44) }
];
