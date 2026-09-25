import { type ReactNode, useEffect } from 'react';
import { IconX } from './Icons';

interface Props {
    open: boolean;
    title: string;
    onClose: () => void;
    children: ReactNode;
    footer?: ReactNode;
    wide?: boolean;
}

export default function Modal({ open, title, onClose, children, footer, wide }: Props) {
    useEffect(() => {
        if (!open) return;
        const h = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
        window.addEventListener('keydown', h);
        return () => window.removeEventListener('keydown', h);
    }, [open, onClose]);

    if (!open) return null;

    return (
        <div className= "modal-backdrop" onClick = { onClose } >
            <div className={ `modal ${wide ? 'modal-lg' : ''}` } onClick = { e => e.stopPropagation() } >
                <div className="modal-header" >
                    <h3 className="modal-title" > { title } </h3>
                        < button className = "modal-close" onClick = { onClose } > <IconX size={ 18 } /></button >
                            </div>
                            < div className = "modal-body" > { children } </div>
    { footer && <div className="modal-footer" > { footer } </div> }
    </div>
        </div>
  );
}