import { Sun, Moon } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

interface Props {
  size?: number;
  variant?: 'icon' | 'full';
}

export default function ThemeToggle({ size = 16, variant = 'icon' }: Props) {
  const { theme, toggleTheme } = useTheme();

  const label = theme === 'dark' ? 'ключить светлую тему' : 'ключить тёмную тему';
  const icon = theme === 'dark' ? <Sun size={size} /> : <Moon size={size} />;

  if (variant === 'full') {
    return (
      <button
        type="button"
        className="btn btn-secondary btn-sm"
        onClick={toggleTheme}
        title={label}
        aria-label={label}
      >
        {icon}
        <span>{theme === 'dark' ? 'Светлая тема' : 'Тёмная тема'}</span>
      </button>
    );
  }

  return (
    <button
      type="button"
      className="icon-btn"
      onClick={toggleTheme}
      title={label}
      aria-label={label}
    >
      {icon}
    </button>
  );
}
