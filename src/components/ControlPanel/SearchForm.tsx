import React from 'react';
import { Search, Globe } from 'lucide-react';
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
      <div className="flex items-center gap-1 text-slate-500 border-r border-slate-200 pr-2 shrink-0">
        <Globe className="w-4 h-4 text-slate-400" />
        <select
          value={lang}
          onChange={(e) => handleLangChange(e.target.value)}
          className="text-xs font-semibold bg-transparent focus:outline-none cursor-pointer pr-1"
        >
          {languages.map((l) => (
            <option key={l.code} value={l.code}>
              {l.code.toUpperCase()}
            </option>
          ))}
        </select>
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
