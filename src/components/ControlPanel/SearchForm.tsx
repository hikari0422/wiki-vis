import React, { useState, useRef, useEffect } from 'react';
import { Search, Globe, ChevronDown, Check } from 'lucide-react';
import { useLanguage } from '../../hooks/useLanguage';

interface SearchFormProps {
  input: string;
  setInput: (input: string) => void;
  lang: string;
  setLang: (lang: string) => void;
  searchLoading: boolean;
  onSubmit: (input: string, lang: string) => void;
  hasNodes: boolean;
}

export const SearchForm: React.FC<SearchFormProps> = ({
  input,
  setInput,
  lang,
  setLang,
  searchLoading,
  onSubmit,
  hasNodes
}) => {
  const { t } = useLanguage();
  const [isLangOpen, setIsLangOpen] = useState(false);
  const langDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (langDropdownRef.current && !langDropdownRef.current.contains(event.target as Node)) {
        setIsLangOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLangChange = (newLang: string) => {
    setLang(newLang);
    const wikiUrlRegex = /https?:\/\/([a-z-]+)\.wikipedia\.org\/(wiki|zh-[a-z]+)\/([^?#]+)/i;
    const match = input.match(wikiUrlRegex);
    if (match) {
      const title = match[3];
      const pathVariant = newLang === 'zh' ? 'zh-tw' : 'wiki';
      const newUrl = `https://${newLang}.wikipedia.org/${pathVariant}/${title}`;
      setInput(newUrl);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;
    onSubmit(input, lang);
  };

  const languages = [
    { code: 'zh', name: '中文 (Wiki)' },
    { code: 'en', name: 'English (Wiki)' },
    { code: 'ja', name: '日本語 (Wiki)' },
    { code: 'de', name: 'Deutsch (Wiki)' },
    { code: 'fr', name: 'Français (Wiki)' },
  ];

  const formClasses = hasNodes
    ? "flex-1 min-w-0 md:min-w-[240px] flex items-center gap-2 bg-slate-100/80 dark:bg-slate-800/80 rounded-xl px-3 py-1.5 border border-slate-200/20 dark:border-slate-700/30 focus-within:border-indigo-500/30 focus-within:bg-white dark:focus-within:bg-slate-800 focus-within:shadow-inner transition-all duration-300"
    : "w-full max-w-xl flex items-center gap-3 bg-slate-50 dark:bg-slate-800 border border-slate-200/60 dark:border-slate-700/60 rounded-2xl px-4 py-3 focus-within:border-indigo-500 focus-within:bg-white dark:focus-within:bg-slate-800/90 focus-within:ring-4 focus-within:ring-indigo-100/50 dark:focus-within:ring-indigo-950/50 focus-within:shadow-inner transition-all duration-300";

  return (
    <form onSubmit={handleSubmit} className={formClasses}>
      <div className="relative flex items-center border-r border-slate-200 dark:border-slate-700 pr-2 shrink-0" ref={langDropdownRef}>
        <button
          type="button"
          onClick={() => setIsLangOpen(!isLangOpen)}
          className="flex items-center gap-1.5 text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 transition-colors p-1 rounded-md"
        >
          <Globe className="w-4 h-4 shrink-0" />
          <span className="text-xs font-bold w-6 text-center">{lang.toUpperCase()}</span>
          <ChevronDown className="w-3.5 h-3.5 shrink-0 opacity-70" />
        </button>

        {isLangOpen && (
          <div className="absolute top-full left-0 mt-2 w-48 bg-white/95 dark:bg-slate-900/95 backdrop-blur-2xl border border-slate-200/50 dark:border-slate-800/50 rounded-2xl shadow-xl py-2 flex flex-col z-50 animate-in slide-in-from-top-2 duration-200">
            {languages.map((l) => (
              <button
                key={l.code}
                type="button"
                onClick={() => {
                  handleLangChange(l.code);
                  setIsLangOpen(false);
                }}
                className="w-full flex items-center justify-between px-4 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/50 cursor-pointer text-left transition-colors"
              >
                <span>{l.name}</span>
                {lang === l.code && (
                  <Check className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                )}
              </button>
            ))}
          </div>
        )}
      </div>

      <input
        type="text"
        value={input}
        onChange={(e) => setInput(e.target.value)}
        disabled={searchLoading}
        placeholder={t.searchPlaceholder}
        className="flex-1 text-sm bg-transparent focus:outline-none text-slate-700 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 min-w-0"
      />

      <button
        type="submit"
        disabled={searchLoading || !input.trim()}
        className="text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300 disabled:text-slate-300 dark:disabled:text-slate-700 transition-colors p-1 rounded-lg focus:outline-none cursor-pointer"
        aria-label={t.searchTooltip}
      >
        {searchLoading ? (
          <span className="w-4 h-4 block border-2 border-indigo-600 dark:border-indigo-500 border-t-transparent rounded-full animate-spin"></span>
        ) : (
          <Search className="w-4.5 h-4.5" />
        )}
      </button>
    </form>
  );
};
