import { useCallback, useEffect, useState } from 'react';
import { LayoutGrid, List } from 'lucide-react';

export type ViewMode = 'cards' | 'table';

/**
 * Вид списка запоминается в localStorage: переходите на другую страницу и
 * обратно — выбранный режим сохранится. Ключ задаётся для каждой страницы.
 */
export function useViewMode(key: string, fallback: ViewMode = 'cards'): [ViewMode, (v: ViewMode) => void] {
    const storageKey = `vs:view:${key}`;

    const [view, setViewState] = useState<ViewMode>(() => {
        try {
            const saved = localStorage.getItem(storageKey);
            return saved === 'table' || saved === 'cards' ? saved : fallback;
        } catch {
            return fallback;
        }
    });

    useEffect(() => {
        try {
            localStorage.setItem(storageKey, view);
        } catch {
            /* приватный режим — просто не запоминаем */
        }
    }, [storageKey, view]);

    const setView = useCallback((v: ViewMode) => setViewState(v), []);

    return [view, setView];
}

interface Props {
    view: ViewMode;
    onChange: (v: ViewMode) => void;
    label?: string;
    className?: string;
}

/** Переключатель «карточки ⇄ таблица». */
export default function ViewToggle({ view, onChange, label = 'Вид списка', className = '' }: Props) {
    return (
        <div className={`view-toggle ${className}`} role="group" aria-label={label}>
            <button
                type="button"
                className={`view-btn ${view === 'cards' ? 'active' : ''}`}
                onClick={() => onChange('cards')}
                aria-pressed={view === 'cards'}
                aria-label="Карточки"
                title="Карточки"
            >
                <LayoutGrid size={16} />
            </button>
            <button
                type="button"
                className={`view-btn ${view === 'table' ? 'active' : ''}`}
                onClick={() => onChange('table')}
                aria-pressed={view === 'table'}
                aria-label="Таблица"
                title="Таблица"
            >
                <List size={16} />
            </button>
        </div>
    );
}
