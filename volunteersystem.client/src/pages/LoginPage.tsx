import { useState, type FormEvent } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Eye, EyeOff, Sparkles, HeartHandshake, Handshake, Sprout, Leaf } from 'lucide-react';
import { motion } from 'framer-motion';
import { authApi } from '../api/auth';
import { useAuth } from '../context/AuthContext';
import ThemeToggle from '../components/ThemeToggle';
import Logo from '../components/Logo';

/* россыпь маленьких прозрачных лого на правой части панели с надписью */
const LOGO_SCATTER: { l: number; t: number; s: number; o: number }[] = [
    { l: 54, t: 8, s: 30, o: 0.10 },
    { l: 68, t: 15, s: 22, o: 0.08 },
    { l: 82, t: 7, s: 34, o: 0.09 },
    { l: 93, t: 18, s: 20, o: 0.07 },
    { l: 58, t: 30, s: 24, o: 0.08 },
    { l: 74, t: 34, s: 38, o: 0.11 },
    { l: 90, t: 38, s: 26, o: 0.08 },
    { l: 52, t: 48, s: 20, o: 0.07 },
    { l: 66, t: 55, s: 28, o: 0.09 },
    { l: 84, t: 58, s: 22, o: 0.07 },
    { l: 95, t: 62, s: 30, o: 0.08 },
    { l: 56, t: 72, s: 34, o: 0.10 },
    { l: 72, t: 78, s: 22, o: 0.07 },
    { l: 86, t: 84, s: 36, o: 0.10 },
    { l: 62, t: 90, s: 20, o: 0.06 },
    { l: 96, t: 88, s: 24, o: 0.07 }
];

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

  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (resetMode) {
      // демо-режим: реальной отправки нет, просто показываем подтверждение
      setResetSent(true);
      return;
    }
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
              <Logo size={50} markOnly />
            </div>
            <div className="name">VolunteerSystem</div>
          </div>
          <h1 className="auth-brand-title">
            Помогать — просто. <br />
            Мы сделаем это удобным.
          </h1>

          {/* россыпь маленьких прозрачных лого — статично, без свечения и анимаций */}
          <div className="auth-logo-scatter" aria-hidden="true">
            {LOGO_SCATTER.map((s, i) => (
              <span
                key={i}
                style={{
                  left: `${s.l}%`,
                  top: `${s.t}%`,
                  width: s.s,
                  height: s.s,
                  opacity: s.o
                }}
              >
                <Logo size={s.s} markOnly plain />
              </span>
            ))}
          </div>


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
              ? 'Укажите email — пришлём ссылку для смены пароля'
              : 'Войдите в свой аккаунт'}
          </p>

          {error && <div className="auth-alert error">{error}</div>}
          {resetMode && resetSent && (
            <div className="auth-alert success">
              Ссылка для сброса отправлена на {resetEmail} (демо-режим — письма не отправляются)
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
                <label className="field-label">Email</label>
                <input
                  type="email"
                  className="input"
                  value={resetEmail}
                  onChange={e => setResetEmail(e.target.value)}
                  placeholder="ivanov@mail.ru"
                  autoComplete="email"
                  autoFocus
                  required
                />
              </div>

              <button
                type="submit"
                className="btn btn-primary"
                style={{ width: '100%', marginTop: 8 }}
                disabled={!resetEmail || resetSent}
              >
                {resetSent ? 'Ссылка отправлена' : 'Отправить ссылку'}
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
            <p className="auth-footer">
              Нет аккаунта? <Link to="/register">Зарегистрироваться</Link>
            </p>
          )}
        </motion.form>

      </div>
    </div>
  );
}
