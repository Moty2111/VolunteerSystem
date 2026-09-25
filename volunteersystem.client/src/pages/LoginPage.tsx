import { useState, type FormEvent } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Eye, EyeOff, Sparkles } from 'lucide-react';
import { motion } from 'framer-motion';
import { authApi } from '../api/auth';
import { useAuth } from '../context/AuthContext';

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
      setError(e2.response?.data?.message || 'еверный логин или пароль');
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
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 21V11" />
                <path d="M12 12c-3.5 0-6-2.5-6-6 3.5 0 6 2.5 6 6z" />
                <path d="M12 9c3.5 0 6-2.5 6-6-3.5 0-6 2.5-6 6z" />
                <path d="M8 21h8" />
              </svg>
            </div>
            <div className="name">VolunteerSystem</div>
          </div>

          <h1 className="auth-brand-title">
            омогать — просто. <br />
            ы сделаем это удобным.
          </h1>
          <p className="auth-brand-sub">
            диная платформа для координации волонтёров, мероприятий и партнёрских программ.
            розрачная отчётность, живые люди, реальная польза.
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
        <motion.form
          onSubmit={handleSubmit}
          className="auth-card"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35 }}
        >
          <h2 className="auth-card-title">
            обро пожаловать
            <Sparkles size={20} style={{ marginLeft: 8, color: 'var(--primary)', verticalAlign: 'middle' }} />
          </h2>
          <p className="auth-card-sub">ойдите в свой аккаунт</p>

          {error && <div className="auth-alert error">{error}</div>}

          <div className="field">
            <label className="field-label">огин</label>
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
            <label className="field-label">ароль</label>
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
            {loading ? <span className="spinner" /> : 'ойти'}
          </button>

          <p className="auth-footer">
            ет аккаунта? <Link to="/register">арегистрироваться</Link>
          </p>
        </motion.form>
      </div>
    </div>
  );
}
