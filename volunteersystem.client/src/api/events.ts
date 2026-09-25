import api from './axios';
import type { EventItem } from '../types';

export const eventsApi = {
    getAll: (params?: { status?: string; typeId?: number; from?: string; to?: string; search?: string }) =>
        api.get<EventItem[]>('/events', { params }).then(r => r.data),

    getById: (id: number) =>
        api.get<EventItem>(`/events/${id}`).then(r => r.data),

    create: (data: any) =>
        api.post<EventItem>('/events', data).then(r => r.data),

    update: (id: number, data: any) =>
        api.put(`/events/${id}`, data).then(r => r.data),

    remove: (id: number) =>
        api.delete(`/events/${id}`).then(r => r.data)
};