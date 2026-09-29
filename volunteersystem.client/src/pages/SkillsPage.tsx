import { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { skillsApi, type Skill } from '../api/skills';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../components/Toast';
import Modal from '../components/Modal';
import { Badge, EmptyState, Skeleton, ViewToggle, useViewMode } from '../components/ui';
import { IllAward } from '../components/illustrations';
import { plural } from '../utils/format';
import {
    SKILL_LEVELS as LEVELS,
    skillLevelVariant as levelVariant,
    skillNameIcon as iconFor,
    skillTone as toneFor,
    skillLevelHint as levelHint,
    skillCategory
} from '../utils/skillLevels';
import { Plus, Trash2, Search, Users, Target, Award, Info, ArrowDownUp } from 'lucide-react';

type SortKey = 'name' | 'level' | 'popular';

const groupByLevel = (skills: Skill[]) => {
    const map = new Map<string, Skill[]>();
    skills.forEach(s => {
        const arr = map.get(s.level) || [];
        arr.push(s);
        map.set(s.level, arr);
    });
    return map;
};

export default function SkillsPage() {
    const { user } = useAuth();
    const toast = useToast();
    const [items, setItems] = useState<Skill[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [showForm, setShowForm] = useState(false);
    const [form, setForm] = useState({ skillName: '', level: 'Начальный' });
    const [view, setView] = useViewMode('skills');
    const [sort, setSort] = useState<SortKey>('level');

    const canEdit = user?.role === 'Администратор' || user?.role === 'Менеджер';
    const isAdmin = user?.role === 'Администратор';

    const load = async () => {
        setLoading(true);
        try {
            setItems(await skillsApi.getAll());
        } catch (e: unknown) {
            const err = e as { response?: { data?: { message?: string } } };
            toast.error(err.response?.data?.message || 'Ошибка');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { load(); }, []);

    const filtered = useMemo(() => {
        const base = !search
            ? items
            : (() => {
                const q = search.toLowerCase();
                return items.filter(s => s.skillName.toLowerCase().includes(q));
            })();

        /* в табличном виде сортировка особенно полезна — в карточках
           данные уже сгруппированы по уровню */
        if (view === 'cards' || !sort) return base;

        const byLevel = (level: string) => LEVELS.indexOf(level);
        return [...base].sort((a, b) => {
            switch (sort) {
                case 'name':
                    return a.skillName.localeCompare(b.skillName, 'ru');
                case 'popular':
                    return (b.assignedCount || 0) - (a.assignedCount || 0) ||
                        a.skillName.localeCompare(b.skillName, 'ru');
                case 'level':
                default:
                    return byLevel(a.level) - byLevel(b.level) ||
                        a.skillName.localeCompare(b.skillName, 'ru');
            }
        });
    }, [items, search, view, sort]);

    const grouped = useMemo(() => groupByLevel(filtered), [filtered]);

    const totalAssigned = useMemo(
        () => items.reduce((s, x) => s + (x.assignedCount || 0), 0),
        [items]
    );

    const handleCreate = async () => {
        if (!form.skillName.trim()) {
            toast.error('Введите название');
            return;
        }
        try {
            await skillsApi.create(form);
            toast.success('Навык добавлен');
            setForm({ skillName: '', level: 'Начальный' });
            setShowForm(false);
            await load();
        } catch (e: unknown) {
            const err = e as { response?: { data?: { message?: string } } };
            toast.error(err.response?.data?.message || 'Ошибка');
        }
    };

    const handleDelete = async (id: number) => {
        if (!confirm('Удалить навык? Он исчезнет у всех волонтёров.')) return;
        try {
            await skillsApi.remove(id);
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
        <h1 className="page-title" > Навыки </h1>
            < p className = "page-subtitle" >
            {
                loading
                ? 'Загрузка...'
                    : `${items.length} компетенций · назначено ${totalAssigned} раз`
            }
                </p>
                </div>
    {
        canEdit && (
            <button className="btn btn-primary" onClick = {() => setShowForm(true)
    }>
        <Plus size={ 16 } /> Добавить навык
            </button>
        )
}
</div>

    < div className = "filter-bar" >
        <div className="input-icon-wrap" style = {{ minWidth: 300 }}>
            <span className="input-icon" > <Search size={ 15 } /></span >
                <input
            className="input"
            placeholder = "Поиск навыка…"
            value = { search }
            onChange = { e => setSearch(e.target.value) }
    />
    </div>
        <div className="sort-group" >
            <ArrowDownUp size = { 14 } />
            <select
                className = "select"
                value = { sort }
                onChange = { e => setSort(e.target.value as SortKey) }
                aria-label = "Сортировка"
            >
                <option value = "name" > По названию </option>
                <option value = "level" > По уровню </option>
                <option value = "popular" > По популярности </option>
            </select>
        </div>
        <ViewToggle view = { view } onChange = { setView } label = "Вид списка навыков" />
    </div>

{
    loading ? (
        <div className="vcard-grid" style = {{ marginBottom: 0 }}>
{ [1, 2, 3, 4, 5, 6, 7, 8].map(i => <Skeleton key={ i } height = { 200} radius = { 16} />) }
    </div>
      ) : filtered.length === 0 ? (
    <div className= "card" >
    <EmptyState
            illustration={ <IllAward size={ 110 } /> }
title = { items.length === 0 ? 'Навыков пока нет' : 'Ничего не найдено' }
text = {
    items.length === 0
        ? 'Добавьте первую компетенцию — например «Первая помощь» или «Вождение автомобиля»'
        : 'Попробуйте другой запрос'
}
action = { canEdit && items.length === 0 ? (
    <button className= "btn btn-primary btn-sm" onClick = {() => setShowForm(true)}>
        <Plus size={ 14 } /> Добавить
            </button>
            ) : undefined}
          />
    </div>
      ) : view === 'table' ? (
    <div className="table-wrap">
        <table className="sticky-first">
            <thead>
                <tr>
                    <th>Навык</th>
                    <th>Категория</th>
                    <th>Уровень</th>
                    <th className="num">Назначений</th>
                    {isAdmin && <th aria-label="Действия" />}
                </tr>
            </thead>
            <tbody>
                { filtered.map(s => {
                    const Icon = iconFor(s.skillName, s.level);
                    const assigned = s.assignedCount || 0;
                    return (
                        <tr key= { s.skillId }>
                            <td>
                                <div className="cell-person">
                                    <span className={ `cell-icon ${toneFor(s.level) }` }>
                                        <Icon size={ 16 } />
                                    </span>
                                    <div>
                                        <div className="cell-name">{ s.skillName }</div>
                                        <div className="cell-sub num">ID #{ s.skillId }</div>
                                    </div>
                                </div>
                            </td>
                            <td><span className="skill-chip">{ skillCategory(s.skillName) }</span></td>
                            <td>
                                <Badge variant={ levelVariant(s.level) }> { s.level } </Badge>
                            </td>
                            <td className="num">{ assigned }</td>
                            {
                                isAdmin && (
                                    <td className="row-actions">
                                        <button
                                            className="btn btn-icon btn-danger"
                                            onClick = {() => handleDelete(s.skillId) }
                                            title = "Удалить навык"
                                            aria-label = "Удалить навык"
                                        >
                                            <Trash2 size={ 14 } />
                                        </button>
                                    </td>
                                )
                            }
                        </tr>
                    );
                }) }
            </tbody>
        </table>
    </div>
      ) : (
    <div style= {{ display: 'flex', flexDirection: 'column', gap: 24 }}>
    {
        Array.from(grouped.entries()).map(([level, list]) => (
            <div key= { level } >
            <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            marginBottom: 12
        }} >
        <Badge variant={ levelVariant(level) }> { level } </Badge>
            < span style = {{ fontSize: 12, color: 'var(--text-3)' }}>
            { list.length } { list.length === 1 ? 'навык' : list.length < 5 ? 'навыка' : 'навыков' }
</span>
    < div style = {{
    flex: 1,
        height: 1,
            background: 'var(--border)',
                marginLeft: 4
}} />
    </div>

    < div className = "vcard-grid" style = {{ marginBottom: 0 }}>

    <AnimatePresence>
    {
    list.map((s, i) => {
            const assigned = s.assignedCount || 0;
            const Icon = iconFor(s.skillName, s.level);
            return (
            <motion.div
                      key= { s.skillId }
                      initial = {{ opacity: 0, y: 12 }}
animate = {{ opacity: 1, y: 0 }}
exit = {{ opacity: 0, scale: 0.95 }}
transition = {{ delay: i * 0.03 }}
className = {`vcard ${toneFor(s.level)}`}
                    >
    <div className= {`vcard-corner cool-tip ${assigned ? '' : 'is-muted'}`}
    data-tip = {
        assigned
            ? `Назначен ${assigned} ${plural(assigned, ['волонтёру', 'волонтёрам', 'волонтёрам'])}.`
            : 'Пока не назначен ни одному волонтёру. Назначьте навык в профиле волонтёра.'
    }
>
    <Users size={ 14 } />
        </div>

    < div className = "vcard-head" >
        <div className = "vcard-avatar" >
            <Icon size={ 22 } strokeWidth = { 2.2 } />
        </div>
            < div className = "vcard-main" >
                <div className="vcard-name" title = { s.skillName } > { s.skillName } </div>
                    < div className = "vcard-sub" >
                        <Users size={ 12 } />
<span>
{
    assigned > 0
        ? `Есть у ${assigned} ${plural(assigned, ['волонтёра', 'волонтёров', 'волонтёров'])}`
        : 'Никому не назначен'
}
</span>
    </div>
    < div className = "vcard-pills" >
        <Badge variant={ levelVariant(s.level) }> { s.level } </Badge>
    </div>
    </div>
    </div>

    < div className = "vcard-rows" >
        <div className="vcard-row" >
            <Award size={ 13 } /> <span>{ s.level } — { levelHint(s.level) }</span>
        </div>
        <div className="vcard-row" >
            <Info size={ 13 } />
            <span>
{
    assigned > 0
        ? `Используют ${assigned} ${plural(assigned, ['человек', 'человека', 'человек'])}`
        : 'Навык ещё не используется'
}
</span>
        </div>
    </div>

    <div className = "vcard-skills" >
        <span className="skill-chip" >
            <Icon size={ 10 } />
            { skillCategory(s.skillName) }
        </span>
    </div>

    < div className = "vcard-foot" >
        <div className = "vcard-id" >
            <Target size={ 12 } />
                < span > ID #{ s.skillId } </span>
                </div>
                < div className = "vcard-actions" >
{
    isAdmin && (
        <button
                            className="btn btn-icon btn-danger"
    onClick = {(e) => { e.stopPropagation(); handleDelete(s.skillId); }}
title = "Удалить навык"
    aria-label = "Удалить навык"
    >
    <Trash2 size={ 14 } />
        </button>
                        )}
</div>
    </div>
    </motion.div>
            );
          })}
</AnimatePresence>
    </div>
    </div>
          ))}
</div>
      )}

<Modal
        open={ showForm }
title = "Новый навык"
onClose = {() => setShowForm(false)}
footer = {
          <>
    <button className="btn btn-ghost" onClick = {() => setShowForm(false)}> Отмена </button>
        < button className = "btn btn-primary" onClick = { handleCreate } > Создать </button>
            </>
        }
      >
    <div className="field" >
        <label className="field-label" > Название * </label>
            < input
className = "input"
value = { form.skillName }
onChange = { e => setForm({ ...form, skillName: e.target.value })}
placeholder = "Например: Вождение автомобиля"
autoFocus
    />
    </div>
    < div className = "field" >
        <label className="field-label" > Уровень * </label>
            < select
className = "select"
value = { form.level }
onChange = { e => setForm({ ...form, level: e.target.value })}
          >
{ LEVELS.map(l => <option key={ l } value = { l } > { l } </option>) }
    </select>
    < div className = "field-hint" >
        Для языков используйте CEFR: A1–C2.Для умений — «Начальный / Средний / Профессиональный».
</div>
    </div>
    </Modal>
    </div>
  );
}