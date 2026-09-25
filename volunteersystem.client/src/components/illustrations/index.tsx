interface Props { size?: number }

export function IllSprout({ size = 120 }: Props) {
  return (
    <svg width={size} height={size} viewBox="0 0 120 120" fill="none">
      <circle cx="60" cy="60" r="58" fill="currentColor" opacity="0.08" />
      <path d="M60 90V52" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
      <path d="M60 62c-14 0-24-10-24-24 14 0 24 10 24 24z" fill="currentColor" opacity="0.35" />
      <path d="M60 55c14 0 24-10 24-24-14 0-24 10-24 24z" fill="currentColor" opacity="0.55" />
      <path d="M44 94h32" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

export function IllHeart({ size = 120 }: Props) {
  return (
    <svg width={size} height={size} viewBox="0 0 120 120" fill="none">
      <circle cx="60" cy="60" r="58" fill="currentColor" opacity="0.08" />
      <path
        d="M60 92S30 74 30 54a18 18 0 0 1 30-13 18 18 0 0 1 30 13c0 20-30 38-30 38z"
        fill="currentColor" opacity="0.35"
        stroke="currentColor" strokeWidth="2.5" strokeLinejoin="round"
      />
      <path d="M52 60l6 6 12-14" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function IllHands({ size = 120 }: Props) {
  return (
    <svg width={size} height={size} viewBox="0 0 120 120" fill="none">
      <circle cx="60" cy="60" r="58" fill="currentColor" opacity="0.08" />
      <path d="M38 78c-6 0-10-4-10-10V54" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
      <path d="M82 78c6 0 10-4 10-10V54" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
      <path d="M38 78V48a6 6 0 0 1 12 0v20" fill="currentColor" opacity="0.35" />
      <path d="M82 78V48a6 6 0 0 0-12 0v20" fill="currentColor" opacity="0.35" />
      <circle cx="60" cy="52" r="8" fill="currentColor" opacity="0.55" />
      <path d="M50 78c0-6 4-10 10-10s10 4 10 10" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  );
}

export function IllCalendar({ size = 120 }: Props) {
  return (
    <svg width={size} height={size} viewBox="0 0 120 120" fill="none">
      <circle cx="60" cy="60" r="58" fill="currentColor" opacity="0.08" />
      <rect x="32" y="38" width="56" height="48" rx="8" fill="currentColor" opacity="0.2" stroke="currentColor" strokeWidth="2.5" />
      <path d="M32 52h56" stroke="currentColor" strokeWidth="2.5" />
      <path d="M46 32v12M74 32v12" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
      <circle cx="50" cy="66" r="3" fill="currentColor" />
      <circle cx="62" cy="66" r="3" fill="currentColor" opacity="0.5" />
      <circle cx="74" cy="66" r="3" fill="currentColor" opacity="0.5" />
      <circle cx="50" cy="76" r="3" fill="currentColor" opacity="0.5" />
      <circle cx="62" cy="76" r="3" fill="currentColor" />
    </svg>
  );
}

export function IllAward({ size = 120 }: Props) {
  return (
    <svg width={size} height={size} viewBox="0 0 120 120" fill="none">
      <circle cx="60" cy="60" r="58" fill="currentColor" opacity="0.08" />
      <circle cx="60" cy="52" r="18" fill="currentColor" opacity="0.3" stroke="currentColor" strokeWidth="2.5" />
      <path d="M60 44l3 6 7 1-5 5 1 7-6-3-6 3 1-7-5-5 7-1z" fill="currentColor" />
      <path d="M50 68l-6 22 16-8 16 8-6-22" stroke="currentColor" strokeWidth="2.5" strokeLinejoin="round" fill="currentColor" fillOpacity="0.2" />
    </svg>
  );
}

export function IllActivity({ size = 120 }: Props) {
  return (
    <svg width={size} height={size} viewBox="0 0 120 120" fill="none">
      <circle cx="60" cy="60" r="58" fill="currentColor" opacity="0.08" />
      <path
        d="M28 60l14 0 6-16 12 30 8-14 24 0"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
      <circle cx="60" cy="60" r="4" fill="currentColor" opacity="0.6" />
    </svg>
  );
}
export function IllBarChart({ size = 120 }: Props) {
    return (
        <svg width= { size } height = { size } viewBox = "0 0 120 120" fill = "none" >
            <circle cx="60" cy = "60" r = "58" fill = "currentColor" opacity = "0.08" />
                <rect x="28" y = "60" width = "12" height = "28" rx = "3" fill = "currentColor" opacity = "0.4" />
                    <rect x="46" y = "44" width = "12" height = "44" rx = "3" fill = "currentColor" opacity = "0.7" />
                        <rect x="64" y = "52" width = "12" height = "36" rx = "3" fill = "currentColor" opacity = "0.5" />
                            <rect x="82" y = "34" width = "12" height = "54" rx = "3" fill = "currentColor" />
                                <path d="M24 94h72" stroke = "currentColor" strokeWidth = "2.5" strokeLinecap = "round" />
                                    </svg>
  );
}