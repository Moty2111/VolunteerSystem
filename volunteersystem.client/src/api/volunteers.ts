import api from './axios';
import type { Volunteer } from '../types';

export const volunteersApi = {
    getAll: (params?: { city?: string; active?: boolean }) =>
        api.get<Volunteer[]>('/volunteers', { params }).then(r => r.data),

    getById: (id: number) =>
        api.get<Volunteer>(`/volunteers/${id}`).then(r => r.data),

    create: (data: any) =>
        api.post<Volunteer>('/volunteers', data).then(r => r.data),

    update: (id: number, data: any) =>
        api.put(`/volunteers/${id}`, data).then(r => r.data),

    remove: (id: number) =>
        api.delete(`/volunteers/${id}`).then(r => r.data)
};