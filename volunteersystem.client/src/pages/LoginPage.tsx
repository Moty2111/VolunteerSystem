import { useState, type FormEvent } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Eye, EyeOff, Sparkles, HeartHandshake, Handshake, Sprout, Leaf } from 'lucide-react';
import { motion } from 'framer-motion';
import { authApi } from '../api/auth';
import { useAuth } from '../context/AuthContext';
import ThemeToggle from '../components/ThemeToggle';
import Logo from '../components/Logo';
import AuthLogoScatter from '../components/AuthLogoScatter';
import AuthBackground from '../components/AuthBackground';


/* вертикальный узор для боков формы: пунктирная нить с сердечком */
const SideOrnament = () => (
    <svg width="16" height="180" viewBox="0 0 16 180" fill="none" aria-hidden="true">
        <path
            d="M8 6v168"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeDasharray="1.5 8"
            opacity=".65"
        />
        <path
            d="M8 74c-2.6-3.6-8.4-2.8-8.4 1.9 0 4.6 8.4 9.6 8.4 9.6s8.4-5 8.4-9.6c0-4.7-5.8-5.5-8.4-1.9z"
            fill="currentColor"
            opacity=".8"
        />
        <circle cx="8" cy="34" r="2.4" fill="currentColor" opacity=".55" />
        <circle cx="8" cy="146" r="2.4" fill="currentColor" opacity=".55" />
        <circle cx="8" cy="52" r="1.6" fill="currentColor" opacity=".4" />
        <circle cx="8" cy="128" r="1.6" fill="currentColor" opacity=".4" />
    </svg>
);


export default function LoginPage() {
  const [loginName, setLoginName] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [resetMode, setResetMode] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [resetSent, setResetSent] = useState(false);
  const [resetLink, setResetLink] = useState('');

  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (resetMode) {
      setError('');
      setLoading(true);
      try {
        const res = await authApi.forgotPassword(resetEmail);
        setResetSent(true);
        setResetLink(res.demoResetLink || '');
        if (res.demoResetLink) {
          window.open(res.demoResetLink, '_blank', 'noopener');
        }
      } catch (err: unknown) {
        const e2 = err as { response?: { data?: { message?: string } } };
        setError(e2.response?.data?.message || 'Не удалось получить ссылку для сброса');
      } finally {
        setLoading(false);
      }
      return;
    }
    setError('');
    setLoading(true);
    try {
      const res = await authApi.login({ loginName, password });
      login(res);
      navigate(res.mustChangePassword ? '/change-password' : '/dashboard');
    } catch (err: unknown) {
      const e2 = err as { response?: { data?: { message?: string } } };
      setError(e2.response?.data?.message || 'Неверный логин или пароль');
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
          <h1 className="auth-brand-title">
            Помогать — просто. <br />
            Мы сделаем это удобным.
          </h1>

          {/* россыпь маленьких прозрачных лого — общий блок для входа и регистрации */}
          <AuthLogoScatter />


          <p className="auth-brand-sub">
            Единая платформа для координации волонтёров, мероприятий и партнёрских программ.
            Прозрачная отчётность, живые люди, реальная польза.
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
          {/* узоры, связанные с волонтёрством: иконки по углам и «нити с сердечком» по бокам */}
          <div className="auth-corners" aria-hidden="true">
            <span className="orn orn-tl"><HeartHandshake size={19} /></span>
            <span className="orn orn-tr"><Handshake size={19} /></span>
            <span className="orn orn-bl"><Sprout size={19} /></span>
            <span className="orn orn-br"><Leaf size={19} /></span>
            <span className="orn orn-side orn-left"><SideOrnament /></span>
            <span className="orn orn-side orn-right"><SideOrnament /></span>
          </div>


          <h2 className="auth-card-title">
            {resetMode ? 'Восстановление пароля' : 'Добро пожаловать'}
            <Sparkles size={20} style={{ marginLeft: 8, color: 'var(--primary)', verticalAlign: 'middle' }} />
          </h2>
          <p className="auth-card-sub">
            {resetMode
              ? 'Укажите логин или email — получите ссылку для смены пароля'
              : 'Войдите в свой аккаунт'}
          </p>

          {error && <div className="auth-alert error">{error}</div>}
          {resetMode && resetSent && (
            <div className="auth-alert success">
              {resetLink
                ? <>Ссылка открыта в новом окне для {resetEmail}.</>
                : <>Пользователь с логином/email «{resetEmail}» не найден.</>}
              {resetLink && (
                <div style={{ marginTop: 8 }}>
                  <span style={{ fontSize: 12, opacity: 0.85 }}>
                    Если окно не открылось — нажмите кнопку:
                  </span>
                  <div style={{ marginTop: 6 }}>
                    <a className="btn btn-secondary btn-sm" href={resetLink} target="_blank" rel="noopener noreferrer">
                      Перейти к смене пароля
                    </a>
                  </div>
                </div>
              )}
            </div>
          )}

          {!resetMode && (
            <>
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
                <button
                  type="button"
                  className="auth-forgot"
                  onClick={() => { setResetMode(true); setResetSent(false); setError(''); }}
                >
                  Забыли пароль?
                </button>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="btn btn-primary"
                style={{ width: '100%', marginTop: 8 }}
              >
                {loading ? <span className="spinner" /> : 'Войти'}
              </button>
            </>
          )}

          {resetMode && (
            <>
              <div className="field">
                <label className="field-label">Логин или email</label>
                <input
                  type="text"
                  className="input"
                  value={resetEmail}
                  onChange={e => setResetEmail(e.target.value)}
                  placeholder="ivanov или ivanov@mail.ru"
                  autoComplete="username"
                  autoFocus
                  required
                />
              </div>

              <button
                type="submit"
                className="btn btn-primary"
                style={{ width: '100%', marginTop: 8 }}
                disabled={!resetEmail || resetSent || loading}
              >
                {loading ? <span className="spinner" /> : resetSent ? 'Ссылка открыта' : 'Получить ссылку'}
              </button>

              <button
                type="button"
                className="auth-forgot"
                style={{ margin: '12px auto 0', display: 'block' }}
                onClick={() => { setResetMode(false); setResetSent(false); setError(''); }}
              >
                ← Вернуться ко входу
              </button>
            </>
          )}

          {!resetMode && (
            <>
              <p className="auth-footer">
                Нет аккаунта? <Link to="/register">Зарегистрироваться</Link>
              </p>
              <div style={{ textAlign: 'center', marginTop: 14 }}>
                <Link to="/privacy" style={{ fontSize: 12, color: 'var(--text-3)' }}>
                  Политика конфиденциальности
                </Link>
              </div>
            </>
          )}
        </motion.form>

      </div>
    </div>
  );
}
