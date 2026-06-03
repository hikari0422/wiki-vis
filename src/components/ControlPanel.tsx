import React, { useState } from 'react';
import { Search, Home, Trash2, Sliders, BarChart3, Globe, Network, Compass } from 'lucide-react';

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
}) => {
  const [input, setInput] = useState<string>('');
  const [lang, setLang] = useState<string>('zh');
  const [showSettings, setShowSettings] = useState<boolean>(false);

  const handleLangChange = (newLang: string) => {
    setLang(newLang);
    
    // Wikipedia URL match regex
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
    onSearch(input, lang);
  };

  const languages = [
    { code: 'zh', name: '中文 (Wiki)' },
    { code: 'en', name: 'English (Wiki)' },
    { code: 'ja', name: '日本語 (Wiki)' },
    { code: 'de', name: 'Deutsch (Wiki)' },
    { code: 'fr', name: 'Français (Wiki)' },
  ];

  const containerClasses = hasNodes
    ? "fixed top-4 left-4 right-4 md:left-1/2 md:-translate-x-1/2 md:max-w-3xl z-30 flex flex-col gap-2.5 pointer-events-none transition-all duration-700 ease-in-out"
    : "fixed top-[22%] left-4 right-4 md:left-1/2 md:-translate-x-1/2 md:max-w-2xl z-30 flex flex-col gap-4 pointer-events-none transition-all duration-700 ease-in-out";

  const searchBoxClasses = hasNodes
    ? "w-full bg-white/75 backdrop-blur-xl border border-slate-200/50 rounded-2xl shadow-lg p-3 flex flex-wrap items-center gap-3 pointer-events-auto transition-all duration-700 ease-in-out"
    : "w-full bg-white/80 backdrop-blur-2xl border border-slate-200/60 rounded-3xl shadow-2xl p-6 flex flex-col items-center gap-5 pointer-events-auto transition-all duration-700 ease-in-out";

  const formClasses = hasNodes
    ? "flex-1 min-w-[240px] flex items-center gap-2 bg-slate-100/80 rounded-xl px-3 py-1.5 border border-slate-200/20 focus-within:border-indigo-500/30 focus-within:bg-white focus-within:shadow-inner transition-all duration-300"
    : "w-full max-w-xl flex items-center gap-3 bg-slate-50 border border-slate-200/60 rounded-2xl px-4 py-3 focus-within:border-indigo-500 focus-within:bg-white focus-within:ring-4 focus-within:ring-indigo-100/50 focus-within:shadow-inner transition-all duration-300";

  return (
    <div className={containerClasses}>
      
      {/* Top Floating Action Bar */}
      <div className={searchBoxClasses}>
        
        {/* Centered Brand/Title Header (Shown only when empty canvas) */}
        {!hasNodes && (
          <div className="text-center w-full mb-1 animate-in fade-in slide-in-from-top-4 duration-500 flex flex-col items-center">
            <Compass className="w-14 h-14 text-indigo-600 mb-3.5 animate-spin-slow" />
            <h1 className="text-3xl font-extrabold bg-gradient-to-r from-indigo-800 via-indigo-600 to-indigo-500 bg-clip-text text-transparent tracking-tight mb-2">
            Wiki Vision
            </h1>
            <p className="text-slate-500 text-sm max-w-md mx-auto leading-relaxed">
              探索wiki條目之間的關係
            </p>
          </div>
        )}

        {/* Brand/Title Inline (Shown only when top floating) */}
        {hasNodes && (
          <div className="flex items-center gap-2 px-2 shrink-0 animate-in fade-in duration-300">
            <Compass className="w-6 h-6 text-indigo-600 animate-spin-slow" />
            <span className="font-bold text-sm bg-gradient-to-r from-indigo-700 to-indigo-500 bg-clip-text text-transparent tracking-tight">
              Wiki MindMap
            </span>
          </div>
        )}

        {/* Search Form */}
        <form onSubmit={handleSubmit} className={formClasses}>
          {/* Language dropdown prefix */}
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

          {/* Search Input */}
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={searchLoading}
            placeholder="貼上維基網址或輸入關鍵字搜尋..."
            className="flex-1 text-sm bg-transparent focus:outline-none text-slate-700 placeholder-slate-400 min-w-0"
          />

          {/* Search Button */}
          <button
            type="submit"
            disabled={searchLoading || !input.trim()}
            className="text-indigo-600 hover:text-indigo-800 disabled:text-slate-300 transition-colors p-1 rounded-lg focus:outline-none"
            aria-label="Search page"
          >
            {searchLoading ? (
              <span className="w-4 h-4 block border-2 border-indigo-600 border-t-transparent rounded-full animate-spin"></span>
            ) : (
              <Search className="w-4.5 h-4.5" />
            )}
          </button>
        </form>

        {/* Toolbar Buttons (Shown only when top floating) */}
        {hasNodes && (
          <div className="flex items-center gap-1.5 shrink-0 animate-in fade-in duration-300">
            
            {/* Reset Zoom */}
            <button
              onClick={onResetView}
              className="p-2 text-slate-600 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all active:scale-95 border border-slate-200/10 cursor-pointer"
              title="重設視角"
              aria-label="Reset View"
            >
              <Home className="w-4.5 h-4.5" />
            </button>

            {/* Settings Toggle */}
            <button
              onClick={() => setShowSettings(!showSettings)}
              className={`p-2 rounded-xl transition-all active:scale-95 border border-slate-200/10 cursor-pointer ${
                showSettings 
                  ? 'text-indigo-600 bg-indigo-50 border-indigo-200/30' 
                  : 'text-slate-600 hover:text-indigo-600 hover:bg-indigo-50'
              }`}
              title="物理配置與統計"
              aria-label="Toggle Settings"
            >
              <Sliders className="w-4.5 h-4.5" />
            </button>

            {/* Clear Board */}
            <button
              onClick={onClearBoard}
              disabled={nodeCount === 0}
              className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-slate-400 rounded-xl transition-all active:scale-95 cursor-pointer"
              title="清除畫布"
              aria-label="Clear Board"
            >
              <Trash2 className="w-4.5 h-4.5" />
            </button>
          </div>
        )}

        {/* Quick Start Suggestions (Centered only) */}
        {!hasNodes && (
          <div className="flex gap-2.5 justify-center mt-1 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <span className="text-xs font-semibold text-slate-400 self-center mr-1">推薦探索:</span>
            <button
              type="button"
              onClick={() => onSearch('宇宙', 'zh')}
              className="text-xs font-semibold px-4 py-2 bg-slate-50 text-indigo-600 border border-slate-200/80 hover:border-indigo-200 hover:bg-indigo-50/50 rounded-xl shadow-sm transition-all cursor-pointer hover:scale-105 active:scale-95"
            >
              宇宙 🚀
            </button>
            <button
              type="button"
              onClick={() => onSearch('人工智能', 'zh')}
              className="text-xs font-semibold px-4 py-2 bg-slate-50 text-indigo-600 border border-slate-200/80 hover:border-indigo-200 hover:bg-indigo-50/50 rounded-xl shadow-sm transition-all cursor-pointer hover:scale-105 active:scale-95"
            >
              人工智能 🧠
            </button>
          </div>
        )}
      </div>

      {/* Sub Settings & Stats Drawer */}
      {showSettings && (
        <div className="w-full bg-white/70 backdrop-blur-xl border border-slate-200/40 rounded-2xl shadow-md p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 pointer-events-auto animate-in slide-in-from-top-3 duration-200">
          
          {/* Node Limit Configurator */}
          <div className="flex-1 flex flex-col gap-2 max-w-sm">
            <div className="flex items-center justify-between text-xs font-semibold text-slate-500">
              <span className="flex items-center gap-1.5">
                <Network className="w-3.5 h-3.5 text-indigo-500" />
                分支條目數量設定
              </span>
              <span className="text-indigo-600 font-bold bg-indigo-50 px-2 py-0.5 rounded-md text-[11px]">
                {limit <= 0 ? '全部顯示 (無限制)' : `隨機顯示 ${limit} 個`}
              </span>
            </div>

            <div className="flex items-center gap-3">
              {/* Unlimited Toggle Button */}
              <button
                type="button"
                onClick={() => onLimitChange(limit <= 0 ? 30 : 0)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all border active:scale-95 cursor-pointer shrink-0 ${
                  limit <= 0
                    ? 'bg-indigo-600 border-indigo-600 text-white shadow-sm'
                    : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                全部顯示
              </button>

              {/* Slider for custom limit */}
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
                      ? 'bg-slate-100 accent-slate-300 cursor-not-allowed opacity-50' 
                      : 'bg-slate-200 accent-indigo-600'
                  }`}
                />
                <span className={`text-[10px] font-bold shrink-0 w-8 text-right ${limit <= 0 ? 'text-slate-300' : 'text-slate-500'}`}>
                  {limit <= 0 ? '--' : `${limit}個`}
                </span>
              </div>
            </div>
          </div>

          {/* Real-time stats block */}
          <div className="flex items-center gap-6 md:border-l md:border-slate-200/50 md:pl-6 shrink-0">
            <div className="flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-slate-400" />
              <span className="text-xs font-semibold text-slate-400">目前看板資訊:</span>
            </div>
            
            <div className="flex gap-4">
              {/* Nodes Stat */}
              <div className="text-center">
                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">
                  總節點數
                </div>
                <div className="text-sm font-bold text-slate-800">
                  {nodeCount}
                </div>
              </div>

              {/* Links Stat */}
              <div className="text-center">
                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">
                  連線數量
                </div>
                <div className="text-sm font-bold text-slate-800">
                  {linkCount}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
