import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { KeyRound, Eye, EyeOff, Sparkles } from 'lucide-react';
import { authApi } from '../api/auth';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../components/Toast';
import { isValidPassword, PASSWORD_REQUIREMENTS } from '../utils/password';
import ThemeToggle from '../components/ThemeToggle';
import Logo from '../components/Logo';
import AuthBackground from '../components/AuthBackground';

export default function ChangePasswordPage() {
    const [current, setCurrent] = useState('');
    const [next, setNext] = useState('');
    const [confirm, setConfirm] = useState('');
    const [showPw, setShowPw] = useState(false);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const { user, clearMustChangePassword } = useAuth();
    const toast = useToast();
    const navigate = useNavigate();

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        setError('');

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
            await authApi.changePassword({ currentPassword: current, newPassword: next });
            clearMustChangePassword();
            toast.success('Пароль обновлён');
            navigate('/dashboard');
        } catch (err: unknown) {
            const e2 = err as { response?: { data?: { message?: string } } };
            setError(e2.response?.data?.message || 'Не удалось сменить пароль');
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
                    <p className="auth-brand-sub">
                        Смените пароль, чтобы продолжить работу в системе.
                    </p>
                </div>
            </div>

            <div className="auth-form-side">
                <AuthBackground />
                <div className="auth-theme-toggle">
                    <ThemeToggle />
                </div>

                <motion.form
                    onSubmit={handleSubmit}
                    className="auth-card"
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.35 }}
                >
                    {user?.mustChangePassword && (
                        <div className="auth-alert info" style={{ marginBottom: 14 }}>
                            Администратор сбросил ваш пароль — необходимо задать новый.
                        </div>
                    )}

                    <h2 className="auth-card-title">
                        Смена пароля
                        <KeyRound size={20} style={{ marginLeft: 8, color: 'var(--primary)', verticalAlign: 'middle' }} />
                    </h2>
                    <p className="auth-card-sub">Введите текущий и новый пароль</p>

                    {error && <div className="auth-alert error">{error}</div>}

                    <div className="field">
                        <label className="field-label">Текущий пароль</label>
                        <input
                            type={showPw ? 'text' : 'password'}
                            className="input"
                            value={current}
                            onChange={e => setCurrent(e.target.value)}
                            autoComplete="current-password"
                            required
                        />
                    </div>

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
                        {loading ? <span className="spinner" /> : <><KeyRound size={16} /> Сохранить пароль</>}
                    </button>
                </motion.form>
            </div>
        </div>
    );
}
