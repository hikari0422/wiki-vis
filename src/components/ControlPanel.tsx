import React, { useState, useEffect } from 'react';
import { Search, Home, Trash2, Sliders, BarChart3, Globe, Network, Compass, History, Layers, MoreVertical, Cloud } from 'lucide-react';

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
}) => {
  const [input, setInput] = useState<string>('');
  const [lang, setLang] = useState<string>('zh');
  const [showSettings, setShowSettings] = useState<boolean>(false);
  const [showMobileToolbar, setShowMobileToolbar] = useState<boolean>(false);
  const [customTitle, setCustomTitle] = useState<string>('');

  // Sync custom title with rootTitle when rootTitle changes
  useEffect(() => {
    if (rootTitle) {
      setCustomTitle(rootTitle);
    } else {
      setCustomTitle('');
    }
  }, [rootTitle]);

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
    ? "flex-1 min-w-0 md:min-w-[240px] flex items-center gap-2 bg-slate-100/80 rounded-xl px-3 py-1.5 border border-slate-200/20 focus-within:border-indigo-500/30 focus-within:bg-white focus-within:shadow-inner transition-all duration-300"
    : "w-full max-w-xl flex items-center gap-3 bg-slate-50 border border-slate-200/60 rounded-2xl px-4 py-3 focus-within:border-indigo-500 focus-within:bg-white focus-within:ring-4 focus-within:ring-indigo-100/50 focus-within:shadow-inner transition-all duration-300";

  return (
    <div className={containerClasses}>
      
      {/* Top Floating Action Bar */}
      <div className={searchBoxClasses}>
        
        {/* Centered Brand/Title Header (Shown only when empty canvas) */}
        {!hasNodes && (
          <div className="text-center w-full mb-1 animate-in fade-in slide-in-from-top-4 duration-500 flex flex-col items-center">
            <Compass className="w-14 h-14 text-indigo-600 mb-3.5 animate-spin-slow" />
            <h1 className="text-3xl font-extrabold bg-linear-to-r from-indigo-800 via-indigo-600 to-indigo-500 bg-clip-text text-transparent tracking-tight mb-2">
            Wiki Vision
            </h1>
            <p className="text-slate-500 text-sm max-w-md mx-auto leading-relaxed">
              探索wiki條目之間的關係
            </p>
          </div>
        )}

        {/* Brand/Title Inline (Shown only when top floating) */}
        {hasNodes && (
          <div className="flex items-center gap-1.5 shrink-0 animate-in fade-in duration-300">
            <Compass className="w-5 h-5 text-indigo-600 animate-spin-slow shrink-0" />
            <span className="font-bold text-sm bg-linear-to-r from-indigo-700 to-indigo-500 bg-clip-text text-transparent tracking-tight hidden sm:inline">
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
          <div className="hidden md:flex items-center gap-1 shrink-0 animate-in fade-in duration-300">
            
            {/* Reset Zoom */}
            <button
              onClick={onResetView}
              className="p-2 text-slate-600 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all active:scale-95 border border-slate-200/10 cursor-pointer"
              title="重設視角"
              aria-label="Reset View"
            >
              <Home className="w-4 h-4" />
            </button>

            {/* History Panel Toggle */}
            {showHistoryButton && (
              <button
                onClick={onToggleHistory}
                className={`p-2 rounded-xl transition-all active:scale-95 border border-slate-200/10 cursor-pointer ${
                  isHistoryOpen
                    ? 'text-indigo-600 bg-indigo-50 border-indigo-200/30'
                    : 'text-slate-600 hover:text-indigo-600 hover:bg-indigo-50'
                }`}
                title="探索歷史軌跡"
                aria-label="Toggle History"
              >
                <History className="w-4 h-4" />
              </button>
            )}

            {/* Sub-articles Panel Toggle */}
            {showSubArticlesButton && (
              <button
                onClick={onToggleSubArticles}
                className={`p-2 rounded-xl transition-all active:scale-95 border border-slate-200/10 cursor-pointer ${
                  isSubArticlesOpen
                    ? 'text-indigo-600 bg-indigo-50 border-indigo-200/30'
                    : 'text-slate-600 hover:text-indigo-600 hover:bg-indigo-50'
                }`}
                title="未顯示關聯條目"
                aria-label="Toggle Sub Articles"
              >
                <Layers className="w-4 h-4" />
              </button>
            )}

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
              <Sliders className="w-4 h-4" />
            </button>

            {/* Clear Board */}
            <button
              onClick={onClearBoard}
              disabled={nodeCount === 0}
              className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-slate-400 rounded-xl transition-all active:scale-95 cursor-pointer"
              title="清除畫布"
              aria-label="Clear Board"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Mobile Toolbar Toggle Button */}
        {hasNodes && (
          <button
            type="button"
            onClick={() => setShowMobileToolbar(!showMobileToolbar)}
            className={`p-2 rounded-xl border border-slate-200/10 cursor-pointer md:hidden transition-all active:scale-95 shrink-0 ${
              showMobileToolbar 
                ? 'text-indigo-600 bg-indigo-50 border-indigo-200/30' 
                : 'text-slate-600 hover:text-indigo-600 hover:bg-indigo-50'
            }`}
            title="更多功能選項"
            aria-label="Toggle Mobile Toolbar"
          >
            <MoreVertical className="w-4.5 h-4.5" />
          </button>
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

      {/* Mobile Secondary Expandable Toolbar */}
      {hasNodes && showMobileToolbar && (
        <div className="w-full bg-white/75 backdrop-blur-xl border border-slate-200/50 rounded-2xl shadow-lg p-2.5 flex justify-around items-center gap-1 pointer-events-auto md:hidden animate-in slide-in-from-top-2 duration-150">
          
          {/* Reset View */}
          <button
            onClick={onResetView}
            className="p-2 text-slate-600 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all active:scale-95 border border-slate-200/10 cursor-pointer flex-1 flex justify-center"
            title="重設視角"
            aria-label="Reset View"
          >
            <Home className="w-4.5 h-4.5" />
          </button>

          {/* History Panel Toggle */}
          {showHistoryButton && (
            <button
              onClick={onToggleHistory}
              className={`p-2 rounded-xl transition-all active:scale-95 border border-slate-200/10 cursor-pointer flex-1 flex justify-center ${
                isHistoryOpen
                  ? 'text-indigo-600 bg-indigo-50 border-indigo-200/30'
                  : 'text-slate-600 hover:text-indigo-600 hover:bg-indigo-50'
              }`}
              title="探索歷史軌跡"
              aria-label="Toggle History"
            >
              <History className="w-4.5 h-4.5" />
            </button>
          )}

          {/* Sub-articles Panel Toggle */}
          {showSubArticlesButton && (
            <button
              onClick={onToggleSubArticles}
              className={`p-2 rounded-xl transition-all active:scale-95 border border-slate-200/10 cursor-pointer flex-1 flex justify-center ${
                isSubArticlesOpen
                  ? 'text-indigo-600 bg-indigo-50 border-indigo-200/30'
                  : 'text-slate-600 hover:text-indigo-600 hover:bg-indigo-50'
              }`}
              title="未顯示關聯條目"
              aria-label="Toggle Sub Articles"
            >
              <Layers className="w-4.5 h-4.5" />
            </button>
          )}

          {/* Settings Toggle */}
          <button
            onClick={() => setShowSettings(!showSettings)}
            className={`p-2 rounded-xl transition-all active:scale-95 border border-slate-200/10 cursor-pointer flex-1 flex justify-center ${
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
            className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-slate-400 rounded-xl transition-all active:scale-95 cursor-pointer flex-1 flex justify-center"
            title="清除畫布"
            aria-label="Clear Board"
          >
            <Trash2 className="w-4.5 h-4.5" />
          </button>
        </div>
      )}

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

          {/* Cloud Saving block */}
          <div className="flex-1 flex flex-col gap-2 max-w-sm border-t border-slate-100 pt-3 md:border-t-0 md:pt-0 md:border-l md:border-slate-200/50 md:pl-6">
            <div className="flex items-center justify-between text-xs font-semibold text-slate-500">
              <span className="flex items-center gap-1.5">
                <Cloud className="w-3.5 h-3.5 text-indigo-500" />
                雲端備份存檔
              </span>
              {isLoggedIn && isDirty && hasNodes && (
                <span className="flex items-center gap-1 text-[10px] font-bold text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded-md animate-pulse">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
                  未儲存變更
                </span>
              )}
              {isLoggedIn && !isDirty && hasNodes && (
                <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded-md">
                  已儲存至雲端
                </span>
              )}
            </div>

            {!isLoggedIn ? (
              <div className="text-[11px] font-semibold text-slate-400 py-2">
                請先在右上角登入 Google 帳戶以使用雲端存檔功能。
              </div>
            ) : !hasNodes ? (
              <div className="text-[11px] font-semibold text-slate-400 py-2">
                請先搜尋並建立圖譜後再進行儲存。
              </div>
            ) : (
              <div className="flex gap-2 items-center">
                <input
                  type="text"
                  value={customTitle}
                  onChange={(e) => setCustomTitle(e.target.value)}
                  placeholder="自訂存檔標題..."
                  className="flex-1 min-w-0 text-xs bg-slate-50 border border-slate-200/60 rounded-xl px-2.5 py-1.5 focus:outline-none focus:border-indigo-500 focus:bg-white transition-all font-semibold text-slate-700"
                />
                <button
                  type="button"
                  onClick={() => onSaveGraph(customTitle.trim() || rootTitle)}
                  disabled={saveLoading}
                  className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 text-white rounded-xl text-xs font-bold transition-all active:scale-95 cursor-pointer shrink-0 shadow-sm"
                >
                  {saveLoading ? (
                    <span className="w-3.5 h-3.5 block border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                  ) : (
                    '儲存'
                  )}
                </button>
              </div>
            )}
          </div>

          {/* Real-time stats block */}
          <div className="flex flex-wrap items-center gap-4 border-t border-slate-100 pt-3 mt-1 md:border-t-0 md:pt-0 md:mt-0 md:border-l md:border-slate-200/50 md:pl-6 shrink-0">
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
