import React, { useEffect, useRef, useState } from 'react';
import ForceGraph3D from '3d-force-graph';
import * as THREE from 'three';
import * as d3 from 'd3';
import type { WikiNode, WikiLink } from '../types/wiki';
import { fetchWikiSummary } from '../services/wikiApi';

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
}) => {
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
    // Update graph nodes to trigger re-render of node colors/highlight
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
          extract: '無法取得此條目的預覽資料。',
        });
      }
    }, 350) as unknown as number;
  };

  // Helper to create high-definition pill text sprite for text-nodes representation
  // Helper to create plain text sprite matching the reference image layout
  const createTextSprite = (
    label: string,
    isRoot: boolean,
    isSelected: boolean,
    textColor: string
  ) => {
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    if (!context) return new THREE.Sprite();

    // High-DPI Scale factor to fix blurry text in WebGL
    const scaleMultiplier = 6;
    const baseFontSize = isRoot ? 24 : isSelected ? 20 : 13;
    const canvasFontSize = baseFontSize * scaleMultiplier;

    context.font = `bold ${canvasFontSize}px sans-serif`;
    
    // Truncate label if too long
    const formattedLabel = label.length > 15 ? `${label.slice(0, 14)}...` : label;
    const textWidth = context.measureText(formattedLabel).width;

    // Allocate canvas size based on high-DPI font size
    canvas.width = textWidth + (20 * scaleMultiplier);
    canvas.height = canvasFontSize + (20 * scaleMultiplier);

    // Redefine font after canvas resizing
    context.font = `bold ${canvasFontSize}px sans-serif`;

    // Draw dark outline for high contrast and readability on any background (scaled proportionately)
    context.strokeStyle = 'rgba(2, 2, 8, 0.85)';
    context.lineWidth = 3.5 * scaleMultiplier;
    context.lineJoin = 'round';
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    context.strokeText(formattedLabel, canvas.width / 2, canvas.height / 2);

    // Draw text label with node color matching reference image
    context.fillStyle = textColor;
    context.fillText(formattedLabel, canvas.width / 2, canvas.height / 2);

    // Create Three.js Texture & Sprite
    const texture = new THREE.CanvasTexture(canvas);
    texture.minFilter = THREE.LinearFilter;
    
    const spriteMaterial = new THREE.SpriteMaterial({
      map: texture,
      depthTest: false, // Make label always draw on top of links for absolute readability
      transparent: true,
    });
    const sprite = new THREE.Sprite(spriteMaterial);
    
    // Scale sprite down by the same multiplier to keep original 3D dimensions but sharp resolution
    const spriteScaleFactor = 0.15 / scaleMultiplier;
    sprite.scale.set(canvas.width * spriteScaleFactor, canvas.height * spriteScaleFactor, 1);

    return sprite;
  };

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
      .backgroundColor('#020208') // Premium dark background
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

  // 1c. Unlock all node coordinates when data changes to ensure they float freely in 3D Free layout
  useEffect(() => {
    nodes.forEach((node) => {
      node.fx = null;
      node.fy = null;
      node.fz = null;
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
      let sphereColor = '#1e3e62'; // Default Unloaded: dark steel blue
      let textColor = '#60a5fa';   // Bright sky blue

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
      const sprite = createTextSprite(node.label, isRoot, isSelected, textColor);
      sprite.position.set(0, 0, 0); // Centered exactly on the node as in the reference image
      group.add(sprite);

      return group;
    });


    // Adjust core physics parameters
    graph.d3Force('charge').strength(-150);
    
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

  }, [nodes, activePathSet]);

  // 4. Handle Camera Control Triggers
  
  // Camera Event: Zoom Reset
  useEffect(() => {
    if (!graphRef.current || resetZoomTrigger === 0) return;
    graphRef.current.cameraPosition(
      { x: 0, y: 0, z: 220 }, // Reset position
      { x: 0, y: 0, z: 0 },   // Reset lookAt
      1200                    // transition ms
    );
  }, [resetZoomTrigger]);

  // Camera Event: Focus Selected Node
  useEffect(() => {
    if (!graphRef.current || !selectedNode) return;
    
    const activeNode = nodes.find(n => n.id === selectedNode.id);
    if (!activeNode) return;

    const x = activeNode.x ?? 0;
    const y = activeNode.y ?? 0;
    const z = activeNode.z ?? 0;

    let tx = x;
    let ty = y;
    let tz = z + 90; // Default offset

    if (x !== 0 || y !== 0 || z !== 0) {
      const dist = Math.hypot(x, y, z);
      tx = x * (1 + 75 / dist);
      ty = y * (1 + 75 / dist);
      tz = z * (1 + 75 / dist);
    }

    graphRef.current.cameraPosition({ x: tx, y: ty, z: tz }, { x, y, z }, 1200);
  }, [selectedNode?.id, selectedNode?.loaded]);

  // Camera Event: Refocus Selected trigger
  useEffect(() => {
    if (!graphRef.current || focusSelectedTrigger === 0 || !selectedNode) return;

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
      tz = z * (1 + 75 / dist);
    }

    graphRef.current.cameraPosition({ x: tx, y: ty, z: tz }, { x, y, z }, 1200);
  }, [focusSelectedTrigger]);

  // Camera Event: Focus Root Node
  useEffect(() => {
    if (!graphRef.current || focusRootTrigger === 0) return;

    const rootNode = nodes.find(n => n.isRoot || n.depth === 0) || nodes[0];
    if (!rootNode) return;

    const x = rootNode.x ?? 0;
    const y = rootNode.y ?? 0;
    const z = rootNode.z ?? 0;

    graphRef.current.cameraPosition({ x: x, y: y, z: z + 90 }, { x, y, z }, 1200);
  }, [focusRootTrigger]);

  // Camera Event: Fit Screen
  useEffect(() => {
    if (!graphRef.current || fitScreenTrigger === 0) return;
    graphRef.current.zoomToFit(1200, 40);
  }, [fitScreenTrigger]);

  return (
    <div
      ref={containerRef}
      onMouseMove={handleMouseMove}
      className="w-full h-full relative overflow-hidden"
    >
      {/* Floating Hover Preview Card (Dark Mode styling matching WebGL background) */}
      {hoveredNode && hoverPosition && (
        <div
          className="fixed z-50 pointer-events-none w-72 bg-slate-900/90 backdrop-blur-xl border border-slate-700/50 rounded-2xl shadow-xl p-4 animate-in fade-in zoom-in-95 duration-200 text-left text-slate-100"
          style={{
            left: `${hoverPosition.x + 16}px`,
            top: `${hoverPosition.y + 16}px`,
          }}
        >
          <h3 className="font-bold text-sm text-amber-400 mb-1.5 truncate border-b border-slate-700 pb-1.5">
            {hoveredNode.id}
          </h3>
          {hoverCardData ? (
            <div className="flex gap-2.5 items-start">
              {hoverCardData.thumbnail && (
                <img
                  src={hoverCardData.thumbnail}
                  alt={hoveredNode.id}
                  className="w-16 h-16 object-cover rounded-xl border border-slate-700/55 shrink-0"
                />
              )}
              <p className="text-[11px] text-slate-300 leading-normal line-clamp-4 select-none">
                {hoverCardData.extract}
              </p>
            </div>
          ) : (
            <div className="flex items-center gap-2 py-1.5 text-[11px] text-slate-400">
              <span className="w-3.5 h-3.5 block border-2 border-amber-500 border-t-transparent rounded-full animate-spin"></span>
              <span>正在加載預覽...</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
