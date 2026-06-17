import React from 'react';
import { Sun, Moon } from 'lucide-react';

interface ThemeToggleProps {
  theme: 'light' | 'dark';
  toggleTheme: () => void;
}

export const ThemeToggle: React.FC<ThemeToggleProps> = ({ theme, toggleTheme }) => {
  return (
    <button
      onClick={toggleTheme}
      className="flex items-center justify-center p-2.5 rounded-full border shadow-md hover:shadow-lg hover:scale-105 active:scale-95 transition-all duration-300 cursor-pointer bg-white/85 dark:bg-slate-900/80 hover:bg-white dark:hover:bg-slate-900 border-slate-200/60 dark:border-slate-800/50 text-slate-700 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-amber-400 pointer-events-auto"
      title={theme === 'dark' ? '切換為明亮模式' : '切換為黑暗模式'}
      aria-label="Toggle theme"
    >
      {theme === 'dark' ? (
        <Sun className="w-5 h-5 animate-in spin-in-180 duration-500 text-amber-400" />
      ) : (
        <Moon className="w-5 h-5 animate-in spin-in-12 duration-500 text-indigo-500" />
      )}
    </button>
  );
};
