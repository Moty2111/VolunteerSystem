import {
    Sprout, Zap, Trophy, Bird, Feather, Leaf, TreeDeciduous, Gem, Crown, Target,
    type LucideIcon
} from 'lucide-react';

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

/* знаки-иконки уровней для карточек */
export const skillIcon = (level: string): LucideIcon => {
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
