import { useState, useEffect, useCallback, useRef } from 'react';
import type { User } from 'firebase/auth';
import type { WikiNode, WikiLink } from '../../types/wiki';
import { saveGraphToFirestore, type SavedGraph } from '../../services/firebase';
import { useAlert } from '../useAlert';

interface UseGraphSyncProps {
  user: User | null;
  nodes: WikiNode[];
  setNodes: React.Dispatch<React.SetStateAction<WikiNode[]>>;
  links: WikiLink[];
  setLinks: React.Dispatch<React.SetStateAction<WikiLink[]>>;
  expandedNodeIds: Set<string>;
  setExpandedNodeIds: React.Dispatch<React.SetStateAction<Set<string>>>;
  limit: number;
  setLimit: React.Dispatch<React.SetStateAction<number>>;
  viewMode: '2d' | '3d';
  setViewMode: React.Dispatch<React.SetStateAction<'2d' | '3d'>>;
  layoutMode: 'hierarchical' | 'radial';
  setLayoutMode: React.Dispatch<React.SetStateAction<'hierarchical' | 'radial'>>;
  layoutMode3D: 'free' | 'hierarchical' | 'radial';
  setLayoutMode3D: React.Dispatch<React.SetStateAction<'free' | 'hierarchical' | 'radial'>>;
  setSelectedNode: React.Dispatch<React.SetStateAction<WikiNode | null>>;
  setDeepestActiveId: React.Dispatch<React.SetStateAction<string | null>>;
  isDirty: boolean;
  setIsDirty: React.Dispatch<React.SetStateAction<boolean>>;
  setResetZoomTrigger: React.Dispatch<React.SetStateAction<number>>;
  exploredLinksMap: { [nodeId: string]: string[] };
  setExploredLinksMap: React.Dispatch<React.SetStateAction<{ [nodeId: string]: string[] }>>;
  clickHistory: WikiNode[];
  setClickHistory: React.Dispatch<React.SetStateAction<WikiNode[]>>;
}

export function useGraphSync({
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
  setResetZoomTrigger,
  exploredLinksMap,
  setExploredLinksMap,
  clickHistory,
  setClickHistory,
}: UseGraphSyncProps) {
  const [saveLoading, setSaveLoading] = useState<boolean>(false);
  const { alert } = useAlert();

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
  }, [setIsDirty]);

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
  }, [setNodes, setLinks, setExpandedNodeIds, setLimit, setExploredLinksMap, setClickHistory, setViewMode, setLayoutMode3D, setLayoutMode, setSelectedNode, setDeepestActiveId, setResetZoomTrigger, setIsDirty]);

  return {
    saveLoading,
    handleSaveGraph,
    handleLoadGraph,
  };
}
