import { useState, type FormEvent } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Eye, EyeOff, Sparkles, Check, HeartPulse, Upload } from 'lucide-react';
import { motion } from 'framer-motion';
import { authApi } from '../api/auth';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../components/Toast';
import ThemeToggle from '../components/ThemeToggle';
import AuthLogoScatter from '../components/AuthLogoScatter';
import AuthBackground from '../components/AuthBackground';

export default function RegisterPage() {
  const [form, setForm] = useState({
    fullName: '', birthDate: '', phone: '', email: '',
    city: '', loginName: '', password: ''
  });
  const [showPw, setShowPw] = useState(false);
  const [agree, setAgree] = useState(true);
  const [medBookFile, setMedBookFile] = useState<File | null>(null);
  const [medBookValidUntil, setMedBookValidUntil] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const { login } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();

  const update = (field: keyof typeof form) =>
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setError('');
      setForm({ ...form, [field]: e.target.value });
    };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    if (!agree) {
      setError('Необходимо согласие на обработку персональных данных');
      return;
    }
    if (!form.city.trim()) {
      setError('Укажите город');
      return;
    }
    if (!form.fullName.trim()) {
      setError('Укажите ФИО');
      return;
    }
    setLoading(true);
    try {
      const res = await authApi.register({
        ...form,
        city: form.city.trim(),
        medBookValidUntil: medBookValidUntil || null,
        medBookScan: medBookFile
      });
      login(res);
      toast.success('Регистрация прошла успешно!');
      navigate('/dashboard');
    } catch (err: unknown) {
      const e2 = err as { response?: { data?: { message?: string; errors?: Record<string, string[]> } } };
      const serverErrors = e2.response?.data?.errors;
      const firstServerError = serverErrors
        ? Object.values(serverErrors).flat()[0]
        : undefined;
      setError(firstServerError || e2.response?.data?.message || 'Ошибка регистрации');
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
            Присоединяйтесь <br />
            к добрым делам
          </h1>

          {/* тот же блок прозрачных лого, что и на странице входа */}
          <AuthLogoScatter />

          <p className="auth-brand-sub">
            Регистрация займёт 1 минуту. Вы сможете записываться на мероприятия,
            отслеживать свои часы и получать бейджи за активность.
          </p>

          <div className="auth-brand-stats">
            <div className="auth-brand-stat">
              <div className="num">10 ч</div>
              <div className="lbl">бейдж «Активист»</div>
            </div>
            <div className="auth-brand-stat">
              <div className="num">50 ч</div>
              <div className="lbl">бейдж «Наставник»</div>
            </div>
            <div className="auth-brand-stat">
              <div className="num">100 ч</div>
              <div className="lbl">бейдж «Герой»</div>
            </div>
          </div>
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
          style={{ maxWidth: 480 }}
        >
          <h2 className="auth-card-title">
            Регистрация
            <Sparkles size={20} style={{ marginLeft: 8, color: 'var(--primary)', verticalAlign: 'middle' }} />
          </h2>
          <p className="auth-card-sub">Станьте частью волонтёрского движения</p>

          {error && <div className="auth-alert error">{error}</div>}

          <div className="form-row">
            <div className="field">
              <label className="field-label">ФИО *</label>
              <input className="input" value={form.fullName} onChange={update('fullName')} required />
            </div>
            <div className="field">
              <label className="field-label">Дата рождения *</label>
              <input type="date" className="input" value={form.birthDate} onChange={update('birthDate')} required />
            </div>
          </div>

          <div className="form-row">
            <div className="field">
              <label className="field-label">Телефон *</label>
              <input className="input" placeholder="+79001234567" value={form.phone} onChange={update('phone')} required />
            </div>
            <div className="field">
              <label className="field-label">Город *</label>
              <input className="input" value={form.city} onChange={update('city')} required />
            </div>
          </div>

          <div className="field">
            <label className="field-label">Email *</label>
            <input type="email" className="input" value={form.email} onChange={update('email')} required />
          </div>

          {/* Медкнижка — необязательный блок */}
          <div className="reg-medbook">
            <div className="reg-medbook-head">
              <span className="reg-medbook-icon"><HeartPulse size={16} /></span>
              <div>
                <div className="reg-medbook-title">Медкнижка <span className="reg-medbook-optional">необязательно</span></div>
                <div className="reg-medbook-sub">
                  Скан откроет доступ к социальным, благотворительным и образовательным мероприятиям.
                  Скан можно загрузить и позже — в профиле.
                </div>
              </div>
            </div>

            <div className="form-row">
              <div className="field">
                <label className="field-label">Действительна до</label>
                <input
                  type="date"
                  className="input"
                  value={medBookValidUntil}
                  onChange={e => { setError(''); setMedBookValidUntil(e.target.value); }}
                />
              </div>
              <div className="field">
                <label className="field-label">Скан (PDF/JPG/PNG до 10 МБ)</label>
                <label className="reg-medbook-file">
                  <input
                    type="file"
                    accept=".pdf,.jpg,.jpeg,.png"
                    onChange={e => { setError(''); setMedBookFile(e.target.files?.[0] ?? null); }}
                  />
                  <span className="reg-medbook-file-btn"><Upload size={14} /> Выбрать файл</span>
                  <span className="reg-medbook-file-name">
                    {medBookFile ? medBookFile.name : 'файл не выбран'}
                  </span>
                </label>
              </div>
            </div>
          </div>

          <div className="form-row">
            <div className="field">
              <label className="field-label">Логин *</label>
              <input className="input" value={form.loginName} onChange={update('loginName')} required />
            </div>
            <div className="field">
              <label className="field-label">Пароль *</label>
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
                  aria-label={showPw ? 'Скрыть пароль' : 'Показать пароль'}
                >
                  {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              {form.password && (
                <div style={{ marginTop: 6, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{ flex: 1, height: 4, borderRadius: 2, background: 'var(--surface-2)', overflow: 'hidden' }}>
                    <div style={{ width: `${(pwStrength / 4) * 100}%`, height: '100%', background: strengthColor, transition: 'all .25s' }} />
                  </div>
                  <span style={{ fontSize: 11, color: strengthColor, fontWeight: 600 }}>{strengthLabel}</span>
                </div>
              )}
            </div>
          </div>

          <label style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginTop: 16, cursor: 'pointer', fontSize: 13, color: 'var(--text-2)', lineHeight: 1.5 }}>
            <span style={{
              width: 18, height: 18, borderRadius: 4,
              border: `1.5px solid ${agree ? 'var(--primary)' : 'var(--border-2)'}`,
              background: agree ? 'var(--primary)' : 'transparent',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0, marginTop: 1, transition: 'all .15s'
            }}>
              {agree && <Check size={12} color="#fff" />}
            </span>
            <input type="checkbox" checked={agree} onChange={e => { setError(''); setAgree(e.target.checked); }} style={{ display: 'none' }} />
            <span>Я согласен(-на) на обработку персональных данных в соответствии с ФЗ-152 и <Link to="/privacy">политикой конфиденциальности</Link></span>
          </label>

          <button type="submit" disabled={loading} className="btn btn-primary" style={{ width: '100%', marginTop: 20 }}>
            {loading ? <span className="spinner" /> : 'Зарегистрироваться'}
          </button>

          <p className="auth-footer">
            Уже есть аккаунт? <Link to="/login">Войти</Link>
          </p>
        </motion.form>
      </div>
    </div>
  );
}
