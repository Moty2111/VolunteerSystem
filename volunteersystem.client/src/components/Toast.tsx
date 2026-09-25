import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';
import { IconCheck, IconX, IconInbox } from './Icons';

type ToastType = 'success' | 'error' | 'info';
interface ToastItem { id: number; type: ToastType; text: string }

interface ToastContextValue {
    success: (text: string) => void;
    error: (text: string) => void;
    info: (text: string) => void;
}

const ToastContext = createContext<ToastContextValue | undefined>(undefined);

export function ToastProvider({ children }: { children: ReactNode }) {
    const [items, setItems] = useState<ToastItem[]>([]);

    const push = useCallback((type: ToastType, text: string) => {
        const id = Date.now() + Math.random();
        setItems(prev => [...prev, { id, type, text }]);
        setTimeout(() => setItems(prev => prev.filter(t => t.id !== id)), 4500);
    }, []);

    const remove = (id: number) => setItems(prev => prev.filter(t => t.id !== id));

    return (
        <ToastContext.Provider value= {{
        success: (t) => push('success', t),
            error: (t) => push('error', t),
                info: (t) => push('info', t)
    }
}>
{ children }
    < div className = "toast-wrap" >
    {
        items.map(t => (
            <div key= { t.id } className = {`toast toast-${t.type}`} >
        <div className="toast-icon" >
        { t.type === 'success' && <IconCheck size={ 18 } />}
{ t.type === 'error' && <IconX size={ 18 } /> }
{ t.type === 'info' && <IconInbox size={ 18 } /> }
</div>
    < div style = {{ flex: 1 }}> { t.text } </div>
        < button className = "toast-close" onClick = {() => remove(t.id)}>
            <IconX size={ 14 } />
                </button>
                </div>
        ))}
</div>
    </ToastContext.Provider>
  );
}

export function useToast() {
    const ctx = useContext(ToastContext);
    if (!ctx) throw new Error('useToast must be used within ToastProvider');
    return ctx;
}