import { useCallback, useEffect, useId, useRef, type ReactNode } from 'react';
import { IconX } from './Icons';

interface Props {
    open: boolean;
    title: string;
    onClose: () => void;
    children: ReactNode;
    footer?: ReactNode;
    wide?: boolean;
}

const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

export default function Modal({ open, title, onClose, children, footer, wide }: Props) {
    const panelRef = useRef<HTMLDivElement>(null);
    const restoreRef = useRef<HTMLElement | null>(null);
    const titleId = useId();

    /* Esc закрывает */
    useEffect(() => {
        if (!open) return;
        const h = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
        window.addEventListener('keydown', h);
        return () => window.removeEventListener('keydown', h);
    }, [open, onClose]);

    /* Ловушка фокуса: Tab не должен уводить за пределы окна */
    const onKeyDown = useCallback((e: React.KeyboardEvent) => {
        if (e.key !== 'Tab') return;
        const panel = panelRef.current;
        if (!panel) return;
        const items = [...panel.querySelectorAll<HTMLElement>(FOCUSABLE)]
            .filter(el => el.offsetParent !== null);
        if (items.length === 0) { e.preventDefault(); return; }
        const first = items[0];
        const last = items[items.length - 1];
        const active = document.activeElement as HTMLElement | null;
        if (e.shiftKey && (active === first || !panel.contains(active))) {
            e.preventDefault();
            last.focus();
        } else if (!e.shiftKey && active === last) {
            e.preventDefault();
            first.focus();
        }
    }, []);

    /* Фокус внутрь окна + блокировка прокрутки страницы + возврат фокуса */
    useEffect(() => {
        if (!open) return;
        restoreRef.current = document.activeElement as HTMLElement | null;

        const prevOverflow = document.body.style.overflow;
        const prevPad = document.body.style.paddingRight;
        const gap = window.innerWidth - document.documentElement.clientWidth;
        document.body.style.overflow = 'hidden';
        if (gap > 0) document.body.style.paddingRight = `${gap}px`;

        const raf = requestAnimationFrame(() => {
            const panel = panelRef.current;
            if (!panel) return;
            /* сначала — первое поле формы, иначе первая кнопка, иначе сама панель */
            const field = panel.querySelector<HTMLElement>(
                'input:not([type="hidden"]):not([disabled]), select:not([disabled]), textarea:not([disabled]), [contenteditable="true"]'
            );
            const target = field ?? panel.querySelector<HTMLElement>(FOCUSABLE) ?? panel;
            target.focus({ preventScroll: true });
            if (field instanceof HTMLInputElement || field instanceof HTMLTextAreaElement) field.select();
        });

        return () => {
            cancelAnimationFrame(raf);
            document.body.style.overflow = prevOverflow;
            document.body.style.paddingRight = prevPad;
            restoreRef.current?.focus?.({ preventScroll: true });
        };
    }, [open]);

    if (!open) return null;

    return (
        <div className="modal-backdrop" onClick={onClose}>
            <div
                ref={panelRef}
                className={`modal ${wide ? 'modal-lg' : ''}`}
                role="dialog"
                aria-modal="true"
                aria-labelledby={titleId}
                tabIndex={-1}
                onKeyDown={onKeyDown}
                onClick={e => e.stopPropagation()}
            >
                <div className="modal-header">
                    <h3 className="modal-title" id={titleId}>{title}</h3>
                    <button type="button" className="modal-close" onClick={onClose} aria-label="Закрыть">
                        <IconX size={18} />
                    </button>
                </div>
                <div className="modal-body">{children}</div>
                {footer && <div className="modal-footer">{footer}</div>}
            </div>
        </div>
    );
}
