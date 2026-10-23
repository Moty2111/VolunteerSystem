/* Хранилище уведомлений: лента + отметки «прочитано».
 *
 * Раньше здесь был просто счётчик, куда Topbar клал длину ленты, поэтому
 * бейдж никогда не уменьшался и «прочитать все» было невозможно.
 * Теперь храним id прочитанных уведомлений (в localStorage, отдельно для
 * каждого пользователя) и считаем непрочитанные.
 */

type Listener = (unread: number) => void;

const READ_KEY = 'vs-notif-read';

/** Ключ хранилища с учётом пользователя: у разных людей состояние общее быть не должно. */
function storageKey(): string {
    try {
        const raw = localStorage.getItem('user');
        const login = raw ? (JSON.parse(raw) as { loginName?: string }).loginName : null;
        return login ? `${READ_KEY}:${login}` : READ_KEY;
    } catch {
        return READ_KEY;
    }
}

function loadRead(): string[] {
    try {
        const raw = localStorage.getItem(storageKey());
        const parsed = raw ? JSON.parse(raw) : [];
        return Array.isArray(parsed) ? parsed.filter(x => typeof x === 'string') : [];
    } catch {
        return [];
    }
}

let readIds = new Set<string>(loadRead());
let feedIds: string[] = [];
const listeners = new Set<Listener>();

function persist() {
    try {
        localStorage.setItem(storageKey(), JSON.stringify([...readIds]));
    } catch {
        /* приватный режим — просто не сохраняем */
    }
}

function notify() {
    const unread = notifStore.unread;
    listeners.forEach(l => l(unread));
}

export const notifStore = {
    /** Сколько уведомлений в ленте. */
    get total(): number {
        return feedIds.length;
    },

    /** Сколько ещё не прочитано. */
    get unread(): number {
        return feedIds.reduce((n, id) => (readIds.has(id) ? n : n + 1), 0);
    },

    /** Прочитано ли конкретное уведомление. */
    isRead: (id: string): boolean => readIds.has(id),

    /** Задать текущую ленту (вызывает Topbar после загрузки). */
    setFeed(ids: string[]): void {
        /* перечитываем отметки: пользователь мог смениться (вход/выход) */
        readIds = new Set(loadRead());
        feedIds = [...ids];
        /* подчищаем старые отметки, чтобы хранилище не росло бесконечно */
        if (readIds.size > 400) {
            const actual = new Set(feedIds);
            readIds = new Set([...readIds].filter(id => actual.has(id)));
            persist();
        }
        notify();
    },

    /** Отметить одно уведомление прочитанным. */
    markRead(id: string): void {
        if (readIds.has(id)) return;
        readIds.add(id);
        persist();
        notify();
    },

    /** Отметить все уведомления прочитанными. */
    markAllRead(): void {
        if (feedIds.length === 0) return;
        feedIds.forEach(id => readIds.add(id));
        persist();
        notify();
    },

    /** Вернуть все как непрочитанные (сброс). */
    reset(): void {
        readIds = new Set();
        persist();
        notify();
    },

    /** Подписка на изменение числа непрочитанных. */
    sub(l: Listener): () => void {
        listeners.add(l);
        return () => { listeners.delete(l); };
    }
};
