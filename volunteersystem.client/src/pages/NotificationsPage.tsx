import { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { notificationsApi, type Notification } from '../api/notifications';
import { useToast } from '../components/Toast';
import { EmptyState, Skeleton, Badge } from '../components/ui';
import { IllActivity } from '../components/illustrations';
import {
    Bell, Check, Handshake, Calendar, Settings2, Mail, Globe, Clock,
    CalendarClock, UserCheck, Newspaper, Moon, Save, Filter
} from 'lucide-react';

interface Settings {
    email: boolean;
    browser: boolean;
    soonEvents: boolean;
    confirms: boolean;
    partners: boolean;
    weekly: boolean;
    quietFrom: string;
    quietTo: string;
}

const DEFAULTS: Settings = {
    email: true,
    browser: true,
    soonEvents: true,
    confirms: true,
    partners: false,
    weekly: true,
    quietFrom: '22:00',
    quietTo: '08:00'
};

const STORAGE_KEY = 'vs-notif-settings';

const kindMeta: Record<Notification['kind'], { label: string; color: string; icon: React.ReactNode }> = {
    assignment: { label: 'Назначение', color: 'var(--primary)', icon: <UserCheck size={15} /> },
    confirm: { label: 'Подтверждение', color: 'var(--success)', icon: <Check size={15} /> },
    event: { label: 'Скоро мероприятие', color: 'var(--warning)', icon: <Calendar size={15} /> },
    partner: { label: 'Новый партнёр', color: 'var(--info)', icon: <Handshake size={15} /> }
};

function loadSettings(): Settings {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (raw) return { ...DEFAULTS, ...(JSON.parse(raw) as Partial<Settings>) };
    } catch { /* ignore */ }
    return DEFAULTS;
}

export default function NotificationsPage() {
    const toast = useToast();
    const [items, setItems] = useState<Notification[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState<'all' | Notification['kind']>('all');
    const [settings, setSettings] = useState<Settings>(loadSettings);

    useEffect(() => {
        (async () => {
            try {
                setItems(await notificationsApi.getAll());
            } catch {
                toast.error('Не удалось загрузить уведомления');
            } finally {
                setLoading(false);
            }
        })();
    }, []);

    const filtered = useMemo(
        () => (filter === 'all' ? items : items.filter(n => n.kind === filter)),
        [items, filter]
    );

    const counts = useMemo(() => {
        const map: Record<string, number> = { all: items.length };
        items.forEach(n => { map[n.kind] = (map[n.kind] || 0) + 1; });
        return map;
    }, [items]);

    const save = () => {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
        toast.success('Настройки уведомлений сохранены');
    };

    const toggle = (key: keyof Settings) =>
        setSettings(s => ({ ...s, [key]: !s[key] }));

    const Switch = ({ on, onClick, label }: { on: boolean; onClick: () => void; label: string }) => (
        <button
            className="switch"
            role="switch"
            aria-checked={on}
            aria-label={label}
            onClick={onClick}
        />
    );

    const filters: Array<{ key: 'all' | Notification['kind']; label: string }> = [
        { key: 'all', label: `Все · ${counts.all}` },
        { key: 'assignment', label: `Назначения · ${counts.assignment || 0}` },
        { key: 'confirm', label: `Подтверждения · ${counts.confirm || 0}` },
        { key: 'event', label: `Мероприятия · ${counts.event || 0}` },
        { key: 'partner', label: `Партнёры · ${counts.partner || 0}` }
    ];

    return (
        <div>
            <div className="page-header">
                <div>
                    <h1 className="page-title">Уведомления</h1>
                    <p className="page-subtitle">
                        Лента событий и настройки уведомлений
                    </p>
                </div>
                <Badge variant="primary" icon={<Bell size={13} />}>
                    {items.length} в ленте
                </Badge>
            </div>

            <div className="notif-layout">
                {/* ---------- Лента ---------- */}
                <div className="card">
                    <h3 className="section-title">
                        <Bell size={18} className="section-title-icon" />
                        Лента событий
                    </h3>

                    <div className="filter-bar" style={{ marginBottom: 14, padding: 0, border: 'none', background: 'transparent', boxShadow: 'none' }}>
                        <span className="sort-hint" style={{ marginLeft: 0 }}>
                            <Filter size={13} /> Фильтр:
                        </span>
                        <div className="tabs" style={{ marginBottom: 0, borderBottom: 'none', flexWrap: 'wrap' }}>
                            {filters.map(f => (
                                <button
                                    key={f.key}
                                    className={`tab ${filter === f.key ? 'active' : ''}`}
                                    onClick={() => setFilter(f.key)}
                                >
                                    {f.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {loading ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                            {[1, 2, 3, 4, 5].map(i => <Skeleton key={i} height={62} radius={12} />)}
                        </div>
                    ) : filtered.length === 0 ? (
                        <EmptyState
                            illustration={<IllActivity size={100} />}
                            title="Уведомлений нет"
                            text="Здесь появятся назначения, подтверждения и новости мероприятий"
                        />
                    ) : (
                        <div className="notif-list">
                            <AnimatePresence initial={false}>
                                {filtered.map((n, i) => {
                                    const meta = kindMeta[n.kind] || kindMeta.assignment;
                                    const time = new Date(n.at).toLocaleString('ru-RU', {
                                        day: '2-digit', month: 'long', hour: '2-digit', minute: '2-digit'
                                    });
                                    return (
                                        <motion.div
                                            key={n.id + '-' + i}
                                            className="notif-item"
                                            initial={{ opacity: 0, y: 8 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            transition={{ delay: Math.min(i * 0.03, 0.3) }}
                                        >
                                            <div
                                                className="notif-icon"
                                                style={{
                                                    color: meta.color,
                                                    background: `color-mix(in srgb, ${meta.color} 15%, transparent)`,
                                                    border: `1px solid color-mix(in srgb, ${meta.color} 32%, transparent)`
                                                }}
                                            >
                                                {meta.icon}
                                            </div>
                                            <div className="notif-body">
                                                <div className="notif-kind" style={{ color: meta.color }}>
                                                    {meta.label}
                                                </div>
                                                <div className="notif-text">{n.text}</div>
                                                <div className="notif-time">{time}</div>
                                            </div>
                                        </motion.div>
                                    );
                                })}
                            </AnimatePresence>
                        </div>
                    )}
                </div>

                {/* ---------- Настройки ---------- */}
                <div className="card">
                    <h3 className="section-title">
                        <Settings2 size={18} className="section-title-icon" />
                        Настройки уведомлений
                    </h3>

                    <div className="setting-row">
                        <Mail size={17} style={{ color: 'var(--primary)' }} />
                        <div className="setting-info">
                            <div className="setting-name">Email-уведомления</div>
                            <div className="setting-desc">Письма о назначениях и изменениях расписания</div>
                        </div>
                        <Switch on={settings.email} onClick={() => toggle('email')} label="Email-уведомления" />
                    </div>

                    <div className="setting-row">
                        <Globe size={17} style={{ color: 'var(--accent)' }} />
                        <div className="setting-info">
                            <div className="setting-name">Push в браузере</div>
                            <div className="setting-desc">Всплывающие уведомления, пока открыта система</div>
                        </div>
                        <Switch on={settings.browser} onClick={() => toggle('browser')} label="Push в браузере" />
                    </div>

                    <div className="setting-row">
                        <CalendarClock size={17} style={{ color: 'var(--warning)' }} />
                        <div className="setting-info">
                            <div className="setting-name">Напоминания о мероприятиях</div>
                            <div className="setting-desc">За 24 часа до начала события, на которое вы записаны</div>
                        </div>
                        <Switch on={settings.soonEvents} onClick={() => toggle('soonEvents')} label="Напоминания" />
                    </div>

                    <div className="setting-row">
                        <Check size={17} style={{ color: 'var(--success)' }} />
                        <div className="setting-info">
                            <div className="setting-name">Подтверждение часов</div>
                            <div className="setting-desc">Когда координатор подтвердил ваши часы участия</div>
                        </div>
                        <Switch on={settings.confirms} onClick={() => toggle('confirms')} label="Подтверждение часов" />
                    </div>

                    <div className="setting-row">
                        <Handshake size={17} style={{ color: 'var(--info)' }} />
                        <div className="setting-info">
                            <div className="setting-name">Новые партнёры</div>
                            <div className="setting-desc">Когда организация подписала партнёрское соглашение</div>
                        </div>
                        <Switch on={settings.partners} onClick={() => toggle('partners')} label="Новые партнёры" />
                    </div>

                    <div className="setting-row">
                        <Newspaper size={17} style={{ color: 'var(--primary-300)' }} />
                        <div className="setting-info">
                            <div className="setting-name">Еженедельная сводка</div>
                            <div className="setting-desc">Итоги недели: часы, мероприятия, рейтинг</div>
                        </div>
                        <Switch on={settings.weekly} onClick={() => toggle('weekly')} label="Еженедельная сводка" />
                    </div>

                    <div className="setting-row">
                        <Moon size={17} style={{ color: 'var(--text-2)' }} />
                        <div className="setting-info">
                            <div className="setting-name">Тихие часы</div>
                            <div className="setting-desc">В это время уведомления не приходят</div>
                        </div>
                        <div className="quiet-hours">
                            <input
                                className="input"
                                type="time"
                                value={settings.quietFrom}
                                onChange={e => setSettings(s => ({ ...s, quietFrom: e.target.value }))}
                            />
                            <Clock size={14} />
                            <input
                                className="input"
                                type="time"
                                value={settings.quietTo}
                                onChange={e => setSettings(s => ({ ...s, quietTo: e.target.value }))}
                            />
                        </div>
                    </div>

                    <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
                        <button className="btn btn-primary" onClick={save}>
                            <Save size={15} /> Сохранить настройки
                        </button>
                        <button
                            className="btn btn-ghost"
                            onClick={() => setSettings(DEFAULTS)}
                        >
                            Сбросить
                        </button>
                    </div>

                    <div className="field-hint" style={{ marginTop: 12 }}>
                        Настройки хранятся локально в этом браузере (localStorage).
                    </div>
                </div>
            </div>
        </div>
    );
}
