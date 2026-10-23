import axios from 'axios';

const api = axios.create({
    baseURL: '/api',
    headers: { 'Content-Type': 'application/json' }
});

// Интерцептор запросов: добавляет JWT из localStorage
api.interceptors.request.use((config) => {
    const token = localStorage.getItem('token');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

/* Если связь с API оборвалась (сервер перезапускается, ноутбук просыпается) —
   повторяем чтение пару раз, вместо того чтобы показывать ошибку. */
api.interceptors.response.use(
    (response) => response,
    async (error) => {
        const cfg = error.config as (typeof error.config & { __retries?: number }) | undefined;

        const isNetworkError = !error.response;
        const isGet = cfg?.method?.toLowerCase() === 'get';

        /* Сервер поднимается около 20 секунд (инициализация БД). Если связь
           оборвалась — ждём и повторяем чтение, вместо того чтобы ругаться. */
        if (isNetworkError && isGet && cfg && (cfg.__retries ?? 0) < 3) {
            cfg.__retries = (cfg.__retries ?? 0) + 1;
            await new Promise(r => setTimeout(r, 2000));
            return api.request(cfg);
        }

        if (error.response?.status === 401) {
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            if (window.location.pathname !== '/login') {
                window.location.href = '/login';
            }
        }
        return Promise.reject(error);
    }
);

export default api;
