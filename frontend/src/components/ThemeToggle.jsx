import { useTheme } from '../context/ThemeContext.jsx';

export default function ThemeToggle() {
  const { theme, toggle } = useTheme();
  return (
    <button className="btn-ghost text-sm" onClick={toggle} aria-label="Cambiar tema">
      {theme === 'light' ? '🌙 Oscuro' : '☀️ Claro'}
    </button>
  );
}
