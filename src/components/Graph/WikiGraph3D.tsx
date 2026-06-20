import React, { useEffect, useRef, useState } from 'react';
import ForceGraph3D from '3d-force-graph';
import * as THREE from 'three';
import * as d3 from 'd3';
import type { WikiNode, WikiLink } from '../../types/wiki';
import { fetchWikiSummary } from '../../services/wikiApi';
import { HoverCard } from './WikiGraph/HoverCard';
import { useLanguage } from '../../hooks/useLanguage';
import { createTextSprite } from './utils/threeHelpers';
import { useGraphCamera } from './hooks/useGraphCamera';

interface WikiGraph3DProps {
  nodes: WikiNode[];
  links: WikiLink[];
  onNodeClick: (node: WikiNode) => void;
  onNodeRightClick: (node: WikiNode, e: React.MouseEvent) => void;
  onMarkDeadEnd: (nodeId: string) => void;
  selectedNode: WikiNode | null;
  resetZoomTrigger: number;
  onBackgroundClick?: () => void;
  focusSelectedTrigger: number;
  fitScreenTrigger: number;
  focusRootTrigger: number;
  expandedNodeIds: Set<string>;
  onToggleNodeExpand: (id: string) => void;
  activePathSet: Set<string>;
  theme: 'light' | 'dark';
}

export const WikiGraph3D: React.FC<WikiGraph3DProps> = ({
  nodes,
  links,
  onNodeClick,
  onNodeRightClick,
  onMarkDeadEnd,
  selectedNode,
  resetZoomTrigger,
  onBackgroundClick,
  focusSelectedTrigger,
  fitScreenTrigger,
  focusRootTrigger,
  activePathSet,
  theme,
}) => {
  const { t } = useLanguage();
  const containerRef = useRef<HTMLDivElement | null>(null);
  const graphRef = useRef<any>(null);
  const mousePositionRef = useRef({ x: 0, y: 0 });

  // States for dynamic Hover Preview Card (same as 2D)
  const [hoveredNode, setHoveredNode] = useState<WikiNode | null>(null);
  const [hoverCardData, setHoverCardData] = useState<{ extract: string; thumbnail?: string } | null>(null);
  const [hoverPosition, setHoverPosition] = useState<{ x: number; y: number } | null>(null);
  const hoverTimeoutRef = useRef<number | null>(null);

  // Cache selection state in refs for Three.js render callbacks to access instantly
  const selectedNodeIdRef = useRef<string | null>(null);
  useEffect(() => {
    selectedNodeIdRef.current = selectedNode ? selectedNode.id : null;
    // Update graph nodes to trigger re-render of colors/highlight
    if (graphRef.current) {
      graphRef.current.nodeThreeObject(graphRef.current.nodeThreeObject());
    }
  }, [selectedNode?.id]);

  // Keep track of mouse position for hover positioning
  const handleMouseMove = (e: React.MouseEvent) => {
    mousePositionRef.current = { x: e.clientX, y: e.clientY };
  };

  // Debounced node hover listener (350ms to prevent Wikipedia API spamming)
  const handleNodeHoverChange = (node: any) => {
    if (hoverTimeoutRef.current) {
      window.clearTimeout(hoverTimeoutRef.current);
      hoverTimeoutRef.current = null;
    }

    if (!node) {
      setHoveredNode(null);
      setHoverCardData(null);
      setHoverPosition(null);
      return;
    }

    const posX = mousePositionRef.current.x;
    const posY = mousePositionRef.current.y;

    hoverTimeoutRef.current = window.setTimeout(async () => {
      setHoveredNode(node);
      setHoverPosition({ x: posX, y: posY });
      setHoverCardData(null);

      try {
        const data = await fetchWikiSummary(node.id, node.lang, node.variant);
        setHoverCardData({
          extract: data.extract,
          thumbnail: data.thumbnail,
        });
        if (data.isNotFound) {
          onMarkDeadEnd(node.id);
        }
      } catch (error) {
        console.error('Failed to load hover preview in 3D:', error);
        setHoverCardData({
          extract: t.hoverFailed,
        });
      }
    }, 350) as unknown as number;
  };

  // Helper to create high-definition pill text sprite
  // createTextSprite is imported from ./utils/threeHelpers.ts

  // 1. Initialize Graph Instance
  useEffect(() => {
    if (!containerRef.current) return;

    // Initialize ForceGraph3D
    const graph = (ForceGraph3D as any)()(containerRef.current);
    graphRef.current = graph;

    // Global Visual Customizations
    graph
      .width(containerRef.current.clientWidth)
      .height(containerRef.current.clientHeight)
      .backgroundColor(theme === 'dark' ? '#0b0f19' : '#f8fafc') // Premium background matching theme
      .showNavInfo(false)         // Hide default navigation hints overlay
      // Setup Node Click & Hover
      .onNodeClick((node: any) => {
        onNodeClick(node as WikiNode);
      })
      .onNodeRightClick((node: any, event: MouseEvent) => {
        // Trigger React custom context menu
        const reactEvent = event as unknown as React.MouseEvent;
        onNodeRightClick(node as WikiNode, reactEvent);
      })
      .onNodeHover((node: any) => {
        handleNodeHoverChange(node);
      })
      .onBackgroundClick(() => {
        onBackgroundClick?.();
      });

    // Handle container resizing
    const handleResize = () => {
      if (containerRef.current && graphRef.current) {
        graphRef.current.width(containerRef.current.clientWidth);
        graphRef.current.height(containerRef.current.clientHeight);
      }
    };
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      if (graphRef.current) {
        // Stop animations & dispose WebGL resources to prevent context leaks!
        graphRef.current.pauseAnimation();
        try {
          const renderer = graphRef.current.renderer();
          if (renderer) renderer.dispose();
        } catch (e) {
          console.error('Failed to dispose renderer:', e);
        }
      }
      if (containerRef.current) {
        containerRef.current.innerHTML = '';
      }
    };
  }, []);

  // 1a. Listen to theme changes and update the 3D scene background color and element rendering dynamically
  useEffect(() => {
    if (graphRef.current) {
      graphRef.current.backgroundColor(theme === 'dark' ? '#0b0f19' : '#f8fafc');
      graphRef.current.nodeThreeObject(graphRef.current.nodeThreeObject());
      graphRef.current.linkColor(() => theme === 'dark' ? '#ffffff' : '#000000');
    }
  }, [theme]);

  // 2. Synchronize Data (Nodes & Links)
  useEffect(() => {
    if (!graphRef.current) return;

    // Convert link source/target to matching format for 3d-force-graph
    const cleanLinks = links.map((l) => ({
      source: typeof l.source === 'string' ? l.source : l.source.id,
      target: typeof l.target === 'string' ? l.target : l.target.id,
    }));

    // Pass data to graph
    graphRef.current.graphData({
      nodes: nodes,
      links: cleanLinks,
    });
  }, [nodes, links]);

  // 1b. Shift + Left-click drag to PAN canvas behavior
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Shift' && graphRef.current) {
        // Disable node dragging so OrbitControls gets mouse drag events
        graphRef.current.enableNodeDrag(false);
        const controls = graphRef.current.controls();
        if (controls) {
          // Bind Left Mouse click to PAN action
          controls.mouseButtons.LEFT = THREE.MOUSE.PAN;
        }
        if (containerRef.current) {
          containerRef.current.style.cursor = 'move';
        }
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.key === 'Shift' && graphRef.current) {
        // Re-enable node dragging
        graphRef.current.enableNodeDrag(true);
        const controls = graphRef.current.controls();
        if (controls) {
          // Reset Left Mouse click to ROTATE action
          controls.mouseButtons.LEFT = THREE.MOUSE.ROTATE;
        }
        if (containerRef.current) {
          containerRef.current.style.cursor = 'default';
        }
      }
    };

    const handleBlur = () => {
      // Safety reset on window blur
      if (graphRef.current) {
        graphRef.current.enableNodeDrag(true);
        const controls = graphRef.current.controls();
        if (controls) {
          controls.mouseButtons.LEFT = THREE.MOUSE.ROTATE;
        }
        if (containerRef.current) {
          containerRef.current.style.cursor = 'default';
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    window.addEventListener('blur', handleBlur);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('blur', handleBlur);
    };
  }, []);

  // 1c. Unlock all node coordinates and initialize Z-axis values if missing/flat to expand into 3D space
  useEffect(() => {
    nodes.forEach((node) => {
      node.fx = null;
      node.fy = null;
      node.fz = null;
      // Break 1D/2D symmetry by ensuring all axes have some randomness
      if (node.z === undefined || node.z === 0) {
        // When transitioning from 2D (or adding new nodes), completely randomize coordinates 
        // to prevent a flat, stretched layout. 2D layouts often have large x/y values that 
        // cause the 3D graph to be too flat and far apart.
        node.x = (Math.random() - 0.5) * 100;
        node.y = (Math.random() - 0.5) * 100;
        node.z = (Math.random() - 0.5) * 100;
      }
    });
    if (graphRef.current) {
      graphRef.current.d3ReheatSimulation();
    }
  }, [nodes]);

  // 1d. Lock OrbitControls rotation target pivot to the selected node on left click, or to graph centroid when no selection
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleMouseDown = (e: MouseEvent) => {
      // Trigger on Left Mouse Click, and Shift key must NOT be pressed (Shift + Left is PAN)
      if (e.button === 0 && !e.shiftKey && graphRef.current) {
        const controls = graphRef.current.controls();
        if (controls) {
          if (selectedNodeIdRef.current) {
            const selNode = nodes.find(n => n.id === selectedNodeIdRef.current);
            if (selNode && selNode.x !== undefined && selNode.y !== undefined && selNode.z !== undefined) {
              controls.target.set(selNode.x, selNode.y, selNode.z);
            }
          } else {
            // Calculate center of all nodes (centroid)
            const validNodes = nodes.filter(n => n.x !== undefined && n.y !== undefined && n.z !== undefined);
            if (validNodes.length > 0) {
              const sumX = validNodes.reduce((sum, n) => sum + (n.x ?? 0), 0);
              const sumY = validNodes.reduce((sum, n) => sum + (n.y ?? 0), 0);
              const sumZ = validNodes.reduce((sum, n) => sum + (n.z ?? 0), 0);
              const count = validNodes.length;
              controls.target.set(sumX / count, sumY / count, sumZ / count);
            } else {
              controls.target.set(0, 0, 0);
            }
          }
        }
      }
    };

    container.addEventListener('mousedown', handleMouseDown);
    return () => {
      container.removeEventListener('mousedown', handleMouseDown);
    };
  }, [nodes]);

  // 2. Synchronize Data (Nodes & Links)
  useEffect(() => {
    if (!graphRef.current) return;

    // Convert link source/target to matching format for 3d-force-graph
    const cleanLinks = links.map((l) => ({
      source: typeof l.source === 'string' ? l.source : l.source.id,
      target: typeof l.target === 'string' ? l.target : l.target.id,
    }));

    // Pass data to graph
    graphRef.current.graphData({
      nodes: nodes,
      links: cleanLinks,
    });
  }, [nodes, links]);

  // 3. Apply Visual Styles (Nodes, Links, Particles)
  useEffect(() => {
    if (!graphRef.current) return;
    const graph = graphRef.current;

    // Node Render Customization: Colored Matte Spheres + Centered Text Sprites (Matching Reference Image Style)
    graph.nodeThreeObject((node: any) => {
      const isSelected = selectedNodeIdRef.current === node.id;
      const isRoot = node.isRoot;
      const isDeadEnd = node.isDeadEnd;
      const isLoaded = node.loaded;
      const isLoading = node.loading;

      // Determine state colors matching the reference image's color styling
      // The spheres are dark, desaturated versions, and the text labels are bright, saturated versions of the same color.
      let sphereColor = '';
      let textColor = '';

      if (theme === 'dark') {
        sphereColor = '#1e3e62'; // Default Unloaded: dark steel blue
        textColor = '#60a5fa';   // Bright sky blue

        if (isLoading) {
          sphereColor = '#134e5e';   // Muted dark teal
          textColor = '#22d3ee';     // Bright teal
        } else if (isRoot) {
          sphereColor = '#806010';   // Muted dark gold
          textColor = '#ffd83b';     // Bright gold
        } else if (isDeadEnd) {
          sphereColor = '#7a2222';   // Muted dark red
          textColor = '#ff5c5c';     // Bright red
        } else if (isLoaded) {
          sphereColor = '#8c5858';   // Muted dark rose/pink (Les Miserables cluster style)
          textColor = '#fda4af';     // Bright rose/pink
        }
      } else {
        // Light mode colors
        sphereColor = '#dbeafe';   // Light blue
        textColor = '#1e40af';     // Dark blue

        if (isLoading) {
          sphereColor = '#ccfbf1';   // Light teal
          textColor = '#0f766e';     // Dark teal
        } else if (isRoot) {
          sphereColor = '#fef3c7';   // Light amber
          textColor = '#b45309';     // Dark amber
        } else if (isDeadEnd) {
          sphereColor = '#fee2e2';   // Light red
          textColor = '#be123c';     // Dark red
        } else if (isLoaded) {
          sphereColor = '#fce7f3';   // Light pink
          textColor = '#be185d';     // Dark pink
        }
      }

      const group = new THREE.Group();

      // A. Sphere Mesh with smooth shading and matte material properties
      const radius = isRoot ? 7.5 : isSelected ? 6.5 : 5.0;
      const sphereGeom = new THREE.SphereGeometry(radius, 32, 32);
      const sphereMat = new THREE.MeshStandardMaterial({
        color: sphereColor,
        roughness: 0.7, // Matte texture matching reference image
        metalness: 0.1,  // Low metalness
        flatShading: false // Smooth rendering
      });
      const sphere = new THREE.Mesh(sphereGeom, sphereMat);
      group.add(sphere);

      // B. Wireframe selection indicator shell if node is selected
      if (isSelected) {
        const ringGeom = new THREE.SphereGeometry(radius + 2, 8, 8);
        const ringMat = new THREE.MeshBasicMaterial({
          color: textColor, // Matching bright state color
          wireframe: true,
          transparent: true,
          opacity: 0.35
        });
        const ring = new THREE.Mesh(ringGeom, ringMat);
        group.add(ring);
      }

      // C. Floating plain text label sprite (positioned directly on the sphere)
      const haloColor = theme === 'dark' ? 'rgba(2, 2, 8, 0.85)' : 'rgba(248, 250, 252, 0.95)';
      const sprite = createTextSprite(node.label, isRoot, isSelected, textColor, haloColor);
      sprite.position.set(0, 0, 0); // Centered exactly on the node as in the reference image
      group.add(sprite);

      return group;
    });

    // Adjust core physics parameters to encourage organic 3D folding rather than a taught straight chain
    graph.d3Force('link').distance(40); // slightly closer
    graph.d3Force('charge').strength(-120).distanceMax(300); // reduced repulsion to keep it compact
    
    // Add collision force to prevent text nodes overlapping
    graph.d3Force('collide', d3.forceCollide((node: any) => {
      const len = node.label ? node.label.length : 10;
      return len * 1.8 + 14;
    }));
    
    // Release physics locks on tick to allow free float layout
    graph.onEngineTick(() => {
      nodes.forEach((node) => {
        node.fx = null;
        node.fy = null;
        node.fz = null;
      });
    });

  }, [nodes, activePathSet, theme]);

  // 4. Handle Camera Control Triggers
  useGraphCamera({
    graphRef,
    nodes,
    selectedNode,
    resetZoomTrigger,
    focusSelectedTrigger,
    focusRootTrigger,
    fitScreenTrigger,
  });

  return (
    <div
      ref={containerRef}
      onMouseMove={handleMouseMove}
      className="w-full h-full relative overflow-hidden"
    >
      <HoverCard
        hoveredNode={hoveredNode}
        hoverPosition={hoverPosition}
        hoverCardData={hoverCardData}
        darkMode={theme === 'dark'}
      />
    </div>
  );
};
