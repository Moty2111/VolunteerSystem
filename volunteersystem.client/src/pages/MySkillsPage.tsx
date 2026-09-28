import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { skillsApi, type Skill, type VolunteerSkill } from '../api/skills';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../components/Toast';
import { Badge, EmptyState, Skeleton, StatCard } from '../components/ui';
import { IllAward } from '../components/illustrations';
import { plural } from '../utils/format';
import { skillLevelVariant, skillIcon, skillTone, isLanguageLevel } from '../utils/skillLevels';
import { Award, CheckCircle2, Languages, Wrench, ArrowRight, Sparkles } from 'lucide-react';

export default function MySkillsPage() {
    const { user } = useAuth();
    const toast = useToast();
    const [catalog, setCatalog] = useState<Skill[]>([]);
    const [mine, setMine] = useState<VolunteerSkill[]>([]);
    const [loading, setLoading] = useState(true);

    const volunteerId = user?.volunteerId;

    useEffect(() => {
        (async () => {
            try {
                const all = await skillsApi.getAll();
                setCatalog(all);
                if (volunteerId) {
                    setMine(await skillsApi.getVolunteerSkills(volunteerId));
                }
            } catch (e: unknown) {
                const err = e as { response?: { data?: { message?: string } } };
                toast.error(err.response?.data?.message || 'Не удалось загрузить навыки');
            } finally {
                setLoading(false);
            }
        })();
    }, [volunteerId]);

    const languages = useMemo(() => mine.filter(s => isLanguageLevel(s.level)), [mine]);
    const skillsOnly = useMemo(() => mine.filter(s => !isLanguageLevel(s.level)), [mine]);
    const mineIds = useMemo(() => new Set(mine.map(s => s.skillId)), [mine]);
    const rest = useMemo(() => catalog.filter(s => !mineIds.has(s.skillId)), [catalog, mineIds]);

    const SkillCard = ({ s, i, confirmed }: { s: { skillId: number; skillName: string; level: string }; i: number; confirmed?: number | null }) => (
        <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.03 }}
            className={`vcard is-static ${skillTone(s.level)}`}
        >
            <div
                className="vcard-corner cool-tip"
                data-tip={confirmed
                    ? `Подтверждён в ${confirmed} году`
                    : 'Навык внесён в ваш профиль менеджером'}
                style={confirmed ? undefined : { background: 'var(--success-soft)', color: 'var(--success)' }}
            >
                <CheckCircle2 size={14} />
            </div>
            <div className="vcard-head">
                <div className="vcard-avatar">
                    {(() => { const Icon = skillIcon(s.level); return <Icon size={22} strokeWidth={2.2} />; })()}
                </div>
                <div className="vcard-main">
                    <div className="vcard-name" title={s.skillName}>{s.skillName}</div>
                    <div className="vcard-sub">
                        <Award size={12} />
                        <span>{isLanguageLevel(s.level) ? 'Языковой уровень' : 'Умение'}</span>
                    </div>
                    <div className="vcard-pills">
                        <Badge variant={skillLevelVariant(s.level)}>{s.level}</Badge>
                        {confirmed != null && <Badge variant="muted">{confirmed}</Badge>}
                    </div>
                </div>
            </div>
            <div className="vcard-foot">
                <div className="vcard-id">
                    <Award size={12} />
                    <span>ID #{s.skillId}</span>
                </div>
            </div>
        </motion.div>
    );

    return (
        <div>
            <div className="page-header">
                <div>
                    <h1 className="page-title">Мои навыки</h1>
                    <p className="page-subtitle">
                        {loading
                            ? 'Загрузка...'
                            : mine.length === 0
                                ? 'Навыки пока не добавлены — попросите менеджера'
                                : `${mine.length} ${plural(mine.length, ['навык', 'навыка', 'навыков'])} в вашем профиле`}
                    </p>
                </div>
                <Link to="/my-progress" className="btn btn-secondary">
                    Мой прогресс <ArrowRight size={16} />
                </Link>
            </div>

            <div className="stat-grid">
                <StatCard
                    label="Навыков"
                    value={loading ? '—' : mine.length}
                    icon={<Award size={20} />}
                    color="var(--primary)"
                    delay={0}
                />
                <StatCard
                    label="Языков"
                    value={loading ? '—' : languages.length}
                    icon={<Languages size={20} />}
                    color="#7c5cff"
                    delay={0.06}
                />
                <StatCard
                    label="Умений"
                    value={loading ? '—' : skillsOnly.length}
                    icon={<Wrench size={20} />}
                    color="var(--success)"
                    delay={0.12}
                />
                <StatCard
                    label="В каталоге"
                    value={loading ? '—' : catalog.length}
                    icon={<Sparkles size={20} />}
                    color="var(--warning)"
                    delay={0.18}
                />
            </div>

            <h3 style={{ display: 'flex', alignItems: 'center', gap: 8, margin: '4px 0 14px', fontSize: 15 }}>
                <Award size={16} /> Профиль навыков
            </h3>

            {loading ? (
                <div className="vcard-grid">
                    {[1, 2, 3, 4].map(i => <Skeleton key={i} height={190} radius={16} />)}
                </div>
            ) : mine.length === 0 ? (
                <div className="card">
                    <EmptyState
                        illustration={<IllAward size={110} />}
                        title="Навыков пока нет"
                        text="Расскажите менеджеру о своих умениях и языках — он добавит их в ваш профиль, и вы будете чаще попадать в команды мероприятий"
                        action={<Link to="/events" className="btn btn-primary btn-sm">Посмотреть мероприятия</Link>}
                    />
                </div>
            ) : (
                <div className="vcard-grid">
                    {mine.map((s, i) => (
                        <SkillCard key={s.skillId} s={s} i={i} confirmed={s.yearConfirmed} />
                    ))}
                </div>
            )}

            {!loading && rest.length > 0 && (
                <div className="card" style={{ marginTop: 8 }}>
                    <div className="card-header">
                        <h3 className="card-title">
                            <Sparkles size={16} /> Ещё в каталоге
                        </h3>
                        <span style={{ fontSize: 12, color: 'var(--text-3)' }}>
                            Добавить может менеджер
                        </span>
                    </div>
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                        {rest.map(s => (
                            <span key={s.skillId} className="skill-chip" title={`Уровень: ${s.level}`}>
                                <Award size={11} />
                                {s.skillName}
                                <span style={{ color: 'var(--text-3)', fontWeight: 600 }}>{s.level}</span>
                            </span>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
