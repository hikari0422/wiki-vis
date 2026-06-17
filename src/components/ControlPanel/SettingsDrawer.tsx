import React from 'react';
import { Network, Cloud, BarChart3 } from 'lucide-react';
import { useLanguage } from '../../hooks/useLanguage';

interface SettingsDrawerProps {
  limit: number;
  onLimitChange: (limit: number) => void;
  isLoggedIn: boolean;
  isDirty: boolean;
  hasNodes: boolean;
  rootTitle: string;
  onSaveGraph: (title: string) => void;
  saveLoading: boolean;
  nodeCount: number;
  linkCount: number;
}

export const SettingsDrawer: React.FC<SettingsDrawerProps> = ({
  limit,
  onLimitChange,
  isLoggedIn,
  isDirty,
  hasNodes,
  rootTitle,
  onSaveGraph,
  saveLoading,
  nodeCount,
  linkCount
}) => {
  const { t } = useLanguage();

  return (
    <div className="w-full bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl border border-slate-200/40 dark:border-slate-800/40 rounded-2xl shadow-md p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 pointer-events-auto animate-in slide-in-from-top-3 duration-200">
      
      {/* Node Limit Configurator */}
      <div className="flex-1 flex flex-col gap-2 max-w-sm">
        <div className="flex items-center justify-between text-xs font-semibold text-slate-500 dark:text-slate-400">
          <span className="flex items-center gap-1.5">
            <Network className="w-3.5 h-3.5 text-indigo-500" />
            {t.branchLimitTitle}
          </span>
          <span className="text-indigo-600 dark:text-indigo-400 font-bold bg-indigo-50 dark:bg-indigo-950/40 px-2 py-0.5 rounded-md text-[11px]">
            {limit <= 0 ? t.showAllNoLimit : t.randomShowN(limit)}
          </span>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => onLimitChange(limit <= 0 ? 30 : 0)}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all border active:scale-95 cursor-pointer shrink-0 ${
              limit <= 0
                ? 'bg-indigo-600 border-indigo-600 text-white shadow-sm'
                : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-750'
            }`}
          >
            {t.showAll}
          </button>

          <div className="flex-1 flex items-center gap-2">
            <input
              type="range"
              min="5"
              max="100"
              step="5"
              disabled={limit <= 0}
              value={limit <= 0 ? 30 : limit}
              onChange={(e) => onLimitChange(parseInt(e.target.value))}
              className={`w-full h-1.5 rounded-lg appearance-none cursor-pointer focus:outline-none transition-all ${
                limit <= 0 
                  ? 'bg-slate-100 dark:bg-slate-800 accent-slate-300 dark:accent-slate-700 cursor-not-allowed opacity-50' 
                  : 'bg-slate-200 dark:bg-slate-755 accent-indigo-600 dark:accent-indigo-500'
              }`}
            />
            <span className={`text-[10px] font-bold shrink-0 w-8 text-right ${limit <= 0 ? 'text-slate-300 dark:text-slate-755' : 'text-slate-500 dark:text-slate-400'}`}>
              {limit <= 0 ? '--' : t.customN(limit)}
            </span>
          </div>
        </div>
      </div>

      {/* Cloud Saving block */}
      <div className="flex-1 flex flex-col gap-2 max-w-sm border-t border-slate-100 dark:border-slate-800 pt-3 md:border-t-0 md:pt-0 md:border-l md:border-slate-200/50 md:dark:border-slate-800/50 md:pl-6">
        <div className="flex items-center justify-between text-xs font-semibold text-slate-500 dark:text-slate-400">
          <span className="flex items-center gap-1.5">
            <Cloud className="w-3.5 h-3.5 text-indigo-500" />
            {t.cloudSaveTitle}
          </span>
          {isLoggedIn && isDirty && hasNodes && (
            <span className="flex items-center gap-1 text-[10px] font-bold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 px-1.5 py-0.5 rounded-md animate-pulse" title={t.unsavedChanges}>
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
              {t.unsavedChanges}
            </span>
          )}
          {isLoggedIn && !isDirty && hasNodes && (
            <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-1.5 py-0.5 rounded-md">
              {t.savedToCloud}
            </span>
          )}
        </div>

        {!isLoggedIn ? (
          <div className="text-[11px] font-semibold text-slate-400 dark:text-slate-500 py-2">
            {t.cloudSaveLoginHelper}
          </div>
        ) : !hasNodes ? (
          <div className="text-[11px] font-semibold text-slate-400 dark:text-slate-500 py-2">
            {t.cloudSaveCreateHelper}
          </div>
        ) : (
          <div className="flex justify-between items-center gap-4 bg-slate-50/50 dark:bg-slate-850/50 border border-slate-200/40 dark:border-slate-800/40 rounded-2xl p-2.5">
            <div className="min-w-0">
              <div className="text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase">{t.graphTheme}</div>
              <div className="text-xs font-extrabold text-slate-700 dark:text-slate-200 truncate">{rootTitle}</div>
            </div>
            <button
              type="button"
              onClick={() => onSaveGraph(rootTitle)}
              disabled={saveLoading}
              className="py-1.5 px-3.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 dark:disabled:bg-slate-800 text-white rounded-lg text-xs font-bold transition-all active:scale-95 cursor-pointer shrink-0 shadow-sm flex items-center justify-center min-w-[70px]"
            >
              {saveLoading ? (
                <span className="w-3.5 h-3.5 block border-2 border-white border-t-transparent rounded-full animate-spin"></span>
              ) : (
                t.manualSave
              )}
            </button>
          </div>
        )}
      </div>

      {/* Real-time stats block */}
      <div className="flex flex-wrap items-center gap-4 border-t border-slate-100 dark:border-slate-800 pt-3 mt-1 md:border-t-0 md:pt-0 md:mt-0 md:border-l md:border-slate-200/50 md:dark:border-slate-800/50 md:pl-6 shrink-0">
        <div className="flex items-center gap-2">
          <BarChart3 className="w-4 h-4 text-slate-400 dark:text-slate-555" />
          <span className="text-xs font-semibold text-slate-400 dark:text-slate-500">{t.boardStats}</span>
        </div>
        
        <div className="flex gap-4">
          <div className="text-center">
            <div className="text-[10px] font-bold text-slate-400 dark:text-slate-555 uppercase tracking-wide">
              {t.totalNodes}
            </div>
            <div className="text-sm font-bold text-slate-800 dark:text-slate-200">
              {nodeCount}
            </div>
          </div>

          <div className="text-center">
            <div className="text-[10px] font-bold text-slate-400 dark:text-slate-555 uppercase tracking-wide">
              {t.totalLinks}
            </div>
            <div className="text-sm font-bold text-slate-800 dark:text-slate-200">
              {linkCount}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
