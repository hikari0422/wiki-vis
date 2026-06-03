import React, { useEffect, useState } from 'react';
import { X, ExternalLink, Target, Trash2, Network, Loader2, BookOpen, RotateCw } from 'lucide-react';
import type { WikiNode } from '../types/wiki';
import { fetchWikiSummary } from '../services/wikiApi';

interface DetailSidebarProps {
  node: WikiNode | null;
  isOpen: boolean;
  onClose: () => void;
  onExplore: (node: WikiNode) => void;
  onSetRoot: (node: WikiNode) => void;
  onRemove: (node: WikiNode) => void;
  onMarkDeadEnd: (nodeId: string) => void; // Flag non-existent nodes
  connectedLinksCount: number;
  onReSearch: (node: WikiNode) => void; // Added for manual re-search/retry
  isExpanded: boolean;
  onToggleExpand: () => void;
  onUpdateNodeLabel?: (nodeId: string, resolvedTitle: string) => void;
}

export const DetailSidebar: React.FC<DetailSidebarProps> = ({
  node,
  isOpen,
  onClose,
  onExplore,
  onSetRoot,
  onRemove,
  onMarkDeadEnd,
  connectedLinksCount,
  onReSearch,
  isExpanded,
  onToggleExpand,
  onUpdateNodeLabel,
}) => {
  const [summary, setSummary] = useState<string>('');
  const [thumbnail, setThumbnail] = useState<string | undefined>(undefined);
  const [loading, setLoading] = useState<boolean>(false);

  const handleReSearchClick = async () => {
    if (!node) return;
    
    // 1. Trigger parent re-search to fetch and sync links
    onReSearch(node);
    
    // 2. Trigger local reload to refresh summary and thumbnail
    setLoading(true);
    try {
      const data = await fetchWikiSummary(node.id, node.lang, node.variant);
      setSummary(data.extract);
      setThumbnail(data.thumbnail);
      if (data.resolvedTitle && data.resolvedTitle !== node.id) {
        onUpdateNodeLabel?.(node.id, data.resolvedTitle);
      }
      if (data.isNotFound) {
        onMarkDeadEnd(node.id);
      }
    } catch (error) {
      console.error('Failed to load page summary:', error);
      setSummary('無法加載此維基條目的摘要內容。');
      setThumbnail(undefined);
    } finally {
      setLoading(false);
    }
  };

  // Fetch summary and image whenever the active node selection changes
  useEffect(() => {
    if (!node) return;

    const loadSummary = async () => {
      setLoading(true);
      try {
        const data = await fetchWikiSummary(node.id, node.lang, node.variant);
        setSummary(data.extract);
        setThumbnail(data.thumbnail);
        if (data.resolvedTitle && data.resolvedTitle !== node.id) {
          onUpdateNodeLabel?.(node.id, data.resolvedTitle);
        }
        if (data.isNotFound) {
          onMarkDeadEnd(node.id);
        }
      } catch (error) {
        console.error('Failed to load page summary:', error);
        setSummary('無法加載此維基條目的摘要內容。');
        setThumbnail(undefined);
      } finally {
        setLoading(false);
      }
    };

    loadSummary();
  }, [node, onMarkDeadEnd, onUpdateNodeLabel]);

  if (!node) return null;

  return (
    <div
      className={`fixed top-0 right-0 h-full w-80 md:w-96 bg-white/80 backdrop-blur-xl border-l border-slate-200/50 shadow-2xl z-40 transition-transform duration-300 ease-out transform ${
        isOpen ? 'translate-x-0' : 'translate-x-full'
      }`}
    >
      {/* Sidebar Container */}
      <div className="flex flex-col h-full relative pt-16 pb-6 px-6">
        
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 transition-colors p-1.5 rounded-lg hover:bg-slate-100"
          aria-label="Close details"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Content Wrapper (Scrollable) */}
        <div className="flex-1 overflow-y-auto pr-1">
          {/* Header Category and Language Badge */}
          <div className="flex items-center gap-2 mb-3">
            <span className="text-[10px] font-bold tracking-widest text-indigo-600 uppercase px-2 py-0.5 bg-indigo-50 border border-indigo-100 rounded-md">
              WIKIPEDIA ITEM
            </span>
            <span className="text-[10px] font-bold tracking-wider text-slate-500 uppercase px-1.5 py-0.5 bg-slate-100 rounded-md">
              語系: {node.lang.toUpperCase()}
            </span>
          </div>

          {/* Title */}
          <h2 className="text-xl font-bold text-slate-900 leading-tight mb-4 break-words">
            {node.id}
          </h2>

          {/* Page Image */}
          {thumbnail && !loading && (
            <div className="w-full h-44 rounded-2xl overflow-hidden mb-5 border border-slate-200/40 shadow-sm">
              <img
                src={thumbnail}
                alt={node.id}
                className="w-full h-full object-cover transition-transform duration-500 hover:scale-105"
              />
            </div>
          )}

          {/* Loading Shimmer State */}
          {loading ? (
            <div className="flex flex-col gap-3 py-6 justify-center items-center text-slate-400 text-sm">
              <Loader2 className="w-8 h-8 animate-spin text-indigo-500 mb-2" />
              <span>正在從 Wikipedia 載入摘要...</span>
            </div>
          ) : (
            /* Summary Text Description */
            <div className="text-sm text-slate-600 leading-relaxed space-y-4 mb-6">
              <p className="whitespace-pre-wrap">{summary}</p>
            </div>
          )}

          {/* Graph Connection Stats */}
          <div className="border-t border-slate-100 pt-5 pb-2 mb-6">
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">
              白板狀態統計
            </h4>
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 bg-slate-50 border border-slate-100 rounded-xl">
                <div className="text-slate-400 text-[10px] font-semibold mb-0.5">關聯連線數</div>
                <div className="text-lg font-bold text-slate-800">{connectedLinksCount} 條</div>
              </div>
              <div className="p-3 bg-slate-50 border border-slate-100 rounded-xl">
                <div className="text-slate-400 text-[10px] font-semibold mb-0.5">加載狀態</div>
                <div className={`text-xs font-bold ${node.loaded ? 'text-emerald-600' : node.isDeadEnd ? 'text-slate-400' : 'text-indigo-600'}`}>
                  {node.loading ? '正在讀取...' : node.isDeadEnd ? '終點無外連' : node.loaded ? '已加載展開' : '未加載'}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Action Panel (Sticky at bottom) */}
        <div className="border-t border-slate-100 pt-4 flex flex-col gap-2 shrink-0">
          
          <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-100 hover:bg-slate-100/50 transition-all duration-300">
            <div className="flex items-center gap-2.5">
              <Network className={`w-4 h-4 transition-colors ${isExpanded ? 'text-indigo-600' : 'text-slate-400'}`} />
              <span className="text-xs font-semibold text-slate-700">保持此分支網路展開 (鎖定)</span>
            </div>
            <button
              type="button"
              onClick={onToggleExpand}
              className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                isExpanded ? 'bg-indigo-600' : 'bg-slate-200'
              }`}
              role="switch"
              aria-checked={isExpanded}
            >
              <span
                aria-hidden="true"
                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                  isExpanded ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>
          
          {/* Action: Expand Node */}
          {!node.loaded && !node.isDeadEnd && (
            <button
              onClick={() => onExplore(node)}
              disabled={node.loading}
              className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white font-semibold py-2.5 px-4 rounded-xl flex items-center justify-center gap-2 text-sm shadow-md shadow-indigo-200 transition-all active:scale-[0.98]"
            >
              <Network className="w-4 h-4" />
              展開此節點網絡
            </button>
          )}

          {/* Action: Force Re-search / Refresh */}
          <button
            onClick={handleReSearchClick}
            disabled={node.loading}
            className="w-full bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-semibold py-2.5 px-4 rounded-xl flex items-center justify-center gap-2 text-sm border border-indigo-200/50 transition-all active:scale-[0.98]"
            title="手動重新自維基百科搜尋此條目，並強制重新解析其內文的所有知識超連結與引言摘要"
          >
            <RotateCw className={`w-4 h-4 ${node.loading ? 'animate-spin' : ''}`} />
            重新搜尋此節點
          </button>

          {/* Action: Set as New Root */}
          <button
            onClick={() => onSetRoot(node)}
            className="w-full bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 font-semibold py-2.5 px-4 rounded-xl flex items-center justify-center gap-2 text-sm transition-all active:scale-[0.98]"
          >
            <Target className="w-4 h-4 text-slate-500" />
            重設以此為探索中心
          </button>

          {/* Action: External wikipedia link */}
          <a
            href={node.url}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full bg-slate-100 hover:bg-slate-200 border border-slate-200/40 text-slate-700 font-semibold py-2.5 px-4 rounded-xl flex items-center justify-center gap-2 text-sm transition-all active:scale-[0.98]"
          >
            <BookOpen className="w-4 h-4 text-slate-500" />
            閱讀維基完整條目
            <ExternalLink className="w-3 h-3 text-slate-400 -mt-0.5" />
          </a>

          {/* Action: Remove node */}
          <button
            onClick={() => onRemove(node)}
            className="w-full bg-rose-50 hover:bg-rose-100 text-rose-600 font-semibold py-2.5 px-4 rounded-xl flex items-center justify-center gap-2 text-sm transition-all mt-2 active:scale-[0.98]"
          >
            <Trash2 className="w-4 h-4" />
            從畫布中刪除節點
          </button>

        </div>
      </div>
    </div>
  );
};
