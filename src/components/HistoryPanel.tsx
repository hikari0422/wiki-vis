import React from 'react';
import { History, ArrowRight } from 'lucide-react';
import type { WikiNode } from '../types/wiki';

interface HistoryPanelProps {
  history: WikiNode[];
  selectedNode: WikiNode | null;
  onNodeClick: (node: WikiNode) => void;
  isOpen: boolean;
}

export const HistoryPanel: React.FC<HistoryPanelProps> = ({
  history,
  selectedNode,
  onNodeClick,
  isOpen,
}) => {
  if (!isOpen || history.length === 0) return null;

  return (
    <div className="fixed top-20 left-4 right-4 w-auto max-h-[40vh] md:top-24 md:left-4 md:right-auto md:w-52 z-20 bg-white/75 backdrop-blur-xl border border-slate-200/50 rounded-2xl shadow-lg p-3 flex flex-col gap-2.5 pointer-events-auto transition-all hover:shadow-xl duration-300 animate-in slide-in-from-top-3 md:slide-in-from-left-5 fade-in">
      {/* Panel Title Header */}
      <div className="flex items-center justify-between border-b border-slate-100 pb-2">
        <span className="flex items-center gap-1.5 text-xs font-bold text-slate-500 select-none">
          <History className="w-3.5 h-3.5 text-indigo-500" />
          探索歷史軌跡
        </span>
        <span className="text-[9px] font-bold text-indigo-500 bg-indigo-50 px-1.5 py-0.5 rounded-md">
          {history.length}/10
        </span>
      </div>

      {/* Vertical Timeline List */}
      <div className="flex flex-col gap-1.5 max-h-65 overflow-y-auto pr-1 scrollbar-thin">
        {history.map((node, index) => {
          const isCurrent = selectedNode?.id === node.id;
          return (
            <button
              key={`hist-${node.id}-${index}`}
              onClick={() => onNodeClick(node)}
              className={`group flex items-start gap-2 w-full text-left py-1.5 px-2 rounded-xl text-xs transition-all active:scale-[0.98] cursor-pointer ${
                isCurrent
                  ? 'bg-indigo-600 text-white font-semibold shadow-md shadow-indigo-600/10'
                  : 'text-slate-600 hover:text-indigo-600 hover:bg-slate-100/50'
              }`}
            >
              {/* Timeline Indicator Dot */}
              <div className="flex flex-col items-center shrink-0 mt-1">
                <div className={`w-1.5 h-1.5 rounded-full ${isCurrent ? 'bg-white' : 'bg-slate-300 group-hover:bg-indigo-500'} transition-colors`} />
                {index < history.length - 1 && (
                  <div className={`w-px h-4 border-l border-dashed ${isCurrent ? 'border-indigo-300' : 'border-slate-200'} mt-1`} />
                )}
              </div>

              {/* Text Label */}
              <div className="flex-1 min-w-0">
                <div className="truncate text-[11px] leading-tight font-medium" title={node.id}>
                  {node.id}
                </div>
                <span className={`text-[9px] block ${isCurrent ? 'text-indigo-200' : 'text-slate-400'} font-semibold mt-0.5`}>
                  深度: {node.depth ?? 0}
                </span>
              </div>

              {/* Arrow right on hover */}
              <ArrowRight className={`w-3 h-3 shrink-0 self-center opacity-0 group-hover:opacity-100 transition-all ${isCurrent ? 'text-white' : 'text-indigo-500'} -translate-x-1 group-hover:translate-x-0`} />
            </button>
          );
        })}
      </div>
    </div>
  );
};
