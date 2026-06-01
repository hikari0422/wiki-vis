import React, { useRef, useEffect } from 'react';
import { Compass, ChevronRight } from 'lucide-react';
import type { WikiNode } from '../types/wiki';

interface PathTimelineProps {
  path: WikiNode[];
  onNodeClick: (node: WikiNode) => void;
}

export const PathTimeline: React.FC<PathTimelineProps> = ({ path, onNodeClick }) => {
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Auto-scroll to the end (most recent node) whenever the path grows
  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTo({
        left: containerRef.current.scrollWidth,
        behavior: 'smooth',
      });
    }
  }, [path.length]);

  if (path.length === 0) return null;

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-20 bg-white/75 backdrop-blur-xl border border-slate-200/50 rounded-2xl shadow-lg p-2 flex items-center gap-1.5 max-w-[85vw] md:max-w-2xl pointer-events-auto transition-all hover:shadow-xl duration-300 animate-in slide-in-from-bottom-5 fade-in duration-500">
      
      {/* Icon Badge */}
      <div className="flex items-center shrink-0 pl-1">
        <Compass className="w-4 h-4 text-indigo-500 animate-spin-slow" />
      </div>
      
      {/* Divider */}
      <div className="w-px h-4 bg-slate-200 shrink-0 mx-1" />

      {/* Ordered Timeline Breadcrumbs */}
      <div
        ref={containerRef}
        className="flex items-center gap-1.5 overflow-x-auto scrollbar-none py-0.5 px-0.5"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        {path.map((node, index) => {
          const isCurrent = index === path.length - 1;

          return (
            <React.Fragment key={`path-${node.id}-${index}`}>
              {/* Breadcrumb Item Button */}
              <button
                onClick={() => onNodeClick(node)}
                className={`text-xs font-semibold py-1 px-2.5 rounded-xl shrink-0 transition-all cursor-pointer active:scale-95 whitespace-nowrap ${
                  isCurrent
                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/10'
                    : 'text-slate-500 hover:text-indigo-600 hover:bg-slate-100/50'
                }`}
                title={`跳轉聚焦至：「${node.id}」 (深度: ${node.depth ?? 0})`}
              >
                {node.id}
              </button>

              {/* Separator (except for last item) */}
              {!isCurrent && (
                <ChevronRight className="w-3.5 h-3.5 text-slate-300 shrink-0 select-none" />
              )}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
};
