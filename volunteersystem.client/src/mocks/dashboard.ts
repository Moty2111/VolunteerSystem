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
  { id: 1, kind: 'assignment', actor: 'Никитин Артём', text: 'Никитин Артём назначен на «Осенний марафон добрых дел»', at: hoursAgo(2) },
  { id: 2, kind: 'confirm', actor: 'Волкова Ольга', text: 'Волкова Ольга подтвердила участие в «Эко-десанте»', at: hoursAgo(5) },
  { id: 3, kind: 'event', actor: 'Менеджер 2', text: 'Создано мероприятие «Зимний фестиваль «Свет города»»', at: hoursAgo(20) },
  { id: 4, kind: 'partner', actor: 'АО Тепло сердец', text: 'Новый партнёр «АО «Тепло сердец»»', at: hoursAgo(31) },
  { id: 5, kind: 'volunteer', actor: 'Фёдорова Алина', text: 'Фёдорова Алина зарегистрировалась', at: hoursAgo(44) }
];
