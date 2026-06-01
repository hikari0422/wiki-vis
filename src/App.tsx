import React, { useState, useEffect } from 'react';
import type { WikiNode, WikiLink } from './types/wiki';
import {
  parseWikiInput,
  searchWikiTitle,
  fetchWikiLinks,
} from './services/wikiApi';
import { WikiGraph } from './components/WikiGraph';
import { ControlPanel } from './components/ControlPanel';
import { DetailSidebar } from './components/DetailSidebar';
import { ContextMenu } from './components/ContextMenu';
import { Toast } from './components/Toast';
import type { ToastMessage, ToastType } from './components/Toast';
import { Compass, Layers, Share2 } from 'lucide-react';

export default function App() {
  // Graph visual states
  const [nodes, setNodes] = useState<WikiNode[]>([]);
  const [links, setLinks] = useState<WikiLink[]>([]);
  
  // Layout mode state: 'hierarchical' | 'radial'
  const [layoutMode, setLayoutMode] = useState<'hierarchical' | 'radial'>('hierarchical');
  
  // Interaction states
  const [selectedNode, setSelectedNode] = useState<WikiNode | null>(null);
  const [searchLoading, setSearchLoading] = useState<boolean>(false);
  const [limit, setLimit] = useState<number>(30); // Node expansion limit per click
  const [resetZoomTrigger, setResetZoomTrigger] = useState<number>(0);
  
  // Custom overlays
  const [toast, setToast] = useState<ToastMessage | null>(null);
  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
    node: WikiNode;
  } | null>(null);

  // Trigger temporary toast message
  const triggerToast = (message: string, type: ToastType = 'info') => {
    setToast({
      id: Math.random().toString(36).substring(2, 9),
      type,
      message,
    });
  };

  // Mount showcase: Auto pre-populate whiteboard with initial network to wow user!
  useEffect(() => {
    handleSearch('維基百科', 'zh');
  }, []);

  /**
   * Search Wikipedia and initialize the graph with the target page as the root.
   */
  const handleSearch = async (input: string, searchLang: string) => {
    setSearchLoading(true);
    setContextMenu(null);
    setSelectedNode(null);
    
    try {
      // 1. Parse inputs to determine title and language code
      const parsed = parseWikiInput(input, searchLang);
      let targetTitle = parsed.title;
      
      // 2. Resolve fuzzy query using search API if not a raw URL
      if (!parsed.isUrl) {
        targetTitle = await searchWikiTitle(parsed.title, parsed.lang);
      }

      if (!targetTitle) {
        triggerToast('找不到相關的維基條目，請試試其他關鍵字', 'warning');
        setSearchLoading(false);
        return;
      }

      // 3. Setup root node
      const rootNode: WikiNode = {
        id: targetTitle,
        label: targetTitle,
        loaded: false,
        url: `https://${parsed.lang}.wikipedia.org/wiki/${encodeURIComponent(targetTitle.replace(/ /g, '_'))}`,
        isRoot: true,
        lang: parsed.lang,
        depth: 0, // Root node is depth 0
      };

      setNodes([rootNode]);
      setLinks([]);
      
      triggerToast(`成功定位條目「${targetTitle}」，點擊節點下方的「+」展開網絡！`, 'success');
      
      // Auto reset zoom back to center
      setResetZoomTrigger((prev) => prev + 1);

    } catch (error) {
      console.error(error);
      triggerToast('載入維基條目失敗，請檢查網路連線或網址格式是否正確', 'error');
    } finally {
      setSearchLoading(false);
    }
  };

  /**
   * Explores and expands a node's outgoing links.
   * Guarantees safety check to prevent circular paths and duplicate nodes.
   */
  const handleExplore = async (node: WikiNode) => {
    if (node.loaded || node.loading || node.isDeadEnd) return;

    // 1. Mark target node as loading in state
    setNodes((prevNodes) =>
      prevNodes.map((n) => (n.id === node.id ? { ...n, loading: true } : n))
    );
    if (selectedNode?.id === node.id) {
      setSelectedNode((prev) => (prev ? { ...prev, loading: true } : null));
    }

    try {
      // 2. Fetch sublinks
      const fetchedTitles = await fetchWikiLinks(node.id, node.lang, limit);

      if (fetchedTitles.length === 0) {
        // Mark as dead end
        setNodes((prevNodes) =>
          prevNodes.map((n) =>
            n.id === node.id ? { ...n, loaded: true, loading: false, isDeadEnd: true } : n
          )
        );
        if (selectedNode?.id === node.id) {
          setSelectedNode((prev) =>
            prev ? { ...prev, loaded: true, loading: false, isDeadEnd: true } : null
          );
        }
        triggerToast(`「${node.id}」是終端節點，沒有其他知識外連`, 'warning');
        return;
      }

      // 3. Prevent duplicate node items using circular registry
      setNodes((prevNodes) => {
        const existingNodeIds = new Set(prevNodes.map((n) => n.id));
        const newNodesToAdd: WikiNode[] = [];

        fetchedTitles.forEach((title) => {
          if (!existingNodeIds.has(title)) {
            newNodesToAdd.push({
              id: title,
              label: title,
              loaded: false,
              url: `https://${node.lang}.wikipedia.org/wiki/${encodeURIComponent(title.replace(/ /g, '_'))}`,
              lang: node.lang,
              depth: (node.depth ?? 0) + 1, // Depth is parent's depth + 1
            });
            existingNodeIds.add(title); // Track to avoid duplicates inside this batch
          }
        });

        // Map and update the explored target node to loaded
        const updatedNodes = prevNodes.map((n) =>
          n.id === node.id ? { ...n, loaded: true, loading: false } : n
        );

        // Auto select the newly explored parent node to center the pathway and display children
        setSelectedNode({ ...node, loaded: true, loading: false });

        return [...updatedNodes, ...newNodesToAdd];
      });

      // 4. Register new connection links (links are added regardless of whether target node is new or existing)
      setLinks((prevLinks) => {
        const existingLinkKeys = new Set(
          prevLinks.map((l) => {
            const src = typeof l.source === 'string' ? l.source : l.source.id;
            const tgt = typeof l.target === 'string' ? l.target : l.target.id;
            return `${src}->${tgt}`;
          })
        );

        const newLinksToAdd: WikiLink[] = [];
        fetchedTitles.forEach((title) => {
          const key = `${node.id}->${title}`;
          if (!existingLinkKeys.has(key)) {
            newLinksToAdd.push({
              source: node.id,
              target: title,
            });
            existingLinkKeys.add(key);
          }
        });

        return [...prevLinks, ...newLinksToAdd];
      });

      triggerToast(`成功展開「${node.id}」，探索出 ${fetchedTitles.length} 個外連通道！`, 'success');

    } catch (error) {
      console.error(error);
      triggerToast('展開節點連結失敗，請檢查網路連線', 'error');
      // Revert loading state
      setNodes((prevNodes) =>
        prevNodes.map((n) => (n.id === node.id ? { ...n, loading: false } : n))
      );
      if (selectedNode?.id === node.id) {
        setSelectedNode((prev) => (prev ? { ...prev, loading: false } : null));
      }
    }
  };

  /**
   * Sets a specific node as the fresh root Exploration center, wiping other branches.
   */
  const handleSetRoot = async (node: WikiNode) => {
    setSelectedNode(null);
    setContextMenu(null);
    
    // Smooth transition
    triggerToast(`正將「${node.id}」設為新探索中心...`, 'info');
    
    const nextRoot: WikiNode = {
      ...node,
      isRoot: true,
      loaded: false,
      isDeadEnd: false,
      loading: false,
      depth: 0, // Reset depth to 0 for the new center
    };

    setNodes([nextRoot]);
    setLinks([]);
    setSelectedNode(nextRoot);
    setResetZoomTrigger((prev) => prev + 1);

    // Auto trigger expand on the new root
    setTimeout(() => {
      handleExplore(nextRoot);
    }, 200);
  };

  /**
   * Prunes/removes a specific node from the canvas together with its connected links.
   */
  const handleRemoveNode = (node: WikiNode) => {
    setContextMenu(null);
    if (selectedNode?.id === node.id) {
      setSelectedNode(null);
    }

    setNodes((prevNodes) => prevNodes.filter((n) => n.id !== node.id));
    setLinks((prevLinks) =>
      prevLinks.filter((l) => {
        const src = typeof l.source === 'string' ? l.source : l.source.id;
        const tgt = typeof l.target === 'string' ? l.target : l.target.id;
        return src !== node.id && tgt !== node.id;
      })
    );

    triggerToast(`已從白板中移除節點「${node.id}」`, 'info');
  };

  /**
   * Activates custom floating context menu on node right clicks
   */
  const handleNodeRightClick = (node: WikiNode, e: React.MouseEvent) => {
    e.preventDefault();
    setContextMenu({
      x: e.clientX,
      y: e.clientY,
      node,
    });
  };

  /**
   * Clean up whiteboard slate fully
   */
  const handleClearBoard = () => {
    setNodes([]);
    setLinks([]);
    setSelectedNode(null);
    setContextMenu(null);
    triggerToast('白板畫布已全面清空。您可以輸入全新主題開始探索！', 'info');
  };

  // Coordinate coordinator that releases locks and toggles modes
  const handleLayoutModeChange = (mode: 'hierarchical' | 'radial') => {
    setLayoutMode(mode);
    setNodes((prevNodes) =>
      prevNodes.map((n) => ({
        ...n,
        fx: null,
        fy: null,
      }))
    );
    setResetZoomTrigger((prev) => prev + 1);
    triggerToast(`已切換為「${mode === 'hierarchical' ? '直線階層' : '放射網絡'}」排列模式`, 'info');
  };

  // Flags non-existent pages in global state
  const handleMarkDeadEnd = (nodeId: string) => {
    setNodes((prev) =>
      prev.map((n) => (n.id === nodeId ? { ...n, isDeadEnd: true, loaded: true, loading: false } : n))
    );
    if (selectedNode?.id === nodeId) {
      setSelectedNode((prev) =>
        prev ? { ...prev, isDeadEnd: true, loaded: true, loading: false } : null
      );
    }
  };

  // Trace ancestral path of active selected node back to the root
  const getActivePathSet = (): Set<string> => {
    const activeSet = new Set<string>();
    
    let currentId = selectedNode?.id;
    if (!currentId && nodes.length > 0) {
      const root = nodes.find(n => n.isRoot || n.depth === 0) || nodes[0];
      currentId = root.id;
    }

    if (!currentId) return activeSet;

    let tempId: string | null = currentId;
    while (tempId) {
      activeSet.add(tempId);
      
      const parentLink = links.find(l => {
        const tgt = typeof l.target === 'string' ? l.target : l.target.id;
        return tgt === tempId;
      });
      
      if (parentLink) {
        const src = typeof parentLink.source === 'string' ? parentLink.source : parentLink.source.id;
        tempId = src;
      } else {
        tempId = null;
      }
    }

    return activeSet;
  };

  const activePathSet = getActivePathSet();
  const deepestActiveId = selectedNode?.id || (nodes.find(n => n.isRoot || n.depth === 0) || nodes[0])?.id;

  // Filter visible nodes to implement the Focused Pathway Mode
  const visibleNodes = nodes.filter(node => {
    if (activePathSet.has(node.id)) return true;
    
    const parentLink = links.find(l => {
      const tgt = typeof l.target === 'string' ? l.target : l.target.id;
      return tgt === node.id;
    });
    if (parentLink) {
      const src = typeof parentLink.source === 'string' ? parentLink.source : parentLink.source.id;
      if (src === deepestActiveId) return true;
    }

    return false;
  });

  // Filter visible links connecting only visible nodes
  const visibleNodesSet = new Set(visibleNodes.map(n => n.id));
  const visibleLinks = links.filter(link => {
    const src = typeof link.source === 'string' ? link.source : link.source.id;
    const tgt = typeof link.target === 'string' ? link.target : link.target.id;
    return visibleNodesSet.has(src) && visibleNodesSet.has(tgt);
  });

  // Calculates connections count for the DetailSidebar display
  const getConnectedLinksCount = (nodeId: string): number => {
    return links.filter((l) => {
      const src = typeof l.source === 'string' ? l.source : l.source.id;
      const tgt = typeof l.target === 'string' ? l.target : l.target.id;
      return src === nodeId || tgt === nodeId;
    }).length;
  };

  return (
    <main className="w-full h-full relative overflow-hidden bg-slate-50">
      
      {/* 1. Core Force-Directed Canvas Layer */}
      {nodes.length > 0 ? (
        <WikiGraph
          nodes={visibleNodes}
          links={visibleLinks}
          layoutMode={layoutMode}
          onNodeClick={(node) => {
            setSelectedNode(node);
            setContextMenu(null);
            if (!node.loaded && !node.loading && !node.isDeadEnd) {
              handleExplore(node);
            }
          }}
          onNodeRightClick={handleNodeRightClick}
          onMarkDeadEnd={handleMarkDeadEnd}
          selectedNode={selectedNode}
          resetZoomTrigger={resetZoomTrigger}
        />
      ) : (
        /* Empty canvas placeholder design */
        <div className="w-full h-full bg-grid-whiteboard flex flex-col justify-center items-center px-6">
          <div className="p-8 bg-white/70 backdrop-blur-md rounded-2xl border border-slate-200/50 shadow-lg text-center max-w-md animate-in zoom-in-95 duration-300">
            <Compass className="w-12 h-12 text-indigo-500 mx-auto mb-4 animate-spin-slow" />
            <h3 className="text-lg font-bold text-slate-800 mb-2">Wiki 知識網絡圖譜</h3>
            <p className="text-slate-500 text-sm leading-relaxed mb-6">
              您的白板目前是空的。請在上方搜尋列中貼上維基百科網址，或輸入一個想要探索的知識主題！
            </p>
            <div className="flex gap-2 justify-center">
              <button
                onClick={() => handleSearch('宇宙', 'zh')}
                className="text-xs font-semibold px-3 py-1.5 bg-indigo-50 text-indigo-600 border border-indigo-100 hover:bg-indigo-100/50 rounded-xl transition-all cursor-pointer"
              >
                探索「宇宙」🚀
              </button>
              <button
                onClick={() => handleSearch('人工智能', 'zh')}
                className="text-xs font-semibold px-3 py-1.5 bg-indigo-50 text-indigo-600 border border-indigo-100 hover:bg-indigo-100/50 rounded-xl transition-all cursor-pointer"
              >
                探索「人工智能」🧠
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 2. Floating Dashboard Search & Controls Layer */}
      <ControlPanel
        onSearch={handleSearch}
        onResetView={() => setResetZoomTrigger((prev) => prev + 1)}
        onClearBoard={handleClearBoard}
        nodeCount={nodes.length}
        linkCount={links.length}
        limit={limit}
        onLimitChange={setLimit}
        searchLoading={searchLoading}
      />

      {/* 3. Sliding Detail Reader Panel */}
      <DetailSidebar
        node={selectedNode}
        onClose={() => setSelectedNode(null)}
        onExplore={handleExplore}
        onSetRoot={handleSetRoot}
        onRemove={handleRemoveNode}
        onMarkDeadEnd={handleMarkDeadEnd}
        connectedLinksCount={selectedNode ? getConnectedLinksCount(selectedNode.id) : 0}
      />

      {/* 4. Customized Right-Click Operations overlay */}
      {contextMenu && (
        <ContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          node={contextMenu.node}
          onClose={() => setContextMenu(null)}
          onExplore={handleExplore}
          onSetRoot={handleSetRoot}
          onRemove={handleRemoveNode}
        />
      )}

      {/* 5. Floating Layout Selector at the bottom-left corner */}
      {nodes.length > 0 && (
        <div className="fixed bottom-4 left-4 z-30 bg-white/75 backdrop-blur-xl border border-slate-200/50 rounded-2xl shadow-lg p-1.5 flex gap-1 pointer-events-auto transition-all hover:shadow-xl duration-300">
          <button
            type="button"
            onClick={() => handleLayoutModeChange('hierarchical')}
            className={`flex items-center gap-1.5 py-2 px-3.5 rounded-xl text-xs font-bold transition-all active:scale-95 cursor-pointer ${
              layoutMode === 'hierarchical'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/10 font-bold'
                : 'text-slate-600 hover:text-slate-800 hover:bg-slate-100/50'
            }`}
            title="直線階層排列"
          >
            <Layers className="w-3.5 h-3.5" />
            <span>階層排列</span>
          </button>
          <button
            type="button"
            onClick={() => handleLayoutModeChange('radial')}
            className={`flex items-center gap-1.5 py-2 px-3.5 rounded-xl text-xs font-bold transition-all active:scale-95 cursor-pointer ${
              layoutMode === 'radial'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/10 font-bold'
                : 'text-slate-600 hover:text-slate-800 hover:bg-slate-100/50'
            }`}
            title="放射網絡排列"
          >
            <Share2 className="w-3.5 h-3.5" />
            <span>放射排列</span>
          </button>
        </div>
      )}

      {/* 6. Sleek Popup alert overlays */}
      <Toast toast={toast} onClose={() => setToast(null)} />
    </main>
  );
}
