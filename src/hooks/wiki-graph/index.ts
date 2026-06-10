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
    addToHistory,
    isDirty,
    setIsDirty,
    setResetZoomTrigger: cameraTriggers.setResetZoomTrigger,
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

  return {
    // States
    nodes,
    links,
    limit,
    setLimit,
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
    getActivePathList: activePathway.getActivePathList,
    getConnectedLinksCount,
  };
}
