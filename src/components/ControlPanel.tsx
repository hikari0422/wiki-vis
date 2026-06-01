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

  return (
    <div className="fixed top-4 left-4 right-4 md:left-1/2 md:-translate-x-1/2 md:max-w-3xl z-30 flex flex-col gap-2.5 pointer-events-none">
      
      {/* Top Floating Action Bar */}
      <div className="w-full bg-white/75 backdrop-blur-xl border border-slate-200/50 rounded-2xl shadow-lg p-3 flex flex-wrap items-center gap-3 pointer-events-auto">
        
        {/* Brand/Title */}
        <div className="flex items-center gap-2 px-2 shrink-0">
          <Compass className="w-6 h-6 text-indigo-600 animate-spin-slow" />
          <span className="font-bold text-sm bg-gradient-to-r from-indigo-700 to-indigo-500 bg-clip-text text-transparent tracking-tight">
            Wiki MindMap
          </span>
        </div>

        {/* Search Form */}
        <form onSubmit={handleSubmit} className="flex-1 min-w-[240px] flex items-center gap-2 bg-slate-100/80 rounded-xl px-3 py-1.5 border border-slate-200/20 focus-within:border-indigo-500/30 focus-within:bg-white focus-within:shadow-inner transition-all duration-300">
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

        {/* Toolbar Buttons */}
        <div className="flex items-center gap-1.5 shrink-0">
          
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
      </div>

      {/* Sub Settings & Stats Drawer */}
      {showSettings && (
        <div className="w-full bg-white/70 backdrop-blur-xl border border-slate-200/40 rounded-2xl shadow-md p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 pointer-events-auto animate-in slide-in-from-top-3 duration-200">
          
          {/* Node Limit Slider */}
          <div className="flex-1 flex flex-col gap-1.5 max-w-sm">
            <div className="flex items-center justify-between text-xs font-semibold text-slate-500">
              <span className="flex items-center gap-1.5">
                <Network className="w-3.5 h-3.5 text-indigo-500" />
                單次展開連結上限
              </span>
              <span className="text-indigo-600 font-bold bg-indigo-50 px-2 py-0.5 rounded-md">
                {limit} 個節點
              </span>
            </div>
            <input
              type="range"
              min="10"
              max="50"
              step="5"
              value={limit}
              onChange={(e) => onLimitChange(parseInt(e.target.value))}
              className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600 focus:outline-none"
            />
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
