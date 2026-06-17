import React from 'react';
import type { WikiNode } from '../../types/wiki';
import { useLanguage } from '../../hooks/useLanguage';

interface HoverCardProps {
  hoveredNode: WikiNode | null;
  hoverPosition: { x: number; y: number } | null;
  hoverCardData: { extract: string; thumbnail?: string } | null;
  darkMode?: boolean;
}

export const HoverCard: React.FC<HoverCardProps> = ({
  hoveredNode,
  hoverPosition,
  hoverCardData,
  darkMode = false,
}) => {
  const { t } = useLanguage();
  if (!hoveredNode || !hoverPosition) return null;

  const containerClass = darkMode
    ? "fixed z-50 pointer-events-none w-72 bg-slate-900/90 backdrop-blur-xl border border-slate-700/55 rounded-2xl shadow-xl p-4 animate-in fade-in zoom-in-95 duration-200 text-left text-slate-100"
    : "fixed z-50 pointer-events-none w-72 bg-white/90 backdrop-blur-xl border border-slate-200/50 rounded-2xl shadow-xl p-4 animate-in fade-in zoom-in-95 duration-200 text-left";

  const titleClass = darkMode
    ? "font-bold text-sm text-amber-400 mb-1.5 truncate border-b border-slate-700 pb-1.5"
    : "font-bold text-sm text-slate-800 mb-1.5 truncate border-b border-slate-100 pb-1.5";

  const textClass = darkMode
    ? "text-[11px] text-slate-300 leading-normal line-clamp-4 select-none"
    : "text-[11px] text-slate-500 leading-normal line-clamp-4 select-none";

  const imageBorderClass = darkMode
    ? "w-16 h-16 object-cover rounded-xl border border-slate-700/55 shrink-0"
    : "w-16 h-16 object-cover rounded-xl border border-slate-200/20 shrink-0";

  const spinnerClass = darkMode
    ? "w-3.5 h-3.5 block border-2 border-amber-500 border-t-transparent rounded-full animate-spin"
    : "w-3.5 h-3.5 block border-2 border-indigo-500 border-t-transparent rounded-full animate-spin";

  return (
    <div
      className={containerClass}
      style={{
        left: `${hoverPosition.x + 16}px`,
        top: `${hoverPosition.y + 16}px`,
      }}
    >
      <h3 className={titleClass}>
        {hoveredNode.id}
      </h3>
      {hoverCardData ? (
        <div className="flex gap-2.5 items-start">
          {hoverCardData.thumbnail && (
            <img
              src={hoverCardData.thumbnail}
              alt={hoveredNode.id}
              className={imageBorderClass}
            />
          )}
          <p className={textClass}>
            {hoverCardData.extract}
          </p>
        </div>
      ) : (
        <div className="flex items-center gap-2 py-1.5 text-[11px] text-slate-400">
          <span className={spinnerClass}></span>
          <span>{t.hoverCardLoading}</span>
        </div>
      )}
    </div>
  );
};
