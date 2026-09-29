import Logo from './Logo';

/* Россыпь маленьких полупрозрачных лого на брендовой панели.
   Раньше блок жил только на странице входа — на регистрации эти знаки
   пропадали, хотя панель выглядела пустой. Теперь он общий для обеих страниц. */
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

export default function AuthLogoScatter() {
    return (
        <div className="auth-logo-scatter" aria-hidden="true">
            {LOGO_SCATTER.map((s, i) => (
                <span
                    key={i}
                    className="auth-logo-ghost"                    style={{
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
    );
}
