import React, { useEffect, useState, useRef } from 'react';
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

  // Cache only the last clicked node's summary data to prevent duplicate requests
  const lastFetchedRef = useRef<{
    nodeId: string;
    extract: string;
    thumbnail?: string;
    resolvedTitle?: string;
    isNotFound?: boolean;
  } | null>(null);

  const handleReSearchClick = async () => {
    if (!node) return;
    
    // Clear last fetched cache to force a fresh fetch
    lastFetchedRef.current = null;
    
    // 1. Trigger parent re-search to fetch and sync links
    onReSearch(node);
    
    // 2. Trigger local reload to refresh summary and thumbnail
    setLoading(true);
    try {
      const data = await fetchWikiSummary(node.id, node.lang, node.variant);
      setSummary(data.extract);
      setThumbnail(data.thumbnail);
      
      lastFetchedRef.current = {
        nodeId: node.id,
        extract: data.extract,
        thumbnail: data.thumbnail,
        resolvedTitle: data.resolvedTitle,
        isNotFound: data.isNotFound,
      };

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
      // Check cache first (only cache the last selected node)
      const cached = lastFetchedRef.current;
      if (cached && cached.nodeId === node.id) {
        setSummary(cached.extract);
        setThumbnail(cached.thumbnail);
        if (cached.resolvedTitle && cached.resolvedTitle !== node.id) {
          onUpdateNodeLabel?.(node.id, cached.resolvedTitle);
        }
        if (cached.isNotFound) {
          onMarkDeadEnd(node.id);
        }
        return;
      }

      setLoading(true);
      try {
        const data = await fetchWikiSummary(node.id, node.lang, node.variant);
        setSummary(data.extract);
        setThumbnail(data.thumbnail);
        
        lastFetchedRef.current = {
          nodeId: node.id,
          extract: data.extract,
          thumbnail: data.thumbnail,
          resolvedTitle: data.resolvedTitle,
          isNotFound: data.isNotFound,
        };

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
      className={`fixed z-40 bg-white/85 dark:bg-slate-900/85 backdrop-blur-2xl border-slate-200/60 dark:border-slate-800/60 shadow-2xl transition-all duration-300 ease-out
        bottom-0 left-0 right-0 top-auto w-full h-[60vh] rounded-t-3xl rounded-b-none border-t border-l-0 border-r-0 border-b-0
        md:top-4 md:right-4 md:bottom-4 md:left-auto md:w-96 md:h-auto md:rounded-3xl md:border
        ${isOpen 
          ? 'translate-y-0 md:translate-x-0 opacity-100 scale-100' 
          : 'translate-y-full md:translate-x-12 md:translate-y-0 opacity-0 pointer-events-none md:scale-95'
        }`}
    >
      {/* Sidebar Container */}
      <div className="flex flex-col h-full relative pt-8 md:pt-16 pb-6 px-6 overflow-hidden">
        {/* Mobile bottom sheet drag handle */}
        <div className="w-12 h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full mx-auto mb-4 shrink-0 md:hidden" />
        
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-2 right-4 md:top-4 md:right-4 text-slate-400 hover:text-slate-600 dark:hover:text-slate-350 transition-colors p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
          aria-label="Close details"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Content Wrapper (Scrollable) */}
        <div className="flex-1 overflow-y-auto pr-1">
          {/* Header Category and Language Badge */}
          <div className="flex items-center gap-2 mb-3">
            <span className="text-[10px] font-bold tracking-widest text-indigo-600 dark:text-indigo-400 uppercase px-2 py-0.5 bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-900/40 rounded-md">
              WIKIPEDIA ITEM
            </span>
            <span className="text-[10px] font-bold tracking-wider text-slate-500 dark:text-slate-400 uppercase px-1.5 py-0.5 bg-slate-100 dark:bg-slate-800 rounded-md">
              語系: {node.lang.toUpperCase()}
            </span>
          </div>

          {/* Title */}
          <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100 leading-tight mb-4 wrap-break-word">
            {node.id}
          </h2>

          {/* Page Image */}
          {thumbnail && !loading && (
            <div className="w-full h-44 rounded-2xl overflow-hidden mb-5 border border-slate-200/40 dark:border-slate-800/40 shadow-sm">
              <img
                src={thumbnail}
                alt={node.id}
                className="w-full h-full object-cover transition-transform duration-500 hover:scale-105"
              />
            </div>
          )}

          {/* Loading Shimmer State */}
          {loading ? (
            <div className="flex flex-col gap-3 py-6 justify-center items-center text-slate-400 dark:text-slate-500 text-sm">
              <Loader2 className="w-8 h-8 animate-spin text-indigo-500 mb-2" />
              <span>正在從 Wikipedia 載入摘要...</span>
            </div>
          ) : (
            /* Summary Text Description */
            <div className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed space-y-4 mb-6">
              <p className="whitespace-pre-wrap">{summary}</p>
            </div>
          )}

          {/* Graph Connection Stats */}
          <div className="border-t border-slate-100 dark:border-slate-800 pt-5 pb-2 mb-6">
            <h4 className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-3">
              白板狀態統計
            </h4>
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 rounded-xl">
                <div className="text-slate-400 dark:text-slate-550 text-[10px] font-semibold mb-0.5">關聯連線數</div>
                <div className="text-lg font-bold text-slate-805 dark:text-slate-200">{connectedLinksCount} 條</div>
              </div>
              <div className="p-3 bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 rounded-xl">
                <div className="text-slate-400 dark:text-slate-550 text-[10px] font-semibold mb-0.5">加載狀態</div>
                <div className={`text-xs font-bold ${node.loaded ? 'text-emerald-600 dark:text-emerald-450' : node.isDeadEnd ? 'text-slate-400 dark:text-slate-500' : 'text-indigo-600 dark:text-indigo-400'}`}>
                  {node.loading ? '正在讀取...' : node.isDeadEnd ? '終點無外連' : node.loaded ? '已加載展開' : '未加載'}
                </div>
              </div>
            </div>
          </div>

          {/* Action Panel (Moved inside scrollable content) */}
          <div className="border-t border-slate-100 dark:border-slate-800 pt-4 flex flex-col gap-2 mt-5">
          
          <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 hover:bg-slate-100/50 dark:hover:bg-slate-800 transition-all duration-300">
            <div className="flex items-center gap-2.5">
              <Network className={`w-4 h-4 transition-colors ${isExpanded ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-400 dark:text-slate-550'}`} />
              <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">保持此分支網路展開 (鎖定)</span>
            </div>
            <button
              type="button"
              onClick={onToggleExpand}
              className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                isExpanded ? 'bg-indigo-600 dark:bg-indigo-500' : 'bg-slate-200 dark:bg-slate-700'
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
              className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 dark:disabled:bg-indigo-850 text-white font-semibold py-2.5 px-4 rounded-xl flex items-center justify-center gap-2 text-sm shadow-md shadow-indigo-200 dark:shadow-none transition-all active:scale-[0.98]"
            >
              <Network className="w-4 h-4" />
              展開此節點網絡
            </button>
          )}

          {/* Action: Force Re-search / Refresh */}
          <button
            onClick={handleReSearchClick}
            disabled={node.loading}
            className="w-full bg-indigo-50 dark:bg-indigo-950/40 hover:bg-indigo-100 dark:hover:bg-indigo-900/40 text-indigo-700 dark:text-indigo-400 font-semibold py-2.5 px-4 rounded-xl flex items-center justify-center gap-2 text-sm border border-indigo-200/50 dark:border-indigo-800/50 transition-all active:scale-[0.98]"
            title="手動重新自維基百科搜尋此條目，並強制重新解析其內文的所有知識超連結與引言摘要"
          >
            <RotateCw className={`w-4 h-4 ${node.loading ? 'animate-spin' : ''}`} />
            重新搜尋此節點
          </button>

          {/* Action: Set as New Root */}
          <button
            onClick={() => onSetRoot(node)}
            className="w-full bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-750 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-205 font-semibold py-2.5 px-4 rounded-xl flex items-center justify-center gap-2 text-sm transition-all active:scale-[0.98]"
          >
            <Target className="w-4 h-4 text-slate-500 dark:text-slate-400" />
            重設以此為探索中心
          </button>

          {/* Action: External wikipedia link */}
          <a
            href={node.url}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full bg-slate-100 dark:bg-slate-850 hover:bg-slate-200 dark:hover:bg-slate-750 border border-slate-200/40 dark:border-slate-700/40 text-slate-700 dark:text-slate-205 font-semibold py-2.5 px-4 rounded-xl flex items-center justify-center gap-2 text-sm transition-all active:scale-[0.98]"
          >
            <BookOpen className="w-4 h-4 text-slate-500 dark:text-slate-400" />
            閱讀維基完整條目
            <ExternalLink className="w-3 h-3 text-slate-400 dark:text-slate-500 -mt-0.5" />
          </a>

          {/* Action: Remove node */}
          <button
            onClick={() => onRemove(node)}
            className="w-full bg-rose-50 dark:bg-rose-950/20 hover:bg-rose-100 dark:hover:bg-rose-950/45 text-rose-600 dark:text-rose-400 font-semibold py-2.5 px-4 rounded-xl flex items-center justify-center gap-2 text-sm transition-all mt-2 active:scale-[0.98]"
          >
            <Trash2 className="w-4 h-4" />
            從畫布中刪除節點
          </button>

        </div>
      </div>
    </div>
  </div>
  );
};
