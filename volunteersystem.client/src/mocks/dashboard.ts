export const MOCK_TRENDS = {
  volunteers: 12,
  events: -5,
  hours: 23,
  partners: 0
};

export const MOCK_MONTHLY_HOURS: { month: string; hours: number }[] = [
  { month: 'апр', hours: 42 },
  { month: 'май', hours: 68 },
  { month: 'июн', hours: 54 },
  { month: 'июл', hours: 91 },
  { month: 'авг', hours: 76 },
  { month: 'сен', hours: 118 },
  { month: 'окт', hours: 63 },
  { month: 'ноя', hours: 88 },
  { month: 'дек', hours: 102 },
  { month: 'янв', hours: 72 },
  { month: 'фев', hours: 95 },
  { month: 'мар', hours: 110 }
];

export type ActivityKind = 'assignment' | 'confirm' | 'event' | 'partner' | 'volunteer';

export interface ActivityItem {
  id: number;
  kind: ActivityKind;
  text: string;
  at: string;
}

export const MOCK_RECENT_ACTIVITY: ActivityItem[] = [
  { id: 1, kind: 'assignment', text: 'Иванов Иван назначен на «Субботник в парке»', at: '2026-04-10T14:23:00Z' },
  { id: 2, kind: 'confirm',    text: 'Петрова Анна подтвердила 5 ч участия', at: '2026-04-10T12:05:00Z' },
  { id: 3, kind: 'event',      text: 'Создано мероприятие «Благотворительный концерт»', at: '2026-04-09T18:40:00Z' },
  { id: 4, kind: 'partner',    text: 'Новый партнёр «ООО Добро»', at: '2026-04-09T11:15:00Z' },
  { id: 5, kind: 'volunteer',  text: 'Кузнецова Мария зарегистрировалась', at: '2026-04-08T16:22:00Z' }
];
