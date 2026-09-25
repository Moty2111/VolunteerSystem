import api from './axios';

export interface Notification {
    id: string;
    kind: 'assignment' | 'confirm' | 'event' | 'partner';
    text: string;
    at: string;
}

export const notificationsApi = {
    getAll: () => api.get<Notification[]>('/notifications').then(r => r.data)
};