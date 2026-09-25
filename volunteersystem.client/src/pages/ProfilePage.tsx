import { useEffect, useState, type FormEvent } from 'react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../components/Toast';
import { volunteersApi } from '../api/volunteers';
import { Avatar, Badge, Skeleton } from '../components/ui';
import { getLevel } from '../utils/level';
import { User, Mail, Phone, MapPin, Save, Lock } from 'lucide-react';
import type { Volunteer } from '../types';

export default function ProfilePage() {
    const { user } = useAuth();
    const toast = useToast();
    const [volunteer, setVolunteer] = useState<Volunteer | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    const [form, setForm] = useState({
        fullName: '',
        phone: '',
        city: '',
        medBookValidUntil: ''
    });

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
                    phone: v.phone,
                    city: v.city,
                    medBookValidUntil: v.medBookValidUntil || ''
                });
            } catch {
                toast.error('Не удалось загрузить профиль');
            } finally {
                setLoading(false);
            }
        })();
    }, [user]);

    const handleSave = async (e: FormEvent) => {
        e.preventDefault();
        if (!volunteer) return;
        setSaving(true);
        try {
            await volunteersApi.update(volunteer.volunteerId, {
                fullName: form.fullName,
                phone: form.phone,
                city: form.city,
                medBookValidUntil: form.medBookValidUntil || null,
                isActive: volunteer.isActive
            });
            toast.success('Профиль сохранён');
            const updated = await volunteersApi.getById(volunteer.volunteerId);
            setVolunteer(updated);
        } catch (e: unknown) {
            const err = e as { response?: { data?: { message?: string } } };
            toast.error(err.response?.data?.message || 'Ошибка сохранения');
        } finally {
            setSaving(false);
        }
    };

    const handleChangePassword = (e: FormEvent) => {
        e.preventDefault();
        if (pwForm.next !== pwForm.confirm) {
            toast.error('Пароли не совпадают');
            return;
        }
        if (pwForm.next.length < 6) {
            toast.error('Минимум 6 символов');
            return;
        }
        toast.info('Смена пароля: в демо не реализовано');
        setPwForm({ current: '', next: '', confirm: '' });
    };

    if (loading) {
        return (
            <div>
            <div className= "page-header" >
            <div><h1 className="page-title" > Мой профиль < /h1></div >
                </div>
                < Skeleton height = { 200} radius = { 16} />
                    </div>
    );
    }

    if (!volunteer) {
        return (
            <div>
            <div className= "page-header" >
            <div>
            <h1 className="page-title" > Мой профиль </h1>
                < p className = "page-subtitle" > Управление аккаунтом </p>
                    </div>
                    </div>
                    < div className = "card" >
                        <p style={ { color: 'var(--text-2)' } }>
                            Для вашей роли(Администратор / Менеджер) профиль волонтёра не привязан.
            Здесь отображается только информация об учётной записи.
          </p>
            < div style = {{ marginTop: 20, display: 'flex', gap: 14, alignItems: 'center' }
    }>
        <Avatar name={ user?.loginName || 'U' } size = "lg" />
            <div>
            <div style={ { fontFamily: 'var(--font-head)', fontSize: 18, fontWeight: 700 } }>
            { user?.loginName }
                </div>
                < Badge variant = "primary" style = {{ marginTop: 6 }
}> { user?.role } </Badge>
    </div>
    </div>
    </div>
    </div>
    );
  }

const level = getLevel(0);

return (
    <div>
    <div className= "page-header" >
    <div>
    <h1 className="page-title" > Мой профиль </h1>
        < p className = "page-subtitle" > Просмотр и редактирование данных </p>
            </div>
            </div>

{/* Шапка профиля */ }
<div className="card" style = {{ marginBottom: 20 }}>
    <div style={ { display: 'flex', gap: 20, alignItems: 'flex-start', flexWrap: 'wrap' } }>
        <Avatar name={ volunteer.fullName } size = "xl" />
            <div style={ { flex: 1, minWidth: 200 } }>
                <h2 style={ { fontFamily: 'var(--font-head)', fontSize: 22, fontWeight: 800, marginBottom: 8 } }>
                { volunteer.fullName }
                    </h2>
                    < div style = {{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
                        <span className={ `level-pill level-${level.key}` }>
                            <span className="level-dot" />
                            { level.label }
                                </span>
{
    volunteer.medBookValidUntil
    ? <Badge variant="success" > медкнижка до { volunteer.medBookValidUntil } </Badge>
                : <Badge variant="danger" > нет медкнижки </Badge>
}
<Badge variant={ volunteer.isActive ? 'success' : 'muted' }>
{ volunteer.isActive ? 'активен' : 'неактивен' }
    </Badge>
    </div>
    < div style = {{ display: 'flex', gap: 16, flexWrap: 'wrap', fontSize: 13, color: 'var(--text-2)' }}>
        <span style={ { display: 'flex', alignItems: 'center', gap: 6 } }>
            <Mail size={ 14 } /> {volunteer.email}
                </span>
                < span style = {{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Phone size={ 14 } /> {volunteer.phone}
                        </span>
                        < span style = {{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <MapPin size={ 14 } /> {volunteer.city}
                                </span>
                                </div>
                                </div>
                                </div>
                                </div>

                                < div style = {{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                                {/* Редактирование */ }
                                    < form className = "card" onSubmit = { handleSave } >
                                        <h3 style={ { fontFamily: 'var(--font-head)', fontSize: 16, fontWeight: 700, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 } }>
                                            <User size={ 18 } style = {{ color: 'var(--primary)' }} />
            Личные данные
    </h3>

    < div className = "field" >
        <label className="field-label" > ФИО </label>
            < input className = "input" value = { form.fullName }
onChange = { e => setForm({ ...form, fullName: e.target.value })} />
    </div>

    < div className = "field" >
        <label className="field-label" > Телефон </label>
            < input className = "input" value = { form.phone }
onChange = { e => setForm({ ...form, phone: e.target.value })} />
    </div>

    < div className = "field" >
        <label className="field-label" > Город </label>
            < input className = "input" value = { form.city }
onChange = { e => setForm({ ...form, city: e.target.value })} />
    </div>

    < div className = "field" >
        <label className="field-label" > Медкнижка(действительна до) </label>
            < input type = "date" className = "input" value = { form.medBookValidUntil }
onChange = { e => setForm({ ...form, medBookValidUntil: e.target.value })} />
    </div>

    < button type = "submit" className = "btn btn-primary" disabled = { saving } >
        { saving?<span className = "spinner" /> : <><Save size={ 15 } /> Сохранить</ >}
</button>
    </form>

{/* Смена пароля */ }
<form className="card" onSubmit = { handleChangePassword } >
    <h3 style={ { fontFamily: 'var(--font-head)', fontSize: 16, fontWeight: 700, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 } }>
        <Lock size={ 18 } style = {{ color: 'var(--primary)' }} />
            Смена пароля
    </h3>

    < div className = "field" >
        <label className="field-label" > Текущий пароль </label>
            < input type = "password" className = "input" value = { pwForm.current }
onChange = { e => setPwForm({ ...pwForm, current: e.target.value })} />
    </div>

    < div className = "field" >
        <label className="field-label" > Новый пароль </label>
            < input type = "password" className = "input" value = { pwForm.next }
onChange = { e => setPwForm({ ...pwForm, next: e.target.value })} />
    </div>

    < div className = "field" >
        <label className="field-label" > Повторите пароль </label>
            < input type = "password" className = "input" value = { pwForm.confirm }
onChange = { e => setPwForm({ ...pwForm, confirm: e.target.value })} />
    </div>

    < button type = "submit" className = "btn btn-secondary" >
        <Lock size={ 15 } /> Сменить пароль
            </button>
            </form>
            </div>
            </div>
  );
}