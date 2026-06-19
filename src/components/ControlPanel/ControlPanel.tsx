import React, { useState } from 'react';
import { Compass, MoreVertical } from 'lucide-react';
import { useLanguage } from '../../hooks/useLanguage';
import { SearchForm } from './SearchForm';
import { ActionButtons } from './ActionButtons';
import { SettingsDrawer } from './SettingsDrawer';
import { fetchRandomWikiTitles } from '../../services/wikiApi';

interface ControlPanelProps {
  onSearch: (input: string, lang: string) => void;
  onResetView: () => void;
  onClearBoard: () => void;
  nodeCount: number;
  linkCount: number;
  limit: number;
  onLimitChange: (limit: number) => void;
  searchLoading: boolean;
  hasNodes: boolean;
  isHistoryOpen: boolean;
  onToggleHistory: () => void;
  showHistoryButton: boolean;
  isSubArticlesOpen: boolean;
  onToggleSubArticles: () => void;
  showSubArticlesButton: boolean;
  isLoggedIn: boolean;
  isDirty: boolean;
  onSaveGraph: (title: string) => void;
  saveLoading: boolean;
  rootTitle: string;
  isGlobalStatsOpen: boolean;
  onToggleGlobalStats: () => void;
}

export const ControlPanel: React.FC<ControlPanelProps> = ({
  onSearch,
  onResetView,
  onClearBoard,
  nodeCount,
  linkCount,
  limit,
  onLimitChange,
  searchLoading,
  hasNodes,
  isHistoryOpen,
  onToggleHistory,
  showHistoryButton,
  isSubArticlesOpen,
  onToggleSubArticles,
  showSubArticlesButton,
  isLoggedIn,
  isDirty,
  onSaveGraph,
  saveLoading,
  rootTitle,
  isGlobalStatsOpen,
  onToggleGlobalStats,
}) => {
  const { language, t } = useLanguage();
  const [input, setInput] = useState<string>('');
  const [lang, setLang] = useState<string>('zh');
  const [showSettings, setShowSettings] = useState<boolean>(false);
  const [showMobileToolbar, setShowMobileToolbar] = useState<boolean>(false);

  const [randomRecommendations, setRandomRecommendations] = useState<string[]>([]);
  const [isFetchingRandoms, setIsFetchingRandoms] = useState<boolean>(true);

  React.useEffect(() => {
    let isMounted = true;
    setIsFetchingRandoms(true);
    fetchRandomWikiTitles(language, 2).then(titles => {
      if (isMounted) {
        if (titles.length === 0) {
          setRandomRecommendations(language === 'zh' ? ['宇宙', '人工智能'] : ['Universe', 'Artificial Intelligence']);
        } else {
          setRandomRecommendations(titles);
        }
        setIsFetchingRandoms(false);
      }
    });
    return () => { isMounted = false; };
  }, [language]);

  const containerClasses = hasNodes
    ? "fixed top-4 left-4 right-4 md:left-1/2 md:-translate-x-1/2 md:max-w-3xl z-30 flex flex-col gap-2.5 pointer-events-none transition-all duration-700 ease-in-out"
    : "fixed top-[22%] left-4 right-4 md:left-1/2 md:-translate-x-1/2 md:max-w-2xl z-30 flex flex-col gap-4 pointer-events-none transition-all duration-700 ease-in-out";

  const searchBoxClasses = hasNodes
    ? "w-full bg-white/75 dark:bg-slate-900/75 backdrop-blur-xl border border-slate-200/50 dark:border-slate-800/50 rounded-2xl shadow-lg p-3 flex flex-wrap items-center gap-3 pointer-events-auto transition-all duration-700 ease-in-out"
    : "w-full bg-white/80 dark:bg-slate-900/80 backdrop-blur-2xl border border-slate-200/60 dark:border-slate-800/60 rounded-3xl shadow-2xl p-6 flex flex-col items-center gap-5 pointer-events-auto transition-all duration-700 ease-in-out";

  const actionProps = {
    onResetView, onClearBoard, nodeCount, isHistoryOpen, onToggleHistory, showHistoryButton,
    isSubArticlesOpen, onToggleSubArticles, showSubArticlesButton, isGlobalStatsOpen,
    onToggleGlobalStats, showSettings, setShowSettings
  };

  return (
    <div className={containerClasses}>
      
      {/* Top Floating Action Bar */}
      <div className={searchBoxClasses}>
        {/* Centered Brand/Title Header (Shown only when empty canvas) */}
        {!hasNodes && (
          <div className="text-center w-full mb-1 animate-in fade-in slide-in-from-top-4 duration-500 flex flex-col items-center">
            <Compass className="w-14 h-14 text-indigo-600 dark:text-indigo-400 mb-3.5 animate-spin-slow" />
            <h1 className="text-3xl font-extrabold bg-linear-to-r from-indigo-800 via-indigo-600 to-indigo-500 dark:from-indigo-400 dark:via-indigo-300 dark:to-indigo-200 bg-clip-text text-transparent tracking-tight mb-2">
              {t.brandTitleEmpty}
            </h1>
            <p className="text-slate-500 dark:text-slate-400 text-sm max-w-md mx-auto leading-relaxed">
              {t.brandSub}
            </p>
          </div>
        )}

        {/* Brand/Title Inline (Shown only when top floating) */}
        {hasNodes && (
          <div className="flex items-center gap-1.5 shrink-0 animate-in fade-in duration-300">
            <Compass className="w-5 h-5 text-indigo-600 dark:text-indigo-400 animate-spin-slow shrink-0" />
            <span className="font-bold text-sm bg-linear-to-r from-indigo-700 to-indigo-500 dark:from-indigo-400 dark:to-indigo-305 bg-clip-text text-transparent tracking-tight hidden sm:inline">
              {t.brandTitleFloating}
            </span>
          </div>
        )}

        <SearchForm 
          input={input} setInput={setInput} lang={lang} setLang={setLang}
          searchLoading={searchLoading} onSubmit={onSearch} hasNodes={hasNodes}
        />

        {/* Toolbar Buttons (Shown only when top floating) */}
        {hasNodes && (
          <div className="hidden md:flex items-center gap-1 shrink-0 animate-in fade-in duration-300">
            <ActionButtons {...actionProps} />
          </div>
        )}

        {/* Mobile Toolbar Toggle Button */}
        {hasNodes && (
          <button
            type="button"
            onClick={() => setShowMobileToolbar(!showMobileToolbar)}
            className={`p-2 rounded-xl border border-slate-200/10 dark:border-slate-800/10 cursor-pointer md:hidden transition-all active:scale-95 shrink-0 ${
              showMobileToolbar 
                ? 'text-indigo-600 bg-indigo-50 border-indigo-200/30 dark:text-indigo-400 dark:bg-indigo-950/40 dark:border-indigo-900/30' 
                : 'text-slate-600 hover:text-indigo-600 hover:bg-indigo-50 dark:text-slate-300 dark:hover:text-indigo-400 dark:hover:bg-indigo-950/30'
            }`}
            title={t.moreOptions}
            aria-label={t.moreOptions}
          >
            <MoreVertical className="w-4.5 h-4.5" />
          </button>
        )}

        {/* Quick Start Suggestions (Centered only) */}
        {!hasNodes && (
          <div className="flex gap-2.5 justify-center mt-1 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <span className="text-xs font-semibold text-slate-400 dark:text-slate-550 self-center mr-1">{t.recommendTitle}</span>
            {isFetchingRandoms ? (
              <span className="text-xs font-semibold px-4 py-2 text-slate-400 animate-pulse">...</span>
            ) : randomRecommendations.map((title, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => onSearch(title, language)}
                className="text-xs font-semibold px-4 py-2 bg-slate-50 dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 border border-slate-200/80 dark:border-slate-700/80 hover:border-indigo-200 dark:hover:border-indigo-950 hover:bg-indigo-50/50 dark:hover:bg-indigo-950/30 rounded-xl shadow-sm transition-all cursor-pointer hover:scale-105 active:scale-95"
              >
                {title}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Mobile Secondary Expandable Toolbar */}
      {hasNodes && showMobileToolbar && (
        <div className="w-full bg-white/75 dark:bg-slate-900/75 backdrop-blur-xl border border-slate-200/50 dark:border-slate-800/50 rounded-2xl shadow-lg p-2.5 flex justify-around items-center gap-1 pointer-events-auto md:hidden animate-in slide-in-from-top-2 duration-150">
          <ActionButtons {...actionProps} isMobile />
        </div>
      )}

      {/* Sub Settings & Stats Drawer */}
      {showSettings && (
        <SettingsDrawer 
          limit={limit} onLimitChange={onLimitChange} isLoggedIn={isLoggedIn} isDirty={isDirty} 
          hasNodes={hasNodes} rootTitle={rootTitle} onSaveGraph={onSaveGraph} saveLoading={saveLoading} 
          nodeCount={nodeCount} linkCount={linkCount} 
        />
      )}
    </div>
  );
};
