import { useEffect, useMemo, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { reportsApi } from '../../api/reports';
import { eventsApi } from '../../api/events';
import { assignmentsApi } from '../../api/assignments';
import { volunteersApi } from '../../api/volunteers';
import type { EventItem, Assignment, Volunteer } from '../../types';
import { Badge, Button, EmptyState, StatCard } from '../../components/ui';
import { IllSprout } from '../../components/illustrations';
import { formatHours, plural } from '../../utils/format';
import {
    Users, Clock, Plus, Sparkles, CalendarCheck2, AlertTriangle, ArrowRight, CheckCircle2
} from 'lucide-react';
import {
    Hero, MonthlyHoursCard, EventsStatusCard, UpcomingCard, MedAlert,
    greeting, calcMedIssues, posterFor, type VolunteerSummaryRow
} from './common';

export default function ManagerDashboard() {
    const { user } = useAuth();
    const navigate = useNavigate();

    const [loading, setLoading] = useState(true);
    const [summary, setSummary] = useState<VolunteerSummaryRow[]>([]);
    const [events, setEvents] = useState<EventItem[]>([]);
    const [assignments, setAssignments] = useState<Assignment[]>([]);
    const [volunteers, setVolunteers] = useState<Volunteer[]>([]);

    useEffect(() => {
        (async () => {
            try {
                const [s, e, a, v] = await Promise.all([
                    reportsApi.volunteerSummary() as Promise<VolunteerSummaryRow[]>,
                    eventsApi.getAll(),
                    assignmentsApi.getAll(),
                    volunteersApi.getAll()
                ]);
                setSummary(s);
                setEvents(e);
                setAssignments(a);
                setVolunteers(v);
            } catch { /* ignore */ }
            finally { setLoading(false); }
        })();
    }, []);

    const stats = useMemo(() => {
        const totalHours = summary.reduce((s, r) => s + Number(r.total_hours || 0), 0);
        const planned = events.filter(e => e.status === 'Запланировано').length;
        return {
            volunteers: summary.length,
            hours: totalHours,
            planned,
            unconfirmed: assignments.filter(a => !a.confirmed).length
        };
    }, [summary, events, assignments]);

    const pending = useMemo(
        () => [...assignments]
            .filter(a => !a.confirmed)
            .sort((a, b) => new Date(a.eventDateStart).getTime() - new Date(b.eventDateStart).getTime())
            .slice(0, 5),
        [assignments]
    );

    const medIssues = useMemo(() => calcMedIssues(volunteers), [volunteers]);

    return (
        <div>
            <Hero
                title={
                    <>
                        {greeting()}, {user?.loginName}!
                        <Sparkles size={22} style={{ marginLeft: 10, verticalAlign: 'middle', opacity: 0.8 }} />
                    </>
                }
                subtitle={
                    stats.planned > 0
                        ? `Запланировано мероприятий: ${stats.planned}${stats.unconfirmed ? ` · требуют подтверждения: ${stats.unconfirmed}` : ''}.`
                        : 'Расписание пока пустое — создайте первое мероприятие.'
                }
                actions={
                    <>
                        <button className="btn btn-primary" onClick={() => navigate('/events')}>
                            <Plus size={16} /> Мероприятие
                        </button>
                        <button className="btn btn-secondary" onClick={() => navigate('/volunteers')}>
                            <Users size={16} /> Волонтёры
                        </button>
                    </>
                }
            />

            <div className="stat-grid">
                <StatCard
                    label="Запланировано"
                    value={loading ? '—' : stats.planned}
                    icon={<CalendarCheck2 size={20} />}
                    color="var(--primary)"
                    onClick={() => navigate('/events')}
                    delay={0}
                />
                <StatCard
                    label="Требуют подтверждения"
                    value={loading ? '—' : stats.unconfirmed}
                    icon={<AlertTriangle size={20} />}
                    color="#ffa14a"
                    onClick={() => navigate('/assignments')}
                    delay={0.06}
                />
                <StatCard
                    label="Волонтёров"
                    value={loading ? '—' : stats.volunteers}
                    icon={<Users size={20} />}
                    color="#7c5cff"
                    onClick={() => navigate('/volunteers')}
                    delay={0.12}
                />
                <StatCard
                    label="Часов отработано"
                    value={loading ? '—' : stats.hours.toFixed(1)}
                    icon={<Clock size={20} />}
                    color="var(--success)"
                    onClick={() => navigate('/reports')}
                    delay={0.18}
                />
            </div>

            {!loading && <MedAlert expired={medIssues.expired} expiring={medIssues.expiring} />}

            {stats.unconfirmed > 0 && (
                <div className="dash-alert" style={{ background: 'color-mix(in srgb, #ffa14a 14%, var(--surface))', borderColor: 'color-mix(in srgb, #ffa14a 45%, var(--border))' }}>
                    <span className="dash-alert-icon" style={{ background: 'color-mix(in srgb, #ffa14a 22%, transparent)', color: '#c07a1e' }}>
                        <AlertTriangle size={18} />
                    </span>
                    <div className="dash-alert-body">
                        <strong>Назначения</strong>
                        <span>
                            {stats.unconfirmed} {plural(stats.unconfirmed, ['ожидает', 'ожидают', 'ожидают'])} подтверждения часов — проверьте отчёты участников
                        </span>
                    </div>
                    <Link to="/assignments" className="dash-alert-link">Открыть назначения</Link>
                </div>
            )}

            <div className="dash-grid">
                <MonthlyHoursCard assignments={assignments} loading={loading} />
                <EventsStatusCard events={events} loading={loading} />
            </div>

            <div className="dash-grid-wide">
                <div className="card">
                    <div className="card-header">
                        <h3 className="card-title"><CheckCircle2 size={16} /> Требуют внимания</h3>
                        <Link to="/assignments" style={{ fontSize: 12, fontWeight: 600 }}>
                            Все <ArrowRight size={12} style={{ verticalAlign: 'middle' }} />
                        </Link>
                    </div>
                    {loading ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                            {[1, 2, 3].map(i => (
                                <div key={i} style={{ height: 44, borderRadius: 12, background: 'var(--surface-2)' }} />
                            ))}
                        </div>
                    ) : pending.length === 0 ? (
                        <EmptyState
                            illustration={<IllSprout size={90} />}
                            title="Всё подтверждено"
                            text="Новые назначения без подтверждения появятся здесь"
                        />
                    ) : (
                        <div className="upcoming-list">
                            {pending.map(a => {
                                const d = new Date(a.eventDateStart);
                                const day = d.getDate().toString().padStart(2, '0');
                                const mon = d.toLocaleDateString('ru-RU', { month: 'short' }).replace('.', '');
                                const ev = events.find(e => e.eventId === a.eventId);
                                return (
                                    <div
                                        key={a.assignmentId}
                                        className="upcoming-item"
                                        onClick={() => navigate('/assignments')}
                                    >
                                        <div className="upcoming-thumb">
                                            <img src={posterFor(ev?.eventTypeId ?? 1)} alt="" />
                                            <span className="thumb-date">{day} {mon}</span>
                                        </div>
                                        <div className="upcoming-info">
                                            <div className="upcoming-title" title={a.eventName}>{a.eventName}</div>
                                            <div className="upcoming-meta">
                                                <span><Users size={12} /> {a.volunteerName}</span>
                                                <span className="dot-sep">·</span>
                                                <span>{a.roleName || 'роль не указана'}</span>
                                            </div>
                                        </div>
                                        <Badge variant="warning">ожидает</Badge>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>

                <UpcomingCard events={events} loading={loading} canCreate />
            </div>

            <div style={{ marginTop: 18, display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                <div className="card" style={{ flex: '1 1 260px' }}>
                    <div className="card-header">
                        <h3 className="card-title"><CalendarCheck2 size={16} /> Быстрые разделы</h3>
                    </div>
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                        <Button variant="secondary" size="sm" onClick={() => navigate('/calendar')}>
                            Календарь
                        </Button>
                        <Button variant="secondary" size="sm" onClick={() => navigate('/skills')}>
                            Навыки
                        </Button>
                        <Button variant="secondary" size="sm" onClick={() => navigate('/assignments')}>
                            Назначения
                        </Button>
                        <Button variant="secondary" size="sm" onClick={() => navigate('/reports')}>
                            Отчёты
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
}
