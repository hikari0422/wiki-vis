import React, { useState, useEffect, useCallback } from 'react';
import type { WikiNode, WikiLink } from './types/wiki';
import {
  parseWikiInput,
  searchWikiTitle,
  fetchWikiLinks,
  resolveCanonicalTitle,
} from './services/wikiApi';
import { WikiGraph } from './components/WikiGraph';
import { ControlPanel } from './components/ControlPanel';
import { DetailSidebar } from './components/DetailSidebar';
import { ContextMenu } from './components/ContextMenu';
import { Toast } from './components/Toast';
import type { ToastMessage, ToastType } from './components/Toast';
import { Compass, Layers, Share2, GitFork } from 'lucide-react';
import { HistoryPanel } from './components/HistoryPanel';
import { SubArticlesPanel } from './components/SubArticlesPanel';
import { PathTimeline } from './components/PathTimeline';

export default function App() {
  // Graph visual states
  const [nodes, setNodes] = useState<WikiNode[]>([]);
  const [links, setLinks] = useState<WikiLink[]>([]);
  
  // Layout mode state: 'hierarchical' | 'radial' | 'tree'
  const [layoutMode, setLayoutMode] = useState<'hierarchical' | 'radial' | 'tree'>('hierarchical');
  
  // Expanded node IDs state (keeps branches locked open in Focused Pathway mode)
  const [expandedNodeIds, setExpandedNodeIds] = useState<Set<string>>(new Set());
  
  // Interaction states
  const [selectedNode, setSelectedNode] = useState<WikiNode | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState<boolean>(false);
  const [deepestActiveId, setDeepestActiveId] = useState<string | null>(null);
  const [exploredLinksMap, setExploredLinksMap] = useState<{ [nodeId: string]: string[] }>({});
  const [clickHistory, setClickHistory] = useState<WikiNode[]>([]);
  const [focusSelectedTrigger, setFocusSelectedTrigger] = useState<number>(0);
  const [fitScreenTrigger, setFitScreenTrigger] = useState<number>(0);
  const [focusRootTrigger, setFocusRootTrigger] = useState<number>(0);
  const [searchLoading, setSearchLoading] = useState<boolean>(false);

  // Helper to add nodes to the click history (unique FIFO queue capped at 10 items)
  const addToHistory = (node: WikiNode) => {
    setClickHistory((prev) => {
      // Remove duplicate if it already exists to bring it to the end (most recent)
      const filtered = prev.filter((n) => n.id !== node.id);
      const updated = [...filtered, node];
      // Limit to 10 items
      if (updated.length > 10) {
        return updated.slice(updated.length - 10);
      }
      return updated;
    });
  };

  // Handle node selection/click events (adds to history, updates active path, zooms, and auto-explores if needed)
  const handleNodeClick = (node: WikiNode) => {
    setSelectedNode(node);
    setIsSidebarOpen(true);
    setContextMenu(null);
    setDeepestActiveId(node.id);
    addToHistory(node);

    if (!node.loaded && !node.loading && !node.isDeadEnd) {
      handleExplore(node);
    }
  };

  // Toggle the expansion lock state for a given node
  const handleToggleNodeExpand = (nodeId: string) => {
    setExpandedNodeIds((prev) => {
      const next = new Set(prev);
      if (next.has(nodeId)) {
        next.delete(nodeId);
      } else {
        next.add(nodeId);
        // Robust guard: If node is not loaded yet, explore it immediately to fetch child network
        const node = nodes.find((n) => n.id === nodeId);
        if (node && !node.loaded && !node.loading && !node.isDeadEnd) {
          handleExplore(node);
        }
      }
      return next;
    });
  };

  const [limit, setLimit] = useState<number>(5); // Node expansion limit per click
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



  /**
   * Search Wikipedia and initialize the graph with the target page as the root.
   */
  const handleSearch = async (input: string, searchLang: string) => {
    setSearchLoading(true);
    setContextMenu(null);
    setSelectedNode(null);
    setIsSidebarOpen(false);
    setExpandedNodeIds(new Set());
    
    try {
      // 1. Parse inputs to determine title and language code
      const parsed = parseWikiInput(input, searchLang);
      let targetTitle = parsed.title;
      
      // 2. Resolve fuzzy query using search API if not a raw URL
      if (!parsed.isUrl) {
        targetTitle = await searchWikiTitle(parsed.title, parsed.lang);
      }

      // 3. Resolve canonical title (handles character variants and redirects)
      targetTitle = await resolveCanonicalTitle(targetTitle, parsed.lang);

      if (!targetTitle) {
        triggerToast('找不到相關的維基條目，請試試其他關鍵字', 'warning');
        setSearchLoading(false);
        return;
      }

      // Determine variant (detect browser language if Chinese, default to zh-tw)
      const userLang = typeof navigator !== 'undefined' ? navigator.language.toLowerCase() : '';
      const browserChineseVariant = userLang.startsWith('zh-') ? userLang : 'zh-tw';
      const variant = parsed.variant || (parsed.lang === 'zh' ? browserChineseVariant : undefined);

      // 3. Setup root node
      const rootNode: WikiNode = {
        id: targetTitle,
        label: targetTitle,
        loaded: false,
        url: `https://${parsed.lang}.wikipedia.org/wiki/${encodeURIComponent(targetTitle.replace(/ /g, '_'))}`,
        isRoot: true,
        lang: parsed.lang,
        variant, // Store variant!
        depth: 0, // Root node is depth 0
      };

      setNodes([rootNode]);
      setLinks([]);
      setDeepestActiveId(targetTitle);
      setClickHistory([rootNode]);
      
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
      // 2. Fetch sublinks (always fetch all links to cache them, enabling instant slider drag updates)
      let allTitles: string[];
      if (exploredLinksMap[node.id]) {
        allTitles = exploredLinksMap[node.id];
      } else {
        const onResolve = (resolved: string) => {
          setNodes((prevNodes) => {
            const targetNode = prevNodes.find((n) => n.id === node.id);
            if (targetNode && targetNode.label === resolved) {
              return prevNodes;
            }
            return prevNodes.map((n) =>
              n.id === node.id
                ? {
                    ...n,
                    label: resolved,
                    url: `https://${n.lang}.wikipedia.org/wiki/${encodeURIComponent(resolved.replace(/ /g, '_'))}`,
                  }
                : n
            );
          });
          setSelectedNode((prev) => {
            if (prev && prev.id === node.id) {
              if (prev.label === resolved) {
                return prev;
              }
              return {
                ...prev,
                label: resolved,
                url: `https://${prev.lang}.wikipedia.org/wiki/${encodeURIComponent(resolved.replace(/ /g, '_'))}`,
              };
            }
            return prev;
          });
        };
        allTitles = await fetchWikiLinks(node.id, node.lang, 0, onResolve, node.variant); // 0 parses all outgoing links
        setExploredLinksMap((prev) => ({
          ...prev,
          [node.id]: allTitles,
        }));
      }

      if (allTitles.length === 0) {
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

      // Slice the full sublinks using the current slider limit
      const currentLimit = limit;
      const fetchedTitles = currentLimit <= 0 ? allTitles : allTitles.slice(0, currentLimit);

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
              variant: node.variant, // Inherit variant!
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
        setDeepestActiveId(node.id);

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
   * Adds a hidden sub-article directly to the canvas as a child of the selected node,
   * selects it, and initiates exploration immediately.
   */
  const handleAddSubArticle = (title: string) => {
    if (!selectedNode) return;

    const newNode: WikiNode = {
      id: title,
      label: title,
      loaded: false,
      url: `https://${selectedNode.lang}.wikipedia.org/wiki/${encodeURIComponent(title.replace(/ /g, '_'))}`,
      lang: selectedNode.lang,
      variant: selectedNode.variant, // Pass variant down!
      depth: (selectedNode.depth ?? 0) + 1,
    };

    const newLink: WikiLink = {
      source: selectedNode.id,
      target: title,
    };

    setNodes((prevNodes) => {
      if (prevNodes.some(n => n.id === title)) return prevNodes;
      return [...prevNodes, newNode];
    });

    setLinks((prevLinks) => {
      const linkKey = `${selectedNode.id}->${title}`;
      if (prevLinks.some(l => {
        const src = typeof l.source === 'string' ? l.source : l.source.id;
        const tgt = typeof l.target === 'string' ? l.target : l.target.id;
        return `${src}->${tgt}` === linkKey;
      })) {
        return prevLinks;
      }
      return [...prevLinks, newLink];
    });

    // Select the new node and explore it
    setSelectedNode(newNode);
    setDeepestActiveId(newNode.id);
    setIsSidebarOpen(true);

    triggerToast(`已成功將隱藏條目「${title}」加入白板並展開！`, 'success');

    // Auto explore the newly spawned child
    setTimeout(() => {
      handleExplore(newNode);
    }, 150);
  };

  /**
   * Manually re-searches a node, clearing its caches and forcing D3 to rebuild its links.
   * Perfect for correcting empty branches or search errors.
   */
  const handleReSearch = async (node: WikiNode) => {
    // 1. Evict cache for this node
    setExploredLinksMap((prev) => {
      const updated = { ...prev };
      delete updated[node.id];
      return updated;
    });

    // 2. Set node state to loading, resetting loaded/isDeadEnd status
    setNodes((prevNodes) =>
      prevNodes.map((n) =>
        n.id === node.id ? { ...n, loaded: false, isDeadEnd: false, loading: true } : n
      )
    );
    setSelectedNode((prev) =>
      prev && prev.id === node.id ? { ...prev, loaded: false, isDeadEnd: false, loading: true } : prev
    );

    // 3. Clear any existing connections where this node is the SOURCE
    // to allow a fresh start for outgoing connections from this node.
    setLinks((prevLinks) =>
      prevLinks.filter((l) => {
        const src = typeof l.source === 'string' ? l.source : l.source.id;
        return src !== node.id;
      })
    );

    try {
      // 4. Fetch outgoing links freshly
      const onResolve = (resolved: string) => {
        setNodes((prevNodes) => {
          const targetNode = prevNodes.find((n) => n.id === node.id);
          if (targetNode && targetNode.label === resolved) {
            return prevNodes;
          }
          return prevNodes.map((n) =>
            n.id === node.id
              ? {
                  ...n,
                  label: resolved,
                  url: `https://${n.lang}.wikipedia.org/wiki/${encodeURIComponent(resolved.replace(/ /g, '_'))}`,
                }
              : n
          );
        });
        setSelectedNode((prev) => {
          if (prev && prev.id === node.id) {
            if (prev.label === resolved) {
              return prev;
            }
            return {
              ...prev,
              label: resolved,
              url: `https://${prev.lang}.wikipedia.org/wiki/${encodeURIComponent(resolved.replace(/ /g, '_'))}`,
            };
          }
          return prev;
        });
      };
      const allTitles = await fetchWikiLinks(node.id, node.lang, 0, onResolve, node.variant); // 0 parses all outgoing links
      
      setExploredLinksMap((prev) => ({
        ...prev,
        [node.id]: allTitles,
      }));

      if (allTitles.length === 0) {
        // Mark as dead end if still empty
        setNodes((prevNodes) =>
          prevNodes.map((n) =>
            n.id === node.id ? { ...n, loaded: true, loading: false, isDeadEnd: true } : n
          )
        );
        setSelectedNode((prev) =>
          prev && prev.id === node.id ? { ...prev, loaded: true, loading: false, isDeadEnd: true } : prev
        );
        triggerToast(`重新搜尋完成，「${node.id}」依然是終端節點`, 'warning');
        return;
      }

      // Slice based on the current slider limit
      const currentLimit = limit;
      const fetchedTitles = currentLimit <= 0 ? allTitles : allTitles.slice(0, currentLimit);

      // 5. Add new nodes dynamically
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
              variant: node.variant, // Pass variant down!
              depth: (node.depth ?? 0) + 1,
            });
            existingNodeIds.add(title);
          }
        });

        const updatedNodes = prevNodes.map((n) =>
          n.id === node.id ? { ...n, loaded: true, loading: false } : n
        );

        setSelectedNode({ ...node, loaded: true, loading: false });
        setDeepestActiveId(node.id);

        return [...updatedNodes, ...newNodesToAdd];
      });

      // 6. Connect new links
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

      triggerToast(`「${node.id}」重新搜尋完成！已成功抓取並解析 ${fetchedTitles.length} 個外連超連結。`, 'success');

    } catch (error) {
      console.error(error);
      triggerToast('重新搜尋失敗，請檢查網路連線', 'error');
      // Revert loading state
      setNodes((prevNodes) =>
        prevNodes.map((n) => (n.id === node.id ? { ...n, loading: false } : n))
      );
      setSelectedNode((prev) =>
        prev && prev.id === node.id ? { ...prev, loading: false } : prev
      );
    }
  };

  /**
   * Sets a specific node as the fresh root Exploration center, wiping other branches.
   */
  const handleSetRoot = async (node: WikiNode) => {
    setSelectedNode(null);
    setIsSidebarOpen(true);
    setContextMenu(null);
    setExpandedNodeIds(new Set());
    
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
    setDeepestActiveId(node.id);
    setClickHistory([nextRoot]);
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
      setIsSidebarOpen(false);
    }

    setNodes((prevNodes) => prevNodes.filter((n) => n.id !== node.id));
    setLinks((prevLinks) =>
      prevLinks.filter((l) => {
        const src = typeof l.source === 'string' ? l.source : l.source.id;
        const tgt = typeof l.target === 'string' ? l.target : l.target.id;
        return src !== node.id && tgt !== node.id;
      })
    );

    // Remove from expandedNodeIds
    setExpandedNodeIds((prev) => {
      const next = new Set(prev);
      next.delete(node.id);
      return next;
    });

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
    setIsSidebarOpen(false);
    setContextMenu(null);
    setClickHistory([]);
    triggerToast('白板畫布已全面清空。您可以輸入全新主題開始探索！', 'info');
  };

  // 5. Watch for branch limit changes to dynamically update visible sublinks instantly!
  useEffect(() => {
    if (!selectedNode || !selectedNode.loaded) return;
    const allChildren = exploredLinksMap[selectedNode.id];
    if (!allChildren) return;

    const currentLimit = limit;
    const targetChildren = currentLimit <= 0 ? allChildren : allChildren.slice(0, currentLimit);
    const targetChildrenSet = new Set(targetChildren);
    const allChildrenSet = new Set(allChildren);

    setNodes((prevNodes) => {
      // Keep nodes that are either NOT children of selectedNode OR are in the targetChildren slice
      const otherNodes = prevNodes.filter((n) => {
        return !allChildrenSet.has(n.id) || targetChildrenSet.has(n.id);
      });

      // Find which targetChildren are missing
      const existingNodeIds = new Set(otherNodes.map((n) => n.id));
      const newNodesToAdd: WikiNode[] = [];
      targetChildren.forEach((title) => {
        if (!existingNodeIds.has(title)) {
          newNodesToAdd.push({
            id: title,
            label: title,
            loaded: false,
            url: `https://${selectedNode.lang}.wikipedia.org/wiki/${encodeURIComponent(title.replace(/ /g, '_'))}`,
            lang: selectedNode.lang,
            variant: selectedNode.variant, // Pass variant down!
            depth: (selectedNode.depth ?? 0) + 1,
          });
        }
      });

      return [...otherNodes, ...newNodesToAdd];
    });

    setLinks((prevLinks) => {
      // Keep links that are NOT outgoing from selectedNode OR target is in targetChildrenSet
      const otherLinks = prevLinks.filter((l) => {
        const src = typeof l.source === 'string' ? l.source : l.source.id;
        const tgt = typeof l.target === 'string' ? l.target : l.target.id;
        return src !== selectedNode.id || targetChildrenSet.has(tgt);
      });

      // Find missing links
      const existingLinkKeys = new Set(
        otherLinks.map((l) => {
          const src = typeof l.source === 'string' ? l.source : l.source.id;
          const tgt = typeof l.target === 'string' ? l.target : l.target.id;
          return `${src}->${tgt}`;
        })
      );

      const newLinksToAdd: WikiLink[] = [];
      targetChildren.forEach((title) => {
        const key = `${selectedNode.id}->${title}`;
        if (!existingLinkKeys.has(key)) {
          newLinksToAdd.push({
            source: selectedNode.id,
            target: title,
          });
        }
      });

      return [...otherLinks, ...newLinksToAdd];
    });
  }, [limit, selectedNode?.id]);

  // Coordinate coordinator that releases locks and toggles modes
  const handleLayoutModeChange = (mode: 'hierarchical' | 'radial' | 'tree') => {
    setLayoutMode(mode);
    setNodes((prevNodes) =>
      prevNodes.map((n) => ({
        ...n,
        fx: null,
        fy: null,
      }))
    );
    setResetZoomTrigger((prev) => prev + 1);
    
    let modeText = '直線階層';
    if (mode === 'radial') modeText = '放射網絡';
    if (mode === 'tree') modeText = '樹狀圖譜';
    
    triggerToast(`已切換為「${modeText}」排列模式`, 'info');
  };

  // Flags non-existent pages in global state
  const handleMarkDeadEnd = useCallback((nodeId: string) => {
    setNodes((prev) =>
      prev.map((n) => (n.id === nodeId ? { ...n, isDeadEnd: true, loaded: true, loading: false } : n))
    );
    if (selectedNode?.id === nodeId) {
      setSelectedNode((prev) =>
        prev ? { ...prev, isDeadEnd: true, loaded: true, loading: false } : null
      );
    }
  }, [selectedNode?.id]);

  // Dynamically updates a node's label and URL when a canonical title is resolved
  const handleUpdateNodeLabel = useCallback((nodeId: string, resolvedTitle: string) => {
    setNodes((prevNodes) => {
      const targetNode = prevNodes.find((n) => n.id === nodeId);
      if (targetNode && targetNode.label === resolvedTitle) {
        return prevNodes;
      }
      return prevNodes.map((n) =>
        n.id === nodeId
          ? {
              ...n,
              label: resolvedTitle,
              url: `https://${n.lang}.wikipedia.org/wiki/${encodeURIComponent(resolvedTitle.replace(/ /g, '_'))}`,
            }
          : n
      );
    });
    setSelectedNode((prev) => {
      if (prev && prev.id === nodeId) {
        if (prev.label === resolvedTitle) {
          return prev;
        }
        return {
          ...prev,
          label: resolvedTitle,
          url: `https://${prev.lang}.wikipedia.org/wiki/${encodeURIComponent(resolvedTitle.replace(/ /g, '_'))}`,
        };
      }
      return prev;
    });
  }, []);

  // Trace ancestral path of active selected node back to the root
  const getActivePathSet = (): Set<string> => {
    const activeSet = new Set<string>();
    
    // Use state-based deepestActiveId to keep path history intact!
    let currentId = deepestActiveId || selectedNode?.id;
    if (!currentId && nodes.length > 0) {
      const root = nodes.find(n => n.isRoot || n.depth === 0) || nodes[0];
      currentId = root.id;
    }

    if (!currentId) return activeSet;

    let tempId: string | null = currentId;
    let iterations = 0;
    while (tempId && iterations < 100) {
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
      iterations++;
    }

    return activeSet;
  };

  const activePathSet = getActivePathSet();
  const currentDeepestActiveId = deepestActiveId || selectedNode?.id || (nodes.find(n => n.isRoot || n.depth === 0) || nodes[0])?.id;

  // Filter visible nodes to implement the Focused Pathway Mode
  const visibleNodes = nodes.filter(node => {
    if (activePathSet.has(node.id)) return true;
    if (expandedNodeIds.has(node.id)) return true;
    
    const parentLink = links.find(l => {
      const tgt = typeof l.target === 'string' ? l.target : l.target.id;
      return tgt === node.id;
    });
    if (parentLink) {
      const src = typeof parentLink.source === 'string' ? parentLink.source : parentLink.source.id;
      if (src === currentDeepestActiveId || expandedNodeIds.has(src)) return true;
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

  // Calculates the ordered list of nodes in the current active exploration path from root to selected
  const getActivePathList = (): WikiNode[] => {
    const pathList: WikiNode[] = [];
    let currentId = deepestActiveId || selectedNode?.id;
    
    if (!currentId && nodes.length > 0) {
      const root = nodes.find(n => n.isRoot || n.depth === 0) || nodes[0];
      currentId = root.id;
    }

    if (!currentId) return pathList;

    let tempId: string | null = currentId;
    let iterations = 0;
    while (tempId && iterations < 100) {
      const foundNode = nodes.find(n => n.id === tempId);
      if (foundNode) {
        pathList.unshift(foundNode); // Prepend to sort from Root to leaf
      }
      
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
      iterations++;
    }

    return pathList;
  };

  return (
    <main className="w-full h-full relative overflow-hidden bg-slate-50">
      
      {/* 1. Core Force-Directed Canvas Layer */}
      {nodes.length > 0 ? (
        <WikiGraph
          nodes={visibleNodes}
          links={visibleLinks}
          layoutMode={layoutMode}
          onNodeClick={handleNodeClick}
          onBackgroundClick={() => {
            setSelectedNode(null);
            setDeepestActiveId(null);
            setIsSidebarOpen(false);
          }}
          onNodeRightClick={handleNodeRightClick}
          onMarkDeadEnd={handleMarkDeadEnd}
          selectedNode={selectedNode}
          resetZoomTrigger={resetZoomTrigger}
          focusSelectedTrigger={focusSelectedTrigger}
          fitScreenTrigger={fitScreenTrigger}
          focusRootTrigger={focusRootTrigger}
          expandedNodeIds={expandedNodeIds}
          onToggleNodeExpand={handleToggleNodeExpand}
        />
      ) : (
        /* Empty canvas whiteboard background */
        <div className="w-full h-full bg-grid-whiteboard relative overflow-hidden bg-slate-50" />
      )}

      {/* Exploration Time Machine History Panel (Top Left Corner) */}
      <HistoryPanel
        history={clickHistory}
        selectedNode={selectedNode}
        onNodeClick={handleNodeClick}
      />

      {/* Search & Dropdown Filter Panel for nodes with >50 sub-articles */}
      <SubArticlesPanel
        selectedNode={selectedNode}
        allSubArticles={selectedNode ? (exploredLinksMap[selectedNode.id] || []) : []}
        visibleNodeIds={new Set(nodes.map(n => n.id))}
        onAddSubArticle={handleAddSubArticle}
      />

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
        hasNodes={nodes.length > 0}
      />

      {/* 3. Sliding Detail Reader Panel */}
      <DetailSidebar
        node={selectedNode}
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
        onExplore={handleExplore}
        onSetRoot={handleSetRoot}
        onRemove={handleRemoveNode}
        onMarkDeadEnd={handleMarkDeadEnd}
        connectedLinksCount={selectedNode ? getConnectedLinksCount(selectedNode.id) : 0}
        onReSearch={handleReSearch}
        isExpanded={selectedNode ? expandedNodeIds.has(selectedNode.id) : false}
        onToggleExpand={() => selectedNode && handleToggleNodeExpand(selectedNode.id)}
        onUpdateNodeLabel={handleUpdateNodeLabel}
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

      {/* 5. Floating Layout & Camera Selector at the bottom-left corner */}
      {nodes.length > 0 && (
        <div className="fixed bottom-4 left-4 z-30 bg-white/80 backdrop-blur-xl border border-slate-200/50 rounded-2xl shadow-lg p-2 flex flex-col gap-2 pointer-events-auto transition-all hover:shadow-xl duration-300 max-w-xs">
          
          {/* Layout Actions Row */}
          <div className="flex gap-1">
            <button
              type="button"
              onClick={() => handleLayoutModeChange('hierarchical')}
              className={`flex items-center gap-1.5 py-1.5 px-2.5 rounded-xl text-[11px] font-bold transition-all active:scale-95 cursor-pointer ${
                layoutMode === 'hierarchical'
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/10'
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
              className={`flex items-center gap-1.5 py-1.5 px-2.5 rounded-xl text-[11px] font-bold transition-all active:scale-95 cursor-pointer ${
                layoutMode === 'radial'
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/10'
                  : 'text-slate-600 hover:text-slate-800 hover:bg-slate-100/50'
              }`}
              title="放射網絡排列"
            >
              <Share2 className="w-3.5 h-3.5" />
              <span>放射排列</span>
            </button>
            <button
              type="button"
              onClick={() => handleLayoutModeChange('tree')}
              className={`flex items-center gap-1.5 py-1.5 px-2.5 rounded-xl text-[11px] font-bold transition-all active:scale-95 cursor-pointer ${
                layoutMode === 'tree'
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/10'
                  : 'text-slate-600 hover:text-slate-800 hover:bg-slate-100/50'
              }`}
              title="水平向右樹狀排列"
            >
              <GitFork className="w-3.5 h-3.5 rotate-90" />
              <span>樹狀排列</span>
            </button>
          </div>

          {/* Divider */}
          <div className="h-px bg-slate-100 w-full" />

          {/* Camera Positioning Row */}
          <div className="flex justify-between gap-1 items-center px-1">
            <span className="text-[10px] font-bold text-slate-400 select-none mr-2 shrink-0">相機鏡頭:</span>
            <div className="flex gap-1.5">
              {/* Focus Selected */}
              <button
                type="button"
                onClick={() => setFocusSelectedTrigger(prev => prev + 1)}
                disabled={!selectedNode}
                className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-slate-500 rounded-lg transition-all active:scale-95 cursor-pointer border border-slate-100/10"
                title={selectedNode ? `鏡頭聚焦選中節點：「${selectedNode.id}」` : "請先選擇畫布上的任何節點來進行鏡頭聚焦"}
              >
                <Compass className="w-4 h-4" />
              </button>

              {/* Fit Screen */}
              <button
                type="button"
                onClick={() => setFitScreenTrigger(prev => prev + 1)}
                className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all active:scale-95 cursor-pointer border border-slate-100/10"
                title="相機全局適應 (將整顆樹縮小塞滿視窗並置中)"
              >
                <Share2 className="w-4 h-4 rotate-90" />
              </button>

              {/* Focus Root */}
              <button
                type="button"
                onClick={() => setFocusRootTrigger(prev => prev + 1)}
                className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all active:scale-95 cursor-pointer border border-slate-100/10"
                title="定位聚焦到最初搜尋的根節點 (Root)"
              >
                <Layers className="w-4 h-4" />
              </button>
            </div>
          </div>

        </div>
      )}

      {/* 6. Sleek Popup alert overlays */}
      <Toast toast={toast} onClose={() => setToast(null)} />

      {/* 7. Bottom Center Breadcrumb Exploration Timeline */}
      <PathTimeline
        path={getActivePathList()}
        onNodeClick={handleNodeClick}
      />
    </main>
  );
}
