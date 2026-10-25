import { useState, type FormEvent } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { KeyRound, Eye, EyeOff, CheckCircle2 } from 'lucide-react';
import { authApi } from '../api/auth';
import { isValidPassword, PASSWORD_REQUIREMENTS } from '../utils/password';
import ThemeToggle from '../components/ThemeToggle';
import Logo from '../components/Logo';
import AuthBackground from '../components/AuthBackground';

export default function ResetPasswordPage() {
    const [params] = useSearchParams();
    const token = params.get('token') || '';

    const [next, setNext] = useState('');
    const [confirm, setConfirm] = useState('');
    const [showPw, setShowPw] = useState(false);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [done, setDone] = useState(false);

    const navigate = useNavigate();

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        setError('');

        if (!token) {
            setError('Ссылка для сброса недействительна: отсутствует токен');
            return;
        }
        if (next !== confirm) {
            setError('Новые пароли не совпадают');
            return;
        }
        if (!isValidPassword(next)) {
            setError(PASSWORD_REQUIREMENTS);
            return;
        }

        setLoading(true);
        try {
            await authApi.resetPassword(token, next);
            setDone(true);
        } catch (err: unknown) {
            const e2 = err as { response?: { data?: { message?: string } } };
            setError(e2.response?.data?.message || 'Не удалось сбросить пароль');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="auth-split">
            <div className="auth-brand auth-brand-login">
                <div className="auth-brand-inner">
                    <div className="auth-brand-logo">
                        <div className="mark">
                            <Logo size={50} markOnly />
                        </div>
                        <div className="name">VolunteerSystem</div>
                    </div>
                    <h1 className="auth-brand-title">Помогать — просто.</h1>
                    <p className="auth-brand-sub">Установите новый пароль для входа в систему.</p>
                </div>
            </div>

            <div className="auth-form-side">
                <AuthBackground />
                <div className="auth-theme-toggle">
                    <ThemeToggle />
                </div>

                {done ? (
                    <motion.div
                        className="auth-card"
                        initial={{ opacity: 0, y: 12 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.35 }}
                    >
                        <div className="auth-alert success">
                            <CheckCircle2 size={18} style={{ verticalAlign: 'middle', marginRight: 6 }} />
                            Пароль успешно изменён — теперь можно войти с новым паролем.
                        </div>
                        <button
                            className="btn btn-primary"
                            style={{ width: '100%', marginTop: 12 }}
                            onClick={() => navigate('/login')}
                        >
                            Перейти ко входу
                        </button>
                    </motion.div>
                ) : (
                    <motion.form
                        onSubmit={handleSubmit}
                        className="auth-card"
                        initial={{ opacity: 0, y: 12 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.35 }}
                    >
                        <h2 className="auth-card-title">
                            Новый пароль
                            <KeyRound size={20} style={{ marginLeft: 8, color: 'var(--primary)', verticalAlign: 'middle' }} />
                        </h2>
                        <p className="auth-card-sub">Задайте новый пароль для аккаунта</p>

                        {error && <div className="auth-alert error">{error}</div>}

                        <div className="field">
                            <label className="field-label">Новый пароль</label>
                            <div style={{ position: 'relative' }}>
                                <input
                                    type={showPw ? 'text' : 'password'}
                                    className="input"
                                    value={next}
                                    onChange={e => setNext(e.target.value)}
                                    autoComplete="new-password"
                                    style={{ paddingRight: 42 }}
                                    required
                                />
                                <button
                                    type="button"
                                    className="pw-toggle"
                                    onClick={() => setShowPw(s => !s)}
                                    tabIndex={-1}
                                    aria-label={showPw ? 'Скрыть пароль' : 'Показать пароль'}
                                >
                                    {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                                </button>
                            </div>
                            <div className="field-hint">{PASSWORD_REQUIREMENTS}</div>
                        </div>

                        <div className="field">
                            <label className="field-label">Повторите новый пароль</label>
                            <input
                                type={showPw ? 'text' : 'password'}
                                className="input"
                                value={confirm}
                                onChange={e => setConfirm(e.target.value)}
                                autoComplete="new-password"
                                required
                            />
                        </div>

                        <button
                            type="submit"
                            className="btn btn-primary"
                            style={{ width: '100%', marginTop: 8 }}
                            disabled={loading}
                        >
                            {loading ? <span className="spinner" /> : 'Сохранить пароль'}
                        </button>

                        <Link to="/login" className="auth-forgot" style={{ margin: '12px auto 0', display: 'block' }}>
                            ← Вернуться ко входу
                        </Link>
                    </motion.form>
                )}
            </div>
        </div>
    );
}
