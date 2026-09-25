import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
    ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid,
    PieChart, Pie, Cell
} from 'recharts';
import { useAuth } from '../context/AuthContext';
import { reportsApi } from '../api/reports';
import { eventsApi } from '../api/events';
import type { EventItem } from '../types';
import {
    StatCard, Avatar, EmptyState, Skeleton, Button
} from '../components/ui';
import {
    IllSprout, IllCalendar, IllActivity
} from '../components/illustrations';
import { getLevel } from '../utils/level';
import { formatHours, plural } from '../utils/format';
import {
    MOCK_TRENDS, MOCK_MONTHLY_HOURS, MOCK_RECENT_ACTIVITY
} from '../mocks/dashboard';
import {
    Users, Calendar, Clock, Briefcase, TrendingUp, Plus, ArrowRight, Sparkles
} from 'lucide-react';

interface VolunteerSummaryRow {
    volunteer_id: number;
    full_name: string;
    city: string;
    events_count: number;
    total_hours: number;
}

const STATUS_COLORS: Record<string, string> = {
    'Запланировано': '#4f7cff',
    'Идёт': '#f59e0b',
    'Завершено': '#14a37f',
    'Отменено': '#ef4444'
};

export default function DashboardPage() {
    const { user } = useAuth();
    const navigate = useNavigate();

    const [loading, setLoading] = useState(true);
    const [summary, setSummary] = useState<VolunteerSummaryRow[]>([]);
    const [events, setEvents] = useState<EventItem[]>([]);
    const [partners, setPartners] = useState<unknown[]>([]);

    const isAdmin = user?.role === 'Администратор';
    const isVolunteer = user?.role === 'Волонтёр';

    useEffect(() => {
        (async () => {
            try {
                const [s, e, p] = await Promise.all([
                    reportsApi.volunteerSummary() as Promise<VolunteerSummaryRow[]>,
                    eventsApi.getAll(),
                    isAdmin ? reportsApi.partnerReport() : Promise.resolve([])
                ]);
                setSummary(s);
                setEvents(e);
                setPartners(p as unknown[]);
            } catch { /* ignore */ }
            finally { setLoading(false); }
        })();
    }, [isAdmin]);

    const stats = useMemo(() => {
        const totalHours = summary.reduce((s, r) => s + Number(r.total_hours || 0), 0);
        const totalParticipations = summary.reduce((s, r) => s + Number(r.events_count || 0), 0);
        return {
            volunteers: summary.length,
            participations: totalParticipations,
            hours: totalHours,
            partners: partners.length
        };
    }, [summary, partners]);

    const leaders = useMemo(
        () => [...summary]
            .sort((a, b) => Number(b.total_hours || 0) - Number(a.total_hours || 0))
            .slice(0, 5),
        [summary]
    );
    const maxHours = leaders.length ? Math.max(...leaders.map(l => Number(l.total_hours || 0))) : 0;

    const eventsByStatus = useMemo(() => {
        const map = new Map<string, number>();
        events.forEach(e => map.set(e.status, (map.get(e.status) || 0) + 1));
        return Array.from(map.entries()).map(([status, count]) => ({ status, count }));
    }, [events]);

    const upcoming = useMemo(
        () => [...events]
            .filter(e => new Date(e.dateStart) >= new Date() && e.status !== 'Отменено')
            .sort((a, b) => new Date(a.dateStart).getTime() - new Date(b.dateStart).getTime())
            .slice(0, 4),
        [events]
    );

    const greeting = useMemo(() => {
        const h = new Date().getHours();
        if (h < 5) return 'Доброй ночи';
        if (h < 12) return 'Доброе утро';
        if (h < 18) return 'Добрый день';
        return 'Добрый вечер';
    }, []);

    const myHours = !isVolunteer
        ? 0
        : summary.find(s => s.volunteer_id === user?.volunteerId)?.total_hours ?? 0;
    const myLevel = getLevel(Number(myHours || 0));

    return (
        <div>
        {/* HERO */ }
        < motion.div
        className = "hero"
    initial = {{ opacity: 0, y: 12 }
}
animate = {{ opacity: 1, y: 0 }}
transition = {{ duration: 0.4 }}
      >
    <div className="hero-content" >
        <div>
        <div className="hero-title" >
        { greeting }, { user?.loginName }!
            < Sparkles size = { 22} style = {{ marginLeft: 10, verticalAlign: 'middle', opacity: 0.8 }} />
                </div>
                < div className = "hero-sub" >
                    {
                        isVolunteer
                        ? `Вы на уровне «${myLevel.label}» и отработали ${formatHours(Number(myHours))}. Спасибо за вашу помощь!`
                : `За всё время волонтёры отработали ${formatHours(stats.hours)} и приняли участие в ${stats.participations} ${plural(stats.participations, ['мероприятии', 'мероприятиях', 'мероприятиях'])}.`}
</div>
{
    isVolunteer && myLevel.nextAt && (
        <div style={ { marginTop: 16, maxWidth: 420 } }>
            <div style={
                {
                    display: 'flex', justifyContent: 'space-between',
                        fontSize: 12, marginBottom: 6, opacity: 0.9
                }
    }>
        <span>До «{ myLevel.nextAt === 10 ? 'Активист' : myLevel.nextAt === 50 ? 'Наставник' : 'Герой' }»</span>
            < span className = "num" > { Number(myHours).toFixed(1) } / { myLevel.nextAt } ч </span>
                </div>
                < div className = "progress" style = {{ background: 'rgba(255,255,255,0.2)' }
}>
    <div className="progress-fill" style = {{
    width: `${myLevel.progress * 100}%`,
        background: 'rgba(255,255,255,0.9)'
}} />
    </div>
    </div>
            )}
</div>

{
    (user?.role === 'Администратор' || user?.role === 'Менеджер') && (
        <div className="hero-actions" >
            <button className="btn btn-primary" onClick = {() => navigate('/events')
}>
    <Plus size={ 16 } /> Мероприятие
        </button>
        < button className = "btn btn-secondary" onClick = {() => navigate('/volunteers')}>
            <Users size={ 16 } /> Волонтёры
                </button>
                </div>
          )}
{
    isVolunteer && (
        <div className="hero-actions" >
            <button className="btn btn-primary" onClick = {() => navigate('/events')
}>
    <Calendar size={ 16 } /> Найти мероприятие
        </button>
        </div>
          )}
</div>
    </motion.div>

{/* STAT GRID */ }
<div className="stat-grid" >
    <StatCard
          label="Волонтёров"
value = { loading? '—': stats.volunteers }
icon = {< Users size = { 20} />}
color = "var(--primary)"
trend = { loading? undefined: { direction: 'up', value: `+${MOCK_TRENDS.volunteers}%`, text: 'к прошлому месяцу' } }
delay = { 0}
    />
    <StatCard
          label="Участий"
value = { loading? '—': stats.participations }
icon = {< TrendingUp size = { 20} />}
color = "#7c5cff"
trend = { loading? undefined: { direction: 'down', value: `${MOCK_TRENDS.events}%`, text: 'к прошлому месяцу' } }
delay = { 0.06}
    />
    <StatCard
          label="Часов отработано"
value = { loading? '—': stats.hours.toFixed(1) }
icon = {< Clock size = { 20} />}
color = "var(--success)"
trend = { loading? undefined: { direction: 'up', value: `+${MOCK_TRENDS.hours}%`, text: 'к прошлому месяцу' } }
delay = { 0.12}
    />
{ isAdmin && (
        <StatCard
            label="Партнёров"
value = { loading? '—': stats.partners }
icon = {< Briefcase size = { 20} />}
color = "var(--warning)"
trend = { loading? undefined: { direction: 'up', value: '0%', text: 'без изменений' } }
delay = { 0.18}
    />
        )}
</div>

{/* CHARTS ROW */ }
<div style={ { display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 16, marginBottom: 24 } }>
    <div className="card" >
        <div className="card-header" >
            <h3 className="card-title" > <TrendingUp size={ 16 } /> Часы по месяцам</h3 >
                <span style={ { fontSize: 12, color: 'var(--text-3)' } }> Последние 12 месяцев </span>
                    </div>
{
    loading ? (
        <Skeleton height= { 220} />
          ) : (
        <ResponsiveContainer width= "100%" height = { 220} >
            <AreaChart data={ MOCK_MONTHLY_HOURS } margin = {{ top: 8, right: 8, bottom: 0, left: -12 }
}>
    <defs>
    <linearGradient id="hoursGrad" x1 = "0" y1 = "0" x2 = "0" y2 = "1" >
        <stop offset="0%" stopColor = "#14a37f" stopOpacity = { 0.5} />
            <stop offset="100%" stopColor = "#14a37f" stopOpacity = { 0} />
                </linearGradient>
                </defs>
                < CartesianGrid strokeDasharray = "3 3" stroke = "var(--border)" vertical = { false} />
                    <XAxis dataKey="month" tick = {{ fill: 'var(--text-3)', fontSize: 11 }} axisLine = { false} tickLine = { false} />
                        <YAxis tick={ { fill: 'var(--text-3)', fontSize: 11 } } axisLine = { false} tickLine = { false} />
                            <Tooltip
                  contentStyle={
    {
        background: 'var(--surface)',
            border: '1px solid var(--border-2)',
                borderRadius: 10,
                    fontSize: 12,
                        color: 'var(--text)'
    }
}
labelStyle = {{ color: 'var(--text-2)' }}
formatter = {(value: number) => [`${value} ч`, 'Часы']}
                />
    < Area type = "monotone" dataKey = "hours" stroke = "#14a37f" strokeWidth = { 2.5} fill = "url(#hoursGrad)" />
        </AreaChart>
        </ResponsiveContainer>
          )}
</div>

    < div className = "card" >
        <div className="card-header" >
            <h3 className="card-title" > <Calendar size={ 16 } /> Мероприятия</h3 >
                </div>
{
    loading ? (
        <Skeleton height= { 220} />
          ) : eventsByStatus.length === 0 ? (
        <EmptyState
              illustration= {< IllCalendar size = { 90} />}
title = "Пока нет мероприятий"
text = "Создайте первое и пригласите команду"
    />
          ) : (
    <>
    <ResponsiveContainer width= "100%" height = { 150} >
        <PieChart>
        <Pie
                    data={ eventsByStatus }
dataKey = "count"
nameKey = "status"
innerRadius = { 40}
outerRadius = { 65}
paddingAngle = { 3}
stroke = "none"
    >
{
    eventsByStatus.map((s, i) => (
        <Cell key= { i } fill = { STATUS_COLORS[s.status] || '#94a3b8' } />
                    ))
}
    </Pie>
    < Tooltip
contentStyle = {{
    background: 'var(--surface)',
        border: '1px solid var(--border-2)',
            borderRadius: 10,
                fontSize: 12,
                    color: 'var(--text)'
}}
                  />
    </PieChart>
    </ResponsiveContainer>
    < div style = {{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 8 }}>
    {
        eventsByStatus.map(s => (
            <div key= { s.status } style = {{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 12 }} >
        <span style={
            {
                width: 10, height: 10, borderRadius: '50%',
                    background: STATUS_COLORS[s.status] || '#94a3b8'
            }
} />
    < span style = {{ color: 'var(--text-2)', flex: 1 }}> { s.status } </span>
        < strong className = "num" > { s.count } </strong>
            </div>
                ))}
</div>
    </>
          )}
</div>
    </div>

{/* LEADERS + UPCOMING */ }
<div style={ { display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: 16, marginBottom: 24 } }>
    <div className="card" >
        <div className="card-header" >
            <h3 className="card-title" > <TrendingUp size={ 16 } /> Топ волонтёров</h3 >
                <Link to="/volunteers" style = {{ fontSize: 12, fontWeight: 600 }}>
                    Все < ArrowRight size = { 12} style = {{ verticalAlign: 'middle' }} />
                        </Link>
                        </div>

{
    loading ? (
        <div style= {{ display: 'flex', flexDirection: 'column', gap: 12 }
}>
{ [1, 2, 3, 4, 5].map(i => <Skeleton key={ i } height = { 44} />) }
    </div>
          ) : leaders.length === 0 ? (
    <EmptyState
              illustration= {< IllSprout size = { 90} />}
title = "Пока нет данных"
text = "Как только волонтёры начнут участвовать в мероприятиях, они появятся здесь"
    />
          ) : (
    <div className= "leader-list" >
    {
        leaders.map((l, i) => {
            const hours = Number(l.total_hours || 0);
            const width = maxHours > 0 ? (hours / maxHours) * 100 : 0;
            const placeClass = i === 0 ? 'gold' : i === 1 ? 'silver' : i === 2 ? 'bronze' : '';
            return (
                <div className= "leader-row" key = { l.volunteer_id } >
                    <div className={ `leader-place ${placeClass}` }>
                        { i + 1
        }
                    </div>
            < Avatar name = { l.full_name } size = "md" />
            <div className="leader-name" title = { l.full_name } > { l.full_name } </div>
            < div className = "leader-bar-wrap" >
            <div className="leader-bar" >
        <div className="leader-bar-fill" style = {{ width: `${width}%` }} />
    </div>
    </div>
    < div className = {`leader-hours num ${hours === 0 ? 'zero' : ''}`}>
    { hours > 0 ? `${hours.toFixed(1)} ч` : '0 ч'}
</div>
    </div>
                );
              })}
</div>
          )}
</div>

    < div className = "card" >
        <div className="card-header" >
            <h3 className="card-title" > <Calendar size={ 16 } /> Ближайшие</h3 >
                <Link to="/events" style = {{ fontSize: 12, fontWeight: 600 }}>
                    Все < ArrowRight size = { 12} style = {{ verticalAlign: 'middle' }} />
                        </Link>
                        </div>

{
    loading ? (
        <div style= {{ display: 'flex', flexDirection: 'column', gap: 10 }
}>
{ [1, 2, 3].map(i => <Skeleton key={ i } height = { 64} />) }
    </div>
          ) : upcoming.length === 0 ? (
    <EmptyState
              illustration= {< IllCalendar size = { 90} />}
title = "Пока нет мероприятий"
text = "Создайте первое и пригласите команду"
action = {
                (user?.role === 'Администратор' || user?.role === 'Менеджер') ? (
    <Button variant= "primary" size = "sm" icon = {< Plus size = { 14} />} onClick = {() => navigate('/events')}>
        Создать
        </Button>
                ) : undefined
              }
            />
          ) : (
    <div className= "upcoming-list" >
    {
        upcoming.map(e => {
            const d = new Date(e.dateStart);
            const day = d.getDate().toString().padStart(2, '0');
            const mon = d.toLocaleDateString('ru-RU', { month: 'short' }).replace('.', '');
            return (
                <div key= { e.eventId } className = "upcoming-item" onClick = {() => navigate('/events')
        }>
        <div className="date-badge" >
        <span className="day num" > { day } </span>
        < span className = "mon" > { mon } </span>
        </div>
        < div className = "upcoming-info" >
        <div className="upcoming-title" title = { e.eventName } > { e.eventName } </div>
        < div className = "upcoming-meta" >
        <span>📍 { e.location } </span>
        < span className = "dot-sep" >·</span>
        <span>👥 { e.assignmentsCount } </span>
        </div>
        </div>
        </div>
        );
    })}
</div>
          )}
</div>
    </div>

{/* ACTIVITY */ }
<div className="card" >
    <div className="card-header" >
        <h3 className="card-title" > <IllActivity size={ 16 } /> Последняя активность</h3 >
            </div>
{
    loading ? (
        <div style= {{ display: 'flex', flexDirection: 'column', gap: 12 }
}>
{ [1, 2, 3].map(i => <Skeleton key={ i } height = { 36} />) }
    </div>
        ) : (
    <div style= {{ display: 'flex', flexDirection: 'column', gap: 4 }}>
    {
        MOCK_RECENT_ACTIVITY.map(a => {
            const emoji = a.kind === 'assignment' ? '✅'
                : a.kind === 'confirm' ? '🔵'
                    : a.kind === 'event' ? '📅'
                        : a.kind === 'partner' ? '🤝'
                            : '👤';
            const time = new Date(a.at).toLocaleString('ru-RU', {
                day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit'
            });
            return (
                <div key= { a.id } style = {{
                display: 'flex', gap: 12, alignItems: 'center',
                    padding: '10px 4px', borderBottom: '1px solid var(--border)'
            }
        }>
        <span style={{ fontSize: 16 }} > { emoji } </span>
        < div style = {{ flex: 1, fontSize: 13 }}> { a.text } </div>
            < span style = {{ fontSize: 11, color: 'var(--text-3)', whiteSpace: 'nowrap' }}> { time } </span>
                </div>
              );
            })}
</div>
        )}
</div>
    </div>
  );
}