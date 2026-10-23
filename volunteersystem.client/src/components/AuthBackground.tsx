import { useEffect, useRef } from 'react';

interface Particle {
    x: number;
    y: number;
    vx: number;
    vy: number;
    r: number;
    hue: number;
}

/**
 * Интерактивный фон для страниц входа/регистрации: плавающие частицы,
 * соединённые линиями, слегка реагируют на движение мыши.
 * Цвета берутся из CSS-переменных темы.
 */
export default function AuthBackground() {
    const canvasRef = useRef<HTMLCanvasElement>(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const root = getComputedStyle(document.documentElement);
        const c1 = root.getPropertyValue('--primary').trim() || '#ff4d8d';
        const c2 = root.getPropertyValue('--accent').trim() || '#b44cff';

        let w = 0;
        let h = 0;
        let raf = 0;
        let particles: Particle[] = [];
        const mouse = { x: -9999, y: -9999 };

        const makeColor = (hue: number, alpha: number) => {
            const base = hue === 1 ? c1 : c2;
            // base может быть как hex, так и rgb(); используем rgba поверх через cssColor
            return `color-mix(in srgb, ${base} ${Math.round(alpha * 100)}%, transparent)`;
        };

        const resize = () => {
            const parent = canvas.parentElement;
            if (!parent) return;
            const dpr = window.devicePixelRatio || 1;
            w = parent.clientWidth;
            h = parent.clientHeight;
            canvas.width = Math.max(1, Math.floor(w * dpr));
            canvas.height = Math.max(1, Math.floor(h * dpr));
            canvas.style.width = `${w}px`;
            canvas.style.height = `${h}px`;
            ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

            const count = Math.min(46, Math.max(14, Math.floor((w * h) / 22000)));
            particles = Array.from({ length: count }, () => ({
                x: Math.random() * w,
                y: Math.random() * h,
                vx: (Math.random() - 0.5) * 0.4,
                vy: (Math.random() - 0.5) * 0.4,
                r: Math.random() * 2.3 + 1,
                hue: Math.random() > 0.5 ? 1 : 2
            }));
        };

        const step = () => {
            ctx.clearRect(0, 0, w, h);

            // движение + отталкивание от курсора
            for (const p of particles) {
                p.x += p.vx;
                p.y += p.vy;
                const dx = p.x - mouse.x;
                const dy = p.y - mouse.y;
                const dist2 = dx * dx + dy * dy;
                const repel = 90;
                if (dist2 < repel * repel && dist2 > 0.01) {
                    const d = Math.sqrt(dist2);
                    const force = ((repel - d) / repel) * 0.45;
                    p.x += (dx / d) * force;
                    p.y += (dy / d) * force;
                }
                if (p.x < -20) p.x = w + 20;
                if (p.x > w + 20) p.x = -20;
                if (p.y < -20) p.y = h + 20;
                if (p.y > h + 20) p.y = -20;
            }

            // линии между близкими частицами
            const linkDist = 120;
            for (let i = 0; i < particles.length; i++) {
                for (let j = i + 1; j < particles.length; j++) {
                    const a = particles[i];
                    const b = particles[j];
                    const dx = a.x - b.x;
                    const dy = a.y - b.y;
                    const dist = Math.sqrt(dx * dx + dy * dy);
                    if (dist < linkDist) {
                        const alpha = (1 - dist / linkDist) * 0.16;
                        ctx.strokeStyle = makeColor(a.hue, alpha);
                        ctx.lineWidth = 1;
                        ctx.beginPath();
                        ctx.moveTo(a.x, a.y);
                        ctx.lineTo(b.x, b.y);
                        ctx.stroke();
                    }
                }
            }

            // сами частицы
            for (const p of particles) {
                ctx.fillStyle = makeColor(p.hue, 0.55);
                ctx.beginPath();
                ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
                ctx.fill();
            }

            raf = requestAnimationFrame(step);
        };

        const onMouseMove = (e: MouseEvent) => {
            const rect = canvas.getBoundingClientRect();
            mouse.x = e.clientX - rect.left;
            mouse.y = e.clientY - rect.top;
        };
        const onMouseLeave = () => {
            mouse.x = -9999;
            mouse.y = -9999;
        };

        resize();
        window.addEventListener('resize', resize);
        window.addEventListener('mousemove', onMouseMove);
        window.addEventListener('mouseleave', onMouseLeave);
        raf = requestAnimationFrame(step);

        return () => {
            cancelAnimationFrame(raf);
            window.removeEventListener('resize', resize);
            window.removeEventListener('mousemove', onMouseMove);
            window.removeEventListener('mouseleave', onMouseLeave);
        };
    }, []);

    return <canvas ref={canvasRef} className="auth-bg-canvas" aria-hidden="true" />;
}
