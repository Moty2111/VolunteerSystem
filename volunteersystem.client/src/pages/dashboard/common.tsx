import { Link, useNavigate } from 'react-router-dom';
import {
    ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid,
    PieChart, Pie, Cell
} from 'recharts';
import type { EventItem, Assignment, Volunteer } from '../../types';
import { Avatar, Button, EmptyState, Skeleton } from '../../components/ui';
import { IllSprout, IllCalendar, IllActivity } from '../../components/illustrations';
import { formatHours, plural } from '../../utils/format';
import { MOCK_RECENT_ACTIVITY } from '../../mocks/dashboard';
import posterSocial from '../../assets/events/social.svg';
import posterEco from '../../assets/events/eco.svg';
import posterCulture from '../../assets/events/culture.svg';
import posterCharity from '../../assets/events/charity.svg';
import posterSport from '../../assets/events/sport.svg';
import posterEducation from '../../assets/events/education.svg';
import {
    TrendingUp, Calendar, Plus, ArrowRight, AlertTriangle, MapPin, Users, Clock
} from 'lucide-react';

/* ================= данные и хелперы ================= */

export const TYPE_POSTERS: Record<number, string> = {
    1: posterSocial, 2: posterEco, 3: posterCulture,
    4: posterCharity, 5: posterSport, 6: posterEducation
};

export const posterFor = (typeId: number) => TYPE_POSTERS[typeId] || posterSocial;

export const RU_MONTHS = ['янв', 'фев', 'мар', 'апр', 'май', 'июн', 'июл', 'авг', 'сен', 'окт', 'ноя', 'дек'];

export const STATUS_COLORS: Record<string, string> = {
    'Запланировано': '#7c5cff',
    'Идёт': '#ffa14a',
    'Завершено': '#2fd08a',
    'Отменено': '#ff5c7a'
};

/* иконки ленты активности */
export const ACTIVITY_META: Record<string, { color: string; icon: React.ReactNode }> = {
    assignment: { color: 'var(--success)', icon: null as React.ReactNode },
    confirm: { color: '#4f7cff', icon: null as React.ReactNode },
    event: { color: 'var(--warning)', icon: null as React.ReactNode },
    partner: { color: 'var(--accent)', icon: null as React.ReactNode },
    volunteer: { color: 'var(--primary)', icon: null as React.ReactNode }
};

export interface VolunteerSummaryRow {
    volunteer_id: number;
    full_name: string;
    city: string;
    events_count: number;
    total_hours: number;
}

export const greeting = () => {
    const h = new Date().getHours();
    if (h < 5) return 'Доброй ночи';
    if (h < 12) return 'Доброе утро';
    if (h < 18) return 'Добрый день';
    return 'Добрый вечер';
};

/* реальные часы по месяцам — из подтверждённых назначений */
export function calcMonthly(assignments: Assignment[]) {
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
    assignments.forEach(a => {
        if (a.hoursActual == null) return;
        const d = new Date(a.eventDateStart);
        const i = index.get(`${d.getFullYear()}-${d.getMonth()}`);
        if (i !== undefined) buckets[i].hours += Number(a.hoursActual);
    });
    const total = buckets.reduce((s, b) => s + b.hours, 0);
    return { buckets, total };
}

export function calcUpcoming(events: EventItem[], n = 4) {
    return [...events]
        .filter(e => new Date(e.dateStart) >= new Date() && e.status !== 'Отменено')
        .sort((a, b) => new Date(a.dateStart).getTime() - new Date(b.dateStart).getTime())
        .slice(0, n);
}

/* медкнижки: просроченные и истекающие в ближайшие 30 дней */
export function calcMedIssues(volunteers: Volunteer[]) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const soon = new Date(today);
    soon.setDate(soon.getDate() + 30);
    const expired: Volunteer[] = [];
    const expiring: Volunteer[] = [];
    volunteers.forEach(v => {
        if (!v.medBookValidUntil) return;
        const d = new Date(v.medBookValidUntil);
        if (d < today) expired.push(v);
        else if (d <= soon) expiring.push(v);
    });
    return { expired, expiring };
}

/* ================= общие карточки ================= */

export function Hero({
    title, subtitle, actions, extra
}: {
    title: React.ReactNode;
    subtitle: React.ReactNode;
    actions?: React.ReactNode;
    extra?: React.ReactNode;
}) {
    return (
        <div className="hero">
            <div className="hero-content">
                <div>
                    <div className="hero-title">{title}</div>
                    <div className="hero-sub">{subtitle}</div>
                    {extra}
                </div>
                {actions && <div className="hero-actions">{actions}</div>}
            </div>
        </div>
    );
}

export function MonthlyHoursCard({ assignments, loading, title = 'Часы по месяцам' }: {
    assignments: Assignment[];
    loading: boolean;
    title?: string;
}) {
    const { buckets, total } = calcMonthly(assignments);

    return (
        <div className="card">
            <div className="card-header">
                <h3 className="card-title"><TrendingUp size={16} /> {title}</h3>
                <span style={{ fontSize: 12, color: 'var(--text-3)' }}>
                    {loading ? 'Последние 12 месяцев' : `Последние 12 месяцев · ${total.toFixed(1)} ч`}
                </span>
            </div>
            {loading ? (
                <Skeleton height={220} />
            ) : total === 0 ? (
                <EmptyState
                    illustration={<IllSprout size={90} />}
                    title="Пока нет часов"
                    text="Как только начнут подтверждаться часы участия, появится график"
                />
            ) : (
                <ResponsiveContainer width="100%" height={220}>
                    <AreaChart data={buckets} margin={{ top: 8, right: 8, bottom: 0, left: -12 }}>
                        <defs>
                            <linearGradient id="hoursGrad" x1="0" y1="0" x2="0" y2="1">
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
                        <Area type="monotone" dataKey="hours" stroke="#ff4d8d" strokeWidth={2.5} fill="url(#hoursGrad)" />
                    </AreaChart>
                </ResponsiveContainer>
            )}
        </div>
    );
}

export function EventsStatusCard({ events, loading }: { events: EventItem[]; loading: boolean }) {
    const eventsByStatus = (() => {
        const map = new Map<string, number>();
        events.forEach(e => map.set(e.status, (map.get(e.status) || 0) + 1));
        return Array.from(map.entries()).map(([status, count]) => ({ status, count }));
    })();

    return (
        <div className="card">
            <div className="card-header">
                <h3 className="card-title"><Calendar size={16} /> Мероприятия</h3>
            </div>
            {loading ? (
                <Skeleton height={220} />
            ) : eventsByStatus.length === 0 ? (
                <EmptyState
                    illustration={<IllCalendar size={90} />}
                    title="Пока нет мероприятий"
                    text="Создайте первое и пригласите команду"
                />
            ) : (
                <>
                    <ResponsiveContainer width="100%" height={150}>
                        <PieChart>
                            <Pie
                                data={eventsByStatus}
                                dataKey="count"
                                nameKey="status"
                                innerRadius={40}
                                outerRadius={65}
                                paddingAngle={3}
                                stroke="none"
                            >
                                {eventsByStatus.map((s, i) => (
                                    <Cell key={i} fill={STATUS_COLORS[s.status] || '#94a3b8'} />
                                ))}
                            </Pie>
                            <Tooltip
                                contentStyle={{
                                    background: 'var(--surface)',
                                    border: '1px solid var(--border-2)',
                                    borderRadius: 10,
                                    fontSize: 12,
                                    color: 'var(--text)'
                                }}
                            />
                        </PieChart>
                    </ResponsiveContainer>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 8 }}>
                        {eventsByStatus.map(s => (
                            <div key={s.status} style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 12 }}>
                                <span style={{
                                    width: 10, height: 10, borderRadius: '50%',
                                    background: STATUS_COLORS[s.status] || '#94a3b8'
                                }} />
                                <span style={{ color: 'var(--text-2)', flex: 1 }}>{s.status}</span>
                                <strong className="num">{s.count}</strong>
                            </div>
                        ))}
                    </div>
                </>
            )}
        </div>
    );
}

export function UpcomingCard({ events, loading, canCreate }: {
    events: EventItem[];
    loading: boolean;
    canCreate?: boolean;
}) {
    const navigate = useNavigate();
    const upcoming = calcUpcoming(events);

    return (
        <div className="card">
            <div className="card-header">
                <h3 className="card-title"><Calendar size={16} /> Ближайшие</h3>
                <Link to="/events" style={{ fontSize: 12, fontWeight: 600 }}>
                    Все <ArrowRight size={12} style={{ verticalAlign: 'middle' }} />
                </Link>
            </div>
            {loading ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {[1, 2, 3].map(i => <Skeleton key={i} height={64} />)}
                </div>
            ) : upcoming.length === 0 ? (
                <EmptyState
                    illustration={<IllCalendar size={90} />}
                    title="Пока нет мероприятий"
                    text="Создайте первое и пригласите команду"
                    action={canCreate ? (
                        <Button variant="primary" size="sm" icon={<Plus size={14} />} onClick={() => navigate('/events')}>
                            Создать
                        </Button>
                    ) : undefined}
                />
            ) : (
                <div className="upcoming-list">
                    {upcoming.map(e => {
                        const d = new Date(e.dateStart);
                        const day = d.getDate().toString().padStart(2, '0');
                        const mon = d.toLocaleDateString('ru-RU', { month: 'short' }).replace('.', '');
                        return (
                            <div key={e.eventId} className="upcoming-item" onClick={() => navigate('/events')}>
                                <div className="upcoming-thumb">
                                    <img src={posterFor(e.eventTypeId)} alt="" />
                                    <span className="thumb-date">{day} {mon}</span>
                                </div>
                                <div className="upcoming-info">
                                    <div className="upcoming-title" title={e.eventName}>{e.eventName}</div>
                                    <div className="upcoming-meta">
                                        <span><MapPin size={12} /> {e.location}</span>
                                        <span className="dot-sep">·</span>
                                        <span><Users size={12} /> {e.assignmentsCount}</span>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}

export function MedAlert({ expired, expiring, to = '/volunteers', linkText = 'Открыть список' }: {
    expired: Volunteer[];
    expiring: Volunteer[];
    to?: string;
    linkText?: string;
}) {
    if (expired.length === 0 && expiring.length === 0) return null;

    return (
        <div className="dash-alert">
            <span className="dash-alert-icon"><AlertTriangle size={18} /></span>
            <div className="dash-alert-body">
                <strong>Медицинские книжки</strong>
                <span>
                    {expired.length > 0
                        ? `просрочены: ${expired.length} ${plural(expired.length, ['волонтёр', 'волонтёра', 'волонтёров'])}`
                        : ''}
                    {expired.length > 0 && expiring.length > 0 ? ' · ' : ''}
                    {expiring.length > 0
                        ? `истекают в течение 30 дней: ${expiring.length} ${plural(expiring.length, ['волонтёр', 'волонтёра', 'волонтёров'])}`
                        : ''}
                </span>
            </div>
            <Link to={to} className="dash-alert-link">{linkText}</Link>
        </div>
    );
}

export function ActivityCard({ loading }: { loading: boolean }) {
    return (
        <div className="card">
            <div className="card-header">
                <h3 className="card-title"><IllActivity size={16} /> Последняя активность</h3>
            </div>
            {loading ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    {[1, 2, 3].map(i => <Skeleton key={i} height={36} />)}
                </div>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                    {MOCK_RECENT_ACTIVITY.map(a => {
                        const meta = ACTIVITY_META[a.kind] || ACTIVITY_META.volunteer;
                        const time = new Date(a.at).toLocaleString('ru-RU', {
                            day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit'
                        });
                        return (
                            <div key={a.id} className="activity-row">
                                <Avatar name={a.actor} size="sm" />
                                <span
                                    className="activity-kind"
                                    style={{ '--act-color': meta.color } as React.CSSProperties}
                                    title={a.kind}
                                >
                                    <ActivityGlyph kind={a.kind} />
                                </span>
                                <div className="activity-text">{a.text}</div>
                                <span className="activity-time">{time}</span>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}

/* небольшие иконки ленты (лениво, чтобы не тянуть lucide в константы) */
function ActivityGlyph({ kind }: { kind: string }) {
    const props = { size: 16 };
    switch (kind) {
        case 'assignment': return <Clock {...props} />;
        case 'confirm': return <AlertTriangle {...props} />;
        case 'event': return <Calendar {...props} />;
        case 'partner': return <Users {...props} />;
        default: return <ArrowRight {...props} />;
    }
}

export function LeadersCard({ leaders, loading }: {
    leaders: VolunteerSummaryRow[];
    loading: boolean;
}) {
    const maxHours = leaders.length ? Math.max(...leaders.map(l => Number(l.total_hours || 0))) : 0;

    return (
        <div className="card">
            <div className="card-header">
                <h3 className="card-title"><TrendingUp size={16} /> Топ волонтёров</h3>
                <Link to="/volunteers" style={{ fontSize: 12, fontWeight: 600 }}>
                    Все <ArrowRight size={12} style={{ verticalAlign: 'middle' }} />
                </Link>
            </div>
            {loading ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    {[1, 2, 3, 4, 5].map(i => <Skeleton key={i} height={44} />)}
                </div>
            ) : leaders.length === 0 ? (
                <EmptyState
                    illustration={<IllSprout size={90} />}
                    title="Пока нет данных"
                    text="Как только волонтёры начнут участвовать в мероприятиях, они появятся здесь"
                />
            ) : (
                <div className="leader-list">
                    {leaders.map((l, i) => {
                        const hours = Number(l.total_hours || 0);
                        const width = maxHours > 0 ? (hours / maxHours) * 100 : 0;
                        const placeClass = i === 0 ? 'gold' : i === 1 ? 'silver' : i === 2 ? 'bronze' : '';
                        return (
                            <div className="leader-row" key={l.volunteer_id}>
                                <div className={`leader-place ${placeClass}`}>{i + 1}</div>
                                <Avatar name={l.full_name} size="md" />
                                <div className="leader-name" title={l.full_name}>{l.full_name}</div>
                                <div className="leader-bar-wrap">
                                    <div className="leader-bar">
                                        <div className="leader-bar-fill" style={{ width: `${width}%` }} />
                                    </div>
                                </div>
                                <div className={`leader-hours num ${hours === 0 ? 'zero' : ''}`}>
                                    {hours > 0 ? `${formatHours(hours)}` : '0 ч'}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
