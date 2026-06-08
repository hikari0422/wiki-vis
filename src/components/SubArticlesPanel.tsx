import React, { useState } from 'react';
import { Layers, Search, Plus } from 'lucide-react';
import type { WikiNode } from '../types/wiki';

interface SubArticlesPanelProps {
  selectedNode: WikiNode | null;
  allSubArticles: string[];
  visibleNodeIds: Set<string>;
  onAddSubArticle: (title: string) => void;
  isOpen: boolean;
}

export const SubArticlesPanel: React.FC<SubArticlesPanelProps> = ({
  selectedNode,
  allSubArticles,
  visibleNodeIds,
  onAddSubArticle,
  isOpen,
}) => {
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedValue, setSelectedValue] = useState<string>('');

  if (!isOpen || !selectedNode || allSubArticles.length === 0) return null;

  // Filter out sub-articles that are already displayed on the whiteboard
  const hiddenSubArticles = allSubArticles.filter((title) => !visibleNodeIds.has(title));

  // Further filter by search query
  const filteredArticles = hiddenSubArticles.filter((title) =>
    title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Set the default selected value to the first filtered item if current selectedValue is not in filtered list
  const activeSelected = filteredArticles.includes(selectedValue)
    ? selectedValue
    : filteredArticles[0] || '';

  const handleAddClick = () => {
    if (!activeSelected) return;
    onAddSubArticle(activeSelected);
    // Clear selection
    setSelectedValue('');
    setSearchQuery('');
  };

  return (
    <div className="fixed top-20 left-4 right-4 w-auto max-h-[45vh] translate-y-0 md:top-[55%] md:left-4 md:right-auto md:w-60 md:-translate-y-1/2 z-20 bg-white/75 backdrop-blur-xl border border-slate-200/50 rounded-2xl shadow-lg p-4 flex flex-col gap-3 pointer-events-auto transition-all hover:shadow-xl duration-300 animate-in slide-in-from-top-3 md:slide-in-from-left-5 fade-in">
      {/* Header Title */}
      <div className="flex items-center gap-1.5 border-b border-slate-100 pb-2 select-none">
        <Layers className="w-4 h-4 text-indigo-500" />
        <span className="text-xs font-bold text-slate-600 leading-tight">
          未顯示關聯條目
        </span>
        <span className="text-[9px] font-bold text-indigo-500 bg-indigo-50 px-1.5 py-0.5 rounded-md ml-auto">
          共 {hiddenSubArticles.length} 個
        </span>
      </div>

      {/* Search Input Box */}
      <div className="relative">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
        <input
          type="text"
          placeholder="搜尋隱藏條目..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full text-[11px] pl-8 pr-2.5 py-1.5 bg-slate-100/50 border border-slate-200/30 rounded-xl focus:outline-none focus:border-indigo-500/50 focus:bg-white text-slate-700 placeholder-slate-400 transition-all shadow-inner"
        />
      </div>

      {/* Dropdown Select Element */}
      <div className="flex flex-col gap-1">
        <label className="text-[9px] font-bold text-slate-400 select-none uppercase tracking-wider">
          選擇欲加入的條目:
        </label>
        <select
          value={activeSelected}
          onChange={(e) => setSelectedValue(e.target.value)}
          disabled={filteredArticles.length === 0}
          className="w-full text-[11px] py-1.5 px-2 bg-slate-50 border border-slate-200/60 rounded-xl focus:outline-none focus:border-indigo-500/50 text-slate-700 font-medium cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed transition-all"
        >
          {filteredArticles.length === 0 ? (
            <option value="">無符合的隱藏條目</option>
          ) : (
            filteredArticles.map((title) => (
              <option key={title} value={title}>
                {title}
              </option>
            ))
          )}
        </select>
      </div>

      {/* Add Button */}
      <button
        onClick={handleAddClick}
        disabled={!activeSelected}
        className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-200 disabled:text-slate-400 text-white font-semibold py-1.5 px-3 rounded-xl flex items-center justify-center gap-1.5 text-xs shadow-md shadow-indigo-600/10 disabled:shadow-none transition-all active:scale-[0.98] cursor-pointer disabled:cursor-not-allowed"
      >
        <Plus className="w-3.5 h-3.5" />
        <span>加入畫布並探索</span>
      </button>
    </div>
  );
};
