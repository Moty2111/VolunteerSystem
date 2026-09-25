import { useState, type FormEvent } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Eye, EyeOff, Sparkles } from 'lucide-react';
import { motion } from 'framer-motion';
import { authApi } from '../api/auth';
import { useAuth } from '../context/AuthContext';
import ThemeToggle from '../components/ThemeToggle';

export default function LoginPage() {
  const [loginName, setLoginName] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await authApi.login({ loginName, password });
      login(res);
      navigate('/dashboard');
    } catch (err: unknown) {
      const e2 = err as { response?: { data?: { message?: string } } };
      setError(e2.response?.data?.message || 'Неверный логин или пароль');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-split">
      <div className="auth-brand">
        <div className="auth-brand-inner">
          <div className="auth-brand-logo">
            <div className="mark">
              <svg viewBox="0 0 32 32" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M16 28C8 22 4 17 4 12.5A5.5 5.5 0 0 1 16 8a5.5 5.5 0 0 1 12 4.5C28 17 24 22 16 28z" fill="rgba(255,255,255,0.25)" stroke="currentColor" />
                <path d="M16 22V13" />
                <path d="M16 16c-2.5 0-4.5-2-4.5-4.5 2.5 0 4.5 2 4.5 4.5z" fill="currentColor" opacity="0.9" />
                <path d="M16 14c2.5 0 4.5-2 4.5-4.5-2.5 0-4.5 2-4.5 4.5z" fill="currentColor" opacity="0.9" />
              </svg>
            </div>
            <div className="name">VolunteerSystem</div>
          </div>

          <h1 className="auth-brand-title">
            Помогать — просто. <br />
            Мы сделаем это удобным.
          </h1>
          <p className="auth-brand-sub">
            Единая платформа для координации волонтёров, мероприятий и партнёрских программ.
            Прозрачная отчётность, живые люди, реальная польза.
          </p>

          <div className="auth-brand-stats">
            <div className="auth-brand-stat">
              <div className="num">124</div>
              <div className="lbl">волонтёра</div>
            </div>
            <div className="auth-brand-stat">
              <div className="num">486 ч</div>
              <div className="lbl">отработано</div>
            </div>
            <div className="auth-brand-stat">
              <div className="num">18</div>
              <div className="lbl">мероприятий</div>
            </div>
          </div>
        </div>
      </div>

      <div className="auth-form-side">
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
          <h2 className="auth-card-title">
            Добро пожаловать
            <Sparkles size={20} style={{ marginLeft: 8, color: 'var(--primary)', verticalAlign: 'middle' }} />
          </h2>
          <p className="auth-card-sub">Войдите в свой аккаунт</p>

          {error && <div className="auth-alert error">{error}</div>}

          <div className="field">
            <label className="field-label">Логин</label>
            <input
              className="input"
              value={loginName}
              onChange={e => setLoginName(e.target.value)}
              autoComplete="username"
              autoFocus
              required
            />
          </div>

          <div className="field">
            <label className="field-label">Пароль</label>
            <div style={{ position: 'relative' }}>
              <input
                type={showPw ? 'text' : 'password'}
                className="input"
                value={password}
                onChange={e => setPassword(e.target.value)}
                autoComplete="current-password"
                required
                style={{ paddingRight: 42 }}
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
          </div>

          <button
            type="submit"
            disabled={loading}
            className="btn btn-primary"
            style={{ width: '100%', marginTop: 8 }}
          >
            {loading ? <span className="spinner" /> : 'Войти'}
          </button>

          <p className="auth-footer">
            Нет аккаунта? <Link to="/register">Зарегистрироваться</Link>
          </p>
        </motion.form>
      </div>
    </div>
  );
}
