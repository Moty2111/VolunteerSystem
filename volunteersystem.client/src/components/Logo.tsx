interface Props {
  size?: number;
  markOnly?: boolean;
}

export default function Logo({ size = 42, markOnly = false }: Props) {
  return (
    <>
      <div className="logo-mark" style={{ width: size, height: size }}>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 21V11" />
          <path d="M12 12c-3.5 0-6-2.5-6-6 3.5 0 6 2.5 6 6z" />
          <path d="M12 9c3.5 0 6-2.5 6-6-3.5 0-6 2.5-6 6z" />
          <path d="M8 21h8" />
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
