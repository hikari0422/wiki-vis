import React, { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import type { WikiNode, WikiLink } from '../types/wiki';
import { fetchWikiSummary } from '../services/wikiApi';

interface WikiGraphProps {
  nodes: WikiNode[];
  links: WikiLink[];
  layoutMode: 'hierarchical' | 'radial';
  onNodeClick: (node: WikiNode) => void;
  onNodeRightClick: (node: WikiNode, e: React.MouseEvent) => void;
  onMarkDeadEnd: (nodeId: string) => void; // Flag non-existent nodes
  selectedNode: WikiNode | null;
  resetZoomTrigger: number;
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

    // Set up or update Simulation
    // Hierarchical top-down spacing forces (spreads left & right in distinct vertical rows)
    const simulation = d3.forceSimulation<WikiNode, WikiLink>(nodes)
      .force('link', d3.forceLink<WikiNode, WikiLink>(cleanLinks)
        .id((d) => d.id)
        .distance(layoutMode === 'hierarchical' ? 110 : 130)
        .strength(0.7)
      )
      .force('charge', d3.forceManyBody().strength(layoutMode === 'hierarchical' ? -400 : -250).distanceMax(500))
      .force('collide', d3.forceCollide().radius(50).iterations(2)); // Keep nodes separated

    if (layoutMode === 'hierarchical') {
      simulation
        .force('y', d3.forceY<WikiNode>().y((d) => (d.depth ?? 0) * 160).strength(0.95)) // Strictly align in vertical rows
        .force('x', d3.forceX<WikiNode>().x(0).strength(0.06)); // Center horizontally
    } else {
      simulation
        .force('center', d3.forceCenter(0, 0).strength(0.03))
        .force('x', d3.forceX<WikiNode>().x(0).strength(0.03))
        .force('y', d3.forceY<WikiNode>().y(0).strength(0.03));
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
        const horizontalSpacing = 135;

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
        const px = source.x ?? 0;
        const py = source.y ?? 0;
        const cx = target.x ?? 0;
        const cy = target.y ?? 0;
        
        if (layoutMode === 'hierarchical') {
          const midY = (py + cy) / 2;
          return `M ${px} ${py} L ${px} ${midY} L ${cx} ${midY} L ${cx} ${cy}`;
        } else {
          return `M ${px} ${py} L ${cx} ${cy}`;
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

  // Truncates labels that exceed 6 characters and adds ellipsis
  const formatLabel = (label: string): string => {
    return label.length > 7 ? `${label.slice(0, 6)}...` : label;
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
        onContextMenu={(e) => e.preventDefault()} // Block browser default context menu
      >
        {/* SVG Defs for Grid Pattern and Arrow Markers */}
        <defs>
          {/* Outward edge arrow indicators */}
          <marker
            id="arrow-marker"
            viewBox="0 0 10 10"
            refX="48" // Node radius is 36, refX=48 places arrow head perfectly on circle perimeter
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
            refX="48"
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
                  className="graph-node select-none"
                  onClick={(e) => {
                    e.stopPropagation();
                    onNodeClick(node);
                  }}
                  onContextMenu={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    onNodeRightClick(node, e);
                  }}
                  onMouseEnter={(e) => handleNodeMouseEnter(node, e)}
                  onMouseLeave={handleNodeMouseLeave}
                >
                  {/* Subtle shadow glow for root or active nodes */}
                  {node.isRoot && (
                    <circle
                      r="44"
                      className="fill-transparent stroke-indigo-100 stroke-[4px] animate-pulse pointer-events-none opacity-60"
                    />
                  )}
                  {isSelected && !node.isRoot && (
                    <circle
                      r="42"
                      className="fill-transparent stroke-sky-100 stroke-[4px] pointer-events-none opacity-85 animate-pulse"
                    />
                  )}

                  {/* Core Node Circle */}
                  <circle
                    r="36"
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
                    className={`text-[11px] font-semibold pointer-events-none select-none tracking-tight ${
                      node.isDeadEnd 
                        ? 'fill-slate-400' 
                        : isSelected 
                          ? 'fill-indigo-900 font-bold' 
                          : 'fill-slate-700'
                    }`}
                  >
                    {formatLabel(node.label)}
                  </text>


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
