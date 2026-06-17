import React, { useState, useRef, useEffect } from 'react';
import { Globe, Check } from 'lucide-react';
import { useLanguage } from '../hooks/useLanguage';

export const LanguageSelector: React.FC = () => {
  const { language, setLanguage } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const options = [
    { code: 'zh' as const, label: '繁體中文' },
    { code: 'en' as const, label: 'English' },
  ];

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center justify-center p-2.5 bg-white/85 hover:bg-white dark:bg-slate-900/80 dark:hover:bg-slate-900 backdrop-blur-xl border border-slate-200/60 dark:border-slate-800/60 rounded-full shadow-md hover:shadow-lg hover:scale-105 active:scale-95 transition-all duration-300 cursor-pointer pointer-events-auto text-slate-700 dark:text-slate-300"
        title={language === 'zh' ? '選擇語言' : 'Select Language'}
      >
        <Globe className="w-4.5 h-4.5" />
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2.5 w-40 bg-white/90 dark:bg-slate-900/90 backdrop-blur-2xl border border-slate-200/50 dark:border-slate-800/50 rounded-2xl shadow-xl py-2 flex flex-col pointer-events-auto animate-in slide-in-from-top-2 duration-200">
          {options.map((opt) => (
            <button
              key={opt.code}
              onClick={() => {
                setLanguage(opt.code);
                setIsOpen(false);
              }}
              className="w-full flex items-center justify-between px-4 py-2 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/50 cursor-pointer text-left transition-colors"
            >
              <span>{opt.label}</span>
              {language === opt.code && (
                <Check className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
