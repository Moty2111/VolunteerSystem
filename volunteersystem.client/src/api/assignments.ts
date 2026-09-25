import api from './axios';
import type { Assignment } from '../types';

export const assignmentsApi = {
    getAll: (params?: { volunteerId?: number; eventId?: number; confirmed?: boolean }) =>
        api.get<Assignment[]>('/assignments', { params }).then(r => r.data),

    my: () =>
        api.get<Assignment[]>('/assignments/my').then(r => r.data),

    getById: (id: number) =>
        api.get<Assignment>(`/assignments/${id}`).then(r => r.data),

    create: (data: { volunteerId: number; eventId: number; roleId: number }) =>
        api.post<Assignment>('/assignments', data).then(r => r.data),

    update: (id: number, data: { hoursActual: number | null; confirmed: boolean }) =>
        api.put(`/assignments/${id}`, data).then(r => r.data),

    remove: (id: number) =>
        api.delete(`/assignments/${id}`).then(r => r.data)
};