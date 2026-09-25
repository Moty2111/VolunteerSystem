import { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { eventsApi } from '../api/events';
import { assignmentsApi } from '../api/assignments';
import type { EventItem } from '../types';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../components/Toast';
import Modal from '../components/Modal';
import { Badge, EmptyState, Skeleton, Avatar } from '../components/ui';
import { IllCalendar } from '../components/illustrations';
import {
    Plus, Search, Trash2, Calendar, MapPin, Users, Clock, Check, X,
    Navigation, Info, UserCheck
} from 'lucide-react';

const STATUSES = ['Запланировано', 'Идёт', 'Завершено', 'Отменено'] as const;
const TYPE_LABELS: Record<number, string> = {
    1: 'Социальное', 2: 'Экологическое', 3: 'Культурное',
    4: 'Благотворительное', 5: 'Спортивное', 6: 'Образовательное'
};
const statusBadge: Record<string, 'info' | 'warning' | 'success' | 'danger'> = {
    'Запланировано': 'info', 'Идёт': 'warning', 'Завершено': 'success', 'Отменено': 'danger'
};

function daysUntil(dateStr: string): string {
    const d = new Date(dateStr);
    const now = new Date();
    const diff = Math.ceil((d.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    if (diff < 0) return 'завершено';
    if (diff === 0) return 'сегодня';
    if (diff === 1) return 'завтра';
    if (diff < 7) return `через ${diff} дн.`;
    return `через ${Math.ceil(diff / 7)} нед.`;
}

export default function EventsPage() {
    const { user } = useAuth();
    const toast = useToast();

    const [items, setItems] = useState<EventItem[]>([]);
    const [myEventIds, setMyEventIds] = useState<number[]>([]);
    const [loading, setLoading] = useState(true);
    const [statusFilter, setStatusFilter] = useState('');
    const [search, setSearch] = useState('');
    const [showForm, setShowForm] = useState(false);
    const [details, setDetails] = useState<EventItem | null>(null);

    const canEdit = user?.role === 'Администратор' || user?.role === 'Менеджер';
    const isVolunteer = user?.role === 'Волонтёр';

    const [form, setForm] = useState({
        eventName: '', dateStart: '', dateEnd: '', location: '',
        eventTypeId: 1, description: '', status: 'Запланировано'
    });

    const load = async () => {
        setLoading(true);
        try {
            const params: Record<string, unknown> = {};
            if (statusFilter) params.status = statusFilter;
            if (search) params.search = search;
            setItems(await eventsApi.getAll(params));
            if (isVolunteer) {
                try {
                    const my = await assignmentsApi.my();
                    setMyEventIds(my.map(a => a.eventId));
                } catch { /* ignore */ }
            }
        } catch (e: unknown) {
            const err = e as { response?: { data?: { message?: string } } };
            toast.error(err.response?.data?.message || 'Ошибка загрузки');
        } finally { setLoading(false); }
    };

    useEffect(() => { load(); }, []);

    const filtered = useMemo(() => {
        if (!search) return items;
        const q = search.toLowerCase();
        return items.filter(e =>
            e.eventName.toLowerCase().includes(q) || e.location.toLowerCase().includes(q)
        );
    }, [items, search]);

    const handleSignUp = async (eventId: number) => {
        if (!user?.volunteerId) { toast.error('Профиль волонтёра не найден'); return; }
        if (!confirm('Записаться на это мероприятие?')) return;
        try {
            await assignmentsApi.create({ volunteerId: user.volunteerId, eventId, roleId: 6 });
            toast.success('Вы успешно записаны!');
            setDetails(null);
            await load();
        } catch (e: unknown) {
            const err = e as { response?: { data?: { message?: string } } };
            toast.error(err.response?.data?.message || 'Ошибка записи');
        }
    };

    const handleCreate = async () => {
        if (!form.eventName || !form.dateStart || !form.dateEnd) {
            toast.error('Заполните обязательные поля'); return;
        }
        try {
            await eventsApi.create(form);
            toast.success('Мероприятие создано');
            setForm({ eventName: '', dateStart: '', dateEnd: '', location: '', eventTypeId: 1, description: '', status: 'Запланировано' });
            setShowForm(false);
            await load();
        } catch (e: unknown) {
            const err = e as { response?: { data?: { message?: string } } };
            toast.error(err.response?.data?.message || 'Ошибка');
        }
    };

    const handleDelete = async (id: number) => {
        if (!confirm('Удалить мероприятие?')) return;
        try { await eventsApi.remove(id); toast.success('Удалено'); setDetails(null); await load(); }
        catch (e: unknown) {
            const err = e as { response?: { data?: { message?: string } } };
            toast.error(err.response?.data?.message || 'Ошибка');
        }
    };

    const handleStatusChange = async (id: number, status: string) => {
        const ev = items.find(i => i.eventId === id);
        if (!ev) return;
        try {
            await eventsApi.update(id, {
                eventName: ev.eventName, dateStart: ev.dateStart, dateEnd: ev.dateEnd,
                location: ev.location, eventTypeId: ev.eventTypeId,
                description: ev.description, status
            });
            await load();
        } catch (e: unknown) {
            const err = e as { response?: { data?: { message?: string } } };
            toast.error(err.response?.data?.message || 'Ошибка');
        }
    };

    const mapLink = (address: string) =>
        `https://yandex.ru/maps/?text=${encodeURIComponent(address)}`;

    return (
        <div>
        <div className= "page-header" >
        <div>
        <h1 className="page-title" > Мероприятия </h1>
            < p className = "page-subtitle" >
            { loading? 'Загрузка...': `${items.length} событий · ${items.filter(e => e.status === 'Запланировано').length} запланировано` }
                </p>
                </div>
    {
        canEdit && (
            <button className="btn btn-primary" onClick = {() => setShowForm(true)
    }>
        <Plus size={ 16 } /> Создать
            </button>
        )
}
</div>

    < div className = "filter-bar" >
        <input className="input" placeholder = "Поиск по названию или месту…"
value = { search } onChange = { e => setSearch(e.target.value) } style = {{ minWidth: 280 }} />
    < select className = "select" value = { statusFilter } onChange = { e => setStatusFilter(e.target.value) } >
        <option value="" > Все статусы </option>
{ STATUSES.map(s => <option key={ s } value = { s } > { s } </option>) }
</select>
    < button className = "btn btn-secondary" onClick = { load } >
        <Search size={ 16 } /> Применить
            </button>
            </div>

{
    loading ? (
        <div style= {{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 16 }
}>
{ [1, 2, 3, 4].map(i => <Skeleton key={ i } height = { 260} radius = { 16} />) }
    </div>
      ) : filtered.length === 0 ? (
    <div className= "card" >
    <EmptyState
            illustration={ <IllCalendar size={ 110 } /> }
title = { items.length === 0 ? 'Пока нет мероприятий' : 'Ничего не найдено' }
text = { items.length === 0 ? 'Создайте первое событие и пригласите команду' : 'Измените фильтры' }
action = { canEdit && items.length === 0 ? (
    <button className= "btn btn-primary btn-sm" onClick = {() => setShowForm(true)}>
        <Plus size={ 14 } /> Создать
            </button>
            ) : undefined}
          />
    </div>
      ) : (
    <motion.div
          initial= {{ opacity: 0 }} animate = {{ opacity: 1 }}
style = {{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: 16 }}
        >
    <AnimatePresence>
    {
        filtered.map((e, i) => {
            const isSignedUp = myEventIds.includes(e.eventId);
            const canSignUp = isVolunteer && !isSignedUp && e.status !== 'Завершено' && e.status !== 'Отменено';
            const d = new Date(e.dateStart);
            const day = d.getDate().toString().padStart(2, '0');
            const mon = d.toLocaleDateString('ru-RU', { month: 'short' }).replace('.', '');
            const time = d.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
            const until = daysUntil(e.dateStart);

            return (
                <motion.div
                  key= { e.eventId }
            initial = {{ opacity: 0, y: 12 }
        }
                  animate = {{ opacity: 1, y: 0 }}
exit = {{ opacity: 0, scale: 0.95 }}
transition = {{ delay: i * 0.03 }}
onClick = {() => setDetails(e)}
style = {{
    background: 'var(--surface)',
        border: '1px solid var(--border)',
            borderRadius: 'var(--r-lg)',
                overflow: 'hidden',
                    display: 'flex', flexDirection: 'column',
                        transition: 'all .2s', cursor: 'pointer'
}}
onMouseEnter = { el => {
    el.currentTarget.style.borderColor = 'var(--primary)';
    el.currentTarget.style.transform = 'translateY(-3px)';
    el.currentTarget.style.boxShadow = 'var(--shadow-md)';
}}
onMouseLeave = { el => {
    el.currentTarget.style.borderColor = 'var(--border)';
    el.currentTarget.style.transform = 'none';
    el.currentTarget.style.boxShadow = 'none';
}}
                >
    <div style={ { display: 'flex', gap: 14, padding: 18, borderBottom: '1px solid var(--border)' } }>
        <div style={
            {
                display: 'flex', flexDirection: 'column',
                    alignItems: 'center', justifyContent: 'center',
                        width: 62, padding: '10px 6px',
                            borderRadius: 'var(--r-md)',
                                background: 'var(--gradient)',
                                    color: '#fff', flexShrink: 0,
                                        boxShadow: '0 4px 14px var(--primary-glow)'
            }
}>
    <span style={ { fontFamily: 'var(--font-head)', fontSize: 22, fontWeight: 800, lineHeight: 1 } }>
    { day }
        </span>
        < span style = {{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.06em', marginTop: 3, opacity: 0.9 }}>
        { mon }
            </span>
            </div>

            < div style = {{ flex: 1, minWidth: 0 }}>
                <div style={
                    {
                        fontFamily: 'var(--font-head)', fontWeight: 700,
                            fontSize: 16, lineHeight: 1.3, marginBottom: 6,
                                display: '-webkit-box', WebkitLineClamp: 2,
                                    WebkitBoxOrient: 'vertical', overflow: 'hidden'
                    }
}>
{ e.eventName }
    </div>
    < div style = {{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
        <Badge variant="primary" > { e.eventTypeName || TYPE_LABELS[e.eventTypeId] } </Badge>
            < Badge variant = { statusBadge[e.status] || 'muted' } > { e.status } </Badge>
                </div>
                </div>
                </div>

                < div style = {{
    padding: '14px 18px',
        display: 'flex', flexDirection: 'column', gap: 8,
            fontSize: 13, color: 'var(--text-2)', flex: 1
}}>
    <div style={ { display: 'flex', alignItems: 'center', gap: 8 } }>
        <Clock size={ 13 } style = {{ color: 'var(--text-3)' }} />
            < span > { time } · { d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' }) } </span>
                </div>
                < div style = {{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <MapPin size={ 13 } style = {{ color: 'var(--text-3)' }} />
                        < span style = {{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        { e.location }
                            </span>
                            </div>
                            < div style = {{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                <Users size={ 13 } style = {{ color: 'var(--text-3)' }} />
                                    < span > { e.assignmentsCount } участник(ов) </span>
                                        </div>
                                        </div>

                                        < div style = {{
    padding: '12px 18px', borderTop: '1px solid var(--border)',
        display: 'flex', gap: 8, alignItems: 'center',
            background: 'var(--surface-2)'
}}>
    <Badge variant={ e.status === 'Завершено' ? 'success' : 'accent' }>
    { until }
        </Badge>
        < div style = {{ marginLeft: 'auto', display: 'flex', gap: 6 }}>
        { isSignedUp && <Badge variant="success" icon = {< Check size = { 12} />}> Записан </Badge>}
{
    canSignUp && (
        <span style={ { fontSize: 12, color: 'var(--primary)', fontWeight: 600 } }>
            Нажмите для записи →
    </span>
                      )
}
</div>
    </div>
    </motion.div>
              );
            })}
</AnimatePresence>
    </motion.div>
      )}

{/* Детальная модалка мероприятия */ }
<Modal
        open={ !!details }
title = { details?.eventName || ''}
onClose = {() => setDetails(null)}
wide
footer = {
    details && (
        <>
        <button className="btn btn-ghost" onClick = {() => setDetails(null)}> Закрыть </button>
{
    user?.role === 'Администратор' && (
        <button className="btn btn-danger" onClick = {() => handleDelete(details.eventId)
}>
    <Trash2 size={ 14 } /> Удалить
        </button>
              )}
{
    isVolunteer && !myEventIds.includes(details.eventId) &&
    details.status !== 'Завершено' && details.status !== 'Отменено' && (
        <button className="btn btn-primary" onClick = {() => handleSignUp(details.eventId)
}>
    <Plus size={ 14 } /> Записаться
        </button>
                )}
</>
          )
        }
      >
{ details && (
        <>
        <div style={ { display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 20 } }>
            <Badge variant="primary" > { details.eventTypeName || TYPE_LABELS[details.eventTypeId] } </Badge>
                < Badge variant = { statusBadge[details.status] || 'muted' } > { details.status } </Badge>
                    < Badge variant = "accent" > { daysUntil(details.dateStart) } </Badge>
                        </div>

{/* Карта-превью */ }
<div style={
    {
        height: 200, borderRadius: 'var(--r-md)',
            background: 'linear-gradient(135deg, var(--primary-500), var(--primary-700))',
                position: 'relative', overflow: 'hidden', marginBottom: 20,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                        color: '#fff'
    }
}>
    <div style={
        {
            position: 'absolute', inset: 0,
                backgroundImage: `url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='60' height='60' viewBox='0 0 60 60'><g fill='none' stroke='%23ffffff' stroke-opacity='0.15' stroke-width='1'><path d='M0 30h60M30 0v60M0 0l60 60M60 0L0 60'/></g></svg>")`,
                    backgroundRepeat: 'repeat', opacity: 0.6
        }
} />
    < div style = {{ position: 'relative', zIndex: 1, textAlign: 'center', padding: 20 }}>
        <Navigation size={ 40 } />
            < div style = {{
    fontFamily: 'var(--font-head)', fontSize: 18, fontWeight: 800,
        marginTop: 12, maxWidth: 400
}}>
{ details.location }
    </div>
    < a
href = { mapLink(details.location) }
target = "_blank" rel = "noopener noreferrer"
className = "btn btn-primary btn-sm"
style = {{ marginTop: 12, background: '#fff', color: 'var(--primary-700)' }}
                >
    <MapPin size={ 14 } /> Открыть в Яндекс.Картах
        </a>
        </div>
        </div>

{/* Сетка деталей */ }
<div style={ { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20 } }>
    <DetailItem
                icon={ <Calendar size={ 16 } /> }
label = "Начало"
value = {
    new Date(details.dateStart).toLocaleString('ru-RU', {
        day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit'
    })
}
    />
    <DetailItem
                icon={ <Calendar size={ 16 } /> }
label = "Окончание"
value = {
    new Date(details.dateEnd).toLocaleString('ru-RU', {
        day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit'
    })
}
    />
    <DetailItem
                icon={ <Clock size={ 16 } /> }
label = "Длительность"
value = {`${Math.round((new Date(details.dateEnd).getTime() - new Date(details.dateStart).getTime()) / (1000 * 60 * 60))} ч`}
              />
    < DetailItem
icon = {< Users size = { 16} />}
label = "Участников"
value = {`${details.assignmentsCount}`}
              />
    </div>

{
    details.description && (
        <div style={
            {
                padding: 16, background: 'var(--surface-2)',
                    borderRadius: 'var(--r-md)', marginBottom: 16,
                        fontSize: 13, lineHeight: 1.6, color: 'var(--text-2)'
            }
    }>
        <div style={
            {
                display: 'flex', alignItems: 'center', gap: 6,
                    marginBottom: 8, fontWeight: 600, color: 'var(--text)'
            }
    }>
        <Info size={ 14 } /> Описание
            </div>
    { details.description }
    </div>
            )
}

{
    myEventIds.includes(details.eventId) && (
        <div style={
            {
                padding: 14, background: 'var(--success-soft)',
                    border: '1px solid color-mix(in srgb, var(--success) 30%, transparent)',
                        borderRadius: 'var(--r-md)',
                            display: 'flex', gap: 10, alignItems: 'center',
                                color: 'var(--success)', fontWeight: 600, fontSize: 13
            }
    }>
        <UserCheck size={ 16 } />
                Вы записаны на это мероприятие
        </div>
            )
}
</>
        )}
</Modal>

{/* Создание мероприятия */ }
<Modal
        open={ showForm }
title = "Новое мероприятие"
onClose = {() => setShowForm(false)}
wide
footer = {
          <>
    <button className="btn btn-ghost" onClick = {() => setShowForm(false)}> Отмена </button>
        < button className = "btn btn-primary" onClick = { handleCreate } > Создать </button>
            </>
        }
      >
    <div className="field" >
        <label className="field-label" > Название * </label>
            < input className = "input" value = { form.eventName }
onChange = { e => setForm({ ...form, eventName: e.target.value })} />
    </div>
    < div className = "form-row" >
        <div className="field" >
            <label className="field-label" > Начало * </label>
                < input type = "datetime-local" className = "input" value = { form.dateStart }
onChange = { e => setForm({ ...form, dateStart: e.target.value })} />
    </div>
    < div className = "field" >
        <label className="field-label" > Окончание * </label>
            < input type = "datetime-local" className = "input" value = { form.dateEnd }
onChange = { e => setForm({ ...form, dateEnd: e.target.value })} />
    </div>
    </div>
    < div className = "form-row" >
        <div className="field" >
            <label className="field-label" > Место * </label>
                < input className = "input" value = { form.location }
onChange = { e => setForm({ ...form, location: e.target.value })} />
    </div>
    < div className = "field" >
        <label className="field-label" > Тип </label>
            < select className = "select" value = { form.eventTypeId }
onChange = { e => setForm({ ...form, eventTypeId: Number(e.target.value) })}>
{
    Object.entries(TYPE_LABELS).map(([id, name]) => (
        <option key= { id } value = { id } > { name } </option>
    ))
}
    </select>
    </div>
    </div>
    < div className = "field" >
        <label className="field-label" > Описание </label>
            < textarea className = "textarea" value = { form.description }
onChange = { e => setForm({ ...form, description: e.target.value })} />
    </div>
    </Modal>
    </div>
  );
}

function DetailItem({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
    return (
        <div style= {{
        padding: 12, background: 'var(--surface-2)',
            borderRadius: 'var(--r-md)', display: 'flex', gap: 10, alignItems: 'flex-start'
    }
}>
    <div style={ { color: 'var(--primary)', marginTop: 2 } }> { icon } </div>
        < div style = {{ flex: 1, minWidth: 0 }}>
            <div style={ { fontSize: 11, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 700 } }>
            { label }
                </div>
                < div style = {{ fontSize: 13, fontWeight: 600, marginTop: 4 }}> { value } </div>
                    </div>
                    </div>
  );
}