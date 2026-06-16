import { useCallback, useMemo } from 'react';
import type { WikiNode, WikiLink } from '../../types/wiki';

export function useActivePathway(
  nodes: WikiNode[],
  links: WikiLink[],
  selectedNode: WikiNode | null,
  expandedNodeIds: Set<string>,
  deepestActiveId: string | null
) {
  const getActivePathSet = useCallback((): Set<string> => {
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

  const activePathSet = useMemo(() => getActivePathSet(), [getActivePathSet]);

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
  return {
    activePathSet,
    visibleNodes,
    visibleLinks,
  };
}
