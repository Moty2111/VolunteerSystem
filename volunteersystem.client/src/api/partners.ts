import api from './axios';
import type { Partner } from '../types';

export const partnersApi = {
    getAll: (search?: string) =>
        api.get<Partner[]>('/partners', { params: { search } }).then(r => r.data),

    getById: (id: number) =>
        api.get<Partner>(`/partners/${id}`).then(r => r.data),

    create: (data: any) =>
        api.post<Partner>('/partners', data).then(r => r.data),

    update: (id: number, data: any) =>
        api.put(`/partners/${id}`, data).then(r => r.data),

    remove: (id: number) =>
        api.delete(`/partners/${id}`).then(r => r.data)
};