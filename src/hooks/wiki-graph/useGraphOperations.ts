import { useState, useCallback } from 'react';
import type { WikiNode, WikiLink } from '../../types/wiki';
import {
  parseWikiInput,
  searchWikiTitle,
  fetchWikiLinks,
  resolveCanonicalTitle,
} from '../../services/wikiApi';
import { recordNodeClick, recordSessionStats } from '../../services/firebase';

interface UseGraphOperationsProps {
  nodes: WikiNode[];
  setNodes: React.Dispatch<React.SetStateAction<WikiNode[]>>;
  setLinks: React.Dispatch<React.SetStateAction<WikiLink[]>>;
  limit: number;
  selectedNode: WikiNode | null;
  setSelectedNode: React.Dispatch<React.SetStateAction<WikiNode | null>>;
  setExpandedNodeIds: React.Dispatch<React.SetStateAction<Set<string>>>;
  setDeepestActiveId: React.Dispatch<React.SetStateAction<string | null>>;
  exploredLinksMap: { [nodeId: string]: string[] };
  setExploredLinksMap: React.Dispatch<React.SetStateAction<{ [nodeId: string]: string[] }>>;
  clickHistory: WikiNode[];
  setClickHistory: React.Dispatch<React.SetStateAction<WikiNode[]>>;
  setIsDirty: React.Dispatch<React.SetStateAction<boolean>>;
  setResetZoomTrigger: React.Dispatch<React.SetStateAction<number>>;
  isMobile: boolean;
  setIsSidebarOpen: React.Dispatch<React.SetStateAction<boolean>>;
  setIsHistoryOpen: React.Dispatch<React.SetStateAction<boolean>>;
  setIsSubArticlesOpen: React.Dispatch<React.SetStateAction<boolean>>;
  setContextMenu: React.Dispatch<React.SetStateAction<{ x: number; y: number; node: WikiNode } | null>>;
  addToHistory: (node: WikiNode) => void;
  setLayoutMode: React.Dispatch<React.SetStateAction<'hierarchical' | 'radial'>>;
}

export function useGraphOperations({
  nodes,
  setNodes,
  setLinks,
  limit,
  selectedNode,
  setSelectedNode,
  setExpandedNodeIds,
  setDeepestActiveId,
  exploredLinksMap,
  setExploredLinksMap,
  setClickHistory,
  setIsDirty,
  setResetZoomTrigger,
  isMobile,
  setIsSidebarOpen,
  setIsHistoryOpen,
  setIsSubArticlesOpen,
  setContextMenu,
  addToHistory,
  setLayoutMode,
}: UseGraphOperationsProps) {
  const [searchLoading, setSearchLoading] = useState<boolean>(false);

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
        allTitles = await fetchWikiLinks(node.id, node.lang, 0, onResolve, node.variant);
        setExploredLinksMap((prev) => ({
          ...prev,
          [node.id]: allTitles,
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
  }, [isMobile, addToHistory]);

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
  }, [nodes]);

  const handleNodeRightClick = useCallback((node: WikiNode, e: React.MouseEvent) => {
    e.preventDefault();
    setContextMenu({
      x: e.clientX,
      y: e.clientY,
      node,
    });
  }, [setContextMenu]);

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
        [node.id]: allTitles,
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
  }, [setNodes, setSelectedNode]);

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
  }, [setNodes, setSelectedNode]);

  return {
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
  };
}
