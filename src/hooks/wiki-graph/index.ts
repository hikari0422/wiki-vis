import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import type { User } from 'firebase/auth';
import type { WikiNode, WikiLink } from '../../types/wiki';
import { useAlert } from '../useAlert';
import {
  saveGraphToFirestore,
  recordNodeClick,
  recordSessionStats,
  type SavedGraph
} from '../../services/firebase';
import {
  parseWikiInput,
  searchWikiTitle,
  fetchWikiLinks,
  resolveCanonicalTitle,
} from '../../services/wikiApi';

export function useWikiGraph(user: User | null) {
  // --- States ---
  // Core Graph states
  const [nodes, setNodes] = useState<WikiNode[]>([]);
  const [links, setLinks] = useState<WikiLink[]>([]);
  const [limit, setLimit] = useState<number>(5);
  
  // Layout mode states
  const [layoutMode, setLayoutMode] = useState<'hierarchical' | 'radial'>('hierarchical');
  const [viewMode, setViewMode] = useState<'2d' | '3d'>('2d');
  const [layoutMode3D, setLayoutMode3D] = useState<'free' | 'hierarchical' | 'radial'>('free');
  
  // Expanded node IDs
  const [expandedNodeIds, setExpandedNodeIds] = useState<Set<string>>(new Set());
  
  // Interaction states
  const [selectedNode, setSelectedNode] = useState<WikiNode | null>(null);
  const [deepestActiveId, setDeepestActiveId] = useState<string | null>(null);
  const [exploredLinksMap, setExploredLinksMap] = useState<{ [nodeId: string]: string[] }>({});
  const [clickHistory, setClickHistory] = useState<WikiNode[]>([]);
  const [isDirty, setIsDirty] = useState<boolean>(false);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; node: WikiNode } | null>(null);

  // Panel states
  const [isSidebarOpen, setIsSidebarOpen] = useState<boolean>(false);
  const isInitialMobile = typeof window !== 'undefined' ? window.innerWidth < 768 : false;
  const [isMobile, setIsMobile] = useState<boolean>(isInitialMobile);
  const [isHistoryOpen, setIsHistoryOpen] = useState<boolean>(!isInitialMobile);
  const [isSubArticlesOpen, setIsSubArticlesOpen] = useState<boolean>(!isInitialMobile);

  // Camera Trigger states
  const [resetZoomTrigger, setResetZoomTrigger] = useState<number>(0);
  const [focusSelectedTrigger, setFocusSelectedTrigger] = useState<number>(0);
  const [fitScreenTrigger, setFitScreenTrigger] = useState<number>(0);
  const [focusRootTrigger, setFocusRootTrigger] = useState<number>(0);

  // Loading states
  const [saveLoading, setSaveLoading] = useState<boolean>(false);
  const [searchLoading, setSearchLoading] = useState<boolean>(false);

  const { alert } = useAlert();

  // --- Mobile Resize Hook ---
  useEffect(() => {
    const checkMobile = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
    };
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // --- Toggle Functions ---
  const toggleHistory = useCallback(() => {
    setIsHistoryOpen((prev) => {
      const next = !prev;
      if (next && isMobile) {
        setIsSubArticlesOpen(false);
        setIsSidebarOpen(false);
      }
      return next;
    });
  }, [isMobile]);

  const toggleSubArticles = useCallback(() => {
    setIsSubArticlesOpen((prev) => {
      const next = !prev;
      if (next && isMobile) {
        setIsHistoryOpen(false);
        setIsSidebarOpen(false);
      }
      return next;
    });
  }, [isMobile]);

  const addToHistory = useCallback((node: WikiNode) => {
    setClickHistory((prev) => {
      const filtered = prev.filter((n) => n.id !== node.id);
      const updated = [...filtered, node];
      if (updated.length > 10) {
        return updated.slice(updated.length - 10);
      }
      return updated;
    });
  }, []);


  const rebuildGraph = useCallback((currentNodes: WikiNode[], currentLinks: WikiLink[], currentLimit: number) => {
    const rootNodes = currentNodes.filter(n => n.isRoot);
    if (rootNodes.length === 0 && currentNodes.length > 0) {
      rootNodes.push(currentNodes[0]);
    }
    if (rootNodes.length === 0) return { nodes: currentNodes, links: currentLinks };

    const preservedIds = new Set<string>();
    if (selectedNode) preservedIds.add(selectedNode.id);
    clickHistory.forEach(n => preservedIds.add(n.id));
    expandedNodeIds.forEach(id => preservedIds.add(id));
    Object.keys(exploredLinksMap).forEach(id => preservedIds.add(id));
    rootNodes.forEach(n => preservedIds.add(n.id));

    const nodeMap = new Map(currentNodes.map(n => [n.id, n]));
    const newNodesMap = new Map<string, WikiNode>();
    const newLinks: WikiLink[] = [];
    const queue: string[] = [];
    const visited = new Set<string>();

    rootNodes.forEach(root => {
      newNodesMap.set(root.id, root);
      queue.push(root.id);
      visited.add(root.id);
    });

    while (queue.length > 0) {
      const parentId = queue.shift()!;
      const parentNode = nodeMap.get(parentId);
      if (!parentNode) continue;

      const wikiChildren = exploredLinksMap[`${parentNode.lang}:${parentId}`] || exploredLinksMap[parentId] || [];
      const wikiChildrenSet = new Set(wikiChildren);

      // Find manually added children from current links
      const manualChildren: string[] = [];
      currentLinks.forEach(l => {
        const src = typeof l.source === 'string' ? l.source : l.source.id;
        const tgt = typeof l.target === 'string' ? l.target : l.target.id;
        if (src === parentId && !wikiChildrenSet.has(tgt)) {
          manualChildren.push(tgt);
        }
      });

      // Sliced wiki children based on new limit
      const slicedWiki = currentLimit <= 0 ? wikiChildren : wikiChildren.slice(0, currentLimit);
      
      // We keep:
      // 1. Sliced wiki children
      // 2. Manually added children
      // 3. Any wiki children that are preserved
      const keptChildrenSet = new Set<string>([
        ...slicedWiki,
        ...manualChildren
      ]);

      wikiChildren.forEach(childId => {
        if (preservedIds.has(childId)) {
          keptChildrenSet.add(childId);
        }
      });

      keptChildrenSet.forEach(childId => {
        let childNode = nodeMap.get(childId);
        if (!childNode) {
          childNode = {
            id: childId,
            label: childId,
            loaded: false,
            url: `https://${parentNode.lang}.wikipedia.org/wiki/${encodeURIComponent(childId.replace(/ /g, '_'))}`,
            lang: parentNode.lang,
            variant: parentNode.variant,
            depth: (parentNode.depth ?? 0) + 1,
          };
        }

        if (!newNodesMap.has(childId)) {
          newNodesMap.set(childId, childNode);
        }

        newLinks.push({
          source: parentId,
          target: childId,
        });

        if (!visited.has(childId)) {
          visited.add(childId);
          queue.push(childId);
        }
      });
    }

    return {
      nodes: Array.from(newNodesMap.values()),
      links: newLinks,
    };
  }, [exploredLinksMap, selectedNode, clickHistory, expandedNodeIds]);

  const changeLimit = useCallback((newLimit: number) => {
    setLimit(newLimit);
    setIsDirty(true);
    
    if (nodes.length === 0) return;

    const { nodes: rebuiltNodes, links: rebuiltLinks } = rebuildGraph(nodes, links, newLimit);
    setNodes(rebuiltNodes);
    setLinks(rebuiltLinks);
  }, [nodes, links, rebuildGraph]);

  // --- Autosave on exit ---
  const stateRef = useRef({ user, nodes, links, expandedNodeIds, layoutMode, layoutMode3D, viewMode, limit, isDirty, saveLoading, exploredLinksMap, clickHistory });
  useEffect(() => {
    stateRef.current = { user, nodes, links, expandedNodeIds, layoutMode, layoutMode3D, viewMode, limit, isDirty, saveLoading, exploredLinksMap, clickHistory };
  }, [user, nodes, links, expandedNodeIds, layoutMode, layoutMode3D, viewMode, limit, isDirty, saveLoading, exploredLinksMap, clickHistory]);

  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      const state = stateRef.current;
      
      if (state.user && state.nodes.length > 0) {
        if (state.saveLoading) {
          e.preventDefault();
          e.returnValue = '您的圖譜正在上傳儲存中（尚未完成），現在關閉網頁可能會遺失進度！是否確定要離開？';
          return e.returnValue;
        }

        if (state.isDirty) {
          const rootNode = state.nodes.find(n => n.isRoot) || state.nodes[0];
          if (rootNode) {
            setSaveLoading(true);
            saveGraphToFirestore({
              userId: state.user.uid,
              title: rootNode.id,
              rootTitle: rootNode.id,
              nodes: state.nodes.map(n => ({
                id: n.id,
                label: n.label,
                loaded: n.loaded,
                url: n.url,
                isRoot: n.isRoot || false,
                lang: n.lang,
                variant: n.variant,
                depth: n.depth,
                isDeadEnd: n.isDeadEnd || false,
                fx: n.fx,
                fy: n.fy,
                x: n.x,
                y: n.y,
                z: n.z
              })),
              links: state.links.map(l => {
                const src = typeof l.source === 'string' ? l.source : l.source.id;
                const tgt = typeof l.target === 'string' ? l.target : l.target.id;
                return { source: src, target: tgt };
              }),
              expandedNodeIds: Array.from(state.expandedNodeIds),
              layoutMode: state.viewMode === '3d' ? state.layoutMode3D : state.layoutMode,
              limit: state.limit,
              viewMode: state.viewMode,
              exploredLinksMap: state.exploredLinksMap,
              clickHistory: state.clickHistory.map(n => ({
                id: n.id,
                label: n.label,
                loaded: n.loaded,
                url: n.url,
                isRoot: n.isRoot || false,
                lang: n.lang,
                variant: n.variant,
                depth: n.depth,
                isDeadEnd: n.isDeadEnd || false,
              })),
            }).then(() => {
              setSaveLoading(false);
              setIsDirty(false);
            }).catch((err) => {
              console.error('Autosave on beforeunload failed:', err);
              setSaveLoading(false);
            });
          }

          e.preventDefault();
          e.returnValue = '偵測到未儲存變更，系統正在進行背景自動存檔，請確認是否關閉網頁？';
          return e.returnValue;
        }
      }
    };
    
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, []);

  const handleSaveGraph = async (title: string) => {
    if (!user) {
      await alert('請先登入帳戶！');
      return;
    }
    const rootNode = nodes.find(n => n.isRoot);
    if (!rootNode) {
      await alert('看板為空，無法儲存。');
      return;
    }
    
    setSaveLoading(true);
    try {
      await saveGraphToFirestore({
        userId: user.uid,
        title: title || rootNode.id,
        rootTitle: rootNode.id,
        nodes: nodes.map(n => ({
          id: n.id,
          label: n.label,
          loaded: n.loaded,
          url: n.url,
          isRoot: n.isRoot || false,
          lang: n.lang,
          variant: n.variant,
          depth: n.depth,
          isDeadEnd: n.isDeadEnd || false,
          fx: n.fx,
          fy: n.fy,
          x: n.x,
          y: n.y,
          z: n.z
        })),
        links: links.map(l => {
          const src = typeof l.source === 'string' ? l.source : l.source.id;
          const tgt = typeof l.target === 'string' ? l.target : l.target.id;
          return { source: src, target: tgt };
        }),
        expandedNodeIds: Array.from(expandedNodeIds),
        layoutMode: viewMode === '3d' ? layoutMode3D : layoutMode,
        limit,
        viewMode,
        exploredLinksMap,
        clickHistory: clickHistory.map(n => ({
          id: n.id,
          label: n.label,
          loaded: n.loaded,
          url: n.url,
          isRoot: n.isRoot || false,
          lang: n.lang,
          variant: n.variant,
          depth: n.depth,
          isDeadEnd: n.isDeadEnd || false,
        })),
      });
      setIsDirty(false);
    } catch (error: any) {
      console.error('Save graph failed:', error);
    } finally {
      setSaveLoading(false);
    }
  };

  const handleLoadGraph = useCallback((savedGraph: SavedGraph) => {
    const loadedNodes: WikiNode[] = savedGraph.nodes.map(n => ({
      ...n,
    }));
    
    const loadedLinks: WikiLink[] = savedGraph.links.map(l => ({
      source: l.source,
      target: l.target
    }));

    setNodes(loadedNodes);
    setLinks(loadedLinks);
    setExpandedNodeIds(new Set(savedGraph.expandedNodeIds));
    setLimit(savedGraph.limit);
    setExploredLinksMap(savedGraph.exploredLinksMap || {});

    if (savedGraph.clickHistory && savedGraph.clickHistory.length > 0) {
      const loadedHistory: WikiNode[] = savedGraph.clickHistory.map(hNode => {
        const matchingNode = loadedNodes.find(n => n.id === hNode.id);
        return matchingNode || { ...hNode };
      });
      setClickHistory(loadedHistory);
    } else {
      const rootNode = loadedNodes.find(n => n.isRoot) || loadedNodes[0];
      if (rootNode) {
        setClickHistory([rootNode]);
      }
    }

    const loadedViewMode = savedGraph.viewMode || (savedGraph.layoutMode === 'free' ? '3d' : '2d');
    setViewMode(loadedViewMode);
    if (loadedViewMode === '3d') {
      setLayoutMode3D(savedGraph.layoutMode as 'free' | 'hierarchical' | 'radial');
    } else {
      setLayoutMode(savedGraph.layoutMode as 'hierarchical' | 'radial');
    }
    
    const rootNode = loadedNodes.find(n => n.isRoot) || loadedNodes[0];
    if (rootNode) {
      setSelectedNode(rootNode);
      setDeepestActiveId(rootNode.id);
    }

    setResetZoomTrigger((prev) => prev + 1);
    setIsDirty(false);
  }, []);

  // --- Graph Operations ---
  const handleExplore = async (node: WikiNode) => {
    if (node.loaded || node.loading || node.isDeadEnd) return;

    recordNodeClick(node.label || node.id);

    setNodes((prevNodes) =>
      prevNodes.map((n) => (n.id === node.id ? { ...n, loading: true } : n))
    );
    setSelectedNode((prev) => {
      if (prev?.id === node.id) {
        return { ...prev, loading: true };
      }
      return prev;
    });

    try {
      let allTitles: string[];
      const cacheKey = `${node.lang}:${node.id}`;
      if (exploredLinksMap[cacheKey] || exploredLinksMap[node.id]) {
        allTitles = exploredLinksMap[cacheKey] || exploredLinksMap[node.id];
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
        allTitles = await fetchWikiLinks(node.id, node.lang, 0, onResolve, node.variant);
        setExploredLinksMap((prev) => ({
          ...prev,
          [cacheKey]: allTitles,
        }));
      }

      if (allTitles.length === 0) {
        setNodes((prevNodes) =>
          prevNodes.map((n) =>
            n.id === node.id ? { ...n, loaded: true, loading: false, isDeadEnd: true } : n
          )
        );
        setSelectedNode((prev) => {
          if (prev?.id === node.id) {
            return { ...prev, loaded: true, loading: false, isDeadEnd: true };
          }
          return prev;
        });
        return;
      }

      const currentLimit = limit;
      const fetchedTitles = currentLimit <= 0 ? allTitles : allTitles.slice(0, currentLimit);

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
              variant: node.variant,
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

      setIsDirty(true);
    } catch (error) {
      console.error(error);
      setNodes((prevNodes) =>
        prevNodes.map((n) => (n.id === node.id ? { ...n, loading: false } : n))
      );
      setSelectedNode((prev) => {
        if (prev?.id === node.id) {
          return { ...prev, loading: false };
        }
        return prev;
      });
    }
  };

  const handleNodeClick = useCallback((node: WikiNode) => {
    setSelectedNode(node);
    setContextMenu(null);
    setDeepestActiveId(node.id);
    addToHistory(node);
    
    recordNodeClick(node.label || node.id);

    if (isMobile) {
      setIsHistoryOpen(false);
      setIsSubArticlesOpen(false);
    }

    if (!node.loaded && !node.loading && !node.isDeadEnd) {
      handleExplore(node);
    }
  }, [isMobile, addToHistory, exploredLinksMap, limit]);

  const handleToggleNodeExpand = useCallback((nodeId: string) => {
    setExpandedNodeIds((prev) => {
      const next = new Set(prev);
      if (next.has(nodeId)) {
        next.delete(nodeId);
      } else {
        next.add(nodeId);
        const node = nodes.find((n) => n.id === nodeId);
        if (node && !node.loaded && !node.loading && !node.isDeadEnd) {
          handleExplore(node);
        }
      }
      return next;
    });
  }, [nodes, exploredLinksMap, limit]);

  const handleNodeRightClick = useCallback((node: WikiNode, e: React.MouseEvent) => {
    e.preventDefault();
    setContextMenu({
      x: e.clientX,
      y: e.clientY,
      node,
    });
  }, []);

  const handleSearch = async (input: string, searchLang: string) => {
    if (nodes.length > 0) {
      const maxDepth = Math.max(0, ...nodes.map(n => n.depth ?? 0));
      recordSessionStats(nodes.length, maxDepth);
    }

    setSearchLoading(true);
    setContextMenu(null);
    setSelectedNode(null);
    setIsSidebarOpen(false);
    setExpandedNodeIds(new Set());
    
    if (isMobile) {
      setIsHistoryOpen(false);
      setIsSubArticlesOpen(false);
    }
    
    try {
      const parsed = parseWikiInput(input, searchLang);
      let targetTitle = parsed.title;
      
      const userLang = typeof navigator !== 'undefined' ? navigator.language.toLowerCase() : '';
      const browserChineseVariant = userLang.startsWith('zh-') ? userLang : 'zh-tw';
      const variant = parsed.variant || (parsed.lang === 'zh' ? browserChineseVariant : undefined);

      if (!parsed.isUrl) {
        targetTitle = await searchWikiTitle(parsed.title, parsed.lang);
      }

      targetTitle = await resolveCanonicalTitle(targetTitle, parsed.lang, variant);

      if (!targetTitle) {
        setSearchLoading(false);
        return;
      }

      const rootNode: WikiNode = {
        id: targetTitle,
        label: targetTitle,
        loaded: false,
        url: `https://${parsed.lang}.wikipedia.org/wiki/${encodeURIComponent(targetTitle.replace(/ /g, '_'))}`,
        isRoot: true,
        lang: parsed.lang,
        variant,
        depth: 0,
      };

      setNodes([rootNode]);
      setLinks([]);
      setDeepestActiveId(targetTitle);
      setClickHistory([rootNode]);
      
      setResetZoomTrigger((prev) => prev + 1);
      setIsDirty(true);

      recordNodeClick(rootNode.label || rootNode.id);

    } catch (error) {
      console.error(error);
    } finally {
      setSearchLoading(false);
    }
  };

  const handleAddSubArticle = (title: string) => {
    if (!selectedNode) return;

    const newNode: WikiNode = {
      id: title,
      label: title,
      loaded: false,
      url: `https://${selectedNode.lang}.wikipedia.org/wiki/${encodeURIComponent(title.replace(/ /g, '_'))}`,
      lang: selectedNode.lang,
      variant: selectedNode.variant,
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

    setSelectedNode(newNode);
    setDeepestActiveId(newNode.id);
    if (isMobile) {
      setIsHistoryOpen(false);
      setIsSubArticlesOpen(false);
    }

    setIsDirty(true);

    setTimeout(() => {
      handleExplore(newNode);
    }, 150);
  };

  const handleReSearch = async (node: WikiNode) => {
    setExploredLinksMap((prev) => {
      const updated = { ...prev };
      delete updated[`${node.lang}:${node.id}`];
      delete updated[node.id];
      return updated;
    });

    setNodes((prevNodes) =>
      prevNodes.map((n) =>
        n.id === node.id ? { ...n, loaded: false, isDeadEnd: false, loading: true } : n
      )
    );
    setSelectedNode((prev) =>
      prev && prev.id === node.id ? { ...prev, loaded: false, isDeadEnd: false, loading: true } : prev
    );

    setLinks((prevLinks) =>
      prevLinks.filter((l) => {
        const src = typeof l.source === 'string' ? l.source : l.source.id;
        return src !== node.id;
      })
    );

    try {
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
      const allTitles = await fetchWikiLinks(node.id, node.lang, 0, onResolve, node.variant);
      
      setExploredLinksMap((prev) => ({
        ...prev,
        [`${node.lang}:${node.id}`]: allTitles,
      }));

      if (allTitles.length === 0) {
        setNodes((prevNodes) =>
          prevNodes.map((n) =>
            n.id === node.id ? { ...n, loaded: true, loading: false, isDeadEnd: true } : n
          )
        );
        setSelectedNode((prev) =>
          prev && prev.id === node.id ? { ...prev, loaded: true, loading: false, isDeadEnd: true } : prev
        );
        return;
      }

      const currentLimit = limit;
      const fetchedTitles = currentLimit <= 0 ? allTitles : allTitles.slice(0, currentLimit);

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
              variant: node.variant,
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

      setIsDirty(true);
    } catch (error) {
      console.error(error);
      setNodes((prevNodes) =>
        prevNodes.map((n) => (n.id === node.id ? { ...n, loading: false } : n))
      );
      setSelectedNode((prev) =>
        prev && prev.id === node.id ? { ...prev, loading: false } : prev
      );
    }
  };

  const handleSetRoot = async (node: WikiNode) => {
    setSelectedNode(null);
    setContextMenu(null);
    if (isMobile) {
      setIsHistoryOpen(false);
      setIsSubArticlesOpen(false);
    }
    setExpandedNodeIds(new Set());
    
    const nextRoot: WikiNode = {
      ...node,
      isRoot: true,
      loaded: false,
      isDeadEnd: false,
      loading: false,
      depth: 0,
    };

    setNodes([nextRoot]);
    setLinks([]);
    setSelectedNode(nextRoot);
    setDeepestActiveId(node.id);
    setClickHistory([nextRoot]);
    setResetZoomTrigger((prev) => prev + 1);

    setIsDirty(true);

    setTimeout(() => {
      handleExplore(nextRoot);
    }, 200);
  };

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

    setExpandedNodeIds((prev) => {
      const next = new Set(prev);
      next.delete(node.id);
      return next;
    });

    setIsDirty(true);
  };

  const handleClearBoard = () => {
    if (nodes.length > 0) {
      const maxDepth = Math.max(0, ...nodes.map(n => n.depth ?? 0));
      recordSessionStats(nodes.length, maxDepth);
    }

    setNodes([]);
    setLinks([]);
    setSelectedNode(null);
    setIsSidebarOpen(false);
    setContextMenu(null);
    setClickHistory([]);
    setIsDirty(false);
  };

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
  };

  const handleMarkDeadEnd = useCallback((nodeId: string) => {
    setNodes((prev) =>
      prev.map((n) => (n.id === nodeId ? { ...n, isDeadEnd: true, loaded: true, loading: false } : n))
    );
    setSelectedNode((prev) => {
      if (prev?.id === nodeId) {
        return { ...prev, isDeadEnd: true, loaded: true, loading: false };
      }
      return prev;
    });
  }, []);

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

  const handleBackgroundClick = useCallback(() => {
    setSelectedNode(null);
    setIsSidebarOpen(false);
    setContextMenu(null);
    if (isMobile) {
      setIsHistoryOpen(false);
      setIsSubArticlesOpen(false);
    }
  }, [isMobile]);

  // --- Active Pathway and Visibility Derivations ---
  const activePathSet = useMemo(() => {
    const activeSet = new Set<string>();
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
  }, [deepestActiveId, selectedNode?.id, nodes, links]);

  const currentDeepestActiveId = deepestActiveId || selectedNode?.id || (nodes.find(n => n.isRoot || n.depth === 0) || nodes[0])?.id;

  const visibleNodes = useMemo(() => {
    return nodes.filter(node => {
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
  }, [nodes, links, activePathSet, expandedNodeIds, currentDeepestActiveId]);

  const visibleLinks = useMemo(() => {
    const visibleNodesSet = new Set(visibleNodes.map(n => n.id));
    return links.filter(link => {
      const src = typeof link.source === 'string' ? link.source : link.source.id;
      const tgt = typeof link.target === 'string' ? link.target : link.target.id;
      return visibleNodesSet.has(src) && visibleNodesSet.has(tgt);
    });
  }, [links, visibleNodes]);

  const getConnectedLinksCount = useCallback((nodeId: string): number => {
    return links.filter((l) => {
      const src = typeof l.source === 'string' ? l.source : l.source.id;
      const tgt = typeof l.target === 'string' ? l.target : l.target.id;
      return src === nodeId || tgt === nodeId;
    }).length;
  }, [links]);

  return {
    // States
    nodes,
    links,
    limit,
    setLimit,
    changeLimit,
    layoutMode,
    setLayoutMode,
    viewMode,
    setViewMode,
    layoutMode3D,
    setLayoutMode3D,
    expandedNodeIds,
    setExpandedNodeIds,
    selectedNode,
    setSelectedNode,
    deepestActiveId,
    exploredLinksMap,
    clickHistory,
    isDirty,
    contextMenu,
    setContextMenu,
    
    // Panel States
    isSidebarOpen,
    setIsSidebarOpen,
    isMobile,
    isHistoryOpen,
    setIsHistoryOpen,
    isSubArticlesOpen,
    setIsSubArticlesOpen,
    toggleHistory,
    toggleSubArticles,

    // Camera Triggers
    resetZoomTrigger,
    setResetZoomTrigger,
    focusSelectedTrigger,
    setFocusSelectedTrigger,
    fitScreenTrigger,
    setFitScreenTrigger,
    focusRootTrigger,
    setFocusRootTrigger,

    // Operations Handlers
    searchLoading,
    handleSearch,
    handleExplore,
    handleNodeClick,
    handleToggleNodeExpand,
    handleAddSubArticle,
    handleReSearch,
    handleSetRoot,
    handleRemoveNode,
    handleClearBoard,
    handleLayoutModeChange,
    handleMarkDeadEnd,
    handleUpdateNodeLabel,
    handleNodeRightClick,
    handleBackgroundClick,

    // Sync Handlers & States
    saveLoading,
    handleSaveGraph,
    handleLoadGraph,

    // Derived values
    activePathSet,
    visibleNodes,
    visibleLinks,
    getConnectedLinksCount,
  };
}
