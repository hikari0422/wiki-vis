import { useEffect } from 'react';
import type { WikiNode } from '../../../types/wiki';

interface UseGraphCameraProps {
  graphRef: React.MutableRefObject<any>;
  nodes: WikiNode[];
  selectedNode: WikiNode | null;
  resetZoomTrigger: number;
  focusSelectedTrigger: number;
  focusRootTrigger: number;
  fitScreenTrigger: number;
}

export const useGraphCamera = ({
  graphRef,
  nodes,
  selectedNode,
  resetZoomTrigger,
  focusSelectedTrigger,
  focusRootTrigger,
  fitScreenTrigger,
}: UseGraphCameraProps) => {
  // Zoom Reset
  useEffect(() => {
    if (!graphRef.current || resetZoomTrigger === 0) return;
    graphRef.current.cameraPosition(
      { x: 0, y: -70, z: 200 },
      { x: 0, y: 0, z: 0 },
      1200
    );
  }, [resetZoomTrigger, graphRef]);

  // Focus Selected Node
  useEffect(() => {
    if (!graphRef.current || !selectedNode) return;
    
    const activeNode = nodes.find(n => n.id === selectedNode.id);
    if (!activeNode) return;

    const x = activeNode.x ?? 0;
    const y = activeNode.y ?? 0;
    const z = activeNode.z ?? 0;

    let tx = x;
    let ty = y;
    let tz = z + 90;

    if (x !== 0 || y !== 0 || z !== 0) {
      const dist = Math.hypot(x, y, z);
      tx = x * (1 + 75 / dist);
      ty = y * (1 + 75 / dist);
      tz = z * (1 + 75 / dist) + 35;
    }

    graphRef.current.cameraPosition({ x: tx, y: ty, z: tz }, { x, y, z }, 1200);
  }, [selectedNode?.id, selectedNode?.loaded, focusSelectedTrigger, graphRef, nodes]);

  // Focus Root Node
  useEffect(() => {
    if (!graphRef.current || focusRootTrigger === 0) return;

    const rootNode = nodes.find(n => n.isRoot || n.depth === 0) || nodes[0];
    if (!rootNode) return;

    const x = rootNode.x ?? 0;
    const y = rootNode.y ?? 0;
    const z = rootNode.z ?? 0;

    graphRef.current.cameraPosition({ x: x, y: y - 45, z: z + 75 }, { x, y, z }, 1200);
  }, [focusRootTrigger, graphRef, nodes]);

  // Fit Screen
  useEffect(() => {
    if (!graphRef.current || fitScreenTrigger === 0) return;
    graphRef.current.zoomToFit(1200, 40);
  }, [fitScreenTrigger, graphRef]);
};
