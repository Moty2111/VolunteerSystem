import { Link } from 'react-router-dom';
import { ShieldCheck, FileText, Lock, Clock, UserCheck, RefreshCw, Mail, ArrowLeft } from 'lucide-react';
import Logo from '../components/Logo';
import AuthLogoScatter from '../components/AuthLogoScatter';
import AuthBackground from '../components/AuthBackground';
import ThemeToggle from '../components/ThemeToggle';

const SECTIONS: { icon: React.ReactNode; title: string; body: string[] }[] = [
    {
        icon: <FileText size={18} />,
        title: '1. Общие положения',
        body: [
            'Настоящая Политика конфиденциальности (далее — «Политика») определяет порядок обработки и защиты персональных данных пользователей информационной системы «VolunteerSystem» (далее — «Система»), эксплуатируемой в рамках волонтёрской программы.',
            'Используя Систему, пользователь выражает согласие с условиями настоящей Политики. Если пользователь не согласен с условиями, он должен прекратить использование Системы.'
        ]
    },
    {
        icon: <UserCheck size={18} />,
        title: '2. Состав обрабатываемых данных',
        body: [
            'Фамилия, имя, отчество; дата рождения; контактный телефон; адрес электронной почты; город проживания.',
            'Данные медицинской книжки: статус проверки, срок действия, электронная копия скана медицинской книжки.',
            'Сведения об активности в Системе: участие в мероприятиях, подтверждённые часы, назначенные роли, навыки, достижения, записи журнала аудита.'
        ]
    },
    {
        icon: <ShieldCheck size={18} />,
        title: '3. Цели обработки',
        body: [
            'Регистрация пользователя и создание личного кабинета.',
            'Учёт участия волонтёров в мероприятиях, начисление часов и формирование рейтингов.',
            'Контроль актуальности медицинских книжек для допуска к мероприятиям с повышенными требованиями.',
            'Информирование о мероприятиях, уведомления, связь с координаторами и администраторами.',
            'Ведение статистики и отчётности в рамках волонтёрской программы.'
        ]
    },
    {
        icon: <Lock size={18} />,
        title: '4. Правовые основания',
        body: [
            'Обработка персональных данных осуществляется на основании Федерального закона от 27.07.2006 № 152-ФЗ «О персональных данных».',
            'Согласие субъекта персональных данных на обработку его персональных данных, предоставляемое при регистрации в Системе.'
        ]
    },
    {
        icon: <Clock size={18} />,
        title: '5. Сроки хранения',
        body: [
            'Персональные данные хранятся в течение срока действия учётной записи пользователя в Системе.',
            'После удаления учётной записи данные удаляются либо обезличиваются, за исключением случаев, когда их хранение требуется законодательством Российской Федерации.'
        ]
    },
    {
        icon: <RefreshCw size={18} />,
        title: '6. Права субъекта персональных данных',
        body: [
            'Пользователь вправе получать сведения об обработке его персональных данных.',
            'Пользователь вправе требовать уточнения, блокирования или удаления своих персональных данных.',
            'Пользователь вправе отозвать согласие на обработку персональных данных в любой момент, направив обращение администратору Системы.'
        ]
    },
    {
        icon: <Lock size={18} />,
        title: '7. Защита данных',
        body: [
            'Система применяет организационные и технические меры защиты: разграничение доступа по ролям, электронная подпись запросов, журналирование действий, шифрование при передаче данных по защищённому соединению.',
            'Доступ к персональным данным имеют только уполномоченные сотрудники в объёме, необходимом для выполнения их должностных обязанностей.'
        ]
    },
    {
        icon: <Mail size={18} />,
        title: '8. Передача третьим лицам',
        body: [
            'Персональные данные не передаются третьим лицам, за исключением случаев, предусмотренных законодательством Российской Федерации.',
            'В рамках Системы данные доступны координаторам, менеджерам и администраторам в объёме, необходимом для организационной работы.'
        ]
    },
    {
        icon: <RefreshCw size={18} />,
        title: '9. Изменение Политики',
        body: [
            'Администрация Системы вправе вносить изменения в настоящую Политику. Новая редакция вступает в силу с момента её размещения в Системе.',
            'Продолжение использования Системы после изменения Политики означает согласие пользователя с новой редакцией.'
        ]
    },
    {
        icon: <Mail size={18} />,
        title: '10. Контакты',
        body: [
            'По вопросам обработки персональных данных пользователь может обратиться к администратору Системы через личный кабинет либо по адресу электронной почты поддержки.',
            'Адрес электронной почты поддержки: support@volunteersystem.local'
        ]
    }
];

export default function PrivacyPage() {
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
                        Конфиденциальность — <br />
                        это часть доверия.
                    </h1>
                    <AuthLogoScatter />
                    <p className="auth-brand-sub">
                        Мы обрабатываем персональные данные только для работы волонтёрской программы
                        и защищаем их в соответствии с ФЗ-152.
                    </p>
                </div>
            </div>

            <div className="auth-form-side">
                <AuthBackground />
                <div className="auth-theme-toggle">
                    <ThemeToggle />
                </div>

                <div className="auth-card" style={{ maxWidth: 720, padding: '28px 32px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 6 }}>
                        <div className="mark" style={{ width: 44, height: 44 }}>
                            <ShieldCheck size={22} />
                        </div>
                        <div>
                            <h2 style={{ fontSize: 20, fontWeight: 700, margin: 0 }}>Политика конфиденциальности</h2>
                            <div style={{ fontSize: 12, color: 'var(--text-3)' }}>
                                Редакция от {new Date().toLocaleDateString('ru-RU')}
                            </div>
                        </div>
                    </div>

                    <div style={{
                        maxHeight: '60vh', overflowY: 'auto', paddingRight: 8,
                        marginTop: 12, display: 'flex', flexDirection: 'column', gap: 16
                    }}>
                        <p style={{ fontSize: 13, lineHeight: 1.6, color: 'var(--text-2)', margin: 0 }}>
                            Настоящий документ является электронным официальным документом — Политикой
                            конфиденциальности информационной системы «VolunteerSystem».
                        </p>

                        {SECTIONS.map(s => (
                            <section key={s.title} style={{ background: 'var(--surface-soft)', borderRadius: 12, padding: '14px 16px' }}>
                                <h3 style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14, fontWeight: 700, margin: '0 0 8px' }}>
                                    <span style={{ color: 'var(--primary)' }}>{s.icon}</span>
                                    {s.title}
                                </h3>
                                {s.body.map((p, i) => (
                                    <p key={i} style={{ fontSize: 13, lineHeight: 1.6, color: 'var(--text-2)', margin: '4px 0 0' }}>
                                        {p}
                                    </p>
                                ))}
                            </section>
                        ))}
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 18, gap: 12, flexWrap: 'wrap' }}>
                        <Link to="/login" className="btn btn-secondary btn-sm">
                            <ArrowLeft size={14} /> Вернуться ко входу
                        </Link>
                        <span style={{ fontSize: 12, color: 'var(--text-3)' }}>
                            © {new Date().getFullYear()} VolunteerSystem
                        </span>
                    </div>
                </div>
            </div>
        </div>
    );
}
