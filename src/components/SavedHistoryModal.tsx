import React, { useEffect, useState } from 'react';
import { X, Calendar, Network, Trash2, FolderOpen, Loader2, Clock } from 'lucide-react';
import { getUserSavedGraphs, deleteSavedGraph, type SavedGraph } from '../services/firebase';

interface SavedHistoryModalProps {
  userId: string;
  isOpen: boolean;
  onClose: () => void;
  onLoadGraph: (graph: SavedGraph) => void;
}

export const SavedHistoryModal: React.FC<SavedHistoryModalProps> = ({
  userId,
  isOpen,
  onClose,
  onLoadGraph,
}) => {
  const [graphs, setGraphs] = useState<SavedGraph[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const fetchGraphs = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getUserSavedGraphs(userId);
      setGraphs(data);
    } catch (err: any) {
      console.error(err);
      setError('載入雲端存檔失敗，請確認資料庫已正確設定。');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && userId) {
      fetchGraphs();
    }
  }, [isOpen, userId]);

  if (!isOpen) return null;

  const handleDelete = async (e: React.MouseEvent, docId: string) => {
    e.stopPropagation();
    if (!window.confirm('確定要刪除此存檔嗎？此動作無法復原。')) return;

    setDeletingId(docId);
    try {
      await deleteSavedGraph(docId);
      setGraphs((prev) => prev.filter((g) => g.id !== docId));
    } catch (err) {
      console.error(err);
      alert('刪除失敗，請稍後再試。');
    } finally {
      setDeletingId(null);
    }
  };

  const formatDate = (timestamp: any) => {
    if (!timestamp) return '未知時間';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleString('zh-TW', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 dark:bg-slate-950/60 backdrop-blur-md pointer-events-auto">
      {/* Modal Card container */}
      <div className="relative w-full max-w-2xl max-h-[85vh] bg-white/90 dark:bg-slate-900/90 backdrop-blur-2xl border border-slate-200/60 dark:border-slate-800/60 rounded-3xl shadow-2xl p-6 flex flex-col gap-4 animate-in fade-in zoom-in-95 duration-200 overflow-hidden">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800/50 pb-3">
          <div className="flex flex-col">
            <h2 className="text-xl font-extrabold text-slate-800 dark:text-slate-200 tracking-tight flex items-center gap-2">
              <FolderOpen className="w-5.5 h-5.5 text-indigo-600 dark:text-indigo-400" />
              我的歷史存檔紀錄
            </h2>
            <p className="text-xs font-semibold text-slate-400 dark:text-slate-500 mt-0.5">
              儲存數量限制：{graphs.length} / 20 個
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300 transition-colors cursor-pointer"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto pr-1 flex flex-col gap-3 min-h-[300px]">
          {loading ? (
            <div className="flex-1 flex flex-col items-center justify-center text-slate-500 dark:text-slate-400 gap-2">
              <Loader2 className="w-8 h-8 text-indigo-600 dark:text-indigo-400 animate-spin" />
              <span className="text-xs font-bold">正在讀取雲端存檔...</span>
            </div>
          ) : error ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center text-rose-500 dark:text-rose-400 p-4 gap-2">
              <span className="text-sm font-bold">{error}</span>
              <button
                onClick={fetchGraphs}
                className="mt-2 text-xs font-bold bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/50 dark:hover:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400 py-1.5 px-3 rounded-xl transition-all"
              >
                重新整理
              </button>
            </div>
          ) : graphs.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center text-slate-400 dark:text-slate-500 p-8 gap-3">
              <FolderOpen className="w-12 h-12 text-slate-300 dark:text-slate-700" />
              <div>
                <h3 className="text-sm font-bold text-slate-600 dark:text-slate-300">尚無雲端存檔</h3>
                <p className="text-xs font-semibold text-slate-400 dark:text-slate-500 mt-1">
                  展開維基圖譜後，可於下方設定面板點擊「儲存目前的圖譜」來建立存檔。
                </p>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 pb-2">
              {graphs.map((graph) => (
                <div
                  key={graph.id}
                  onClick={() => onLoadGraph(graph)}
                  className="group relative bg-slate-50/50 dark:bg-slate-950/30 hover:bg-indigo-50/20 dark:hover:bg-indigo-950/10 border border-slate-200/50 dark:border-slate-800/50 hover:border-indigo-200 dark:hover:border-indigo-900/50 rounded-2xl p-4 shadow-sm hover:shadow-md transition-all duration-300 cursor-pointer flex flex-col justify-between gap-3 min-h-[140px]"
                >
                  {/* Top info */}
                  <div className="min-w-0">
                    <div className="flex justify-between items-start gap-2">
                      <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 truncate group-hover:text-indigo-700 dark:group-hover:text-indigo-400 transition-colors">
                        {graph.title || graph.rootTitle}
                      </h3>
                      {graph.title && graph.title !== graph.rootTitle && (
                        <span className="shrink-0 text-[9px] font-bold px-1.5 py-0.5 bg-slate-200/60 dark:bg-slate-800/60 text-slate-500 dark:text-slate-400 rounded-md">
                          {graph.rootTitle}
                        </span>
                      )}
                    </div>
                    
                    {/* Timestamps */}
                    <div className="flex flex-col gap-1 mt-2 text-slate-400 dark:text-slate-500">
                      <div className="flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 shrink-0 text-slate-300 dark:text-slate-600" />
                        <span className="text-[10px] font-semibold">建立時間: {formatDate(graph.createdAt)}</span>
                      </div>
                      {graph.updatedAt && (
                        <div className="flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5 shrink-0 text-slate-300 dark:text-slate-600" />
                          <span className="text-[10px] font-semibold">最後修改: {formatDate(graph.updatedAt)}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Bottom Stats */}
                  <div className="flex items-center justify-between border-t border-slate-200/20 dark:border-slate-800/20 pt-2.5">
                    <div className="flex gap-3 text-slate-500 dark:text-slate-400">
                      <div className="flex items-center gap-1 text-[10px] font-bold">
                        <Network className="w-3.5 h-3.5 text-slate-400 dark:text-slate-600" />
                        <span>節點: {graph.nodes.length}</span>
                      </div>
                      <div className="flex items-center gap-1 text-[10px] font-bold">
                        <span className="w-1.5 h-1.5 rounded-full bg-slate-400 dark:bg-slate-600"></span>
                        <span>連線: {graph.links.length}</span>
                      </div>
                      <div className="flex items-center gap-1 text-[10px] font-bold">
                        <span className="text-[10px] uppercase font-extrabold px-1 bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 rounded">
                          {graph.layoutMode === 'hierarchical' ? '階層' : '放射'}
                        </span>
                      </div>
                    </div>

                    {/* Delete button */}
                    <button
                      onClick={(e) => graph.id && handleDelete(e, graph.id)}
                      disabled={deletingId === graph.id}
                      className="p-2 text-slate-400 dark:text-slate-500 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-xl transition-all active:scale-95 cursor-pointer disabled:opacity-40"
                      title="刪除此存檔"
                    >
                      {deletingId === graph.id ? (
                        <Loader2 className="w-4 h-4 animate-spin text-rose-600 dark:text-rose-400" />
                      ) : (
                        <Trash2 className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
        
        {/* Footer */}
        <div className="border-t border-slate-100 dark:border-slate-800/50 pt-3 flex justify-end">
          <button
            onClick={onClose}
            className="py-2 px-5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-xl text-xs font-bold transition-all active:scale-95 cursor-pointer"
          >
            關閉
          </button>
        </div>

      </div>
    </div>
  );
};
