import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Modal from '../components/Modal';
import { Avatar, Badge, Button } from '../components/ui';
import { skillsApi, type Skill, type VolunteerSkill } from '../api/skills';
import { useToast } from '../components/Toast';
import { useAuth } from '../context/AuthContext';
import { getLevel, getBadges } from '../utils/level';
import { plural } from '../utils/format';
import type { Volunteer } from '../types';
import { Award, Plus, X, MapPin, Phone, Mail, Calendar, Check } from 'lucide-react';
import {
    LuStethoscope, LuCar, LuCalendarCheck, LuLanguages, LuCamera, LuMusic,
    LuUtensils, LuLaptop, LuHandshake, LuUsers, LuTruck, LuPalette,
    LuMegaphone, LuSprout, LuBaby, LuDog, LuBookOpen, LuMessageCircle,
    LuClipboardList, LuWrench, LuDumbbell, LuGraduationCap, LuHeart
} from 'react-icons/lu';
import type { IconType } from 'react-icons';

/* иконка навыка по названию (react-icons) */
const skillIcon = (name: string): IconType => {
    const n = name.toLowerCase();
    if (/первая помощь|мед|аптечк|health/.test(n)) return LuStethoscope;
    if (/вод|авто|транспорт|категор|car|drive/.test(n)) return LuCar;
    if (/мероприят|организ|ивент|координац|событи/.test(n)) return LuCalendarCheck;
    if (/англ|язык|перевод|lingu/.test(n)) return LuLanguages;
    if (/фот|виде|съёмк|съемк/.test(n)) return LuCamera;
    if (/музык|звук|гитар|пиани|вокал/.test(n)) return LuMusic;
    if (/кулин|готов|кухн|питани|барбекю/.test(n)) return LuUtensils;
    if (/программ|компьютер|веб|it\b|1с|разработк/.test(n)) return LuLaptop;
    if (/рукопож|переговор|партнер|партнёр/.test(n)) return LuHandshake;
    if (/команд|групп|наставни|ментор/.test(n)) return LuUsers;
    if (/достав|логист|груз|эвакуац/.test(n)) return LuTruck;
    if (/рисов|дизайн|арт|живопис|краск|иллюстр/.test(n)) return LuPalette;
    if (/реклам|агитац|привлеч|пиар|宣传/.test(n)) return LuMegaphone;
    if (/сад|озелен|дерев|растени|эко|садов/.test(n)) return LuSprout;
    if (/дет|юность|аниматор|детсад/.test(n)) return LuBaby;
    if (/животн|приют|собак|кошк|vet/.test(n)) return LuDog;
    if (/учеб|обуч|школ|лекц|курс|тренинг/.test(n)) return LuGraduationCap;
    if (/психолог|поддержк|слушать|консультац|грепп|кризис/.test(n)) return LuMessageCircle;
    if (/документ|отчет|бухгалтер|счет|заполн|таблиц/.test(n)) return LuClipboardList;
    if (/ремонт|инструмент|техник|строитель/.test(n)) return LuWrench;
    if (/спорт|фитнес|тренер|бег|турнир/.test(n)) return LuDumbbell;
    return LuHeart;
};

/* цветовая гамма по уровню (как на странице «Навыки») */
const toneForLevel = (level: string): string => {
    switch (level) {
        case 'Начальный': return 'tone-green';
        case 'Средний': return 'tone-blue';
        case 'Профессиональный': return 'tone-gold';
        case 'A1': case 'A2': return 'tone-green';
        case 'B1': case 'B2': return 'tone-blue';
        case 'C1': case 'C2': return 'tone-violet';
        default: return 'tone-pink';
    }
};

interface Props {
    volunteer: Volunteer | null;
    onClose: () => void;
}

export default function VolunteerProfileModal({ volunteer, onClose }: Props) {
    const { user } = useAuth();
    const toast = useToast();
    const [volunteerSkills, setVolunteerSkills] = useState<VolunteerSkill[]>([]);
    const [allSkills, setAllSkills] = useState<Skill[]>([]);
    const [selectedSkill, setSelectedSkill] = useState<number>(0);
    const [year, setYear] = useState<number>(new Date().getFullYear());
    const [loading, setLoading] = useState(true);

    const canEdit = user?.role === 'Администратор' || user?.role === 'Менеджер';

    const load = async () => {
        if (!volunteer) return;
        setLoading(true);
        try {
            const [vs, all] = await Promise.all([
                skillsApi.getVolunteerSkills(volunteer.volunteerId),
                skillsApi.getAll()
            ]);
            setVolunteerSkills(vs);
            setAllSkills(all);
        } catch {
            toast.error('Ошибка загрузки навыков');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { load(); }, [volunteer]);

    const handleAssign = async () => {
        if (!volunteer || !selectedSkill) {
            toast.error('Выберите навык');
            return;
        }
        try {
            await skillsApi.assign(volunteer.volunteerId, { skillId: selectedSkill, yearConfirmed: year });
            toast.success('Навык добавлен');
            setSelectedSkill(0);
            await load();
        } catch (e: unknown) {
            const err = e as { response?: { data?: { message?: string } } };
            toast.error(err.response?.data?.message || 'Ошибка');
        }
    };

    const handleRemove = async (skillId: number) => {
        if (!volunteer) return;
        try {
            await skillsApi.unassign(volunteer.volunteerId, skillId);
            toast.success('Навык убран');
            await load();
        } catch {
            toast.error('Ошибка');
        }
    };

    if (!volunteer) return null;

    const availableSkills = allSkills.filter(s =>
        !volunteerSkills.some(vs => vs.skillId === s.skillId)
    );

    // Уровень по часам — здесь часов нет, показываем новичка.
    // Если позже добавите эндпоинт /volunteers/{id}/stats — подставьте часы.
    const level = getLevel(0);
    const badges = getBadges(0);

    return (
        <Modal open= {!!volunteer
} title = "Профиль волонтёра" onClose = { onClose } wide >
{/* HEADER */ }
    < div style = {{ display: 'flex', gap: 20, marginBottom: 24 }}>
        <Avatar name={ volunteer.fullName } size = "xl" />
            <div style={ { flex: 1, minWidth: 0 } }>
                <h3 style={
                    {
                        fontFamily: 'var(--font-head)',
                            fontSize: 20,
                                fontWeight: 700,
                                    margin: '0 0 8px',
                                        lineHeight: 1.2
                    }
}>
{ volunteer.fullName }
    </h3>

    < div style = {{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
        <span className={ `level-pill level-${level.key}` }>
            <span className="level-dot" />
            { level.label }
                </span>
{
    volunteer.medBookValidUntil
    ? <span className = "cool-tip"
        data-tip = {`Медкнижка действует до ${volunteer.medBookValidUntil} — допускает участие в мероприятиях с повышенными требованиями.`}>
        <Badge variant="success" icon={<Check size={11} />}> медкнижка до {volunteer.medBookValidUntil} </Badge>
    </span>
              : < span className = "cool-tip"
        data-tip = "У волонтёра нет медкнижки — участие в мероприятиях с повышенными требованиями ограничено.">
        <Badge variant="danger"> нет медкнижки </Badge>
    </span>}
{
    volunteer.isActive
    ? <Badge variant="success" > активен </Badge>
              : <Badge variant="muted" > неактивен </Badge>
}
{
    badges.map(b => (
        <Badge key= { b } variant = "accent" icon = {< Award size = { 11} />}> { b } </Badge>
            ))}
</div>

    < div style = {{
    display: 'flex',
        gap: 16,
            flexWrap: 'wrap',
                fontSize: 13,
                    color: 'var(--text-2)'
}}>
    <span style={ { display: 'flex', alignItems: 'center', gap: 6 } }>
        <MapPin size={ 13 } /> {volunteer.city}
            </span>
            < span style = {{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <Phone size={ 13 } /> {volunteer.phone}
                    </span>
                    < span style = {{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <Mail size={ 13 } /> {volunteer.email}
                            </span>
                            < span style = {{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                <Calendar size={ 13 } /> зарегистрирован {new Date(volunteer.createdAt).toLocaleDateString('ru-RU')}
                                    </span>
                                    </div>
                                    </div>
                                    </div>

{/* SKILLS */ }
<div style={ { borderTop: '1px solid var(--border)', paddingTop: 20 } }>
    <h4 style={
        {
            fontFamily: 'var(--font-head)',
                fontSize: 15,
                    fontWeight: 700,
                        display: 'flex',
                            alignItems: 'center',
                                gap: 8,
                                    marginBottom: 16
        }
}>
    <Award size={ 18 } style = {{ color: 'var(--primary)' }} />
Навыки
    < span style = {{
    fontSize: 12,
        fontWeight: 500,
            color: 'var(--text-3)',
                marginLeft: 'auto'
}}>
{ volunteerSkills.length } { plural(volunteerSkills.length, ['навык', 'навыка', 'навыков']) }
</span>
    </h4>

{
    loading ? (
        <div className= "loading-state" > <span className="spinner" /> </div>
        ) : (
        <>
        <div className="skill-mini-grid">
    {
        volunteerSkills.length === 0 && (
            <p style={ { color: 'var(--text-3)', fontSize: 13, margin: 0, gridColumn: '1 / -1' } }>
                У волонтёра пока нет назначенных навыков
            </p>
        )
    }
    <AnimatePresence>
        {
            volunteerSkills.map(vs => {
                const Icon = skillIcon(vs.skillName);
                return (
                    <motion.div
                        key= { vs.skillId }
                        initial = {{ opacity: 0, scale: 0.85 }}
                        animate = {{ opacity: 1, scale: 1 }}
                        exit = {{ opacity: 0, scale: 0.85 }}
                        className = {`skill-mini ${toneForLevel(vs.level)}`}
                    >
                        <span className="skill-mini-icon"><Icon size={19} /></span>
                        < div className = "skill-mini-body" >
                            <div className="skill-mini-name" title = { vs.skillName }> { vs.skillName } </div>
                            < div className = "skill-mini-meta" >
                                <span className="skill-mini-level"> { vs.level } </span>
                                { vs.yearConfirmed && < span > · { vs.yearConfirmed } </span>}
                            </div>
                        </div>
                        {
                            canEdit && (
                                <button
                                    className="skill-mini-remove"
                                    onClick = {() => handleRemove(vs.skillId)}
                                    title = "Убрать навык"
                                    aria-label = "Убрать навык"
                                >
                                    <X size={11} />
                                </button>
                            )}
                    </motion.div>
                );
            })
        }
    </AnimatePresence>
    </div>

{
    canEdit && availableSkills.length > 0 && (
        <div style={
            {
                padding: 14,
                    background: 'var(--surface-2)',
                        borderRadius: 'var(--r-md)',
                            display: 'flex',
                                gap: 10,
                                    alignItems: 'flex-end',
                                        flexWrap: 'wrap'
            }
    }>
        <div className="field" style = {{ flex: 2, minWidth: 200, marginBottom: 0 }
}>
    <label className="field-label" > Добавить навык </label>
        < select
className = "select"
value = { selectedSkill }
onChange = { e => setSelectedSkill(Number(e.target.value))}
                  >
    <option value={ 0 }>— Выберите —</option>
{
    availableSkills.map(s => (
        <option key= { s.skillId } value = { s.skillId } >
        { s.skillName }({ s.level })
        </option>
    ))
}
</select>
    </div>
    < div className = "field" style = {{ width: 110, marginBottom: 0 }}>
        <label className="field-label" > Год </label>
            < input
type = "number"
className = "input"
value = { year }
onChange = { e => setYear(Number(e.target.value))}
min = { 2000}
max = { 2100}
    />
    </div>
    < Button
variant = "primary"
icon = {< Plus size = { 14} />}
onClick = { handleAssign }
disabled = {!selectedSkill}
                >
    Добавить
    </Button>
    </div>
            )}
</>
        )}
</div>

{/* LEVEL PROGRESS hint */ }
<div style={
    {
        marginTop: 20,
            padding: 14,
                borderRadius: 'var(--r-md)',
                    background: 'var(--surface-2)',
                        border: '1px solid var(--border)',
                            fontSize: 13,
                                color: 'var(--text-2)',
                                    lineHeight: 1.5
    }
}>
    <strong style={ { color: 'var(--text)' } }> Уровни волонтёра: </strong>{' '}
        < span className = "level-novice" > Новичок </span> (0 ч) →{' '}
            < span className = "level-activist" > Активист </span> (10 ч) →{' '}
                < span className = "level-mentor" > Наставник </span> (50 ч) →{' '}
                    < span className = "level-hero" > Герой </span> (100 ч)
                        </div>
                        </Modal>
  );
}