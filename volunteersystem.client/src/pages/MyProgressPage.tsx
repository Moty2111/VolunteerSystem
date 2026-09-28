import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
    ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid
} from 'recharts';
import { assignmentsApi } from '../api/assignments';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../components/Toast';
import { Badge, EmptyState, Skeleton, StatCard } from '../components/ui';
import { IllCalendar } from '../components/illustrations';
import type { Assignment } from '../types';
import { getLevel, getBadges } from '../utils/level';
import { formatHours, plural } from '../utils/format';
import {
    Clock, CalendarCheck, BadgeCheck, Sparkles, Trophy, ArrowRight, Target
} from 'lucide-react';

const RU_MONTHS = ['янв', 'фев', 'мар', 'апр', 'май', 'июн', 'июл', 'авг', 'сен', 'окт', 'ноя', 'дек'];

const LEVEL_ORDER = [
    { key: 'novice', label: 'Новичок', min: 0 },
    { key: 'activist', label: 'Активист', min: 10 },
    { key: 'mentor', label: 'Наставник', min: 50 },
    { key: 'hero', label: 'Герой', min: 100 }
];

export default function MyProgressPage() {
    const { user } = useAuth();
    const toast = useToast();
    const [items, setItems] = useState<Assignment[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        (async () => {
            try {
                setItems(await assignmentsApi.my());
            } catch (e: unknown) {
                const err = e as { response?: { data?: { message?: string } } };
                toast.error(err.response?.data?.message || 'Не удалось загрузить статистику');
            } finally {
                setLoading(false);
            }
        })();
    }, []);

    const totalHours = useMemo(
        () => items.reduce((s, a) => s + Number(a.hoursActual || 0), 0),
        [items]
    );
    const confirmedCount = useMemo(() => items.filter(a => a.confirmed).length, [items]);
    const level = getLevel(totalHours);
    const badges = getBadges(totalHours);

    const monthly = useMemo(() => {
        const now = new Date();
        const buckets = Array.from({ length: 12 }, (_, i) => {
            const d = new Date(now.getFullYear(), now.getMonth() - (11 - i), 1);
            return {
                key: `${d.getFullYear()}-${d.getMonth()}`,
                month: RU_MONTHS[d.getMonth()],
                hours: 0
            };
        });
        const index = new Map(buckets.map((b, i) => [b.key, i]));
        items.forEach(a => {
            if (a.hoursActual == null) return;
            const d = new Date(a.eventDateStart);
            const i = index.get(`${d.getFullYear()}-${d.getMonth()}`);
            if (i !== undefined) buckets[i].hours += Number(a.hoursActual);
        });
        return buckets;
    }, [items]);

    const history = useMemo(
        () => [...items].sort(
            (a, b) => new Date(b.eventDateStart).getTime() - new Date(a.eventDateStart).getTime()
        ).slice(0, 20),
        [items]
    );

    return (
        <div>
            <div className="page-header">
                <div>
                    <h1 className="page-title">Мой прогресс</h1>
                    <p className="page-subtitle">
                        {loading
                            ? 'Загрузка...'
                            : `Уровень «${level.label}» · ${formatHours(totalHours)} · ${items.length} ${plural(items.length, ['участие', 'участия', 'участий'])}`}
                    </p>
                </div>
                <Link to="/my-skills" className="btn btn-secondary">
                    Мои навыки <ArrowRight size={16} />
                </Link>
            </div>

            <div className="stat-grid">
                <StatCard
                    label="Часов отработано"
                    value={loading ? '—' : formatHours(totalHours)}
                    icon={<Clock size={20} />}
                    color="var(--success)"
                    delay={0}
                />
                <StatCard
                    label="Мероприятий"
                    value={loading ? '—' : items.length}
                    icon={<CalendarCheck size={20} />}
                    color="var(--primary)"
                    delay={0.06}
                />
                <StatCard
                    label="Подтверждено"
                    value={loading ? '—' : confirmedCount}
                    icon={<BadgeCheck size={20} />}
                    color="#7c5cff"
                    delay={0.12}
                />
                <StatCard
                    label="Уровень"
                    value={loading ? '—' : level.label}
                    icon={<Trophy size={20} />}
                    color="var(--warning)"
                    delay={0.18}
                />
            </div>

            <div className="dash-grid">
                <div className="card">
                    <div className="card-header">
                        <h3 className="card-title"><Trophy size={16} /> Уровень волонтёра</h3>
                        <span className={`level-pill level-${level.key}`}>
                            <span className="level-dot" />
                            {level.label}
                        </span>
                    </div>

                    {loading ? <Skeleton height={120} /> : (
                        <>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--text-2)', marginBottom: 6 }}>
                                <span>
                                    {level.nextAt
                                        ? `До «${LEVEL_ORDER.find(l => l.min === level.nextAt)?.label || 'следующего уровня'}»`
                                        : 'Максимальный уровень достигнут'}
                                </span>
                                <span className="num">
                                    {formatHours(totalHours)}{level.nextAt ? ` / ${level.nextAt} ч` : ''}
                                </span>
                            </div>
                            <div className="progress">
                                <div className="progress-fill" style={{ width: `${level.progress * 100}%` }} />
                            </div>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 18 }}>
                                {LEVEL_ORDER.map(l => {
                                    const done = totalHours >= l.min;
                                    return (
                                        <div key={l.key} style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 13 }}>
                                            <span
                                                style={{
                                                    width: 24, height: 24, borderRadius: '50%',
                                                    display: 'grid', placeItems: 'center',
                                                    background: done ? 'var(--success-soft)' : 'var(--surface-2)',
                                                    color: done ? 'var(--success)' : 'var(--text-3)',
                                                    flex: '0 0 auto'
                                                }}
                                            >
                                                {done ? <BadgeCheck size={14} /> : <Target size={13} />}
                                            </span>
                                            <span style={{ color: done ? 'var(--text)' : 'var(--text-3)', flex: 1 }}>
                                                {l.label}
                                            </span>
                                            <span className="num" style={{ color: 'var(--text-3)', fontSize: 12 }}>
                                                {l.min}+ ч
                                            </span>
                                        </div>
                                    );
                                })}
                            </div>

                            {badges.length > 0 && (
                                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 16, paddingTop: 14, borderTop: '1px solid var(--border)' }}>
                                    <span style={{ fontSize: 12, color: 'var(--text-3)', display: 'flex', alignItems: 'center', gap: 6 }}>
                                        <Sparkles size={13} /> Значки:
                                    </span>
                                    {badges.map(b => (
                                        <Badge key={b} variant="warning">
                                            <Trophy size={11} style={{ marginRight: 4 }} />
                                            {b}
                                        </Badge>
                                    ))}
                                </div>
                            )}
                        </>
                    )}
                </div>

                <div className="card">
                    <div className="card-header">
                        <h3 className="card-title"><Clock size={16} /> Часы по месяцам</h3>
                        <span style={{ fontSize: 12, color: 'var(--text-3)' }}>
                            {loading ? '12 месяцев' : `последние 12 месяцев · ${totalHours.toFixed(1)} ч`}
                        </span>
                    </div>
                    {loading ? (
                        <Skeleton height={220} />
                    ) : totalHours === 0 ? (
                        <EmptyState
                            illustration={<IllCalendar size={90} />}
                            title="Пока нет часов"
                            text="Запишитесь на мероприятие — после подтверждения участия часы появятся здесь"
                            action={<Link to="/events" className="btn btn-primary btn-sm">Найти мероприятие</Link>}
                        />
                    ) : (
                        <ResponsiveContainer width="100%" height={220}>
                            <AreaChart data={monthly} margin={{ top: 8, right: 8, bottom: 0, left: -12 }}>
                                <defs>
                                    <linearGradient id="myHoursGrad" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="0%" stopColor="#ff4d8d" stopOpacity={0.45} />
                                        <stop offset="100%" stopColor="#ff4d8d" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                                <XAxis dataKey="month" tick={{ fill: 'var(--text-3)', fontSize: 11 }} axisLine={false} tickLine={false} />
                                <YAxis tick={{ fill: 'var(--text-3)', fontSize: 11 }} axisLine={false} tickLine={false} />
                                <Tooltip
                                    contentStyle={{
                                        background: 'var(--surface)',
                                        border: '1px solid var(--border-2)',
                                        borderRadius: 10,
                                        fontSize: 12,
                                        color: 'var(--text)'
                                    }}
                                    labelStyle={{ color: 'var(--text-2)' }}
                                    formatter={(value) => [`${value} ч`, 'Часы']}
                                />
                                <Area type="monotone" dataKey="hours" stroke="#ff4d8d" strokeWidth={2.5} fill="url(#myHoursGrad)" />
                            </AreaChart>
                        </ResponsiveContainer>
                    )}
                </div>
            </div>

            <div className="card" style={{ marginTop: 18 }}>
                <div className="card-header">
                    <h3 className="card-title"><CalendarCheck size={16} /> История участий</h3>
                    <Link to="/my-assignments" style={{ fontSize: 12, fontWeight: 600 }}>
                        Все назначения <ArrowRight size={12} style={{ verticalAlign: 'middle' }} />
                    </Link>
                </div>

                {loading ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                        {[1, 2, 3].map(i => <Skeleton key={i} height={44} radius={12} />)}
                    </div>
                ) : history.length === 0 ? (
                    <EmptyState
                        illustration={<IllCalendar size={90} />}
                        title="Участий пока не было"
                        text="Первое мероприятие — здесь появится ваша история"
                    />
                ) : (
                    <div className="table-wrap">
                        <table className="sticky-first">
                            <thead>
                                <tr>
                                    <th>Мероприятие</th>
                                    <th>Дата</th>
                                    <th>Роль</th>
                                    <th>Часы</th>
                                    <th>Статус</th>
                                </tr>
                            </thead>
                            <tbody>
                                {history.map((a, i) => (
                                    <motion.tr
                                        key={a.assignmentId}
                                        initial={{ opacity: 0, y: 4 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: Math.min(i * 0.02, 0.2) }}
                                    >
                                        <td>
                                            <div className="cell-name">{a.eventName}</div>
                                            <div className="cell-sub">ID #{a.assignmentId}</div>
                                        </td>
                                        <td>{new Date(a.eventDateStart).toLocaleDateString('ru-RU')}</td>
                                        <td>{a.roleName || '—'}</td>
                                        <td className="num">
                                            <strong>{a.hoursActual != null ? `${a.hoursActual} ч` : '—'}</strong>
                                        </td>
                                        <td>
                                            {a.confirmed
                                                ? <Badge variant="success">подтверждено</Badge>
                                                : <Badge variant="warning">ожидает</Badge>}
                                        </td>
                                    </motion.tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
}
