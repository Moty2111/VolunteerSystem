import api from './axios';

export interface SystemUserItem {
    userId: number;
    loginName: string;
    role: string;
    volunteerId: number | null;
    volunteerName: string | null;
    isActive: boolean;
    createdAt: string;
}

export const usersApi = {
    getAll: () => api.get<SystemUserItem[]>('/users').then(r => r.data),
    updateRole: (id: number, role: string) =>
        api.put(`/users/${id}/role`, { role }).then(r => r.data),
    updateActive: (id: number, isActive: boolean) =>
        api.put(`/users/${id}/active`, { isActive }).then(r => r.data)
};
