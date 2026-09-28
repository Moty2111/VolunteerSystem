interface Props {
    size?: number;
    markOnly?: boolean;
    /* «прозрачный» вариант: только знак, без свечения, орбиты и бликов */
    plain?: boolean;
}

export default function Logo({ size = 42, markOnly = false, plain = false }: Props) {
    return (
        <>
            <div className={`logo-mark${plain ? ' logo-plain' : ''}`} style={{ width: size, height: size }}>
                <svg viewBox="0 0 64 64" fill="none" aria-hidden="true">
                    <defs>
                        <linearGradient id="lgHeart" x1="0" y1="0" x2="1" y2="1">
                            <stop offset="0%" stopColor="#ffd6e8" />
                            <stop offset="45%" stopColor="#ff6aa5" />
                            <stop offset="100%" stopColor="#ff8a3d" />
                        </linearGradient>
                        <linearGradient id="lgLeaf" x1="0" y1="1" x2="1" y2="0">
                            <stop offset="0%" stopColor="#7dffc4" />
                            <stop offset="100%" stopColor="#ffffff" />
                        </linearGradient>
                        <radialGradient id="lgGlow" cx="50%" cy="50%" r="50%">
                            <stop offset="0%" stopColor="#ff4d8d" stopOpacity="0.75" />
                            <stop offset="100%" stopColor="#ff4d8d" stopOpacity="0" />
                        </radialGradient>
                    </defs>

                    {!plain && (
                        /* тёплое свечение позади знака */
                        <circle className="logo-glow" cx="32" cy="34" r="26" fill="url(#lgGlow)" />
                    )}

                    {!plain && (
                        /* орбита с искрами */
                        <g className="logo-orbit">
                            <circle className="logo-spark spark-a" cx="32" cy="7" r="2.6" fill="#ffe27a" />
                            <circle className="logo-spark spark-b" cx="57" cy="40" r="2" fill="#8affd7" />
                            <circle className="logo-spark spark-c" cx="8" cy="42" r="1.7" fill="#ffffff" />
                        </g>
                    )}

                    {/* сердце-ладонь: помощь и забота */}
                    <g className="logo-heart">
                        <path
                            d="M32 55C17.5 45 8 36.5 8 25.5A11.5 11.5 0 0 1 32 18a11.5 11.5 0 0 1 24 7.5C56 36.5 46.5 45 32 55z"
                            fill="url(#lgHeart)"
                            stroke="rgba(255,255,255,0.85)"
                            strokeWidth="2.5"
                            strokeLinejoin="round"
                        />
                        {/* росток внутри сердца */}
                        <path d="M32 44V26" stroke="#ffffff" strokeWidth="3.2" strokeLinecap="round" />
                        <path
                            className="logo-leaf"
                            d="M32 33c-5.4 0-9.6-4.3-9.6-9.6 5.4 0 9.6 4.3 9.6 9.6z"
                            fill="url(#lgLeaf)"
                        />
                        <path
                            className="logo-leaf"
                            d="M32 29c5.4 0 9.6-4.3 9.6-9.6-5.4 0-9.6 4.3-9.6 9.6z"
                            fill="url(#lgLeaf)"
                        />
                    </g>

                    {/* блик */}
                    {!plain && (
                        <path
                            className="logo-shine"
                            d="M18 24a11.5 11.5 0 0 1 9-9"
                            stroke="rgba(255,255,255,0.9)"
                            strokeWidth="3"
                            strokeLinecap="round"
                        />
                    )}
                </svg>
            </div>
            {!markOnly && (
                <div className="hide-collapsed">
                    <div className="sidebar-logo-text">VolunteerSystem</div>
                    <div className="sidebar-logo-sub">Помощь рядом</div>
                </div>
            )}
        </>
    );
}
