import { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { eventsApi } from '../api/events';
import { assignmentsApi } from '../api/assignments';
import type { EventItem } from '../types';
import { plural } from '../utils/format';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../components/Toast';
import Modal from '../components/Modal';
import EventMap from '../components/EventMap';
import { Badge, EmptyState, Skeleton } from '../components/ui';
import { IllCalendar } from '../components/illustrations';
import {
    Plus, Search, Trash2, Calendar, MapPin, Users, Clock, Check, X,
    Info, UserCheck, ArrowDownUp, ArrowRight, CalendarClock, ImageOff,
    Eye, UserPlus
} from 'lucide-react';
import posterSocial from '../assets/events/social.svg';
import posterEco from '../assets/events/eco.svg';
import posterCulture from '../assets/events/culture.svg';
import posterCharity from '../assets/events/charity.svg';
import posterSport from '../assets/events/sport.svg';
import posterEducation from '../assets/events/education.svg';

const STATUSES = ['Запланировано', 'Идёт', 'Завершено', 'Отменено'] as const;
const TYPE_LABELS: Record<number, string> = {
    1: 'Социальное', 2: 'Экологическое', 3: 'Культурное',
    4: 'Благотворительное', 5: 'Спортивное', 6: 'Образовательное'
};
/* иллюстрированные постеры типов мероприятий */
const TYPE_POSTERS: Record<number, string> = {
    1: posterSocial, 2: posterEco, 3: posterCulture,
    4: posterCharity, 5: posterSport, 6: posterEducation
};
const posterFor = (typeId: number) => TYPE_POSTERS[typeId] || posterSocial;
const statusBadge: Record<string, 'info' | 'warning' | 'success' | 'danger'> = {
    'Запланировано': 'info', 'Идёт': 'warning', 'Завершено': 'success', 'Отменено': 'danger'
};

type SortKey = 'date-asc' | 'date-desc' | 'name' | 'participants' | 'status';

const SORT_OPTIONS: { key: SortKey; label: string }[] = [
    { key: 'date-asc', label: 'Дата: сначала ближайшие' },
    { key: 'date-desc', label: 'Дата: сначала давние' },
    { key: 'name', label: 'Название: А → Я' },
    { key: 'participants', label: 'Больше участников' },
    { key: 'status', label: 'Статус: активные сверху' }
];

const STATUS_ORDER: Record<string, number> = {
    'Идёт': 0, 'Запланировано': 1, 'Завершено': 2, 'Отменено': 3
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
    const [typeFilter, setTypeFilter] = useState('');
    const [sort, setSort] = useState<SortKey>('date-asc');
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
        let list = items;
        if (typeFilter) list = list.filter(e => String(e.eventTypeId) === typeFilter);
        if (search) {
            const q = search.toLowerCase();
            list = list.filter(e =>
                e.eventName.toLowerCase().includes(q) || e.location.toLowerCase().includes(q)
            );
        }
        const sorted = [...list];
        switch (sort) {
            case 'date-asc':
                sorted.sort((a, b) => new Date(a.dateStart).getTime() - new Date(b.dateStart).getTime());
                break;
            case 'date-desc':
                sorted.sort((a, b) => new Date(b.dateStart).getTime() - new Date(a.dateStart).getTime());
                break;
            case 'name':
                sorted.sort((a, b) => a.eventName.localeCompare(b.eventName, 'ru'));
                break;
            case 'participants':
                sorted.sort((a, b) => b.assignmentsCount - a.assignmentsCount);
                break;
            case 'status':
                sorted.sort((a, b) =>
                    (STATUS_ORDER[a.status] ?? 9) - (STATUS_ORDER[b.status] ?? 9) ||
                    new Date(a.dateStart).getTime() - new Date(b.dateStart).getTime());
                break;
        }
        return sorted;
    }, [items, search, typeFilter, sort]);

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
value = { search } onChange = { e => setSearch(e.target.value) } style = {{ minWidth: 240 }} />
    < select className = "select" value = { statusFilter } onChange = { e => setStatusFilter(e.target.value) } >
        <option value="" > Все статусы </option>
{ STATUSES.map(s => <option key={ s } value = { s } > { s } </option>) }
</select>
    < select className = "select" value = { typeFilter } onChange = { e => setTypeFilter(e.target.value) } >
        <option value="" > Все типы </option>
{
    Object.entries(TYPE_LABELS).map(([id, name]) => (
        <option key= { id } value = { id } > { name } </option>
    ))
}
</select>
    < select className = "select sort-select" value = { sort } onChange = { e => setSort(e.target.value as SortKey) } >
{
    SORT_OPTIONS.map(o => <option key= { o.key } value = { o.key } > { o.label } </option>)
}
</select>
    < span className = "sort-hint" > <ArrowDownUp size = { 13 } /> найдено: { filtered.length } </span >
    < button className = "btn btn-secondary" onClick = { load } >
        <Search size={ 16 } /> Обновить
            </button>
            </div>

{
    loading ? (
        <div style= {{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(320px, 100%), 1fr))', gap: 16 }
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
style = {{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(340px, 100%), 1fr))', gap: 16 }}
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
className = "event-card"
onClick = {() => setDetails(e)}
                >
    <div className="event-card-top" >
        <div className={ `event-poster poster-${e.eventTypeId}` } >
            <img
                className="event-poster-img"
                src={ posterFor(e.eventTypeId) }
                alt=""
                loading="lazy"
            />
                < div className = "event-poster-date" >
                    <span className="d num" > { day } </span>
                        < span className = "m" > { mon } </span>
                            </div>
                            </div>

                            < div className = "event-card-main" >
                                <div className="event-card-title" > { e.eventName } </div>
                                    < div className = "event-card-badges" >
                                        <Badge variant="primary" > { e.eventTypeName || TYPE_LABELS[e.eventTypeId] } </Badge>
                                            < Badge variant = { statusBadge[e.status] || 'muted' } > { e.status } </Badge>
                                                </div>
                                                </div>
                                                </div>

                                                < div className = "event-meta" >
                                                    <div className="event-meta-row" >
                                                        <Clock size={ 14 } />
                                                            < span > { time } · { d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' }) } </span>
                                                                </div>
                                                                < div className = "event-meta-row" >
                                                                    <MapPin size={ 14 } />
                                                                        < span > { e.location } </span>
                                                                            </div>
                                                                            < div className = "event-meta-row" >
                                                                                <Users size={ 14 } />
                                                                                    < span > { e.assignmentsCount } { plural(e.assignmentsCount, ['участник', 'участника', 'участников']) } </span>
                                                                                        </div>
                                                                                        </div>

                                                                                        < div className = "event-card-foot" >
    <Badge variant={ e.status === 'Завершено' ? 'success' : 'accent' }>
    { until }
        </Badge>
{
    isSignedUp && <Badge variant="success" icon = {< Check size = { 12} />}> Записан </Badge>}
    < div className = "foot-right" >
{
    canSignUp && (
        <span className="hint" >
            Записаться <ArrowRight size={ 13 } />
        </span>
                      )
}
    < div className = "event-card-actions" onClick = {(ev) => ev.stopPropagation()} >
        <button className="foot-act" title = "Подробнее" onClick = {() => setDetails(e)}>
            <Eye size={ 14 } />
                </button>
{
    canSignUp && (
        <button className="foot-act" title = "Записаться" onClick = {() => handleSignUp(e.eventId)}>
            <UserPlus size={ 14 } />
                </button>
            )}
{
    canEdit && (
        <button className="foot-act danger" title = "Удалить" onClick = {() => handleDelete(e.eventId)}>
            <Trash2 size={ 14 } />
                </button>
            )}
    </div>
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
        <div className={ `event-modal-banner poster-${details.eventTypeId}` }>
            <img
                className="event-modal-banner-img"
                src={ posterFor(details.eventTypeId) }
                alt={ details.eventTypeName || TYPE_LABELS[details.eventTypeId] }
            />
        </div>

        <div style={ { display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 20 } }>
            <Badge variant="primary" > { details.eventTypeName || TYPE_LABELS[details.eventTypeId] } </Badge>
                < Badge variant = { statusBadge[details.status] || 'muted' } > { details.status } </Badge>
                    < Badge variant = "accent" > { daysUntil(details.dateStart) } </Badge>
                        </div>

{/* Настоящая карта с меткой места */ }
<div style={ { marginBottom: 20 } }>
    <div style={
        {
            display: 'flex', alignItems: 'center', gap: 7,
                marginBottom: 9, fontSize: 12, fontWeight: 700,
                    color: 'var(--text-2)', textTransform: 'uppercase',
                        letterSpacing: '0.07em'
        }
}>
    <MapPin size={ 14 } style = {{ color: 'var(--primary)' }} /> Место проведения
        </div>
        < EventMap address = { details.location } height = { 270} />
        </div>

{/* Сетка деталей */ }
<div className="modal-grid-2">
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