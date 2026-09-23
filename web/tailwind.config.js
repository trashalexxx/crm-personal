/** @type {import('tailwindcss').Config} */

/**
 * Sistema de diseño: rojo sobre negro.
 *
 * Dos escalas y nada más:
 *   brand  → rojo de acento (acciones, estado activo, foco)
 *   slate  → neutros; aquí se redefine el "slate" de Tailwind con grises neutros
 *            que terminan en negro real, en lugar del gris azulado por defecto.
 *
 * Redefinir `slate` en lugar de renombrarlo hace que toda la aplicación cambie de
 * aspecto sin tocar ni una clase en los componentes: cambiar estos valores repinta
 * el CRM entero.
 *
 * Contraste: brand-600 sobre texto blanco da 5.5:1, por encima del mínimo AA (4.5:1),
 * así que los botones rojos son legibles.
 */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#fff1f2',
          100: '#ffe1e4',
          200: '#ffc7cd',
          300: '#ff9aa5',
          400: '#fb5f70',
          500: '#ed2b40',
          600: '#d01228',
          700: '#ab0f21',
          800: '#8c1220',
          900: '#75151f',
          950: '#41050b',
        },
        slate: {
          50: '#f7f7f8',
          100: '#eeeef0',
          200: '#dcdce0',
          300: '#b9b9c0',
          400: '#8a8a93',
          500: '#63636c',
          600: '#4a4a52',
          700: '#33333a',
          800: '#1f1f25',
          900: '#141418',
          950: '#0a0a0c',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'sans-serif'],
      },
      boxShadow: {
        // Resplandor rojo para elementos activos; discreto, no decorativo.
        glow: '0 0 0 1px rgb(208 18 40 / 0.35), 0 8px 24px -8px rgb(208 18 40 / 0.45)',
        card: '0 1px 2px 0 rgb(0 0 0 / 0.04), 0 1px 3px 0 rgb(0 0 0 / 0.06)',
        'card-dark': '0 1px 2px 0 rgb(0 0 0 / 0.5), 0 8px 24px -16px rgb(0 0 0 / 0.8)',
      },
      keyframes: {
        'fade-in': {
          from: { opacity: '0', transform: 'translateY(4px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        'slide-up': {
          from: { opacity: '0', transform: 'translateY(12px) scale(0.98)' },
          to: { opacity: '1', transform: 'translateY(0) scale(1)' },
        },
      },
      animation: {
        'fade-in': 'fade-in 0.18s ease-out',
        'slide-up': 'slide-up 0.22s cubic-bezier(0.16, 1, 0.3, 1)',
      },
    },
  },
  plugins: [],
};
