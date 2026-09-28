import api from './axios';
import type { AuthResponse, LoginRequest, RegisterRequest } from '../types';

export const authApi = {
    login: (data: LoginRequest) =>
        api.post<AuthResponse>('/auth/login', data).then(r => r.data),

    register: (data: RegisterRequest) =>
        api.post<AuthResponse>('/auth/register', data).then(r => r.data),

    me: () => api.get('/auth/me').then(r => r.data),

    changePassword: (data: { currentPassword: string; newPassword: string }) =>
        api.post<{ message: string }>('/auth/change-password', data).then(r => r.data)
};