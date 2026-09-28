import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { reportsApi } from '../../api/reports';
import { eventsApi } from '../../api/events';
import { assignmentsApi } from '../../api/assignments';
import { volunteersApi } from '../../api/volunteers';
import type { EventItem, Assignment, Volunteer } from '../../types';
import { StatCard } from '../../components/ui';
import { formatHours, plural } from '../../utils/format';
import {
    Users, Clock, Briefcase, TrendingUp, Plus, Sparkles, UserCheck, Award
} from 'lucide-react';
import {
    Hero, MonthlyHoursCard, EventsStatusCard, UpcomingCard, MedAlert,
    ActivityCard, LeadersCard, greeting, calcMedIssues,
    type VolunteerSummaryRow
} from './common';

export default function AdminDashboard() {
    const { user } = useAuth();
    const navigate = useNavigate();

    const [loading, setLoading] = useState(true);
    const [summary, setSummary] = useState<VolunteerSummaryRow[]>([]);
    const [events, setEvents] = useState<EventItem[]>([]);
    const [partners, setPartners] = useState<unknown[]>([]);
    const [assignments, setAssignments] = useState<Assignment[]>([]);
    const [volunteers, setVolunteers] = useState<Volunteer[]>([]);

    useEffect(() => {
        (async () => {
            try {
                const [s, e, p, a, v] = await Promise.all([
                    reportsApi.volunteerSummary() as Promise<VolunteerSummaryRow[]>,
                    eventsApi.getAll(),
                    reportsApi.partnerReport() as Promise<unknown[]>,
                    assignmentsApi.getAll(),
                    volunteersApi.getAll()
                ]);
                setSummary(s);
                setEvents(e);
                setPartners(p);
                setAssignments(a);
                setVolunteers(v);
            } catch { /* ignore */ }
            finally { setLoading(false); }
        })();
    }, []);

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
                subtitle={`За всё время волонтёры отработали ${formatHours(stats.hours)} и приняли участие в ${stats.participations} ${plural(stats.participations, ['мероприятии', 'мероприятиях', 'мероприятиях'])}.`}
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
                    label="Волонтёров"
                    value={loading ? '—' : stats.volunteers}
                    icon={<Users size={20} />}
                    color="var(--primary)"
                    onClick={() => navigate('/volunteers')}
                    delay={0}
                />
                <StatCard
                    label="Участий"
                    value={loading ? '—' : stats.participations}
                    icon={<TrendingUp size={20} />}
                    color="#7c5cff"
                    onClick={() => navigate('/assignments')}
                    delay={0.06}
                />
                <StatCard
                    label="Часов отработано"
                    value={loading ? '—' : stats.hours.toFixed(1)}
                    icon={<Clock size={20} />}
                    color="var(--success)"
                    onClick={() => navigate('/reports')}
                    delay={0.12}
                />
                <StatCard
                    label="Партнёров"
                    value={loading ? '—' : stats.partners}
                    icon={<Briefcase size={20} />}
                    color="var(--warning)"
                    onClick={() => navigate('/partners')}
                    delay={0.18}
                />
            </div>

            {!loading && <MedAlert expired={medIssues.expired} expiring={medIssues.expiring} />}

            <div className="dash-grid">
                <MonthlyHoursCard assignments={assignments} loading={loading} />
                <EventsStatusCard events={events} loading={loading} />
            </div>

            <div className="dash-grid-wide">
                <LeadersCard leaders={leaders} loading={loading} />
                <UpcomingCard events={events} loading={loading} canCreate />
            </div>

            <div style={{ marginTop: 18, display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                <div className="card" style={{ flex: '1 1 260px' }}>
                    <div className="card-header">
                        <h3 className="card-title"><UserCheck size={16} /> Быстрые разделы</h3>
                    </div>
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                        <button className="btn btn-secondary btn-sm" onClick={() => navigate('/audit')}>
                            Журнал аудита
                        </button>
                        <button className="btn btn-secondary btn-sm" onClick={() => navigate('/users')}>
                            Учётные записи
                        </button>
                        <button className="btn btn-secondary btn-sm" onClick={() => navigate('/calendar')}>
                            Календарь
                        </button>
                        <button className="btn btn-secondary btn-sm" onClick={() => navigate('/skills')}>
                            <Award size={14} /> Навыки
                        </button>
                    </div>
                </div>
            </div>

            <div style={{ marginTop: 18 }}>
                <ActivityCard loading={loading} />
            </div>
        </div>
    );
}
