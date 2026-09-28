import { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { assignmentsApi } from '../api/assignments';
import { volunteersApi } from '../api/volunteers';
import { eventsApi } from '../api/events';
import type { Assignment, Volunteer, EventItem } from '../types';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../components/Toast';
import Modal from '../components/Modal';
import { Avatar, Badge, EmptyState, Skeleton } from '../components/ui';
import { IllHands } from '../components/illustrations';
import {
    Plus, Trash2, CheckSquare, Check, Clock, Search, Filter
} from 'lucide-react';

const ROLES = [
    { id: 1, name: 'Координатор' },
    { id: 2, name: 'Помощник' },
    { id: 3, name: 'Водитель' },
    { id: 4, name: 'Медик' },
    { id: 5, name: 'Организатор' },
    { id: 6, name: 'Участник' }
];

type StatusFilter = 'all' | 'pending' | 'confirmed';

export default function AssignmentsPage() {
    const { user } = useAuth();
    const toast = useToast();

    const [items, setItems] = useState<Assignment[]>([]);
    const [volunteers, setVolunteers] = useState<Volunteer[]>([]);
    const [events, setEvents] = useState<EventItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
    const [search, setSearch] = useState('');

    const [form, setForm] = useState({ volunteerId: 0, eventId: 0, roleId: 6 });

    const isAdmin = user?.role === 'Администратор';
    const canManage = isAdmin || user?.role === 'Менеджер';

    const load = async () => {
        setLoading(true);
        try {
            const [a, v, e] = await Promise.all([
                assignmentsApi.getAll(),
                volunteersApi.getAll({ active: true }),
                eventsApi.getAll()
            ]);
            setItems(a);
            setVolunteers(v);
            setEvents(e);
        } catch (e: unknown) {
            const err = e as { response?: { data?: { message?: string } } };
            toast.error(err.response?.data?.message || 'Ошибка загрузки');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { load(); }, []);

    const filtered = useMemo(() => {
        let list = items;
        if (statusFilter === 'pending') list = list.filter(a => !a.confirmed);
        if (statusFilter === 'confirmed') list = list.filter(a => a.confirmed);
        if (search) {
            const q = search.toLowerCase();
            list = list.filter(a =>
                a.volunteerName.toLowerCase().includes(q) ||
                a.eventName.toLowerCase().includes(q) ||
                (a.roleName || '').toLowerCase().includes(q)
            );
        }
        return list;
    }, [items, statusFilter, search]);

    const counts = useMemo(() => ({
        all: items.length,
        pending: items.filter(a => !a.confirmed).length,
        confirmed: items.filter(a => a.confirmed).length
    }), [items]);

    const handleCreate = async () => {
        if (!form.volunteerId || !form.eventId) {
            toast.error('Выберите волонтёра и мероприятие');
            return;
        }
        try {
            await assignmentsApi.create(form);
            toast.success('Волонтёр назначен');
            setForm({ volunteerId: 0, eventId: 0, roleId: 6 });
            setShowForm(false);
            await load();
        } catch (e: unknown) {
            const err = e as { response?: { data?: { message?: string } } };
            toast.error(err.response?.data?.message || 'Ошибка назначения');
        }
    };

    const handleConfirm = async (a: Assignment) => {
        const suggested = a.hoursActual?.toString() || '0';
        const hoursStr = prompt('Сколько часов отработано?', suggested);
        if (hoursStr === null) return;
        const hours = Number(hoursStr.replace(',', '.'));
        if (isNaN(hours) || hours < 0) {
            toast.error('Некорректное число');
            return;
        }
        try {
            await assignmentsApi.update(a.assignmentId, { hoursActual: hours, confirmed: true });
            toast.success(`Подтверждено ${hours} ч`);
            await load();
        } catch (e: unknown) {
            const err = e as { response?: { data?: { message?: string } } };
            toast.error(err.response?.data?.message || 'Ошибка');
        }
    };

    const handleUnconfirm = async (a: Assignment) => {
        try {
            await assignmentsApi.update(a.assignmentId, { hoursActual: a.hoursActual, confirmed: false });
            toast.info('Подтверждение снято');
            await load();
        } catch (e: unknown) {
            const err = e as { response?: { data?: { message?: string } } };
            toast.error(err.response?.data?.message || 'Ошибка');
        }
    };

    const handleDelete = async (id: number) => {
        if (!confirm('Удалить назначение?')) return;
        try {
            await assignmentsApi.remove(id);
            toast.success('Удалено');
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
        <h1 className="page-title" > Назначения </h1>
            < p className = "page-subtitle" >
            { loading? 'Загрузка...': `${counts.all} назначений · ${counts.pending} ожидают подтверждения` }
                </p>
                </div>
    {
        canManage && (
            <button className="btn btn-primary" onClick = {() => setShowForm(true)
    }>
        <Plus size={ 16 } /> Назначить
            </button>
        )
}
</div>

    < div className = "filter-bar" >
        <div className="tabs" style = {{ marginBottom: 0, borderBottom: 'none', flex: '0 0 auto' }}>
            <button
            className={ `tab ${statusFilter === 'all' ? 'active' : ''}` }
onClick = {() => setStatusFilter('all')}
          >
    Все · { counts.all }
</button>
    < button
className = {`tab ${statusFilter === 'pending' ? 'active' : ''}`}
onClick = {() => setStatusFilter('pending')}
          >
    Ожидают · { counts.pending }
</button>
    < button
className = {`tab ${statusFilter === 'confirmed' ? 'active' : ''}`}
onClick = {() => setStatusFilter('confirmed')}
          >
    Подтверждено · { counts.confirmed }
</button>
    </div>
    < input
className = "input"
placeholder = "Поиск по волонтёру, мероприятию…"
value = { search }
onChange = { e => setSearch(e.target.value) }
style = {{ minWidth: 260 }}
        />
    </div>

{
    loading ? (
        <div style= {{ display: 'flex', flexDirection: 'column', gap: 10 }
}>
{ [1, 2, 3, 4, 5].map(i => <Skeleton key={ i } height = { 64} radius = { 12} />) }
    </div>
      ) : filtered.length === 0 ? (
    <div className= "card" >
    <EmptyState
            illustration={ <IllHands size={ 110 } /> }
title = { items.length === 0 ? 'Назначений нет' : 'Ничего не найдено' }
text = {
    items.length === 0
        ? 'Назначьте первого волонтёра на мероприятие'
        : 'Попробуйте изменить фильтр'
}
action = { canManage && items.length === 0 ? (
    <button className= "btn btn-primary btn-sm" onClick = {() => setShowForm(true)}>
        <Plus size={ 14 } /> Назначить
            </button>
            ) : undefined}
          />
    </div>
      ) : (
    <div className= "assign-grid" >
    <AnimatePresence>
    {
        filtered.map((a, i) => {
            const when = new Date(a.eventDateStart).toLocaleDateString('ru-RU', {
                day: '2-digit', month: 'short', year: 'numeric'
            });
            return (
                <motion.div
                    key= { a.assignmentId }
                    initial = {{ opacity: 0, y: 8 }}
animate = {{ opacity: 1, y: 0 }}
exit = {{ opacity: 0, scale: 0.96 }}
transition = {{ delay: i * 0.03 }}
className = {`assign-card ${a.confirmed ? 'confirmed' : 'pending'}`}
                  >
    <div className="assign-side" >
        <Avatar name={ a.volunteerName } size = "md" />
            < div className = "assign-info" >
                <div className="assign-label" > Волонтёр </div>
                    < div className = "assign-name" title = { a.volunteerName } > { a.volunteerName } </div>
                        < div className = "assign-sub" > { when } </div>
                            </div>
                            </div>

                            < div className = "assign-stub" >
                                <span className="assign-role" > { a.roleName || 'Участник' } </span>
{
    a.hoursActual != null
    ? <span className="assign-hours" > { a.hoursActual } ч </span>
                        : <span className="assign-hours empty" > — ч </span>}
{
    a.confirmed
    ? <span className="assign-status ok" > <Check size={ 11 } /> Подтверждено </span>
                        : <span className="assign-status wait" > <Clock size={ 11 } /> Ожидает </span>}
</div>

    < div className = "assign-side event" >
        < div className = "assign-info" >
            <div className="assign-label" > Мероприятие </div>
                < div className = "assign-name" title = { a.eventName } > { a.eventName } </div>
                    < div className = "assign-sub" > #{ a.assignmentId } · {'№'}{ a.eventId } </div>
                        </div>
                        </div>

{
    canManage && (
        < div className = "assign-actions" >
{
    !a.confirmed && (
        <button className="btn btn-success btn-sm"
onClick = {() => handleConfirm(a)}
        >
    <Check size={ 13 } /> Подтвердить часы
        </button>
              )}
{
    a.confirmed && (
        <button className="btn btn-secondary btn-sm"
    onClick = {() => handleUnconfirm(a)}
        >
    <Clock size={ 13 } /> Снять подтверждение
            </button>
              )}
    <button className="btn btn-danger btn-sm"
onClick = {() => handleDelete(a.assignmentId)
}
    >
    <Trash2 size={ 13 } /> Удалить
        </button>
        </div>
              )}
</motion.div>
            );
          })}
</AnimatePresence>
    </div>
      )}

<Modal
        open={ showForm }
title = "Новое назначение"
onClose = {() => setShowForm(false)}
footer = {
          <>
    <button className="btn btn-ghost" onClick = {() => setShowForm(false)}> Отмена </button>
        < button className = "btn btn-primary" onClick = { handleCreate } > Назначить </button>
            </>
        }
      >
    <div className="field" >
        <label className="field-label" > Волонтёр * </label>
            < select
className = "select"
value = { form.volunteerId }
onChange = { e => setForm({ ...form, volunteerId: Number(e.target.value) })}
          >
    <option value={ 0 }>— Выберите волонтёра —</option>
{
    volunteers.map(v => (
        <option key= { v.volunteerId } value = { v.volunteerId } >
        { v.fullName }({ v.city })
        </option>
    ))
}
</select>
    </div>
    < div className = "field" >
        <label className="field-label" > Мероприятие * </label>
            < select
className = "select"
value = { form.eventId }
onChange = { e => setForm({ ...form, eventId: Number(e.target.value) })}
          >
    <option value={ 0 }>— Выберите мероприятие —</option>
{
    events
        .filter(e => e.status !== 'Завершено' && e.status !== 'Отменено')
    .map(e => (
        <option key= { e.eventId } value = { e.eventId } >
        { e.eventName } · { new Date(e.dateStart).toLocaleDateString('ru-RU') }
    </option>
    ))
}
</select>
    </div>
    < div className = "field" >
        <label className="field-label" > Роль </label>
            < select
className = "select"
value = { form.roleId }
onChange = { e => setForm({ ...form, roleId: Number(e.target.value) })}
          >
{
    ROLES.map(r => (
        <option key= { r.id } value = { r.id } > { r.name } </option>
    ))
}
    </select>
    </div>

{
    (form.volunteerId > 0 || form.eventId > 0) && (
        <div style={
            {
                marginTop: 16,
                    padding: 12,
                        background: 'var(--surface-2)',
                            borderRadius: 'var(--r-md)',
                                fontSize: 12,
                                    color: 'var(--text-2)',
                                        lineHeight: 1.5
            }
    }>
        <strong style={ { color: 'var(--text)' } }> Обратите внимание: </strong> при назначении система
            автоматически проверит пересечение мероприятий по времени и наличие действующей
            медкнижки для социальных, благотворительных и образовательных событий.
          </div>
        )
}
</Modal>
    </div>
  );
}