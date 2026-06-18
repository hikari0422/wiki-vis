import React from 'react';
import { Home, Trash2, Sliders, TrendingUp, History, Layers } from 'lucide-react';
import { useLanguage } from '../../hooks/useLanguage';
import { useAlert } from '../../hooks/useAlert';

interface ActionButtonsProps {
  onResetView: () => void;
  onClearBoard: () => void;
  nodeCount: number;
  isHistoryOpen: boolean;
  onToggleHistory: () => void;
  showHistoryButton: boolean;
  isSubArticlesOpen: boolean;
  onToggleSubArticles: () => void;
  showSubArticlesButton: boolean;
  isGlobalStatsOpen: boolean;
  onToggleGlobalStats: () => void;
  showSettings: boolean;
  setShowSettings: (val: boolean) => void;
  isMobile?: boolean;
}

export const ActionButtons: React.FC<ActionButtonsProps> = ({
  onResetView,
  onClearBoard,
  nodeCount,
  isHistoryOpen,
  onToggleHistory,
  showHistoryButton,
  isSubArticlesOpen,
  onToggleSubArticles,
  showSubArticlesButton,
  isGlobalStatsOpen,
  onToggleGlobalStats,
  showSettings,
  setShowSettings,
  isMobile = false
}) => {
  const { t } = useLanguage();
  const { confirm } = useAlert();

  const getBtnClass = (isActive: boolean, isDanger = false, disabled = false) => {
    const base = `p-2 rounded-xl transition-all active:scale-95 border border-slate-200/10 dark:border-slate-800/10 cursor-pointer flex justify-center ${isMobile ? 'flex-1' : ''}`;
    
    if (disabled) {
      return `${base} text-slate-400 dark:text-slate-550 opacity-40 hover:bg-transparent`;
    }

    if (isDanger) {
      return `${base} text-slate-400 dark:text-slate-550 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40`;
    }

    if (isActive) {
      return `${base} text-indigo-600 bg-indigo-50 border-indigo-200/30 dark:text-indigo-400 dark:bg-indigo-950/40 dark:border-indigo-900/30`;
    }
    
    return `${base} text-slate-600 hover:text-indigo-600 hover:bg-indigo-50 dark:text-slate-300 dark:hover:text-indigo-400 dark:hover:bg-indigo-950/30`;
  };

  const IconSize = isMobile ? "w-4.5 h-4.5" : "w-4 h-4";

  return (
    <>
      <button
        onClick={onResetView}
        className={getBtnClass(false)}
        title={t.resetView}
        aria-label={t.resetView}
      >
        <Home className={IconSize} />
      </button>

      {showHistoryButton && (
        <button
          onClick={onToggleHistory}
          className={getBtnClass(isHistoryOpen)}
          title={t.historyTimeline}
          aria-label={t.historyTimeline}
        >
          <History className={IconSize} />
        </button>
      )}

      {showSubArticlesButton && (
        <button
          onClick={onToggleSubArticles}
          className={getBtnClass(isSubArticlesOpen)}
          title={t.subArticles}
          aria-label={t.subArticles}
        >
          <Layers className={IconSize} />
        </button>
      )}

      <button
        onClick={() => setShowSettings(!showSettings)}
        className={getBtnClass(showSettings)}
        title={t.settingsStats}
        aria-label={t.settingsStats}
      >
        <Sliders className={IconSize} />
      </button>

      <button
        onClick={onToggleGlobalStats}
        className={getBtnClass(isGlobalStatsOpen)}
        title="全站統計 (Global Stats)"
        aria-label="全站統計"
      >
        <TrendingUp className={IconSize} />
      </button>

      <button
        onClick={async () => {
          if (await confirm(t.confirmClearBoard)) onClearBoard();
        }}
        disabled={nodeCount === 0}
        className={getBtnClass(false, true, nodeCount === 0)}
        title={t.clearBoard}
        aria-label={t.clearBoard}
      >
        <Trash2 className={IconSize} />
      </button>
    </>
  );
};
