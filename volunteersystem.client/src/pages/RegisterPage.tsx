import { useState, type FormEvent } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Eye, EyeOff, Sparkles, Check } from 'lucide-react';
import { motion } from 'framer-motion';
import { authApi } from '../api/auth';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../components/Toast';

export default function RegisterPage() {
  const [form, setForm] = useState({
    fullName: '', birthDate: '', phone: '', email: '',
    city: '', loginName: '', password: ''
  });
  const [showPw, setShowPw] = useState(false);
  const [agree, setAgree] = useState(true);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const { login } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();

  const update = (field: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm({ ...form, [field]: e.target.value });

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    if (!agree) {
      setError('еобходимо согласие на обработку персональных данных');
      return;
    }
    setLoading(true);
    try {
      const res = await authApi.register(form);
      login(res);
      toast.success('егистрация прошла успешно!');
      navigate('/dashboard');
    } catch (err: unknown) {
      const e2 = err as { response?: { data?: { message?: string } } };
      setError(e2.response?.data?.message || 'шибка регистрации');
    } finally {
      setLoading(false);
    }
  };

  const pwStrength = (() => {
    const p = form.password;
    let score = 0;
    if (p.length >= 6) score++;
    if (p.length >= 10) score++;
    if (/[A-Z]/.test(p)) score++;
    if (/\d/.test(p)) score++;
    if (/[^A-Za-z0-9]/.test(p)) score++;
    return Math.min(score, 4);
  })();

  const strengthLabel = ['', 'слабый', 'средний', 'хороший', 'сильный'][pwStrength];
  const strengthColor = ['', 'var(--danger)', 'var(--warning)', 'var(--info)', 'var(--success)'][pwStrength];

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
            рисоединяйтесь <br />
            к добрым делам
          </h1>
          <p className="auth-brand-sub">
            егистрация займёт 1 минуту. ы сможете записываться на мероприятия,
            отслеживать свои часы и получать бейджи за активность.
          </p>

          <div className="auth-brand-stats">
            <div className="auth-brand-stat">
              <div className="num">10 ч</div>
              <div className="lbl">бейдж «ктивист»</div>
            </div>
            <div className="auth-brand-stat">
              <div className="num">50 ч</div>
              <div className="lbl">бейдж «аставник»</div>
            </div>
            <div className="auth-brand-stat">
              <div className="num">100 ч</div>
              <div className="lbl">бейдж «ерой»</div>
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
          style={{ maxWidth: 480 }}
        >
          <h2 className="auth-card-title">
            егистрация
            <Sparkles size={20} style={{ marginLeft: 8, color: 'var(--primary)', verticalAlign: 'middle' }} />
          </h2>
          <p className="auth-card-sub">Станьте частью волонтёрского движения</p>

          {error && <div className="auth-alert error">{error}</div>}

          <div className="form-row">
            <div className="field">
              <label className="field-label"> *</label>
              <input className="input" value={form.fullName} onChange={update('fullName')} required />
            </div>
            <div className="field">
              <label className="field-label">ата рождения *</label>
              <input type="date" className="input" value={form.birthDate} onChange={update('birthDate')} required />
            </div>
          </div>

          <div className="form-row">
            <div className="field">
              <label className="field-label">Телефон *</label>
              <input className="input" placeholder="+79001234567" value={form.phone} onChange={update('phone')} required />
            </div>
            <div className="field">
              <label className="field-label">ород *</label>
              <input className="input" value={form.city} onChange={update('city')} required />
            </div>
          </div>

          <div className="field">
            <label className="field-label">Email *</label>
            <input type="email" className="input" value={form.email} onChange={update('email')} required />
          </div>

          <div className="form-row">
            <div className="field">
              <label className="field-label">огин *</label>
              <input className="input" value={form.loginName} onChange={update('loginName')} required />
            </div>
            <div className="field">
              <label className="field-label">ароль *</label>
              <div style={{ position: 'relative' }}>
                <input
                  type={showPw ? 'text' : 'password'}
                  className="input"
                  value={form.password}
                  onChange={update('password')}
                  required
                  minLength={6}
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
              {form.password && (
                <div style={{ marginTop: 6, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{
                    flex: 1, height: 4, borderRadius: 2,
                    background: 'var(--surface-2)', overflow: 'hidden'
                  }}>
                    <div style={{
                      width: `${(pwStrength / 4) * 100}%`,
                      height: '100%',
                      background: strengthColor,
                      transition: 'all .25s'
                    }} />
                  </div>
                  <span style={{ fontSize: 11, color: strengthColor, fontWeight: 600 }}>
                    {strengthLabel}
                  </span>
                </div>
              )}
            </div>
          </div>

          <label style={{
            display: 'flex',
            alignItems: 'flex-start',
            gap: 10,
            marginTop: 16,
            cursor: 'pointer',
            fontSize: 13,
            color: 'var(--text-2)',
            lineHeight: 1.5
          }}>
            <span style={{
              width: 18, height: 18,
              borderRadius: 4,
              border: `1.5px solid ${agree ? 'var(--primary)' : 'var(--border-2)'}`,
              background: agree ? 'var(--primary)' : 'transparent',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
              marginTop: 1,
              transition: 'all .15s'
            }}>
              {agree && <Check size={12} color="#fff" />}
            </span>
            <input
              type="checkbox"
              checked={agree}
              onChange={e => setAgree(e.target.checked)}
              style={{ display: 'none' }}
            />
            <span>
              Я согласен(-на) на обработку персональных данных в соответствии
              с -152 и политикой конфиденциальности
            </span>
          </label>

          <button
            type="submit"
            disabled={loading}
            className="btn btn-primary"
            style={{ width: '100%', marginTop: 20 }}
          >
            {loading ? <span className="spinner" /> : 'арегистрироваться'}
          </button>

          <p className="auth-footer">
            же есть аккаунт? <Link to="/login">ойти</Link>
          </p>
        </motion.form>
      </div>
    </div>
  );
}
