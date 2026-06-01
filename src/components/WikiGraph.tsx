import React, { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import type { WikiNode, WikiLink } from '../types/wiki';
import { fetchWikiSummary } from '../services/wikiApi';

interface WikiGraphProps {
  nodes: WikiNode[];
  links: WikiLink[];
  layoutMode: 'hierarchical' | 'radial' | 'tree';
  onNodeClick: (node: WikiNode) => void;
  onNodeRightClick: (node: WikiNode, e: React.MouseEvent) => void;
  onMarkDeadEnd: (nodeId: string) => void; // Flag non-existent nodes
  selectedNode: WikiNode | null;
  resetZoomTrigger: number;
  onBackgroundClick?: () => void;
  focusSelectedTrigger: number;
  fitScreenTrigger: number;
  focusRootTrigger: number;
  expandedNodeIds: Set<string>;
  onToggleNodeExpand: (id: string) => void;
}

export const WikiGraph: React.FC<WikiGraphProps> = ({
  nodes,
  links,
  layoutMode,
  onNodeClick,
  onNodeRightClick,
  onMarkDeadEnd,
  selectedNode,
  resetZoomTrigger,
  onBackgroundClick,
  focusSelectedTrigger,
  fitScreenTrigger,
  focusRootTrigger,
  expandedNodeIds,
  onToggleNodeExpand,
}) => {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const gRef = useRef<SVGGElement | null>(null);
  const simulationRef = useRef<d3.Simulation<WikiNode, WikiLink> | null>(null);
  const zoomBehaviorRef = useRef<d3.ZoomBehavior<SVGSVGElement, unknown> | null>(null);

  // States for dynamic Hover Preview Card
  const [hoveredNode, setHoveredNode] = useState<WikiNode | null>(null);
  const [hoverCardData, setHoverCardData] = useState<{ extract: string; thumbnail?: string } | null>(null);
  const [hoverPosition, setHoverPosition] = useState<{ x: number; y: number } | null>(null);
  const hoverTimeoutRef = useRef<number | null>(null);

  // State for tracking the currently hovered node instantly
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);

  // Debounced node hover listener (350ms to prevent Wikipedia API spamming)
  const handleNodeMouseEnter = (node: WikiNode, e: React.MouseEvent) => {
    if (hoverTimeoutRef.current) {
      window.clearTimeout(hoverTimeoutRef.current);
    }
    
    const posX = e.clientX;
    const posY = e.clientY;

    hoverTimeoutRef.current = window.setTimeout(async () => {
      setHoveredNode(node);
      setHoverPosition({ x: posX, y: posY });
      setHoverCardData(null);

      try {
        const data = await fetchWikiSummary(node.id, node.lang);
        setHoverCardData({
          extract: data.extract,
          thumbnail: data.thumbnail,
        });
        if (data.isNotFound) {
          onMarkDeadEnd(node.id);
        }
      } catch (error) {
        console.error('Failed to load hover preview:', error);
        setHoverCardData({
          extract: '無法取得此條目的預覽資料。',
        });
      }
    }, 350) as unknown as number;
  };

  const handleNodeMouseLeave = () => {
    if (hoverTimeoutRef.current) {
      window.clearTimeout(hoverTimeoutRef.current);
      hoverTimeoutRef.current = null;
    }
    setHoveredNode(null);
    setHoverCardData(null);
    setHoverPosition(null);
  };

  // 1. Initial SVG Setup and Zoom Configuration
  useEffect(() => {
    if (!svgRef.current || !containerRef.current) return;
    
    const svg = d3.select<SVGSVGElement, unknown>(svgRef.current);
    const container = containerRef.current;

    svg.attr('width', '100%').attr('height', '100%');

    // Define Zoom behavior
    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.1, 4]) // Zoom bounds
      .on('zoom', (event) => {
        d3.select(gRef.current).attr('transform', event.transform);
      });

    svg.call(zoom);
    zoomBehaviorRef.current = zoom;

    // Handle window resizing and initial camera centering
    let isInitialized = false;
    const resizeObserver = new ResizeObserver(() => {
      const w = container.clientWidth;
      const h = container.clientHeight;
      
      if (w > 0 && h > 0) {
        // Initialize camera at the viewport center only once
        if (!isInitialized) {
          svg.call(zoom.transform, d3.zoomIdentity.translate(w / 2, h / 2).scale(0.8));
          isInitialized = true;
        }
        
        // Trigger a light refresh to settle simulation
        if (simulationRef.current) {
          simulationRef.current.alpha(0.2).restart();
        }
      }
    });

    resizeObserver.observe(container);

    return () => {
      resizeObserver.disconnect();
    };
  }, []);

  // 2. Zoom Reset Trigger
  useEffect(() => {
    if (!svgRef.current || !containerRef.current || !zoomBehaviorRef.current || resetZoomTrigger === 0) return;

    const svg = d3.select<SVGSVGElement, unknown>(svgRef.current);
    const container = containerRef.current;
    const zoom = zoomBehaviorRef.current;

    const width = container.clientWidth;
    const height = container.clientHeight;

    // Transition smoothly back to center and initial scale
    svg.transition()
      .duration(750)
      .ease(d3.easeCubicOut)
      .call(zoom.transform, d3.zoomIdentity.translate(width / 2, height / 2).scale(0.8));
  }, [resetZoomTrigger]);

  // 2b. Zoom and Focus on Selected Node after exploration or selection
  useEffect(() => {
    if (!selectedNode || !selectedNode.loaded || selectedNode.loading) return;
    if (!svgRef.current || !containerRef.current || !zoomBehaviorRef.current) return;

    // Find the latest simulated coordinates from the active nodes array
    const activeNode = nodes.find(n => n.id === selectedNode.id);
    if (!activeNode || activeNode.x === undefined || activeNode.y === undefined) return;

    const svg = d3.select<SVGSVGElement, unknown>(svgRef.current);
    const container = containerRef.current;
    const zoom = zoomBehaviorRef.current;

    const width = container.clientWidth;
    const height = container.clientHeight;

    const targetScale = 1.15; // Slightly zoomed in for detail focus

    svg.transition()
      .duration(800)
      .ease(d3.easeCubicInOut)
      .call(
        zoom.transform,
        d3.zoomIdentity
          .translate(width / 2 - activeNode.x * targetScale, height / 2 - activeNode.y * targetScale)
          .scale(targetScale)
      );
  }, [selectedNode?.id, selectedNode?.loaded]);

  // 2c. Camera Control Action: Focus on Selected Node
  useEffect(() => {
    if (focusSelectedTrigger === 0 || !selectedNode) return;
    if (!svgRef.current || !containerRef.current || !zoomBehaviorRef.current) return;

    const activeNode = nodes.find(n => n.id === selectedNode.id);
    if (!activeNode || activeNode.x === undefined || activeNode.y === undefined) return;

    const svg = d3.select<SVGSVGElement, unknown>(svgRef.current);
    const container = containerRef.current;
    const zoom = zoomBehaviorRef.current;

    const w = container.clientWidth;
    const h = container.clientHeight;
    const targetScale = 1.25; // Slightly zoomed in for detail focus

    svg.transition()
      .duration(750)
      .ease(d3.easeCubicInOut)
      .call(
        zoom.transform,
        d3.zoomIdentity
          .translate(w / 2 - activeNode.x * targetScale, h / 2 - activeNode.y * targetScale)
          .scale(targetScale)
      );
  }, [focusSelectedTrigger]);

  // 2d. Camera Control Action: Focus on Root Node
  useEffect(() => {
    if (focusRootTrigger === 0) return;
    if (!svgRef.current || !containerRef.current || !zoomBehaviorRef.current) return;

    const rootNode = nodes.find(n => n.isRoot || n.depth === 0) || nodes[0];
    if (!rootNode || rootNode.x === undefined || rootNode.y === undefined) return;

    const svg = d3.select<SVGSVGElement, unknown>(svgRef.current);
    const container = containerRef.current;
    const zoom = zoomBehaviorRef.current;

    const w = container.clientWidth;
    const h = container.clientHeight;
    const targetScale = 1.0; // Standard root focus scale

    svg.transition()
      .duration(750)
      .ease(d3.easeCubicInOut)
      .call(
        zoom.transform,
        d3.zoomIdentity
          .translate(w / 2 - rootNode.x * targetScale, h / 2 - rootNode.y * targetScale)
          .scale(targetScale)
      );
  }, [focusRootTrigger]);

  // 2e. Camera Control Action: Fit Whole Tree in Viewport
  useEffect(() => {
    if (fitScreenTrigger === 0 || nodes.length === 0) return;
    if (!svgRef.current || !containerRef.current || !zoomBehaviorRef.current) return;

    const svg = d3.select<SVGSVGElement, unknown>(svgRef.current);
    const container = containerRef.current;
    const zoom = zoomBehaviorRef.current;

    const w = container.clientWidth;
    const h = container.clientHeight;

    // Calculate bounding box of all nodes
    let xMin = Infinity, xMax = -Infinity;
    let yMin = Infinity, yMax = -Infinity;

    nodes.forEach(n => {
      const rx = getNodeRadiusX(n);
      const ryVal = getNodeRadiusY(n);
      if (n.x !== undefined && n.y !== undefined) {
        xMin = Math.min(xMin, n.x - rx);
        xMax = Math.max(xMax, n.x + rx);
        yMin = Math.min(yMin, n.y - ryVal);
        yMax = Math.max(yMax, n.y + ryVal);
      }
    });

    if (xMin === Infinity) return;

    const graphW = xMax - xMin;
    const graphH = yMax - yMin;
    const graphCX = (xMin + xMax) / 2;
    const graphCY = (yMin + yMax) / 2;

    const padding = 80;
    const scaleX = w / (graphW + padding);
    const scaleY = h / (graphH + padding);
    const targetScale = Math.max(0.15, Math.min(1.5, Math.min(scaleX, scaleY) * 0.95));

    svg.transition()
      .duration(850)
      .ease(d3.easeCubicInOut)
      .call(
        zoom.transform,
        d3.zoomIdentity
          .translate(w / 2 - graphCX * targetScale, h / 2 - graphCY * targetScale)
          .scale(targetScale)
      );
  }, [fitScreenTrigger]);

  // 3. D3 Physics Simulation Engine & DOM Sync
  useEffect(() => {
    const svg = svgRef.current;
    const container = containerRef.current;
    if (!svg || !container || nodes.length === 0) return;

    // Stop previous simulation if active
    if (simulationRef.current) {
      simulationRef.current.stop();
    }

    // Map links back to string IDs so D3's forceLink can cleanly re-bind them to the new node objects
    const cleanLinks = links.map((l) => ({
      ...l,
      source: typeof l.source === 'string' ? l.source : l.source.id,
      target: typeof l.target === 'string' ? l.target : l.target.id,
    }));

    // Unfreeze all nodes to allow the simulation to settle them cleanly without overlaps!
    nodes.forEach((node) => {
      node.fx = null;
      node.fy = null;
    });

    // Set up or update Simulation
    // Hierarchical top-down spacing forces (spreads left & right in distinct vertical rows)
    const simulation = d3.forceSimulation<WikiNode, WikiLink>(nodes)
      .force('link', d3.forceLink<WikiNode, WikiLink>(cleanLinks)
        .id((d) => d.id)
        .distance(layoutMode === 'hierarchical' ? 110 : 130)
        .strength(0.7)
      )
      .force('charge', d3.forceManyBody().strength(layoutMode === 'hierarchical' ? -400 : -250).distanceMax(500))
      .force('collide', d3.forceCollide<WikiNode>().radius((d) => getNodeRadiusX(d) + 16).iterations(2)); // Keep nodes separated

    if (layoutMode === 'hierarchical') {
      simulation
        .force('y', d3.forceY<WikiNode>().y((d) => (d.depth ?? 0) * 160).strength(0.95)) // Strictly align in vertical rows
        .force('x', d3.forceX<WikiNode>().x(0).strength(0.06)); // Center horizontally
    } else {
      // Concentric radial circles based on depth
      simulation
        .force('radial', d3.forceRadial<WikiNode>((d) => (d.depth ?? 0) * 220, 0, 0).strength(0.85))
        .force('center', d3.forceCenter(0, 0).strength(0.05));
    }

    simulationRef.current = simulation;

    // Explicitly bind the active data arrays to the DOM selections
    const linkElements = d3.select(svg)
      .selectAll<SVGPathElement, WikiLink>('.graph-link')
      .data(cleanLinks);

    const nodeElements = d3.select(svg)
      .selectAll<SVGGElement, WikiNode>('.graph-node')
      .data(nodes);

    // On tick, update DOM attributes directly (buttery smooth 60fps)
    simulation.on('tick', () => {
      if (layoutMode === 'hierarchical') {
        // Group active whiteboard nodes by their depth level
        const nodesByDepth: { [key: number]: WikiNode[] } = {};
        nodes.forEach((d) => {
          const depth = d.depth ?? 0;
          if (!nodesByDepth[depth]) nodesByDepth[depth] = [];
          nodesByDepth[depth].push(d);
        });

        // Rigid fixed horizontal spacing between nodes in the same row
        const horizontalSpacing = 190;

        // Enforce absolute vertical tracks and equal horizontal intervals
        Object.keys(nodesByDepth).forEach((depthKey) => {
          const depth = parseInt(depthKey);
          const tierNodes = nodesByDepth[depth];

          // Sort nodes by their current X coordinate to maintain sliding dragging order smoothly
          tierNodes.sort((a, b) => (a.x ?? 0) - (b.x ?? 0));

          const N = tierNodes.length;
          tierNodes.forEach((node, index) => {
            // Lock node strictly on its generational horizontal row
            node.y = depth * 160;

            // Align horizontal nodes side-by-side with locked, equal spacing
            if (node.fx === null || node.fx === undefined) {
              const targetX = (index - (N - 1) / 2) * horizontalSpacing;
              // Smoothly interpolate towards the target X to avoid sudden snaps
              node.x = (node.x ?? 0) + (targetX - (node.x ?? 0)) * 0.15;
            }
          });
        });
      }

      linkElements.attr('d', (d) => {
        const source = d.source as unknown as WikiNode;
        const target = d.target as unknown as WikiNode;
        
        // Safety checks to ensure source and target are fully resolved objects
        if (!source || !target || typeof source === 'string' || typeof target === 'string') {
          return '';
        }
        
        const px = source.x ?? 0;
        const py = source.y ?? 0;
        const cx = target.x ?? 0;
        const cy = target.y ?? 0;

        const sourceRx = getNodeRadiusX(source);
        const sourceRy = getNodeRadiusY(source);
        const targetRx = getNodeRadiusX(target);
        const targetRy = getNodeRadiusY(target);
        
        if (layoutMode === 'hierarchical') {
          const midY = (py + cy) / 2;
          const arrowCompensation = 7; // Shorten line by 7px so arrow is fully visible
          const targetYOffset = cy > midY ? -(targetRy + arrowCompensation) : (targetRy + arrowCompensation);
          return `M ${px} ${py} L ${px} ${midY} L ${cx} ${midY} L ${cx} ${cy + targetYOffset}`;
        } else {
          const dx = px - cx;
          const dy = py - cy;
          const dist = Math.hypot(dx, dy);
          if (dist === 0) {
            return `M ${px} ${py} L ${cx} ${cy}`;
          }
          // Ellipse intersection factor t
          const t = 1 / Math.sqrt((dx * dx) / (targetRx * targetRx) + (dy * dy) / (targetRy * targetRy));
          
          // Source ellipse intersection factor tSource
          const tSource = 1 / Math.sqrt((dx * dx) / (sourceRx * sourceRx) + (dy * dy) / (sourceRy * sourceRy));
          
          // Apply line shortening compensation at both ends so the arrow marker is visible and does not overlap
          const arrowCompensation = 7; // Shift end point 7px back towards source
          const startCompensation = 2; // Shift start point 2px forward towards target
          
          const tOffset = arrowCompensation / dist;
          const tSourceOffset = startCompensation / dist;
          
          const startX = px - Math.max(0, tSource - tSourceOffset) * dx;
          const startY = py - Math.max(0, tSource - tSourceOffset) * dy;
          const endX = cx + (t + tOffset) * dx;
          const endY = cy + (t + tOffset) * dy;
          
          return `M ${startX} ${startY} L ${endX} ${endY}`;
        }
      });

      nodeElements.attr('transform', (d) => `translate(${d.x ?? 0}, ${d.y ?? 0})`);

      // Freeze node positions once the layout settles to prevent subsequent rearrangement
      if (simulation.alpha() < 0.03) {
        nodes.forEach((node) => {
          if (node.x !== undefined && node.y !== undefined) {
            node.fx = node.x;
            node.fy = node.y;
          }
        });
      }
    });

    // Node Drag Handlers
    nodeElements.call(
      d3.drag<SVGGElement, WikiNode>()
        .on('start', (event, d) => {
          if (!event.active) simulation.alphaTarget(0.2).restart();
          // Unfreeze all other nodes so they can dynamically slide and avoid overlaps during dragging!
          nodes.forEach((node) => {
            if (node.id !== d.id) {
              node.fx = null;
              node.fy = null;
            }
          });
          d.fx = d.x;
          d.fy = layoutMode === 'hierarchical' ? (d.depth ?? 0) * 160 : d.y; // Slide horizontally in hierarchical, drag freely in radial
        })
        .on('drag', (event, d) => {
          d.fx = event.x;
          d.fy = layoutMode === 'hierarchical' ? (d.depth ?? 0) * 160 : event.y;
        })
        .on('end', (event, d) => {
          if (!event.active) simulation.alphaTarget(0);
          d.fx = null;
          d.fy = null;
        })
    );

    // Warm up the simulation slightly to settle nodes into nice positions before displaying
    simulation.alpha(0.8).restart();

    return () => {
      simulation.stop();
    };
  }, [nodes, links, layoutMode]);

  // Truncates labels that exceed 14 characters and adds ellipsis
  const formatLabel = (label: string | undefined | null): string => {
    if (!label) return '';
    return label.length > 15 ? `${label.slice(0, 14)}...` : label;
  };

  // Simple deterministic hash of a string to a float in [0, 1)
  const getDeterministicRandom = (str: string): number => {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }
    return Math.abs((Math.sin(hash) * 10000) % 1);
  };

  // Dynamically query random vertical radius (ry) for a node
  const getNodeRadiusY = (node: WikiNode | undefined | null): number => {
    if (!node) return 34;
    const rand = getDeterministicRandom(node.id);
    // Randomize vertical radius between 26 and 42 deterministically
    return Math.round(26 + rand * 16);
  };

  // Calculates the horizontal radius of the ellipse based on the formatted label length,
  // giving extra weight to full-width characters (like Chinese) to ensure the text fits perfectly.
  const getEllipseRadiusX = (label: string | undefined | null): number => {
    if (!label) return 48;
    const formatted = formatLabel(label);
    let length = 0;
    for (let i = 0; i < formatted.length; i++) {
      const code = formatted.charCodeAt(i);
      if (code > 127) {
        length += 1.8; // Chinese characters have more width weight
      } else {
        length += 1.0;
      }
    }
    return Math.max(48, length * 5.5 + 18);
  };

  // Dynamically query random horizontal radius (rx) for a node
  const getNodeRadiusX = (node: WikiNode | undefined | null): number => {
    if (!node) return 48;
    const baseRx = getEllipseRadiusX(node.label);
    const rand = getDeterministicRandom(node.id);
    // Random scale between 0.85 and 1.25 deterministically
    const randomScale = 0.85 + rand * 0.40;
    return Math.round(baseRx * randomScale);
  };

  // Helper to determine node visual classes
  const getNodeClasses = (node: WikiNode) => {
    const isSelected = selectedNode?.id === node.id;
    
    let base = 'node-interactive cursor-pointer select-none ';
    
    if (node.loading) {
      base += 'fill-indigo-50 stroke-indigo-400 stroke-[3px] animate-node-pulse';
    } else if (node.isRoot) {
      base += isSelected 
        ? 'fill-indigo-100 stroke-amber-500 stroke-[4px] shadow-lg'
        : 'fill-indigo-50 stroke-indigo-600 stroke-[3.5px]';
    } else if (node.isDeadEnd) {
      base += isSelected
        ? 'fill-slate-100 stroke-slate-500 stroke-[3px] stroke-dasharray-[4,4]'
        : 'fill-slate-50 stroke-slate-400 stroke-[2px] stroke-dasharray-[4,4]';
    } else if (node.loaded) {
      base += isSelected
        ? 'fill-emerald-50 stroke-emerald-600 stroke-[3.5px]'
        : 'fill-emerald-50 stroke-emerald-500 stroke-[2.5px]';
    } else {
      // Unloaded Node (Expandable)
      base += isSelected
        ? 'fill-sky-50 stroke-indigo-600 stroke-[3.5px]'
        : 'fill-white stroke-indigo-400 stroke-[2px] hover:stroke-indigo-600';
    }

    return base;
  };

  return (
    <div ref={containerRef} className="w-full h-full relative overflow-hidden bg-grid-whiteboard">
      <svg
        ref={svgRef}
        className="w-full h-full block focus:outline-none"
        onClick={() => onBackgroundClick?.()}
        onContextMenu={(e) => e.preventDefault()} // Block browser default context menu
      >
        {/* SVG Defs for Grid Pattern and Arrow Markers */}
        <defs>
          {/* Outward edge arrow indicators */}
          <marker
            id="arrow-marker"
            viewBox="0 0 10 10"
            refX="9.5"
            refY="5"
            markerWidth="6"
            markerHeight="6"
            orient="auto-start-reverse"
          >
            <path d="M 0 1 L 10 5 L 0 9 z" fill="#cbd5e1" />
          </marker>
          
          <marker
            id="arrow-marker-selected"
            viewBox="0 0 10 10"
            refX="9.5"
            refY="5"
            markerWidth="6"
            markerHeight="6"
            orient="auto-start-reverse"
          >
            <path d="M 0 1 L 10 5 L 0 9 z" fill="#818cf8" />
          </marker>

          {/* Core Whiteboard Grid (scales and pans dynamically if desired, but we place it globally or in g) */}
          <pattern
            id="grid-pattern"
            width="50"
            height="50"
            patternUnits="userSpaceOnUse"
          >
            <circle cx="2" cy="2" r="1" fill="#e2e8f0" />
          </pattern>
        </defs>

        {/* Global Zoom Group */}
        <g ref={gRef}>
          {/* Zoomable grid backdrop for high precision visual reference */}
          <rect width="100000" height="100000" x="-50000" y="-50000" fill="url(#grid-pattern)" pointerEvents="none" />

          {/* Links Layer (rendered behind nodes) */}
          <g className="links-layer">
            {links.map((link, idx) => {
              const sourceId = typeof link.source === 'string' ? link.source : link.source.id;
              const targetId = typeof link.target === 'string' ? link.target : link.target.id;
              const isSelectedPath = selectedNode && (selectedNode.id === sourceId || selectedNode.id === targetId);

              return (
                <path
                  key={`link-${sourceId}-${targetId}-${idx}`}
                  className="graph-link transition-all"
                  stroke={isSelectedPath ? '#818cf8' : '#e2e8f0'}
                  strokeWidth={isSelectedPath ? 2.5 : 1.5}
                  fill="none"
                  markerEnd={`url(#${isSelectedPath ? 'arrow-marker-selected' : 'arrow-marker'})`}
                />
              );
            })}
          </g>

          {/* Nodes Layer */}
          <g className="nodes-layer">
            {nodes.map((node) => {
              const isSelected = selectedNode?.id === node.id;
              return (
                <g
                  key={`node-${node.id}`}
                  className="graph-node select-none group/node cursor-pointer"
                  onClick={(e) => {
                    e.stopPropagation();
                    onNodeClick(node);
                  }}
                  onContextMenu={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    onNodeRightClick(node, e);
                  }}
                  onMouseEnter={(e) => {
                    setHoveredNodeId(node.id);
                    handleNodeMouseEnter(node, e);
                  }}
                  onMouseLeave={() => {
                    setHoveredNodeId(null);
                    handleNodeMouseLeave();
                  }}
                >
                  {/* Subtle shadow glow for root or active nodes */}
                  {node.isRoot && (
                    <ellipse
                      cx="0"
                      cy="0"
                      rx={getNodeRadiusX(node) + 8}
                      ry={getNodeRadiusY(node) + 8}
                      className="fill-transparent stroke-indigo-100 stroke-[4px] animate-pulse pointer-events-none opacity-60"
                    />
                  )}
                  {isSelected && !node.isRoot && (
                    <ellipse
                      cx="0"
                      cy="0"
                      rx={getNodeRadiusX(node) + 6}
                      ry={getNodeRadiusY(node) + 6}
                      className="fill-transparent stroke-sky-100 stroke-[4px] pointer-events-none opacity-85 animate-pulse"
                    />
                  )}

                  {/* Core Node Ellipse */}
                  <ellipse
                    cx="0"
                    cy="0"
                    rx={getNodeRadiusX(node)}
                    ry={getNodeRadiusY(node)}
                    className={getNodeClasses(node)}
                    style={{ transition: 'fill 0.2s, stroke 0.2s, stroke-width 0.2s' }}
                  />

                  {/* Special Visual Decor for Root Node (Crown Icon / Star SVG) */}
                  {node.isRoot && (
                    <g transform="translate(0, -22)" className="fill-amber-500 text-amber-500 pointer-events-none">
                      <polygon points="0,-4 3,2 -3,2" />
                      <circle cx="0" cy="-6" r="1.5" />
                    </g>
                  )}

                  {/* Centered Truncated Text Label */}
                  <text
                    textAnchor="middle"
                    dy=".3em"
                    className={`text-[13px] font-bold pointer-events-none select-none tracking-tight ${
                      node.isDeadEnd 
                        ? 'fill-slate-400' 
                        : isSelected 
                          ? 'fill-indigo-900 font-bold' 
                          : 'fill-slate-700'
                    }`}
                  >
                    {formatLabel(node.label)}
                  </text>

                  {/* Expansion Lock Lock Icon Switch */}
                  {node.loaded && !node.isRoot && (
                    <g
                      transform={`translate(0, ${getNodeRadiusY(node) - 11})`}
                      className="cursor-pointer group/toggle pointer-events-auto"
                      style={{
                        opacity: (expandedNodeIds.has(node.id) || hoveredNodeId === node.id) ? 1 : 0,
                        pointerEvents: (expandedNodeIds.has(node.id) || hoveredNodeId === node.id) ? 'auto' : 'none',
                        transition: 'opacity 200ms ease-in-out',
                      }}
                      onClick={(e) => {
                        e.stopPropagation();
                        onToggleNodeExpand(node.id);
                      }}
                    >
                      {/* Interactive circular background glow */}
                      <circle
                        cx="0"
                        cy="3"
                        r="10"
                        className={`transition-all duration-300 ${
                          expandedNodeIds.has(node.id)
                            ? 'fill-indigo-50/80 stroke-indigo-200/50'
                            : 'fill-slate-50/50 stroke-transparent group-hover/toggle:fill-slate-100 group-hover/toggle:stroke-slate-200'
                        }`}
                        strokeWidth="1"
                      />
                      
                      {/* SVG Lock Icon */}
                      <g transform="translate(0, 1)" className="transition-all duration-300">
                        {/* Lock Shackle */}
                        <path
                          d={
                            expandedNodeIds.has(node.id)
                              ? "M -3 -1 V -4 A 3 3 0 0 1 3 -4 V -1" // Closed shackle
                              : "M -3 -1 V -4 A 3 3 0 0 1 3 -4 V -2" // Open shackle
                          }
                          fill="none"
                          className={`transition-all duration-300 ${
                            expandedNodeIds.has(node.id)
                              ? 'stroke-indigo-600'
                              : 'stroke-slate-400 group-hover/toggle:stroke-indigo-500'
                          }`}
                          strokeWidth="1.5"
                          strokeLinecap="round"
                        />
                        {/* Lock Body */}
                        <rect
                          x="-5"
                          y="-1"
                          width="10"
                          height="7.5"
                          rx="1.5"
                          className={`transition-all duration-300 ${
                            expandedNodeIds.has(node.id)
                              ? 'fill-indigo-600 stroke-indigo-600'
                              : 'fill-white stroke-slate-400 group-hover/toggle:stroke-indigo-500'
                          }`}
                          strokeWidth="1"
                        />
                        {/* Key Hole */}
                        <circle
                          cx="0"
                          cy="2.5"
                          r="1"
                          className={`transition-all duration-300 ${
                            expandedNodeIds.has(node.id) ? 'fill-white' : 'fill-slate-400 group-hover/toggle:fill-indigo-500'
                          }`}
                        />
                      </g>
                      <title>{expandedNodeIds.has(node.id) ? "取消鎖定展開此分支" : "鎖定展開此分支網路"}</title>
                    </g>
                  )}


                  {/* Loading Spinner underneath the node */}
                  {node.loading && (
                    <g transform="translate(0, 52)" className="animate-spin text-indigo-500 pointer-events-none">
                      <circle
                        cx="0"
                        cy="0"
                        r="6"
                        fill="none"
                        stroke="#e2e8f0"
                        strokeWidth="1.5"
                      />
                      <circle
                        cx="0"
                        cy="0"
                        r="6"
                        fill="none"
                        stroke="#6366f1"
                        strokeWidth="1.5"
                        strokeDasharray="9, 20"
                      />
                    </g>
                  )}

                  {/* Browser hover tooltips fallback */}
                  <title>{node.id}</title>
                </g>
              );
            })}
          </g>
        </g>
      </svg>

      {/* Floating Hover Preview Card overlay */}
      {hoveredNode && hoverPosition && (
        <div
          className="fixed z-50 pointer-events-none w-72 bg-white/90 backdrop-blur-xl border border-slate-200/50 rounded-2xl shadow-xl p-4 animate-in fade-in zoom-in-95 duration-200 text-left"
          style={{
            left: `${hoverPosition.x + 16}px`,
            top: `${hoverPosition.y + 16}px`,
          }}
        >
          <h3 className="font-bold text-sm text-slate-800 mb-1.5 truncate border-b border-slate-100 pb-1.5">
            {hoveredNode.id}
          </h3>
          {hoverCardData ? (
            <div className="flex gap-2.5 items-start">
              {hoverCardData.thumbnail && (
                <img
                  src={hoverCardData.thumbnail}
                  alt={hoveredNode.id}
                  className="w-16 h-16 object-cover rounded-xl border border-slate-200/20 shrink-0"
                />
              )}
              <p className="text-[11px] text-slate-500 leading-normal line-clamp-4 select-none">
                {hoverCardData.extract}
              </p>
            </div>
          ) : (
            <div className="flex items-center gap-2 py-1.5 text-[11px] text-slate-400">
              <span className="w-3.5 h-3.5 block border-2 border-indigo-500 border-t-transparent rounded-full animate-spin"></span>
              <span>正在加載預覽...</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
