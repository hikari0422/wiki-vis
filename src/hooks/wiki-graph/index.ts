import { useState, useCallback } from 'react';
import type { User } from 'firebase/auth';
import type { WikiNode, WikiLink } from '../../types/wiki';
import { usePanelState } from './usePanelState';
import { useCameraTriggers } from './useCameraTriggers';
import { useActivePathway } from './useActivePathway';
import { useGraphSync } from './useGraphSync';
import { useGraphOperations } from './useGraphOperations';

export function useWikiGraph(user: User | null) {
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

  // Invoke modular sub-hooks
  const panelState = usePanelState();
  const cameraTriggers = useCameraTriggers();
  const activePathway = useActivePathway(nodes, links, selectedNode, expandedNodeIds, deepestActiveId);

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

  const sync = useGraphSync({
    user,
    nodes,
    setNodes,
    links,
    setLinks,
    expandedNodeIds,
    setExpandedNodeIds,
    limit,
    setLimit,
    viewMode,
    setViewMode,
    layoutMode,
    setLayoutMode,
    layoutMode3D,
    setLayoutMode3D,
    setSelectedNode,
    setDeepestActiveId,
    isDirty,
    setIsDirty,
    setResetZoomTrigger: cameraTriggers.setResetZoomTrigger,
    exploredLinksMap,
    setExploredLinksMap,
    clickHistory,
    setClickHistory,
  });

  const operations = useGraphOperations({
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
    clickHistory,
    setClickHistory,
    setIsDirty,
    setResetZoomTrigger: cameraTriggers.setResetZoomTrigger,
    isMobile: panelState.isMobile,
    setIsSidebarOpen: panelState.setIsSidebarOpen,
    setIsHistoryOpen: panelState.setIsHistoryOpen,
    setIsSubArticlesOpen: panelState.setIsSubArticlesOpen,
    setContextMenu,
    addToHistory,
    setLayoutMode,
  });

  const getConnectedLinksCount = useCallback((nodeId: string): number => {
    return links.filter((l) => {
      const src = typeof l.source === 'string' ? l.source : l.source.id;
      const tgt = typeof l.target === 'string' ? l.target : l.target.id;
      return src === nodeId || tgt === nodeId;
    }).length;
  }, [links]);

  const handleBackgroundClick = useCallback(() => {
    setSelectedNode(null);
    setDeepestActiveId(null);
    panelState.setIsSidebarOpen(false);
    setContextMenu(null);
    if (panelState.isMobile) {
      panelState.setIsHistoryOpen(false);
      panelState.setIsSubArticlesOpen(false);
    }
  }, [panelState]);

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

      const wikiChildren = exploredLinksMap[parentId] || [];
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
    isSidebarOpen: panelState.isSidebarOpen,
    setIsSidebarOpen: panelState.setIsSidebarOpen,
    isMobile: panelState.isMobile,
    isHistoryOpen: panelState.isHistoryOpen,
    setIsHistoryOpen: panelState.setIsHistoryOpen,
    isSubArticlesOpen: panelState.isSubArticlesOpen,
    setIsSubArticlesOpen: panelState.setIsSubArticlesOpen,
    toggleHistory: panelState.toggleHistory,
    toggleSubArticles: panelState.toggleSubArticles,

    // Camera Triggers
    resetZoomTrigger: cameraTriggers.resetZoomTrigger,
    setResetZoomTrigger: cameraTriggers.setResetZoomTrigger,
    focusSelectedTrigger: cameraTriggers.focusSelectedTrigger,
    setFocusSelectedTrigger: cameraTriggers.setFocusSelectedTrigger,
    fitScreenTrigger: cameraTriggers.fitScreenTrigger,
    setFitScreenTrigger: cameraTriggers.setFitScreenTrigger,
    focusRootTrigger: cameraTriggers.focusRootTrigger,
    setFocusRootTrigger: cameraTriggers.setFocusRootTrigger,

    // Operations Handlers
    searchLoading: operations.searchLoading,
    handleSearch: operations.handleSearch,
    handleExplore: operations.handleExplore,
    handleNodeClick: operations.handleNodeClick,
    handleToggleNodeExpand: operations.handleToggleNodeExpand,
    handleAddSubArticle: operations.handleAddSubArticle,
    handleReSearch: operations.handleReSearch,
    handleSetRoot: operations.handleSetRoot,
    handleRemoveNode: operations.handleRemoveNode,
    handleClearBoard: operations.handleClearBoard,
    handleLayoutModeChange: operations.handleLayoutModeChange,
    handleMarkDeadEnd: operations.handleMarkDeadEnd,
    handleUpdateNodeLabel: operations.handleUpdateNodeLabel,
    handleNodeRightClick: operations.handleNodeRightClick,
    handleBackgroundClick,

    // Sync Handlers & States
    saveLoading: sync.saveLoading,
    handleSaveGraph: sync.handleSaveGraph,
    handleLoadGraph: sync.handleLoadGraph,

    // Derived values
    activePathSet: activePathway.activePathSet,
    visibleNodes: activePathway.visibleNodes,
    visibleLinks: activePathway.visibleLinks,
    getConnectedLinksCount,
  };
}
