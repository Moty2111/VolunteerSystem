import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, Compass } from 'lucide-react';
import { IllSprout } from '../components/illustrations';

export default function NotFoundPage() {
    const navigate = useNavigate();

    return (
        <div className="notfound-page">
            <motion.div
                className="notfound-art"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.35 }}
            >
                <IllSprout size={170} />
            </motion.div>

            <motion.div
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.35, delay: 0.1 }}
                style={{ textAlign: 'center', position: 'relative' }}
            >
                <div className="notfound-code">404</div>
                <h1 className="notfound-title">Страница не найдена</h1>
                <p className="notfound-text">
                    Возможно, ссылка устарела или адрес введён с опечаткой.
                    Вернитесь на главную — там всё самое важное.
                </p>
                <div style={{ display: 'flex', gap: 10, justifyContent: 'center', marginTop: 22, flexWrap: 'wrap' }}>
                    <button className="btn btn-primary" onClick={() => navigate('/dashboard')}>
                        <ArrowLeft size={16} /> На главную
                    </button>
                    <button className="btn btn-secondary" onClick={() => navigate(-1)}>
                        <Compass size={16} /> Назад
                    </button>
                </div>
            </motion.div>
        </div>
    );
}
