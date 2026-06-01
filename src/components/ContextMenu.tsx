import React from 'react';
import { ExternalLink, Target, Trash2, Network } from 'lucide-react';
import type { WikiNode } from '../types/wiki';

interface ContextMenuProps {
  x: number;
  y: number;
  node: WikiNode;
  onClose: () => void;
  onExplore: (node: WikiNode) => void;
  onSetRoot: (node: WikiNode) => void;
  onRemove: (node: WikiNode) => void;
}

export const ContextMenu: React.FC<ContextMenuProps> = ({
  x,
  y,
  node,
  onClose,
  onExplore,
  onSetRoot,
  onRemove,
}) => {
  // Prevent context menu clicks from triggering other interactions
  const handleContainerClick = (e: React.MouseEvent) => {
    e.stopPropagation();
  };

  return (
    <div
      className="fixed inset-0 z-50 overflow-hidden"
      onClick={onClose}
      onContextMenu={(e) => {
        e.preventDefault();
        onClose();
      }}
    >
      {/* Menu Container */}
      <div
        className="absolute w-52 bg-white/80 backdrop-blur-md border border-slate-200/60 rounded-xl shadow-xl overflow-hidden py-1.5 z-50 animate-in fade-in zoom-in-95 duration-100"
        style={{
          left: `${x}px`,
          top: `${y}px`,
        }}
        onClick={handleContainerClick}
      >
        {/* Node Label Header */}
        <div className="px-3 py-1.5 text-xs font-semibold text-slate-400 border-b border-slate-100 truncate mb-1">
          {node.label}
        </div>

        {/* Options */}
        {!node.loaded && !node.isDeadEnd && (
          <button
            onClick={() => {
              onExplore(node);
              onClose();
            }}
            className="w-full text-left px-3 py-2 text-sm text-indigo-600 hover:bg-indigo-50 font-medium flex items-center gap-2.5 transition-colors"
          >
            <Network className="w-4 h-4" />
            展開節點連結
          </button>
        )}

        <button
          onClick={() => {
            onSetRoot(node);
            onClose();
          }}
          className="w-full text-left px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-2.5 transition-colors"
        >
          <Target className="w-4 h-4 text-slate-500" />
          設為新探索中心
        </button>

        <a
          href={node.url}
          target="_blank"
          rel="noopener noreferrer"
          onClick={onClose}
          className="w-full text-left px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-2.5 transition-colors cursor-pointer"
        >
          <ExternalLink className="w-4 h-4 text-slate-500" />
          開啟維基原網頁
        </a>

        <div className="border-t border-slate-100 my-1"></div>

        <button
          onClick={() => {
            onRemove(node);
            onClose();
          }}
          className="w-full text-left px-3 py-2 text-sm text-rose-600 hover:bg-rose-50 flex items-center gap-2.5 transition-colors"
        >
          <Trash2 className="w-4 h-4" />
          刪除此節點
        </button>
      </div>
    </div>
  );
};
