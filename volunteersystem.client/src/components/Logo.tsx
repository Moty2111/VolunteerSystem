interface Props {
    size?: number;
    markOnly?: boolean;
}

export default function Logo({ size = 42, markOnly = false }: Props) {
    return (
        <>
        <div className= "logo-mark" style = {{ width: size, height: size }
}>
    <svg viewBox="0 0 32 32" fill = "none" stroke = "currentColor" strokeWidth = "2" strokeLinecap = "round" strokeLinejoin = "round" >
    {/* Сердце-ладонь: помощь и забота */ }
        < path d = "M16 28C8 22 4 17 4 12.5A5.5 5.5 0 0 1 16 8a5.5 5.5 0 0 1 12 4.5C28 17 24 22 16 28z"
fill = "rgba(255,255,255,0.25)"
stroke = "currentColor" />
{/* Росток внутри сердца */ }
    < path d = "M16 22V13" />
        <path d="M16 16c-2.5 0-4.5-2-4.5-4.5 2.5 0 4.5 2 4.5 4.5z" fill = "currentColor" opacity = "0.9" />
            <path d="M16 14c2.5 0 4.5-2 4.5-4.5-2.5 0-4.5 2-4.5 4.5z" fill = "currentColor" opacity = "0.9" />
                </svg>
                </div>
{
    !markOnly && (
        <div className="hide-collapsed" >
            <div className="sidebar-logo-text" > VolunteerSystem </div>
                < div className = "sidebar-logo-sub" > Помощь рядом </div>
                    </div>
      )
}
</>
  );
}