import {
    Sprout, Zap, Trophy, Bird, Feather, Leaf, TreeDeciduous, Gem, Crown, Target,
    type LucideIcon
} from 'lucide-react';
import {
    LuStethoscope, LuCar, LuCalendarCheck, LuLanguages, LuCamera, LuMusic,
    LuUtensils, LuLaptop, LuHandshake, LuUsers, LuTruck, LuPalette,
    LuMegaphone, LuSprout, LuBaby, LuDog, LuBookOpen, LuMessageCircle,
    LuClipboardList, LuWrench, LuDumbbell, LuGraduationCap, LuHeart, LuLifeBuoy
} from 'react-icons/lu';
import type { IconType } from 'react-icons';

export const SKILL_LEVELS = ['Начальный', 'Средний', 'Профессиональный', 'A1', 'A2', 'B1', 'B2', 'C1', 'C2'];

/* языковые уровни CEFR */
export const isLanguageLevel = (level: string) =>
    ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'].includes(level);

export const skillLevelVariant = (level: string): 'muted' | 'info' | 'primary' | 'success' | 'warning' | 'accent' => {
    if (level === 'Профессиональный') return 'primary';
    if (level === 'Средний') return 'info';
    if (['B2', 'C1', 'C2'].includes(level)) return 'success';
    if (['B1', 'A2'].includes(level)) return 'warning';
    return 'muted';
};

/* ---------- иконка и категория по названию навыка (как в карточке волонтёра) ---------- */

/** Правила: «слово в названии» → иконка + короткая категория. Один набор для всех экранов. */
const SKILL_RULES: [RegExp, IconType, string][] = [
    [/первая помощь|мед\b|медицин|аптечк|здоров|health/i, LuStethoscope, 'Медицина'],
    [/вод|авто|транспорт|категор|вождени|car|drive/i, LuCar, 'Транспорт'],
    [/мероприят|организ|ивент|координац|событи|распис/i, LuCalendarCheck, 'Организация'],
    [/англ|язык|перевод|лингв|lingu|немец|франц|испан/i, LuLanguages, 'Языки'],
    [/фот|видео|съёмк|съемк|монтаж/i, LuCamera, 'Творчество'],
    [/музык|звук|гитар|пиани|вокал|диджей/i, LuMusic, 'Творчество'],
    [/рисов|дизайн|арт|живопис|краск|иллюстр|фото-?граф/i, LuPalette, 'Творчество'],
    [/кулин|готов|кухн|питани|барбекю/i, LuUtensils, 'Быт и сервис'],
    [/ремонт|инструмент|техник|строител|сантех|электрик/i, LuWrench, 'Технические'],
    [/программ|компьютер|веб|\bit\b|1с|разработк|тест|qa|автоматизац/i, LuLaptop, 'IT'],
    [/рукопож|переговор|партнер|партнёр|спонсор/i, LuHandshake, 'Коммуникация'],
    [/команд|групп|наставни|ментор|общен/i, LuUsers, 'Работа с людьми'],
    [/учеб|обуч|школ|лекц|курс|тренинг|преподав/i, LuGraduationCap, 'Обучение'],
    [/книг|чтени|библиот/i, LuBookOpen, 'Обучение'],
    [/психолог|поддержк|слушать|консультац|грепп|кризис/i, LuMessageCircle, 'Помощь людям'],
    [/достав|логист|груз|перевоз/i, LuTruck, 'Логистика'],
    [/реклам|агитац|привлеч|пиар|информ/i, LuMegaphone, 'Продвижение'],
    [/сад|озелен|дерев|растени|эко|садов|уборк/i, LuSprout, 'Экология'],
    [/дет|юность|аниматор|детсад|малыш/i, LuBaby, 'Дети'],
    [/животн|приют|собак|кошк|вет/i, LuDog, 'Животные'],
    [/спорт|фитнес|тренер|бег|турнир|плаван/i, LuDumbbell, 'Спорт'],
    [/документ|отчет|отчёт|бухгалтер|счет|счёт|заполн|таблиц/i, LuClipboardList, 'Документы'],
    [/спасат|эвакуац|безопас|поиск|спасение/i, LuLifeBuoy, 'Безопасность']
];

/** Иконка по названию навыка; если совпадений нет — по уровню (см. {@link skillLevelIcon}). */
export const skillNameIcon = (name: string, level?: string): IconType => {
    const n = (name ?? '').toLowerCase();
    for (const [pattern, icon] of SKILL_RULES) {
        if (pattern.test(n)) return icon;
    }
    return skillLevelIcon(level ?? '');
};

/** Короткая категория навыка для подписи на карточке («Медицина», «IT», …). */
export const skillCategory = (name: string): string => {
    const n = (name ?? '').toLowerCase();
    for (const [pattern, , label] of SKILL_RULES) {
        if (pattern.test(n)) return label;
    }
    return 'Навык';
};

/* ---------- иконки уровней (запасной вариант) ---------- */

/** Значки-иконки уровней для карточек. */
export const skillLevelIcon = (level: string): LucideIcon => {
    switch (level) {
        case 'Начальный': return Sprout;
        case 'Средний': return Zap;
        case 'Профессиональный': return Trophy;
        case 'A1': return Bird;
        case 'A2': return Feather;
        case 'B1': return Leaf;
        case 'B2': return TreeDeciduous;
        case 'C1': return Gem;
        case 'C2': return Crown;
        default: return Target;
    }
};

/** Значок уровня как react-icons — для единого вида с иконками навыков. */
export const skillLevelIconR = (level: string): IconType => {
    const ICONS: Record<string, IconType> = {
        'Начальный': LuSprout,
        'Средний': LuHandshake,
        'Профессиональный': LuGraduationCap,
        'A1': LuBookOpen,
        'A2': LuBookOpen,
        'B1': LuLanguages,
        'B2': LuLanguages,
        'C1': LuGraduationCap,
        'C2': LuGraduationCap
    };
    return ICONS[level] ?? LuHeart;
};

/** Цветовая гамма карточки по уровню навыка. */
export const skillTone = (level: string): string => {
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

/** Короткое пояснение к уровню — показываем строкой в карточке, как у волонтёра. */
export const skillLevelHint = (level: string): string => {
    switch (level) {
        case 'Начальный': return 'базовые знания';
        case 'Средний': return 'уверенное владение';
        case 'Профессиональный': return 'глубокая экспертиза';
        case 'A1': return 'базовый уровень языка';
        case 'A2': return 'elementary';
        case 'B1': return 'самостоятельно';
        case 'B2': return 'уверенно';
        case 'C1': return 'свободно';
        case 'C2': return 'в совершенстве';
        default: return 'уровень не указан';
    }
};
