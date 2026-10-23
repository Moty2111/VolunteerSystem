import api from './axios';
import type { AuthResponse, LoginRequest, RegisterRequest } from '../types';

export const authApi = {
    login: (data: LoginRequest) =>
        api.post<AuthResponse>('/auth/login', data).then(r => r.data),

    register: (data: RegisterRequest) => {
        // Сервер принимает форму (multipart), чтобы можно было приложить скан медкнижки
        const fd = new FormData();
        (Object.keys(data) as (keyof RegisterRequest)[]).forEach(key => {
            const value = data[key];
            if (value == null) return;
            if (key === 'medBookScan') {
                if (value) fd.append('medBookScan', value as File);
            } else {
                fd.append(key, String(value));
            }
        });
        return api.post<AuthResponse>('/auth/register', fd).then(r => r.data);
    },

    me: () => api.get('/auth/me').then(r => r.data),

    changePassword: (data: { currentPassword: string; newPassword: string }) =>
        api.post<{ message: string }>('/auth/change-password', data).then(r => r.data)
};
