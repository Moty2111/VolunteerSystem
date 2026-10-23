import { useEffect, useState, useMemo, type FormEvent } from 'react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../components/Toast';
import { volunteersApi } from '../api/volunteers';
import { authApi } from '../api/auth';
import { assignmentsApi } from '../api/assignments';
import { skillsApi, type VolunteerSkill } from '../api/skills';
import { Avatar, Badge, Skeleton } from '../components/ui';
import { getLevel } from '../utils/level';
import { plural } from '../utils/format';
import {
    User, Mail, Phone, MapPin, Save, Lock, ShieldCheck, AtSign, CalendarDays,
    Clock, CalendarCheck, Sparkles, Award, Activity, HeartPulse, BadgeCheck,
    Upload, Eye, Medal, Users, Leaf, Palette, HeartHandshake, Trophy,
    GraduationCap, Car, ClipboardList, type LucideIcon
} from 'lucide-react';
import type { Volunteer, Assignment, AchievementBadge } from '../types';

const BADGE_ICONS: Record<string, LucideIcon> = {
    'hours-10': Clock,
    'hours-50': Clock,
    'hours-100': Clock,
    veteran: Medal,
    'month-active': CalendarCheck,
    social: Users,
    eco: Leaf,
    culture: Palette,
    charity: HeartHandshake,
    sport: Trophy,
    education: GraduationCap,
    medic: HeartPulse,
    driver: Car,
    organizer: ClipboardList
};
const badgeIcon = (code: string) => BADGE_ICONS[code] || Award;

export default function ProfilePage() {
    const { user, token } = useAuth();
    const toast = useToast();
    const [volunteer, setVolunteer] = useState<Volunteer | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [changingPw, setChangingPw] = useState(false);
    const [myAssignments, setMyAssignments] = useState<Assignment[]>([]);
    const [mySkills, setMySkills] = useState<VolunteerSkill[]>([]);
    const [badges, setBadges] = useState<AchievementBadge[]>([]);

    const [form, setForm] = useState({
        fullName: '',
        email: '',
        phone: '',
        city: ''
    });

    const [medBookFile, setMedBookFile] = useState<File | null>(null);
    const [medBookDate, setMedBookDate] = useState('');
    const [uploadingMedBook, setUploadingMedBook] = useState(false);
    const [openingScan, setOpeningScan] = useState(false);

    const [pwForm, setPwForm] = useState({ current: '', next: '', confirm: '' });

    useEffect(() => {
        (async () => {
            if (!user?.volunteerId) {
                setLoading(false);
                return;
            }
            try {
                const v = await volunteersApi.getById(user.volunteerId);
                setVolunteer(v);
                setForm({
                    fullName: v.fullName,
                    email: v.email,
                    phone: v.phone,
                    city: v.city
                });
                setMedBookDate(v.medBookValidUntil || '');
            } catch {
                toast.error('Не удалось загрузить профиль');
            } finally {
                setLoading(false);
            }
            // статистика профиля: часы, участия, навыки, достижения
            try {
                const [as, sk, ach] = await Promise.all([
                    assignmentsApi.my(),
                    skillsApi.getVolunteerSkills(user.volunteerId),
                    volunteersApi.achievements(user.volunteerId).catch(() => null)
                ]);
                setMyAssignments(as);
                setMySkills(sk);
                setBadges(ach?.badges ?? []);
            } catch { /* статистика не критична */ }
        })();
    }, [user]);

    const stats = useMemo(() => {
        const confirmed = myAssignments.filter(a => a.confirmed);
        const hours = confirmed.reduce((s, a) => s + Number(a.hoursActual || 0), 0);
        const events = new Set(myAssignments.map(a => a.eventId)).size;
        const pending = myAssignments.filter(a => !a.confirmed).length;
        return { hours, events, pending, skills: mySkills.length };
    }, [myAssignments, mySkills]);

    const level = getLevel(stats.hours);

    /* срок действия JWT из токена (поле exp) */
    const tokenExpiresAt = useMemo(() => {
        try {
            const b64 = (token || '').split('.')[1] || '';
            const json = atob(b64.replace(/-/g, '+').replace(/_/g, '/'));
            const payload = JSON.parse(json);
            return payload.exp
                ? new Date(payload.exp * 1000).toLocaleString('ru-RU')
                : '—';
        } catch { return '—'; }
    }, [token]);

    const handleSave = async (e: FormEvent) => {
        e.preventDefault();
        if (!volunteer) return;
        if (!form.fullName.trim() || !form.email.trim()) {
            toast.error('ФИО и Email обязательны');
            return;
        }
        setSaving(true);
        try {
            await volunteersApi.update(volunteer.volunteerId, {
                fullName: form.fullName.trim(),
                email: form.email.trim(),
                phone: form.phone.trim(),
                city: form.city.trim(),
                isActive: volunteer.isActive
            });
            toast.success('Профиль сохранён');
            setVolunteer(await volunteersApi.getById(volunteer.volunteerId));
        } catch (e: unknown) {
            const err = e as { response?: { data?: { message?: string } } };
            toast.error(err.response?.data?.message || 'Ошибка сохранения');
        } finally {
            setSaving(false);
        }
    };

    const handleChangePassword = async (e: FormEvent) => {        e.preventDefault();
        if (pwForm.next !== pwForm.confirm) {
            toast.error('Пароли не совпадают');
            return;
        }
        if (pwForm.next.length < 6) {
            toast.error('Минимум 6 символов');
            return;
        }
        setChangingPw(true);
        try {
            const res = await authApi.changePassword({
                currentPassword: pwForm.current,
                newPassword: pwForm.next
            });
            toast.success(res.message || 'Пароль обновлён');
            setPwForm({ current: '', next: '', confirm: '' });
        } catch (e: unknown) {
            const err = e as { response?: { data?: { message?: string } } };
            toast.error(err.response?.data?.message || 'Не удалось сменить пароль');
        } finally {
            setChangingPw(false);
        }
    };

    // ---------- Медкнижка ----------

    const handleUploadMedBook = async () => {
        if (!volunteer) return;
        if (!medBookFile) {
            toast.error('Выберите файл скана');
            return;
        }
        setUploadingMedBook(true);
        try {
            const fd = new FormData();
            fd.append('file', medBookFile);
            if (medBookDate) fd.append('validUntil', medBookDate);
            const updated = await volunteersApi.uploadMedBook(volunteer.volunteerId, fd);
            setVolunteer(updated);
            setMedBookFile(null);
            toast.success('Скан отправлен на проверку');
        } catch (e: unknown) {
            const err = e as { response?: { data?: { message?: string } } };
            toast.error(err.response?.data?.message || 'Ошибка загрузки скана');
        } finally {
            setUploadingMedBook(false);
        }
    };

    const handleOpenScan = async () => {
        if (!volunteer) return;
        setOpeningScan(true);
        try {
            const blob = await volunteersApi.fetchMedBookScan(volunteer.volunteerId);
            const url = URL.createObjectURL(blob);
            window.open(url, '_blank', 'noopener');
            setTimeout(() => URL.revokeObjectURL(url), 60000);
        } catch (e: unknown) {
            const err = e as { response?: { data?: { message?: string } } };
            toast.error(err.response?.data?.message || 'Не удалось открыть скан');
        } finally {
            setOpeningScan(false);
        }
    };

    // ---------- Блок «Аккаунт» (общий для всех ролей) ----------
    const accountCard = (
        <form className="card" onSubmit={handleChangePassword}>
            <h3 className="section-title">
                <Lock size={18} className="section-title-icon" />
                Аккаунт и пароль
            </h3>

            <div className="account-row">
                <div className="account-item">
                    <span className="account-item-label"><AtSign size={13} /> Логин</span>
                    <span className="account-item-value">{user?.loginName}</span>
                </div>
                <div className="account-item">
                    <span className="account-item-label"><ShieldCheck size={13} /> Роль</span>
                    <span className="account-item-value">{user?.role}</span>
                </div>
            </div>

            <div className="field">
                <label className="field-label">Текущий пароль</label>
                <input
                    type="password"
                    className="input"
                    autoComplete="current-password"
                    value={pwForm.current}
                    onChange={e => setPwForm({ ...pwForm, current: e.target.value })}
                    required
                />
            </div>

            <div className="field">
                <label className="field-label">Новый пароль</label>
                <input
                    type="password"
                    className="input"
                    autoComplete="new-password"
                    minLength={6}
                    value={pwForm.next}
                    onChange={e => setPwForm({ ...pwForm, next: e.target.value })}
                    required
                />
                <div className="field-hint">Пароли хранятся в системе открытым текстом — как требуется в курсовом проекте.</div>
            </div>

            <div className="field">
                <label className="field-label">Повторите новый пароль</label>
                <input
                    type="password"
                    className="input"
                    autoComplete="new-password"
                    minLength={6}
                    value={pwForm.confirm}
                    onChange={e => setPwForm({ ...pwForm, confirm: e.target.value })}
                    required
                />
            </div>

            <button type="submit" className="btn btn-primary" disabled={changingPw}>
                {changingPw ? <span className="spinner" /> : <><Lock size={15} /> Сменить пароль</>}
            </button>
        </form>
    );

    // ---------- Загрузка ----------
    if (loading) {
        return (
            <div>
                <div className="page-header">
                    <div>
                        <h1 className="page-title">Мой профиль</h1>
                        <p className="page-subtitle">Управление аккаунтом</p>
                    </div>
                </div>
                <Skeleton height={200} radius={16} />
            </div>
        );
    }

    // ---------- Аккаунт без волонтёрской карточки (админ/менеджер) ----------
    if (!volunteer) {
        return (
            <div>
                <div className="page-header">
                    <div>
                        <h1 className="page-title">Мой профиль</h1>
                        <p className="page-subtitle">Управление учётной записью</p>
                    </div>
                </div>

                <div className="card profile-hero">
                    <Avatar name={user?.loginName || 'U'} size="xl" />
                    <div>
                        <div className="profile-hero-name">{user?.loginName}</div>
                        <Badge variant="primary">{user?.role}</Badge>
                    </div>
                </div>

                <div className="profile-grid">
                    {accountCard}
                    <div className="card">
                        <h3 className="section-title">
                            <User size={18} className="section-title-icon" />
                            О профиле
                        </h3>

                        <div className="account-row">
                            <div className="account-item">
                                <span className="account-item-label"><AtSign size={13} /> Логин</span>
                                <span className="account-item-value">{user?.loginName}</span>
                            </div>
                            <div className="account-item">
                                <span className="account-item-label"><ShieldCheck size={13} /> Роль</span>
                                <span className="account-item-value">{user?.role}</span>
                            </div>
                        </div>

                        <div className="account-row">
                            <div className="account-item">
                                <span className="account-item-label"><Activity size={13} /> Учётная запись</span>
                                <span className="account-item-value">системная (без карточки волонтёра)</span>
                            </div>
                            <div className="account-item">
                                <span className="account-item-label"><CalendarDays size={13} /> Сессия истекает</span>
                                <span className="account-item-value">{tokenExpiresAt}</span>
                            </div>
                        </div>

                        <div className="field-hint" style={{ marginTop: 4 }}>
                            <strong>Доступные разделы:</strong> волонтёры, назначения, навыки,
                            мероприятия, партнёры и отчёты. Карточка волонтёра к вашей роли
                            не привязана — часы и уровень начинаются после первого назначения.
                        </div>

                        <p style={{ color: 'var(--text-2)', fontSize: 13.5, lineHeight: 1.6, marginTop: 10 }}>
                            Сменить пароль и данные учётной записи можно в карточке слева.
                        </p>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div>
            <div className="page-header">
                <div>
                    <h1 className="page-title">Мой профиль</h1>
                    <p className="page-subtitle">Просмотр и редактирование данных</p>
                </div>
            </div>

            {/* Шапка профиля */}
            <div className="card profile-hero">
                <div className="avatar-ring">
                    <Avatar name={volunteer.fullName} size="xl" />
                </div>
                <div style={{ flex: 1, minWidth: 200 }}>
                    <div className="profile-hero-name">{volunteer.fullName}</div>
                    <div className="profile-badges">
                        <span className={`level-pill level-${level.key}`}>
                            <span className="level-dot" />
                            {level.label}
                        </span>
                        {volunteer.medBookStatus === 'Подтверждена' ? (
                            <span
                                className="cool-tip"
                                data-tip={`Медкнижка действует до ${new Date(volunteer.medBookValidUntil!).toLocaleDateString('ru-RU')} — открывает доступ к социальным, благотворительным и образовательным мероприятиям.`}
                            >
                                <Badge variant="success" icon={<HeartPulse size={12} />}>
                                    медкнижка подтверждена · до {volunteer.medBookValidUntil}
                                </Badge>
                            </span>
                        ) : volunteer.medBookStatus === 'На проверке' ? (
                            <span
                                className="cool-tip"
                                data-tip="Скан медкнижки отправлен на проверку. Обычно это занимает не больше дня."
                            >
                                <Badge variant="warning" icon={<Clock size={12} />}>
                                    медкнижка на проверке
                                </Badge>
                            </span>
                        ) : volunteer.medBookStatus === 'Отклонена' ? (
                            <span
                                className="cool-tip"
                                data-tip={volunteer.medBookComment ? `Причина: ${volunteer.medBookComment}` : 'Медкнижка отклонена — загрузите корректный скан.'}
                            >
                                <Badge variant="danger" icon={<HeartPulse size={12} />}>
                                    медкнижка отклонена
                                </Badge>
                            </span>
                        ) : volunteer.medBookStatus === 'Просрочена' ? (
                            <span
                                className="cool-tip"
                                data-tip="Срок действия медкнижки истёк — продлите её или загрузите новый скан."
                            >
                                <Badge variant="danger" icon={<HeartPulse size={12} />}>
                                    медкнижка просрочена
                                </Badge>
                            </span>
                        ) : (
                            <span
                                className="cool-tip"
                                data-tip="Медкнижки нет — участие в мероприятиях с повышенными требованиями к здоровью будет ограничено."
                            >
                                <Badge variant="muted" icon={<HeartPulse size={12} />}>нет медкнижки</Badge>
                            </span>
                        )}
                        <Badge variant={volunteer.isActive ? 'success' : 'muted'}>
                            {volunteer.isActive ? 'активен' : 'неактивен'}
                        </Badge>
                        <Badge variant="info">{user?.role}</Badge>
                    </div>
                    <div className="profile-contacts">
                        <span><Mail size={14} /> {volunteer.email}</span>
                        <span><Phone size={14} /> {volunteer.phone}</span>
                        <span><MapPin size={14} /> {volunteer.city}</span>
                        <span><CalendarDays size={14} /> дата рождения: {volunteer.birthDate}</span>
                    </div>
                </div>
            </div>

            {/* Статистика волонтёра */}
            <div className="profile-stats">
                <div className="profile-stat" style={{ ['--stat-color' as string]: 'var(--primary)' }}>
                    <span className="profile-stat-icon"><Clock size={17} /></span>
                    <span className="profile-stat-value num">{stats.hours.toFixed(1)}</span>
                    <span className="profile-stat-label">часов отработано</span>
                </div>
                <div className="profile-stat" style={{ ['--stat-color' as string]: 'var(--accent)' }}>
                    <span className="profile-stat-icon"><CalendarCheck size={17} /></span>
                    <span className="profile-stat-value num">{stats.events}</span>
                    <span className="profile-stat-label">
                        мероприятий {stats.events > 0 ? `(${plural(stats.events, ['участие', 'участия', 'участий'])})` : ''}
                    </span>
                </div>
                <div className="profile-stat" style={{ ['--stat-color' as string]: 'var(--success)' }}>
                    <span className="profile-stat-icon"><Award size={17} /></span>
                    <span className="profile-stat-value num">{stats.skills}</span>
                    <span className="profile-stat-label">
                        навыков {stats.skills > 0 ? 'в карточке' : 'пока нет'}
                    </span>
                </div>
                <div className="profile-stat" style={{ ['--stat-color' as string]: 'var(--warning)' }}>
                    <span className="profile-stat-icon"><Sparkles size={17} /></span>
                    <span className="profile-stat-value" style={{ fontSize: 17 }}>{level.label}</span>
                    <span className="profile-stat-label">
                        {level.nextAt
                            ? `до следующего уровня: ${(level.nextAt - stats.hours).toFixed(1)} ч`
                            : 'высший уровень'}
                    </span>
                </div>
            </div>

            {stats.pending > 0 && (
                <div className="card" style={{ marginTop: 14, display: 'flex', gap: 12, alignItems: 'center' }}>
                    <span className="activity-icon" style={{ ['--act-color' as string]: 'var(--warning)' }}>
                        <Activity size={16} />
                    </span>
                    <div style={{ flex: 1, fontSize: 13.5 }}>
                        <strong>{stats.pending}</strong>{' '}
                        {plural(stats.pending, ['назначение ждёт', 'назначения ждут', 'назначений ждут'])} подтверждения часов
                    </div>
                    <Badge variant="warning" icon={<BadgeCheck size={12} />}>ожидает</Badge>
                </div>
            )}

            {/* Достижения */}
            {badges.length > 0 && (
                <div className="card" style={{ marginTop: 14 }}>
                    <div className="profile-medbook-head">
                        <h3 className="section-title" style={{ marginBottom: 0 }}>
                            <Award size={18} className="section-title-icon" />
                            Достижения
                        </h3>
                        <Badge variant="primary">
                            {badges.filter(b => b.earned).length} из {badges.length}
                        </Badge>
                    </div>
                    <div className="badge-grid">
                        {badges.map(b => {
                            const Icon = badgeIcon(b.code);
                            return (
                                <div key={b.code} className={`badge-card ${b.earned ? 'is-earned' : ''}`}>
                                    <span className="badge-icon"><Icon size={20} /></span>
                                    <div className="badge-body">
                                        <div className="badge-title">{b.title}</div>
                                        <div className="badge-desc">{b.description}</div>
                                        {!b.earned && b.target > 1 && (
                                            <div className="progress" style={{ height: 4, marginTop: 8 }}>
                                                <div className="progress-fill" style={{ width: `${Math.round(b.progress * 100)}%` }} />
                                            </div>
                                        )}
                                        {b.target > 1 && (
                                            <div className="badge-count num">
                                                {b.current} / {b.target}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* Медкнижка */}
            <div className="card profile-medbook">
                <div className="profile-medbook-head">
                    <h3 className="section-title" style={{ marginBottom: 0 }}>
                        <HeartPulse size={18} className="section-title-icon" />
                        Медкнижка
                    </h3>
                    {(() => {
                        const s = volunteer.medBookStatus;
                        if (s === 'Подтверждена')
                            return <Badge variant="success" icon={<HeartPulse size={12} />}>Подтверждена</Badge>;
                        if (s === 'На проверке')
                            return <Badge variant="warning" icon={<Clock size={12} />}>На проверке</Badge>;
                        if (s === 'Отклонена')
                            return <Badge variant="danger" icon={<HeartPulse size={12} />}>Отклонена</Badge>;
                        if (s === 'Просрочена')
                            return <Badge variant="danger" icon={<HeartPulse size={12} />}>Просрочена</Badge>;
                        return <Badge variant="muted" icon={<HeartPulse size={12} />}>Не загружена</Badge>;
                    })()}
                </div>

                <div className="profile-medbook-info">
                    <div className="account-row">
                        <div className="account-item">
                            <span className="account-item-label"><CalendarDays size={13} /> Срок действия</span>
                            <span className="account-item-value">
                                {volunteer.medBookValidUntil
                                    ? `до ${new Date(volunteer.medBookValidUntil).toLocaleDateString('ru-RU')}`
                                    : 'не указан'}
                            </span>
                        </div>
                        <div className="account-item">
                            <span className="account-item-label"><ShieldCheck size={13} /> Статус</span>
                            <span className="account-item-value">{volunteer.medBookStatus || 'Не загружена'}</span>
                        </div>
                    </div>

                    {volunteer.medBookUploadedAt && (
                        <div className="account-row">
                            <div className="account-item">
                                <span className="account-item-label"><CalendarCheck size={13} /> Загружен</span>
                                <span className="account-item-value">
                                    {new Date(volunteer.medBookUploadedAt).toLocaleDateString('ru-RU', {
                                        day: 'numeric', month: 'long', year: 'numeric'
                                    })}
                                </span>
                            </div>
                            {volunteer.medBookVerifiedAt && (
                                <div className="account-item">
                                    <span className="account-item-label"><BadgeCheck size={13} /> Проверен</span>
                                    <span className="account-item-value">
                                        {new Date(volunteer.medBookVerifiedAt).toLocaleDateString('ru-RU', {
                                            day: 'numeric', month: 'long', year: 'numeric'
                                        })}
                                    </span>
                                </div>
                            )}
                        </div>
                    )}

                    {volunteer.medBookComment && (
                        <div className="profile-medbook-comment">
                            <strong>Комментарий:</strong> {volunteer.medBookComment}
                        </div>
                    )}

                    {volunteer.medBookScanPath && (
                        <div className="profile-medbook-scan-row">
                            <button
                                type="button"
                                className="btn btn-secondary btn-sm"
                                onClick={handleOpenScan}
                                disabled={openingScan}
                            >
                                {openingScan ? <span className="spinner" /> : <Eye size={14} />}
                                Открыть скан
                            </button>
                        </div>
                    )}
                </div>

                <div className="profile-medbook-upload">
                    <div className="form-row">
                        <div className="field">
                            <label className="field-label">Действительна до</label>
                            <input
                                type="date"
                                className="input"
                                value={medBookDate}
                                onChange={e => setMedBookDate(e.target.value)}
                            />
                        </div>
                        <div className="field">
                            <label className="field-label">Скан (PDF/JPG/PNG до 10 МБ)</label>
                            <label className="reg-medbook-file">
                                <input
                                    type="file"
                                    accept=".pdf,.jpg,.jpeg,.png"
                                    onChange={e => setMedBookFile(e.target.files?.[0] ?? null)}
                                />
                                <span className="reg-medbook-file-btn"><Upload size={14} /> Выбрать файл</span>
                                <span className="reg-medbook-file-name">
                                    {medBookFile ? medBookFile.name : 'файл не выбран'}
                                </span>
                            </label>
                        </div>
                    </div>
                    <button
                        type="button"
                        className="btn btn-primary"
                        onClick={handleUploadMedBook}
                        disabled={uploadingMedBook || !medBookFile}
                    >
                        {uploadingMedBook ? <span className="spinner" /> : <Upload size={15} />}
                        Отправить на проверку
                    </button>
                    <div className="field-hint" style={{ marginTop: 10 }}>
                        Подать скан может сам волонтёр — заявки не нужны. После проверки менеджером
                        медкнижка откроет доступ к социальным, благотворительным и образовательным мероприятиям.
                    </div>
                </div>
            </div>

            <div className="profile-grid">
                {/* Редактирование личных данных */}
                <form className="card" onSubmit={handleSave}>
                    <h3 className="section-title">
                        <User size={18} className="section-title-icon" />
                        Личные данные
                    </h3>

                    <div className="field">
                        <label className="field-label">ФИО</label>
                        <input
                            className="input"
                            value={form.fullName}
                            onChange={e => setForm({ ...form, fullName: e.target.value })}
                            required
                        />
                    </div>

                    <div className="field">
                        <label className="field-label">Email</label>
                        <input
                            type="email"
                            className="input"
                            value={form.email}
                            onChange={e => setForm({ ...form, email: e.target.value })}
                            required
                        />
                    </div>

                    <div className="form-row">
                        <div className="field">
                            <label className="field-label">Телефон</label>
                            <input
                                className="input"
                                value={form.phone}
                                onChange={e => setForm({ ...form, phone: e.target.value })}
                                required
                            />
                        </div>
                        <div className="field">
                            <label className="field-label">Город</label>
                            <input
                                className="input"
                                value={form.city}
                                onChange={e => setForm({ ...form, city: e.target.value })}
                                required
                            />
                        </div>
                    </div>

                    <button type="submit" className="btn btn-primary" disabled={saving}>
                        {saving ? <span className="spinner" /> : <><Save size={15} /> Сохранить</>}
                    </button>
                </form>

                {accountCard}
            </div>
        </div>
    );
}
