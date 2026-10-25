import type { CSSProperties } from 'react';

export interface SortState {
    key: string;
    dir: 1 | -1;
}

/**
 * Стабильная сортировка списка по выбранному ключу.
 * Числовые значения сравниваются как числа, строки — как текст (ru).
 */
export function sortRows<T>(rows: T[], state: SortState, getters: Record<string, (row: T) => string | number>): T[] {
    const get = getters[state.key];
    if (!get) return [...rows];
    return [...rows].sort((a, b) => {
        const av = get(a);
        const bv = get(b);
        let cmp: number;
        if (typeof av === 'number' && typeof bv === 'number') {
            cmp = av - bv;
        } else {
            cmp = String(av).localeCompare(String(bv), 'ru');
        }
        return cmp * state.dir;
    });
}

/** Переключатели сортировки: клик по активному ключу меняет направление (↑/↓). */
export function SortChips({ options, value, onChange }: {
    options: { key: string; label: string }[];
    value: SortState;
    onChange: (v: SortState) => void;
}) {
    const activeStyle: CSSProperties = {
        background: 'var(--primary-soft)',
        color: 'var(--primary)'
    };
    return (
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 10 }}>
            {options.map(o => {
                const active = value.key === o.key;
                return (
                    <button
                        key={o.key}
                        type="button"
                        className="btn btn-ghost btn-sm"
                        style={active ? activeStyle : undefined}
                        aria-pressed={active}
                        onClick={() => onChange(
                            active
                                ? { key: o.key, dir: value.dir === 1 ? -1 : 1 }
                                : { key: o.key, dir: 1 }
                        )}
                    >
                        {o.label} {active ? (value.dir === 1 ? ' ↑' : ' ↓') : ''}
                    </button>
                );
            })}
        </div>
    );
}
