import { createContext, useContext, useState, useCallback, useRef, type ReactNode } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { IconCheck, IconX, IconInbox } from './Icons';

type ToastType = 'success' | 'error' | 'info';
interface ToastItem { id: number; type: ToastType; text: string }

interface ToastContextValue {
    success: (text: string) => void;
    error: (text: string) => void;
    info: (text: string) => void;
}

const ToastContext = createContext<ToastContextValue | undefined>(undefined);

const LIFE = 4500;

export function ToastProvider({ children }: { children: ReactNode }) {
    const [items, setItems] = useState<ToastItem[]>([]);
    const timers = useRef<number[]>([]);

    const push = useCallback((type: ToastType, text: string) => {
        const id = Date.now() + Math.random();
        setItems(prev => [...prev.slice(-3), { id, type, text }]);
        const t = window.setTimeout(() => setItems(prev => prev.filter(x => x.id !== id)), LIFE);
        timers.current.push(t);
    }, []);

    const remove = useCallback((id: number) => setItems(prev => prev.filter(t => t.id !== id)), []);

    return (
        <ToastContext.Provider value={{
            success: (t) => push('success', t),
            error: (t) => push('error', t),
            info: (t) => push('info', t)
        }}>
            {children}

            <div className="toast-wrap" role="region" aria-label="Уведомления">
                <AnimatePresence initial={false}>
                    {items.map(t => (
                        <motion.div
                            key={t.id}
                            layout
                            className={`toast toast-${t.type}`}
                            initial={{ opacity: 0, y: 14, scale: .96 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, x: 40, scale: .96 }}
                            transition={{ type: 'spring', stiffness: 420, damping: 32 }}
                            role={t.type === 'error' ? 'alert' : 'status'}
                            aria-live={t.type === 'error' ? 'assertive' : 'polite'}
                        >
                            <div className="toast-icon">
                                {t.type === 'success' && <IconCheck size={18} />}
                                {t.type === 'error' && <IconX size={18} />}
                                {t.type === 'info' && <IconInbox size={18} />}
                            </div>
                            <div className="toast-text">{t.text}</div>
                            <button type="button" className="toast-close" onClick={() => remove(t.id)} aria-label="Закрыть уведомление">
                                <IconX size={14} />
                            </button>
                            <motion.span
                                className="toast-life"
                                initial={{ scaleX: 1 }}
                                animate={{ scaleX: 0 }}
                                transition={{ duration: LIFE / 1000, ease: 'linear' }}
                            />
                        </motion.div>
                    ))}
                </AnimatePresence>
            </div>
        </ToastContext.Provider>
    );
}

export function useToast() {
    const ctx = useContext(ToastContext);
    if (!ctx) throw new Error('useToast must be used within ToastProvider');
    return ctx;
}
