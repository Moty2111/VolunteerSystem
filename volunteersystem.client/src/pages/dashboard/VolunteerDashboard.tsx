import { useEffect, useMemo, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { eventsApi } from '../../api/events';
import { assignmentsApi } from '../../api/assignments';
import { volunteersApi } from '../../api/volunteers';
import { skillsApi, type VolunteerSkill } from '../../api/skills';
import type { EventItem, Assignment, Volunteer } from '../../types';
import { Badge, EmptyState, StatCard } from '../../components/ui';
import { IllCalendar, IllSprout } from '../../components/illustrations';
import { getLevel } from '../../utils/level';
import { formatHours, plural } from '../../utils/format';
import posterSocial from '../../assets/events/social.svg';
import posterEco from '../../assets/events/eco.svg';
import posterCulture from '../../assets/events/culture.svg';
import posterCharity from '../../assets/events/charity.svg';
import posterSport from '../../assets/events/sport.svg';
import posterEducation from '../../assets/events/education.svg';
import {
    Clock, CalendarCheck, Award, Trophy, Sparkles, Calendar, MapPin, Users,
    AlertTriangle, ArrowRight, UserPlus, CheckCircle2, ShieldCheck, Shield
} from 'lucide-react';
import { Hero, MonthlyHoursCard, greeting, calcUpcoming, type VolunteerSummaryRow } from './common';

const TYPE_POSTERS: Record<number, string> = {
    1: posterSocial, 2: posterEco, 3: posterCulture,
    4: posterCharity, 5: posterSport, 6: posterEducation
};
const posterFor = (typeId: number) => TYPE_POSTERS[typeId] || posterSocial;

/* резерв: если сводка недоступна, считаем часы из назначений */
const hoursFrom = (items: Assignment[]) =>
    items.reduce((s, a) => s + Number(a.hoursActual || 0), 0);

export default function VolunteerDashboard() {
    const { user } = useAuth();
    const navigate = useNavigate();

    const [loading, setLoading] = useState(true);
    const [events, setEvents] = useState<EventItem[]>([]);
    const [assignments, setAssignments] = useState<Assignment[]>([]);
    const [me, setMe] = useState<Volunteer | null>(null);
    const [skills, setSkills] = useState<VolunteerSkill[]>([]);

    const volunteerId = user?.volunteerId ?? null;

    useEffect(() => {
        (async () => {
            try {
                const [e, a] = await Promise.all([
                    eventsApi.getAll(),
                    assignmentsApi.my()
                ]);
                setEvents(e);
                setAssignments(a);

                if (volunteerId) {
                    const [profile, mySkills] = await Promise.all([
                        volunteersApi.getById(volunteerId).catch(() => null),
                        skillsApi.getVolunteerSkills(volunteerId).catch(() => [] as VolunteerSkill[])
                    ]);
                    setMe(profile);
                    setSkills(mySkills);
                }
            } catch { /* ignore */ }
            finally { setLoading(false); }
        })();
    }, [volunteerId]);

    const totalHours = hoursFrom(assignments);
    const level = getLevel(totalHours);

    const myEventIds = useMemo(() => new Set(assignments.map(a => a.eventId)), [assignments]);

    const myUpcoming = useMemo(
        () => [...assignments]
            .filter(a => new Date(a.eventDateStart) >= new Date())
            .sort((a, b) => new Date(a.eventDateStart).getTime() - new Date(b.eventDateStart).getTime())
            .slice(0, 4),
        [assignments]
    );

    const openEvents = useMemo(() => calcUpcoming(events, 4), [events]);

    /* своя медкнижка */
    const medIssue = useMemo(() => {
        if (!me?.medBookValidUntil) return 'none';
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const soon = new Date(today);
        soon.setDate(soon.getDate() + 30);
        const d = new Date(me.medBookValidUntil);
        if (d < today) return 'expired';
        if (d <= soon) return 'expiring';
        return 'ok';
    }, [me]);

    return (
        <div>
            <Hero
                title={
                    <>
                        {greeting()}, {user?.loginName}!
                        <Sparkles size={22} style={{ marginLeft: 10, verticalAlign: 'middle', opacity: 0.8 }} />
                    </>
                }
                subtitle={`Вы на уровне «${level.label}» и отработали ${formatHours(totalHours)}. Спасибо за вашу помощь!`}
                extra={
                    level.nextAt != null && (
                        <div style={{ marginTop: 16, maxWidth: 420 }}>
                            <div style={{
                                display: 'flex', justifyContent: 'space-between',
                                fontSize: 12, marginBottom: 6, opacity: 0.9
                            }}>
                                <span>До «{level.nextAt === 10 ? 'Активист' : level.nextAt === 50 ? 'Наставник' : 'Герой'}»</span>
                                <span className="num">{totalHours.toFixed(1)} / {level.nextAt} ч</span>
                            </div>
                            <div className="progress" style={{ background: 'rgba(255,255,255,0.2)' }}>
                                <div className="progress-fill" style={{
                                    width: `${level.progress * 100}%`,
                                    background: 'rgba(255,255,255,0.9)'
                                }} />
                            </div>
                        </div>
                    )
                }
                actions={
                    <>
                        <button className="btn btn-primary" onClick={() => navigate('/events')}>
                            <Calendar size={16} /> Найти мероприятие
                        </button>
                        <button className="btn btn-secondary" onClick={() => navigate('/my-progress')}>
                            <Trophy size={16} /> Мой прогресс
                        </button>
                    </>
                }
            />

            <div className="stat-grid">
                <StatCard
                    label="Мои часы"
                    value={loading ? '—' : formatHours(totalHours)}
                    icon={<Clock size={20} />}
                    color="var(--success)"
                    onClick={() => navigate('/my-progress')}
                    delay={0}
                />
                <StatCard
                    label="Моих назначений"
                    value={loading ? '—' : assignments.length}
                    icon={<CalendarCheck size={20} />}
                    color="var(--primary)"
                    onClick={() => navigate('/my-assignments')}
                    delay={0.06}
                />
                <StatCard
                    label="Мои навыки"
                    value={loading ? '—' : skills.length}
                    icon={<Award size={20} />}
                    color="#7c5cff"
                    onClick={() => navigate('/my-skills')}
                    delay={0.12}
                />
                <StatCard
                    label="Уровень"
                    value={loading ? '—' : level.label}
                    icon={<Trophy size={20} />}
                    color="var(--warning)"
                    onClick={() => navigate('/my-progress')}
                    delay={0.18}
                />
            </div>

            {!loading && me && medIssue !== 'ok' && (
                <div className="dash-alert">
                    <span className="dash-alert-icon"><AlertTriangle size={18} /></span>
                    <div className="dash-alert-body">
                        <strong>Медицинская книжка</strong>
                        <span>
                            {medIssue === 'expired'
                                ? 'просрочена — участие в мероприятиях с повышенными требованиями ограничено'
                                : medIssue === 'expiring'
                                    ? `истекает ${me.medBookValidUntil} — продлите заранее`
                                    : 'отсутствует — участие в мероприятиях с повышенными требованиями ограничено'}
                        </span>
                    </div>
                    <Link to="/profile" className="dash-alert-link">Мой профиль</Link>
                </div>
            )}

            <div className="dash-grid">
                <div className="card">
                    <div className="card-header">
                        <h3 className="card-title"><CalendarCheck size={16} /> Мои ближайшие</h3>
                        <Link to="/my-assignments" style={{ fontSize: 12, fontWeight: 600 }}>
                            Все <ArrowRight size={12} style={{ verticalAlign: 'middle' }} />
                        </Link>
                    </div>
                    {loading ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                            {[1, 2, 3].map(i => <div key={i} style={{ height: 64, borderRadius: 12, background: 'var(--surface-2)' }} />)}
                        </div>
                    ) : myUpcoming.length === 0 ? (
                        <EmptyState
                            illustration={<IllCalendar size={90} />}
                            title="Пока нет записей"
                            text="Запишитесь на мероприятие — оно появится здесь"
                            action={<button className="btn btn-primary btn-sm" onClick={() => navigate('/events')}>К мероприятиям</button>}
                        />
                    ) : (
                        <div className="upcoming-list">
                            {myUpcoming.map(a => {
                                const d = new Date(a.eventDateStart);
                                const day = d.getDate().toString().padStart(2, '0');
                                const mon = d.toLocaleDateString('ru-RU', { month: 'short' }).replace('.', '');
                                const ev = events.find(e => e.eventId === a.eventId);
                                return (
                                    <div key={a.assignmentId} className="upcoming-item" onClick={() => navigate('/my-assignments')}>
                                        <div className="upcoming-thumb">
                                            <img src={posterFor(ev?.eventTypeId ?? 1)} alt="" />
                                            <span className="thumb-date">{day} {mon}</span>
                                        </div>
                                        <div className="upcoming-info">
                                            <div className="upcoming-title" title={a.eventName}>{a.eventName}</div>
                                            <div className="upcoming-meta">
                                                <span><MapPin size={12} /> {ev?.location || '—'}</span>
                                                <span className="dot-sep">·</span>
                                                <span>{a.roleName || 'роль не указана'}</span>
                                            </div>
                                        </div>
                                        {a.confirmed
                                            ? <Badge variant="success"><CheckCircle2 size={11} style={{ marginRight: 4 }} />подтверждено</Badge>
                                            : <Badge variant="warning">ожидает</Badge>}
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>

                <div className="card">
                    <div className="card-header">
                        <h3 className="card-title"><UserPlus size={16} /> Куда можно записаться</h3>
                        <Link to="/events" style={{ fontSize: 12, fontWeight: 600 }}>
                            Все <ArrowRight size={12} style={{ verticalAlign: 'middle' }} />
                        </Link>
                    </div>
                    {loading ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                            {[1, 2, 3].map(i => <div key={i} style={{ height: 64, borderRadius: 12, background: 'var(--surface-2)' }} />)}
                        </div>
                    ) : openEvents.length === 0 ? (
                        <EmptyState
                            illustration={<IllSprout size={90} />}
                            title="Новых мероприятий нет"
                            text="Следите за обновлениями — скоро появятся"
                        />
                    ) : (
                        <div className="upcoming-list">
                            {openEvents.map(e => {
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
                                        <Badge variant={myEventIds.has(e.eventId) ? 'success' : 'info'}>
                                            {myEventIds.has(e.eventId) ? 'вы записаны' : 'открыто'}
                                        </Badge>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>

            <div style={{ marginTop: 18 }}>
                <MonthlyHoursCard assignments={assignments} loading={loading} title="Мои часы по месяцам" />
            </div>

            {!loading && me && (
                <div className="card" style={{ marginTop: 18 }}>
                    <div className="card-header">
                        <h3 className="card-title">
                            {me.medBookValidUntil ? <ShieldCheck size={16} /> : <Shield size={16} />}
                            Допуск к мероприятиям
                        </h3>
                    </div>
                    <div style={{ display: 'flex', gap: 18, flexWrap: 'wrap', fontSize: 13, color: 'var(--text-2)' }}>
                        <span>
                            <strong>Медкнижка:</strong>{' '}
                            {me.medBookValidUntil ? `до ${me.medBookValidUntil}` : 'нет'}
                        </span>
                        <span>
                            <strong>Город:</strong> {me.city}
                        </span>
                        <span>
                            <strong>Статус:</strong>{' '}
                            {me.isActive ? 'активен' : 'неактивен'}
                        </span>
                        <span>
                            <strong>Навыков в профиле:</strong> {skills.length}{' '}
                            {plural(skills.length, ['навык', 'навыка', 'навыков'])}
                        </span>
                    </div>
                </div>
            )}
        </div>
    );
}
