import { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { eventsApi } from '../api/events';
import { assignmentsApi } from '../api/assignments';
import type { EventItem } from '../types';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../components/Toast';
import Modal from '../components/Modal';
import { Badge, EmptyState, Skeleton, Button } from '../components/ui';
import { IllCalendar } from '../components/illustrations';
import {
    Plus, Search, Trash2, Calendar, MapPin, Users, Clock, Check, X
} from 'lucide-react';

const STATUSES = ['Запланировано', 'Идёт', 'Завершено', 'Отменено'] as const;

const TYPE_LABELS: Record<number, string> = {
    1: 'Социальное',
    2: 'Экологическое',
    3: 'Культурное',
    4: 'Благотворительное',
    5: 'Спортивное',
    6: 'Образовательное'
};

const statusBadge: Record<string, 'info' | 'warning' | 'success' | 'danger'> = {
    'Запланировано': 'info',
    'Идёт': 'warning',
    'Завершено': 'success',
    'Отменено': 'danger'
};

export default function EventsPage() {
    const { user } = useAuth();
    const toast = useToast();

    const [items, setItems] = useState<EventItem[]>([]);
    const [myEventIds, setMyEventIds] = useState<number[]>([]);
    const [loading, setLoading] = useState(true);
    const [statusFilter, setStatusFilter] = useState('');
    const [search, setSearch] = useState('');
    const [showForm, setShowForm] = useState(false);

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
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { load(); }, []);

    const filtered = useMemo(() => {
        if (!search) return items;
        const q = search.toLowerCase();
        return items.filter(e =>
            e.eventName.toLowerCase().includes(q) ||
            e.location.toLowerCase().includes(q)
        );
    }, [items, search]);

    const handleSignUp = async (eventId: number) => {
        if (!user?.volunteerId) {
            toast.error('Профиль волонтёра не найден');
            return;
        }
        if (!confirm('Записаться на это мероприятие?')) return;
        try {
            await assignmentsApi.create({ volunteerId: user.volunteerId, eventId, roleId: 6 });
            toast.success('Вы успешно записаны!');
            await load();
        } catch (e: unknown) {
            const err = e as { response?: { data?: { message?: string } } };
            toast.error(err.response?.data?.message || 'Ошибка записи');
        }
    };

    const handleCreate = async () => {
        if (!form.eventName || !form.dateStart || !form.dateEnd) {
            toast.error('Заполните обязательные поля');
            return;
        }
        try {
            await eventsApi.create(form);
            toast.success('Мероприятие создано');
            setForm({
                eventName: '', dateStart: '', dateEnd: '', location: '',
                eventTypeId: 1, description: '', status: 'Запланировано'
            });
            setShowForm(false);
            await load();
        } catch (e: unknown) {
            const err = e as { response?: { data?: { message?: string } } };
            toast.error(err.response?.data?.message || 'Ошибка');
        }
    };

    const handleDelete = async (id: number) => {
        if (!confirm('Удалить мероприятие?')) return;
        try {
            await eventsApi.remove(id);
            toast.success('Удалено');
            await load();
        } catch (e: unknown) {
            const err = e as { response?: { data?: { message?: string } } };
            toast.error(err.response?.data?.message || 'Ошибка');
        }
    };

    const handleStatusChange = async (id: number, status: string) => {
        const ev = items.find(i => i.eventId === id);
        if (!ev) return;
        try {
            await eventsApi.update(id, {
                eventName: ev.eventName,
                dateStart: ev.dateStart,
                dateEnd: ev.dateEnd,
                location: ev.location,
                eventTypeId: ev.eventTypeId,
                description: ev.description,
                status
            });
            await load();
        } catch (e: unknown) {
            const err = e as { response?: { data?: { message?: string } } };
            toast.error(err.response?.data?.message || 'Ошибка');
        }
    };

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
        <input
          className="input"
placeholder = "Поиск по названию или месту…"
value = { search }
onChange = { e => setSearch(e.target.value) }
style = {{ minWidth: 280 }}
        />
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
{ [1, 2, 3, 4].map(i => <Skeleton key={ i } height = { 240} radius = { 16} />) }
    </div>
      ) : filtered.length === 0 ? (
    <div className= "card" >
    <EmptyState
            illustration={ <IllCalendar size={ 110 } /> }
title = { items.length === 0 ? 'Пока нет мероприятий' : 'Ничего не найдено' }
text = {
    items.length === 0
        ? 'Создайте первое событие и пригласите команду'
        : 'Попробуйте изменить фильтры'
}
action = { canEdit && items.length === 0 ? (
    <button className= "btn btn-primary btn-sm" onClick = {() => setShowForm(true)}>
        <Plus size={ 14 } /> Создать
            </button>
            ) : undefined}
          />
    </div>
      ) : (
    <motion.div
          initial= {{ opacity: 0 }}
animate = {{ opacity: 1 }}
style = {{
    display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))',
            gap: 16
}}
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

            return (
                <motion.div
                  key= { e.eventId }
            initial = {{ opacity: 0, y: 12 }
        }
                  animate = {{ opacity: 1, y: 0 }}
exit = {{ opacity: 0, scale: 0.95 }}
transition = {{ delay: i * 0.03 }}
style = {{
    background: 'var(--surface)',
        border: '1px solid var(--border)',
            borderRadius: 'var(--r-lg)',
                overflow: 'hidden',
                    display: 'flex',
                        flexDirection: 'column',
                            transition: 'all .2s'
}}
onMouseEnter = { el => {
    el.currentTarget.style.borderColor = 'var(--primary)';
    el.currentTarget.style.transform = 'translateY(-2px)';
    el.currentTarget.style.boxShadow = 'var(--shadow-md)';
}}
onMouseLeave = { el => {
    el.currentTarget.style.borderColor = 'var(--border)';
    el.currentTarget.style.transform = 'none';
    el.currentTarget.style.boxShadow = 'none';
}}
                >
    <div style={
        {
            display: 'flex',
                gap: 14,
                    padding: 18,
                        borderBottom: '1px solid var(--border)'
        }
}>
    <div style={
        {
            display: 'flex',
                flexDirection: 'column',
                    alignItems: 'center',
                        justifyContent: 'center',
                            width: 60,
                                padding: '10px 6px',
                                    borderRadius: 'var(--r-md)',
                                        background: 'var(--gradient)',
                                            color: '#fff',
                                                flexShrink: 0,
                                                    boxShadow: '0 4px 14px var(--primary-glow)'
        }
}>
    <span style={
        {
            fontFamily: 'var(--font-head)',
                fontSize: 22,
                    fontWeight: 800,
                        lineHeight: 1,
                            fontVariantNumeric: 'tabular-nums'
        }
}> { day } </span>
    < span style = {{
    fontSize: 10,
        textTransform: 'uppercase',
            letterSpacing: '0.06em',
                marginTop: 3,
                    opacity: 0.9
}}> { mon } </span>
    </div>

    < div style = {{ flex: 1, minWidth: 0 }}>
        <div style={
            {
                fontFamily: 'var(--font-head)',
                    fontWeight: 700,
                        fontSize: 16,
                            lineHeight: 1.3,
                                marginBottom: 6,
                                    display: '-webkit-box',
                                        WebkitLineClamp: 2,
                                            WebkitBoxOrient: 'vertical',
                                                overflow: 'hidden'
            }
} title = { e.eventName } >
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
        display: 'flex',
            flexDirection: 'column',
                gap: 8,
                    fontSize: 13,
                        color: 'var(--text-2)',
                            flex: 1
}}>
    <div style={ { display: 'flex', alignItems: 'center', gap: 8 } }>
        <Clock size={ 13 } style = {{ color: 'var(--text-3)', flexShrink: 0 }} />
            < span > { time } · { d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' }) } </span>
                </div>
                < div style = {{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <MapPin size={ 13 } style = {{ color: 'var(--text-3)', flexShrink: 0 }} />
                        < span style = {{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        { e.location }
                            </span>
                            </div>
                            < div style = {{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                <Users size={ 13 } style = {{ color: 'var(--text-3)', flexShrink: 0 }} />
                                    < span > { e.assignmentsCount } { e.assignmentsCount === 1 ? 'участник' : e.assignmentsCount < 5 && e.assignmentsCount > 0 ? 'участника' : 'участников' } </span>
                                        </div>
{
    e.description && (
        <div style={
            {
                marginTop: 4,
                    fontSize: 12,
                        color: 'var(--text-3)',
                            display: '-webkit-box',
                                WebkitLineClamp: 2,
                                    WebkitBoxOrient: 'vertical',
                                        overflow: 'hidden'
            }
    }>
    { e.description }
        </div>
                    )
}
</div>

    < div style = {{
    padding: '12px 18px',
        borderTop: '1px solid var(--border)',
            display: 'flex',
                gap: 8,
                    alignItems: 'center',
                        background: 'var(--surface-2)'
}}>
{ canEdit && (
        <select
                        className="select"
value = { e.status }
onChange = { ev => handleStatusChange(e.eventId, ev.target.value) }
style = {{ padding: '6px 10px', fontSize: 12, width: 'auto', flex: 1 }}
                      >
{ STATUSES.map(s => <option key={ s } value = { s } > { s } </option>) }
    </select>
                    )}

{
    canSignUp && (
        <button
                        className="btn btn-primary btn-sm"
    onClick = {() => handleSignUp(e.eventId)
}
style = {{ flex: 1 }}
                      >
    <Plus size={ 14 } /> Записаться
        </button>
                    )}

{
    isVolunteer && isSignedUp && (
        <Badge variant="success" icon = {< Check size = { 12} />}> Вы записаны </Badge>
                    )}

{
    user?.role === 'Администратор' && (
        <button
                        className="btn btn-icon btn-danger"
    onClick = {() => handleDelete(e.eventId)
}
title = "Удалить"
    >
    <Trash2 size={ 14 } />
        </button>
                    )}
</div>
    </motion.div>
              );
            })}
</AnimatePresence>
    </motion.div>
      )}

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
onChange = { e => setForm({ ...form, description: e.target.value })}
placeholder = "Краткое описание мероприятия…" />
    </div>
    </Modal>
    </div>
  );
}