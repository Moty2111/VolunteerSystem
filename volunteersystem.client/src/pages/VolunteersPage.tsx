import { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { volunteersApi } from '../api/volunteers';
import { skillsApi, type VolunteerSkill } from '../api/skills';
import type { Volunteer } from '../types';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../components/Toast';
import Modal from '../components/Modal';
import { Avatar, Badge, EmptyState, Skeleton } from '../components/ui';
import { IllSprout } from '../components/illustrations';
import VolunteerProfileModal from './VolunteerProfileModal';
import { reportsApi } from '../api/reports';
import { getLevel } from '../utils/level';
import { plural } from '../utils/format';
import {
    Plus, Search, Trash2, Users, Eye, MapPin, Phone, Mail,
    Award, Shield, ShieldCheck, Activity, ChevronLeft, ChevronRight,
    LayoutGrid, List, ArrowDownUp, CalendarClock
} from 'lucide-react';

const PAGE_SIZE = 12;

type SortKey = 'name' | 'hours' | 'city' | 'created';

export default function VolunteersPage() {
    const { user } = useAuth();
    const toast = useToast();

    const [items, setItems] = useState<Volunteer[]>([]);
    const [skillsMap, setSkillsMap] = useState<Record<number, VolunteerSkill[]>>({});
    const [hoursMap, setHoursMap] = useState<Record<number, number>>({});
    const [loading, setLoading] = useState(true);
    const [cityFilter, setCityFilter] = useState('');
    const [activeFilter, setActiveFilter] = useState('');
    const [search, setSearch] = useState('');
    const [showForm, setShowForm] = useState(false);
    const [profileVolunteer, setProfileVolunteer] = useState<Volunteer | null>(null);
    const [page, setPage] = useState(1);
    const [view, setView] = useState<'cards' | 'table'>('cards');
    const [sort, setSort] = useState<SortKey>('name');

    const [form, setForm] = useState({
        fullName: '', birthDate: '', phone: '', email: '',
        city: '', medBookValidUntil: '', personalDataConsent: true
    });

    const canCreate = user?.role === 'Администратор' || user?.role === 'Менеджер';

    const load = async () => {
        setLoading(true);
        try {
            const params: Record<string, unknown> = {};
            if (cityFilter) params.city = cityFilter;
            if (activeFilter) params.active = activeFilter === 'true';
            const [list, summary] = await Promise.all([
                volunteersApi.getAll(params),
                (reportsApi.volunteerSummary() as Promise<{ volunteer_id: number; total_hours: number }[]>)
                    .catch(() => [])
            ]);
            setItems(list);
            setHoursMap(Object.fromEntries(
                summary.map(s => [s.volunteer_id, Number(s.total_hours || 0)])
            ));

            // Загружаем навыки для первых 30 волонтёров (оптимизация)
            const map: Record<number, VolunteerSkill[]> = {};
            await Promise.all(list.slice(0, 30).map(async v => {
                try {
                    map[v.volunteerId] = await skillsApi.getVolunteerSkills(v.volunteerId);
                } catch { /* ignore */ }
            }));
            setSkillsMap(map);
        } catch (e: unknown) {
            const err = e as { response?: { data?: { message?: string } } };
            toast.error(err.response?.data?.message || 'Ошибка загрузки');
        } finally { setLoading(false); }
    };

    useEffect(() => { load(); }, []);

    const filtered = useMemo(() => {
        if (!search) return items;
        const q = search.toLowerCase();
        return items.filter(v =>
            v.fullName.toLowerCase().includes(q) ||
            v.city.toLowerCase().includes(q) ||
            v.email.toLowerCase().includes(q) ||
            v.phone.includes(q)
        );
    }, [items, search]);

    const sorted = useMemo(() => {
        const arr = [...filtered];
        const hoursOf = (id: number) => hoursMap[id] ?? 0;
        switch (sort) {
            case 'hours':
                arr.sort((a, b) => hoursOf(b.volunteerId) - hoursOf(a.volunteerId));
                break;
            case 'city':
                arr.sort((a, b) => a.city.localeCompare(b.city, 'ru'));
                break;
            case 'created':
                arr.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
                break;
            default:
                arr.sort((a, b) => a.fullName.localeCompare(b.fullName, 'ru'));
        }
        return arr;
    }, [filtered, sort, hoursMap]);

    const paged = useMemo(
        () => sorted.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE),
        [sorted, page]
    );

    useEffect(() => { setPage(1); }, [search, cityFilter, activeFilter]);

    const handleCreate = async () => {
        if (!form.fullName || !form.email) { toast.error('Заполните обязательные поля'); return; }
        try {
            await volunteersApi.create({ ...form, medBookValidUntil: form.medBookValidUntil || null });
            toast.success('Волонтёр добавлен');
            setForm({ fullName: '', birthDate: '', phone: '', email: '', city: '', medBookValidUntil: '', personalDataConsent: true });
            setShowForm(false);
            await load();
        } catch (e: unknown) {
            const err = e as { response?: { data?: { message?: string } } };
            toast.error(err.response?.data?.message || 'Ошибка создания');
        }
    };

    const handleDelete = async (e: React.MouseEvent, id: number) => {
        e.stopPropagation();
        if (!confirm(`Анонимизировать волонтёра #${id}?`)) return;
        try {
            await volunteersApi.remove(id);
            toast.success('Волонтёр анонимизирован');
            await load();
        } catch (e: unknown) {
            const err = e as { response?: { data?: { message?: string } } };
            toast.error(err.response?.data?.message || 'Ошибка');
        }
    };

    const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));

    const pager = totalPages > 1 ? (
        <div style={ { display: 'flex', justifyContent: 'center', gap: 8, alignItems: 'center', marginTop: 16 } }>
            <button className="btn btn-secondary btn-sm" disabled = { page === 1
}
onClick = {() => setPage(p => p - 1)} aria-label = "Предыдущая страница">
    <ChevronLeft size={ 16 } />
        </button>
    < span style = {{ fontSize: 13, color: 'var(--text-2)', minWidth: 80, textAlign: 'center' }}>
        { page } / { totalPages }
        </span>
        < button className = "btn btn-secondary btn-sm" disabled = { page === totalPages}
    onClick = {() => setPage(p => p + 1)} aria-label = "Следующая страница">
            <ChevronRight size={ 16 } />
        </button>
    </div>
    ) : null;

    return (
        <div>
        <div className= "page-header" >
        <div>
        <h1 className="page-title" > Волонтёры </h1>
            < p className = "page-subtitle" >
            { loading? 'Загрузка...': `${items.length} ${plural(items.length, ['человек', 'человека', 'человек'])} в команде` }
                </p>
                </div>
    {
        canCreate && (
            <button className="btn btn-primary" onClick = {() => setShowForm(true)
    }>
        <Plus size={ 16 } /> Добавить
            </button>
        )
}
</div>

    < div className = "filter-bar" >
        <input className="input" placeholder = "Поиск по имени, городу, email…"
value = { search } onChange = { e => setSearch(e.target.value) } style = {{ minWidth: 280 }} />
    < input className = "input" placeholder = "Город"
value = { cityFilter } onChange = { e => setCityFilter(e.target.value) } />
    < select className = "select" value = { activeFilter } onChange = { e => setActiveFilter(e.target.value) } >
        <option value="" > Все статусы </option>
            < option value = "true" > Активные </option>
                < option value = "false" > Неактивные </option>
                    </select>
                    < div className = "sort-group" >
                        <ArrowDownUp size={ 14 } />
                            < select className = "select" value = { sort } onChange = { e => setSort(e.target.value as SortKey) } aria-label = "Сортировка" >
                                <option value="name" > По имени </option>
                                    < option value = "hours" > По часам </option>
                                        < option value = "city" > По городу </option>
                                            < option value = "created" > По дате регистрации </option>
                                                </select>
                                            </div >
                                            < button className = "btn btn-secondary" onClick = { load } >
                                                <Search size={ 16 } /> Применить
                                                    </button>
                                                    < div className = "view-toggle" role = "group" aria-label = "Вид списка" >
                                                        <button
                                                            className={`view-btn ${view === 'cards' ? 'active' : ''}`}
                                                            onClick={() => setView('cards')}
                                                    aria-label = "Карточки"
                                                        >
                                                    <LayoutGrid size={ 16 } />
                                                        </button >
                                                        < button className = {`view-btn ${view === 'table' ? 'active' : ''}`}
                                                            onClick={() => setView('table')}
                                                    aria-label = "Таблица"
                                                        >
                                                    <List size={ 16 } />
                                                        </button >
                                                    </div >
                                                    </div >

{
    loading ? (
        <div className="vcard-grid" style={ { marginBottom: 0 } }>
{ [1, 2, 3, 4, 5, 6].map(i => <Skeleton key={ i } height = { 230} radius = { 16} />) }
    </div>
      ) : filtered.length === 0 ? (
    <div className= "card" >
    <EmptyState
            illustration={ <IllSprout size={ 110 } /> }
title = "Волонтёров не найдено"
text = { items.length === 0 ? 'Добавьте первого волонтёра и пригласите команду' : 'Измените фильтры' }
action = { canCreate && items.length === 0 ? (
    <button className= "btn btn-primary btn-sm" onClick = {() => setShowForm(true)}>
        <Plus size={ 14 } /> Добавить
            </button>
            ) : undefined}
          />
    </div>
      ) : view === 'table' ? (
    <>
    <div className="table-wrap" >
        <table className="sticky-first" >
            <thead>
                <tr>
                    <th> Волонтёр </th>
                    < th > Город </th>
                    < th > Контакты </th>
                    < th > Уровень </th>
                    < th > Часы </th>
                    < th > Медкнижка </th>
                    < th > Статус </th>
                    < th aria-label = "Действия" > </th>
                </tr>
            </thead>
            <tbody>
                { paged.map(v => {
                    const hours = hoursMap[v.volunteerId] ?? 0;
                    const level = getLevel(hours);
                    return (
                        <tr key= { v.volunteerId } className = "row-clickable" onClick = {() => setProfileVolunteer(v)} >
                            <td>
                                <div className="cell-person" >
                                    <Avatar name={ v.fullName } size = "sm" />
                                    <div>
                                        <div className="cell-name" > { v.fullName } </div>
                                        < div className = "cell-sub" > ID #{ v.volunteerId } </div>
                                    </div>
                                </div>
                            </td>
                            < td > { v.city } </td>
                            < td >
                                <div className="cell-sub" > { v.phone } </div>
                                < div className = "cell-sub" > { v.email } </div>
                            </td>
                            < td >
                                <span className={ `level-pill level-${level.key}` }>
                                    <span className="level-dot" />
                                    { level.label }
                                </span>
                            </td>
                            < td className = "num" > <strong> { hours } ч </strong> </td>
                            < td >
                                { v.medBookValidUntil
                                    ? <Badge variant= "success" > до { v.medBookValidUntil } </Badge>
                                        : <Badge variant= "muted" > нет </Badge>}
                            </td>
                            < td >
                                { v.isActive
                                    ? <Badge variant= "info" > активен </Badge>
                                        : <Badge variant= "muted" > неактивен </Badge>}
                            </td>
                            < td >
                                <div className="row-actions" >
                                    <button className="btn btn-icon btn-secondary"
                                        onClick={(e) => { e.stopPropagation(); setProfileVolunteer(v); }}
                                        title="Профиль" >
                                        <Eye size={ 14 } />
                                    </button>
                                    { user?.role === 'Администратор' && (
                                        <button className="btn btn-icon btn-danger"
                                            onClick={(e) => handleDelete(e, v.volunteerId)}
                                            title="Удалить" >
                                            <Trash2 size={ 14 } />
                                        </button>
                                    )}
                                </div>
                            </td>
                        </tr>
                    );
                })}
            </tbody>
        </table>
    </div>
    { pager }
    </>
      ) : (
    <>
    <motion.div
            initial= {{ opacity: 0 }} animate = {{ opacity: 1 }}
className = "vcard-grid"
          >
    <AnimatePresence>
    {
        paged.map((v, i) => {
            const skills = skillsMap[v.volunteerId] || [];
            const hours = hoursMap[v.volunteerId] ?? 0;
            const level = getLevel(hours);
            const hasMedBook = !!v.medBookValidUntil;
            return (
                <motion.div
                    key= { v.volunteerId }
            initial = {{ opacity: 0, y: 12 }
        }
                    animate = {{ opacity: 1, y: 0 }}
exit = {{ opacity: 0, scale: 0.95 }}
transition = {{ delay: i * 0.03 }}
onClick = {() => setProfileVolunteer(v)}
className = "vcard"
                  >
{/* Медкнижка индикатор */ }
    < div className = {`vcard-corner cool-tip ${hasMedBook ? '' : 'is-danger'}`}
    data-tip = {
        hasMedBook
            ? `Медкнижка действует до ${v.medBookValidUntil} — допускает участие в мероприятиях с повышенными требованиями.`
            : 'У волонтёра нет медкнижки — участие в мероприятиях с повышенными требованиями ограничено.'
    }
>
{ hasMedBook?<ShieldCheck size = { 14 } /> : <Shield size={ 14 } />}
</div>

    < div className = "vcard-head">
        <Avatar name={ v.fullName } size = "lg" />
            <div className= "vcard-main" >
                <div className="vcard-name" title = { v.fullName } >
{ v.fullName }
    </div>
    < div className = "vcard-sub" >
        <MapPin size={ 12 } /> <span>{v.city}</span>
            </div>
            < div className = "vcard-pills" >
                <span className={ `level-pill level-${level.key}` } title = { `Отработано ${hours} ч` }>
                    <span className="level-dot" />
                    { level.label }
                        < span className = "level-hours num" > { hours > 0 ? `${hours} ч` : '0 ч'} </span>
                        </span>
{ !v.isActive && <Badge variant="muted" > неактивен </Badge> }
</div>
    </div>
    </div>

    < div className = "vcard-rows" >
        <div className="vcard-row" >
            <Phone size={ 13 } /> <span>{v.phone}</span >
                </div>
                < div className = "vcard-row" >
                    <Mail size={ 13 } /> <span>{v.email}</span >
                        </div>
                        </div>

{/* Навыки */ }
{
    skills.length > 0 && (
        <div className= "vcard-skills" >
    {
        skills.slice(0, 3).map(s => (
            <span key= { s.skillId } className = "skill-chip" >
        <Award size={ 10 } />
    { s.skillName }
    </span>
                        ))
}
{
    skills.length > 3 && (
        <span className="skill-chip is-more" >
    +{ skills.length - 3 }
    </span>
                        )}
</div>
                    )}

<div className= "vcard-foot" >
    <div className="vcard-id" >
        <Activity size={ 12 } />
            < span > ID #{ v.volunteerId } </span>
                </div>
                < div className = "vcard-actions" >
                    <button className="btn btn-icon btn-secondary"
onClick = {(e) => { e.stopPropagation(); setProfileVolunteer(v); }}
title = "Профиль" >
    <Eye size={ 14 } />
        </button>
{
    user?.role === 'Администратор' && (
        <button className="btn btn-icon btn-danger"
    onClick = {(e) => handleDelete(e, v.volunteerId)
}
title = "Удалить" >
    <Trash2 size={ 14 } />
        </button>
                        )}
</div>
    </div>
    </motion.div>
                );
              })}
</AnimatePresence>
    </motion.div>

    { pager }
</>
      )}

<Modal
        open={ showForm }
title = "Новый волонтёр"
onClose = {() => setShowForm(false)}
footer = {
          <>
    <button className="btn btn-ghost" onClick = {() => setShowForm(false)}> Отмена </button>
        < button className = "btn btn-primary" onClick = { handleCreate } > Создать </button>
            </>
        }
      >
    <div className="form-row" >
        <div className="field" >
            <label className="field-label" > ФИО * </label>
                < input className = "input" value = { form.fullName } onChange = { e => setForm({ ...form, fullName: e.target.value })} />
                    </div>
                    < div className = "field" >
                        <label className="field-label" > Дата рождения * </label>
                            < input type = "date" className = "input" value = { form.birthDate } onChange = { e => setForm({ ...form, birthDate: e.target.value })} />
                                </div>
                                </div>
                                < div className = "form-row" >
                                    <div className="field" >
                                        <label className="field-label" > Телефон * </label>
                                            < input className = "input" value = { form.phone } onChange = { e => setForm({ ...form, phone: e.target.value })} />
                                                </div>
                                                < div className = "field" >
                                                    <label className="field-label" > Email * </label>
                                                        < input className = "input" value = { form.email } onChange = { e => setForm({ ...form, email: e.target.value })} />
                                                            </div>
                                                            </div>
                                                            < div className = "form-row" >
                                                                <div className="field" >
                                                                    <label className="field-label" > Город * </label>
                                                                        < input className = "input" value = { form.city } onChange = { e => setForm({ ...form, city: e.target.value })} />
                                                                            </div>
                                                                            < div className = "field" >
                                                                                <label className="field-label" > Медкнижка(до) </label>
                                                                                    < input type = "date" className = "input" value = { form.medBookValidUntil } onChange = { e => setForm({ ...form, medBookValidUntil: e.target.value })} />
                                                                                        </div>
                                                                                        </div>
                                                                                        </Modal>

                                                                                        < VolunteerProfileModal volunteer = { profileVolunteer } onClose = {() => setProfileVolunteer(null)} />
                                                                                            </div>
  );
}