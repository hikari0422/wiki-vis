import React from 'react';
import { Eye, Box, Layers, Share2, Compass } from 'lucide-react';
import type { WikiNode } from '../types/wiki';
import { useLanguage } from '../hooks/useLanguage';

interface LayoutCameraSelectorProps {
  viewMode: '2d' | '3d';
  onViewModeChange: (mode: '2d' | '3d') => void;
  layoutMode: 'hierarchical' | 'radial';
  onLayoutModeChange: (mode: 'hierarchical' | 'radial') => void;
  selectedNode: WikiNode | null;
  onResetView: () => void;
  onFocusSelected: () => void;
  onFitScreen: () => void;
  onFocusRoot: () => void;
}

export const LayoutCameraSelector: React.FC<LayoutCameraSelectorProps> = ({
  viewMode,
  onViewModeChange,
  layoutMode,
  onLayoutModeChange,
  selectedNode,
  onResetView,
  onFocusSelected,
  onFitScreen,
  onFocusRoot,
}) => {
  const { t } = useLanguage();
  return (
    <div className="fixed bottom-20 left-4 md:bottom-4 md:left-4 z-30 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border border-slate-200/50 dark:border-slate-800/50 rounded-2xl shadow-lg p-2 flex flex-col gap-2 pointer-events-auto transition-all hover:shadow-xl duration-300 max-w-xs">
      
      {/* View Mode Switcher Row */}
      <div className="flex gap-1 bg-slate-100/80 dark:bg-slate-950/80 p-0.5 rounded-xl">
        <button
          type="button"
          onClick={() => {
            onViewModeChange('2d');
            onResetView();
          }}
          className={`flex-1 flex items-center justify-center gap-1.5 py-1 px-2 rounded-lg text-[10px] font-bold transition-all cursor-pointer ${
            viewMode === '2d'
              ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm border border-slate-200/20 dark:border-slate-800/20'
              : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          <Eye className="w-3.5 h-3.5" />
          <span>{t.view2D}</span>
        </button>
        <button
          type="button"
          onClick={() => {
            onViewModeChange('3d');
            onResetView();
          }}
          className={`flex-1 flex items-center justify-center gap-1.5 py-1 px-2 rounded-lg text-[10px] font-bold transition-all cursor-pointer ${
            viewMode === '3d'
              ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm border border-slate-200/20 dark:border-slate-800/20'
              : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          <Box className="w-3.5 h-3.5" />
          <span>{t.view3D}</span>
        </button>
      </div>

      {/* Layout Actions Row (Only visible in 2D mode, 3D mode is locked to 3D Free layout) */}
      {viewMode === '2d' && (
        <>
          <div className="flex gap-1">
            <button
              type="button"
              onClick={() => onLayoutModeChange('hierarchical')}
              className={`flex items-center gap-1.5 py-1.5 px-2.5 rounded-xl text-[11px] font-bold transition-all active:scale-95 cursor-pointer ${
                layoutMode === 'hierarchical'
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/10'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100/50 dark:hover:bg-slate-800/50'
              }`}
              title={t.titleHierarchical}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>{t.layoutHierarchical}</span>
            </button>
            <button
              type="button"
              onClick={() => onLayoutModeChange('radial')}
              className={`flex items-center gap-1.5 py-1.5 px-2.5 rounded-xl text-[11px] font-bold transition-all active:scale-95 cursor-pointer ${
                layoutMode === 'radial'
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/10'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100/50 dark:hover:bg-slate-800/50'
              }`}
              title={t.titleRadial}
            >
              <Share2 className="w-3.5 h-3.5" />
              <span>{t.layoutRadial}</span>
            </button>
          </div>

          {/* Divider */}
          <div className="h-px bg-slate-100 dark:bg-slate-800/50 w-full" />
        </>
      )}

      {/* Camera Positioning Row */}
      <div className="flex justify-between gap-1 items-center px-1">
        <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 select-none mr-2 shrink-0">{t.cameraLens}</span>
        <div className="flex gap-1.5">
          {/* Focus Selected */}
          <button
            type="button"
            onClick={onFocusSelected}
            disabled={!selectedNode}
            className="p-1.5 text-slate-500 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/30 disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-slate-500 dark:disabled:hover:text-slate-400 rounded-lg transition-all active:scale-95 cursor-pointer border border-slate-100/10 dark:border-slate-800/20"
            title={selectedNode ? t.cameraFocusSelected(selectedNode.id) : t.cameraFocusPrompt}
          >
            <Compass className="w-4 h-4" />
          </button>

          {/* Fit Screen */}
          <button
            type="button"
            onClick={onFitScreen}
            className="p-1.5 text-slate-500 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/30 rounded-lg transition-all active:scale-95 cursor-pointer border border-slate-100/10 dark:border-slate-800/20"
            title={t.cameraFitScreen}
          >
            <Share2 className="w-4 h-4 rotate-90" />
          </button>

          {/* Focus Root */}
          <button
            type="button"
            onClick={onFocusRoot}
            className="p-1.5 text-slate-500 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/30 rounded-lg transition-all active:scale-95 cursor-pointer border border-slate-100/10 dark:border-slate-800/20"
            title={t.cameraFocusRoot}
          >
            <Layers className="w-4 h-4" />
          </button>
        </div>
      </div>

    </div>
  );
};
