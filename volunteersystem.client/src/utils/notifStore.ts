/* Мини-хранилище счётчика уведомлений — Topbar наполняет, сайдбар показывает бейдж */
type Listener = (count: number) => void;

let count = 0;
const listeners = new Set<Listener>();

export const notifStore = {
    get: () => count,
    set: (n: number) => {
        count = n;
        listeners.forEach(l => l(n));
    },
    sub: (l: Listener) => {
        listeners.add(l);
        return () => { listeners.delete(l); };
    }
};
