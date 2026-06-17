import React, { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import type { WikiNode, WikiLink } from '../../../types/wiki';
import { fetchWikiSummary } from '../../../services/wikiApi';
import {
  formatLabel,
  getNodeRadiusX,
  getNodeRadiusY,
  getLinkPath,
  getNodeClasses,
} from './helpers';
import { HoverCard } from './HoverCard';
import { useLanguage } from '../../../hooks/useLanguage';

interface WikiGraphProps {
  nodes: WikiNode[];
  links: WikiLink[];
  layoutMode: 'hierarchical' | 'radial';
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
  theme: 'light' | 'dark';
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
  theme,
}) => {
  const { t } = useLanguage();
  const svgRef = useRef<SVGSVGElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const gRef = useRef<SVGGElement | null>(null);
  const simulationRef = useRef<d3.Simulation<WikiNode, WikiLink> | null>(null);
  const zoomBehaviorRef = useRef<d3.ZoomBehavior<SVGSVGElement, unknown> | null>(null);

  const prevNodesStrRef = useRef<string>('');
  const prevLinksStrRef = useRef<string>('');
  const prevLayoutModeRef = useRef<'hierarchical' | 'radial'>('hierarchical');

  const [hoveredNode, setHoveredNode] = useState<WikiNode | null>(null);
  const [hoverCardData, setHoverCardData] = useState<{ extract: string; thumbnail?: string } | null>(null);
  const [hoverPosition, setHoverPosition] = useState<{ x: number; y: number } | null>(null);
  const hoverTimeoutRef = useRef<number | null>(null);
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);

  const handleNodeMouseEnter = (node: WikiNode, e: React.MouseEvent) => {
    if (window.matchMedia && !window.matchMedia('(hover: hover)').matches) {
      return;
    }

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
        const data = await fetchWikiSummary(node.id, node.lang, node.variant);
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
          extract: t.hoverFailed,
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

    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.1, 4])
      .on('zoom', (event) => {
        d3.select(gRef.current).attr('transform', event.transform);
      });

    svg.call(zoom);
    zoomBehaviorRef.current = zoom;

    let isInitialized = false;
    const resizeObserver = new ResizeObserver(() => {
      const w = container.clientWidth;
      const h = container.clientHeight;
      
      if (w > 0 && h > 0) {
        if (!isInitialized) {
          svg.call(zoom.transform, d3.zoomIdentity.translate(w / 2, h / 2).scale(0.8));
          isInitialized = true;
        }
        
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

    svg.transition()
      .duration(750)
      .ease(d3.easeCubicOut)
      .call(zoom.transform, d3.zoomIdentity.translate(width / 2, height / 2).scale(0.8));
  }, [resetZoomTrigger]);

  // 2b. Zoom and Focus on Selected Node
  useEffect(() => {
    if (!selectedNode || !selectedNode.loaded || selectedNode.loading) return;
    if (!svgRef.current || !containerRef.current || !zoomBehaviorRef.current) return;

    const activeNode = nodes.find(n => n.id === selectedNode.id);
    if (!activeNode || activeNode.x === undefined || activeNode.y === undefined) return;

    const svg = d3.select<SVGSVGElement, unknown>(svgRef.current);
    const container = containerRef.current;
    const zoom = zoomBehaviorRef.current;

    const width = container.clientWidth;
    const height = container.clientHeight;
    const targetScale = 1.15;

    const isMobileViewport = width < 768;
    let centerX = width / 2;
    let centerY = height / 2;
    if (isMobileViewport) {
      centerY = height * 0.22;
    } else {
      centerX = width * 0.35;
    }

    svg.transition()
      .duration(800)
      .ease(d3.easeCubicInOut)
      .call(
        zoom.transform,
        d3.zoomIdentity
          .translate(centerX - activeNode.x * targetScale, centerY - activeNode.y * targetScale)
          .scale(targetScale)
      );
  }, [selectedNode?.id, selectedNode?.loaded, nodes]);

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
    const targetScale = 1.25;

    const isMobileViewport = w < 768;
    let centerX = w / 2;
    let centerY = h / 2;
    if (isMobileViewport) {
      centerY = h * 0.22;
    } else {
      centerX = w * 0.35;
    }

    svg.transition()
      .duration(750)
      .ease(d3.easeCubicInOut)
      .call(
        zoom.transform,
        d3.zoomIdentity
          .translate(centerX - activeNode.x * targetScale, centerY - activeNode.y * targetScale)
          .scale(targetScale)
      );
  }, [focusSelectedTrigger, selectedNode, nodes]);

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
    const targetScale = 1.0;

    const isMobileViewport = w < 768;
    let centerX = w / 2;
    let centerY = h / 2;
    if (selectedNode) {
      if (isMobileViewport) {
        centerY = h * 0.22;
      } else {
        centerX = w * 0.35;
      }
    }

    svg.transition()
      .duration(750)
      .ease(d3.easeCubicInOut)
      .call(
        zoom.transform,
        d3.zoomIdentity
          .translate(centerX - rootNode.x * targetScale, centerY - rootNode.y * targetScale)
          .scale(targetScale)
      );
  }, [focusRootTrigger, selectedNode, nodes]);

  // 2e. Camera Control Action: Fit Whole Tree in Viewport
  useEffect(() => {
    if (fitScreenTrigger === 0 || nodes.length === 0) return;
    if (!svgRef.current || !containerRef.current || !zoomBehaviorRef.current) return;

    const svg = d3.select<SVGSVGElement, unknown>(svgRef.current);
    const container = containerRef.current;
    const zoom = zoomBehaviorRef.current;

    const w = container.clientWidth;
    const h = container.clientHeight;

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
  }, [fitScreenTrigger, nodes]);

  // 3. D3 Physics Simulation Engine & DOM Sync
  useEffect(() => {
    const svg = svgRef.current;
    const container = containerRef.current;
    if (!svg || !container || nodes.length === 0) return;

    const nodeIdsStr = nodes.map((n) => n.id).sort().join(',');
    const linksStr = links
      .map((l) => {
        const src = typeof l.source === 'string' ? l.source : l.source.id;
        const tgt = typeof l.target === 'string' ? l.target : l.target.id;
        return `${src}->${tgt}`;
      })
      .sort()
      .join(',');

    const layoutChanged = prevLayoutModeRef.current !== layoutMode;
    const dataChanged = nodeIdsStr !== prevNodesStrRef.current || linksStr !== prevLinksStrRef.current;

    prevLayoutModeRef.current = layoutMode;
    prevNodesStrRef.current = nodeIdsStr;
    prevLinksStrRef.current = linksStr;

    if (!dataChanged && !layoutChanged) {
      return;
    }

    if (simulationRef.current) {
      simulationRef.current.stop();
    }

    const cleanLinks = links.map((l) => ({
      ...l,
      source: typeof l.source === 'string' ? l.source : l.source.id,
      target: typeof l.target === 'string' ? l.target : l.target.id,
    }));

    nodes.forEach((node) => {
      if (node.x === undefined || node.y === undefined) {
        const incomingLink = cleanLinks.find(
          (l) => l.target === node.id
        );
        if (incomingLink) {
          const parentNode = nodes.find((n) => n.id === incomingLink.source);
          if (parentNode && parentNode.x !== undefined && parentNode.y !== undefined) {
            node.x = parentNode.x + (Math.random() - 0.5) * 20;
            node.y = parentNode.y + (Math.random() - 0.5) * 20;
          }
        }
      }
    });

    nodes.forEach((node) => {
      node.fx = null;
      node.fy = null;
    });

    const nodesByDepthForRadial: { [key: number]: WikiNode[] } = {};
    nodes.forEach((node) => {
      const depth = node.depth ?? 0;
      if (!nodesByDepthForRadial[depth]) nodesByDepthForRadial[depth] = [];
      nodesByDepthForRadial[depth].push(node);
    });

    const radialRadii: { [depth: number]: number } = { 0: 0 };
    const maxDepth = d3.max(nodes, (d) => d.depth ?? 0) ?? 0;

    let currentRadius = 0;
    const defaultStep = 220;
    const nodePadding = 45;

    for (let d = 1; d <= maxDepth; d++) {
      const tierNodes = nodesByDepthForRadial[d] || [];
      const K = tierNodes.length;
      
      let totalWidth = 0;
      tierNodes.forEach((node) => {
        totalWidth += getNodeRadiusX(node) * 2;
      });
      const avgNodeWidth = K > 0 ? totalWidth / K : 100;
      
      const requiredCircumference = K * (avgNodeWidth + nodePadding);
      const minStep = requiredCircumference / (2 * Math.PI);
      
      const step = Math.max(defaultStep, minStep);
      currentRadius += step;
      radialRadii[d] = currentRadius;
    }

    const simulation = d3.forceSimulation<WikiNode, WikiLink>(nodes)
      .force('link', d3.forceLink<WikiNode, WikiLink>(cleanLinks)
        .id((d) => d.id)
        .distance((link) => {
          if (layoutMode === 'hierarchical') {
            return 110;
          } else {
            const source = link.source as unknown as WikiNode;
            const target = link.target as unknown as WikiNode;
            const srcDepth = source.depth ?? 0;
            const tgtDepth = target.depth ?? 0;
            const srcR = radialRadii[srcDepth] || 0;
            const tgtR = radialRadii[tgtDepth] || 0;
            return Math.max(130, tgtR - srcR);
          }
        })
        .strength(0.7)
      )
      .force('charge', d3.forceManyBody().strength(layoutMode === 'hierarchical' ? -400 : -250).distanceMax(500))
      .force('collide', d3.forceCollide<WikiNode>().radius((d) => getNodeRadiusX(d) + 16).iterations(2));

    if (layoutMode === 'hierarchical') {
      simulation
        .force('y', d3.forceY<WikiNode>().y((d) => (d.depth ?? 0) * 160).strength(0.95))
        .force('x', d3.forceX<WikiNode>().x(0).strength(0.06));
    } else {
      simulation
        .force('radial', d3.forceRadial<WikiNode>((d) => radialRadii[d.depth ?? 0] || 0, 0, 0).strength(0.85))
        .force('center', d3.forceCenter(0, 0).strength(0.05));
    }

    simulationRef.current = simulation;

    const linkElements = d3.select(svg)
      .selectAll<SVGPathElement, WikiLink>('.graph-link')
      .data(cleanLinks);

    const nodeElements = d3.select(svg)
      .selectAll<SVGGElement, WikiNode>('.graph-node')
      .data(nodes);

    simulation.on('tick', () => {
      if (layoutMode === 'hierarchical') {
        const nodesByDepth: { [key: number]: WikiNode[] } = {};
        nodes.forEach((d) => {
          const depth = d.depth ?? 0;
          if (!nodesByDepth[depth]) nodesByDepth[depth] = [];
          nodesByDepth[depth].push(d);
        });

        Object.keys(nodesByDepth).forEach((depthKey) => {
          const depth = parseInt(depthKey);
          const tierNodes = nodesByDepth[depth];

          tierNodes.sort((a, b) => (a.x ?? 0) - (b.x ?? 0));
          const N = tierNodes.length;

          let tierSpacing = 190;
          if (N > 1) {
            let maxRequired = 0;
            for (let i = 0; i < N - 1; i++) {
              const r1 = getNodeRadiusX(tierNodes[i]);
              const r2 = getNodeRadiusX(tierNodes[i + 1]);
              const required = r1 + r2 + 40;
              if (required > maxRequired) {
                maxRequired = required;
              }
            }
            tierSpacing = Math.max(190, maxRequired);
          }

          tierNodes.forEach((node, index) => {
            node.y = depth * 160;

            if (node.fx === null || node.fx === undefined) {
              const targetX = (index - (N - 1) / 2) * tierSpacing;
              node.x = (node.x ?? 0) + (targetX - (node.x ?? 0)) * 0.15;
            }
          });
        });
      }

      linkElements.attr('d', (d) => getLinkPath(d, nodes, layoutMode));

      nodeElements.attr('transform', (d) => `translate(${d.x ?? 0}, ${d.y ?? 0})`);

      if (simulation.alpha() < 0.03) {
        nodes.forEach((node) => {
          if (node.x !== undefined && node.y !== undefined) {
            node.fx = node.x;
            node.fy = node.y;
          }
        });
      }
    });

    nodeElements.call(
      d3.drag<SVGGElement, WikiNode>()
        .on('start', (event, d) => {
          if (!event.active) simulation.alphaTarget(0.2).restart();
          nodes.forEach((node) => {
            if (node.id !== d.id) {
              node.fx = null;
              node.fy = null;
            }
          });
          d.fx = d.x;
          d.fy = layoutMode === 'hierarchical' ? (d.depth ?? 0) * 160 : d.y;
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

    simulation.alpha(0.8).restart();

    return () => {
      simulation.stop();
    };
  }, [nodes, links, layoutMode]);

  return (
    <div ref={containerRef} className="w-full h-full relative overflow-hidden bg-grid-whiteboard bg-slate-50 dark:bg-slate-950 transition-colors duration-300">
      <svg
        ref={svgRef}
        className="w-full h-full block focus:outline-none"
        onClick={() => onBackgroundClick?.()}
        onContextMenu={(e) => e.preventDefault()}
      >
        <defs>
          <marker
            id="arrow-marker"
            viewBox="0 0 10 10"
            refX="9.5"
            refY="5"
            markerWidth="6"
            markerHeight="6"
            orient="auto-start-reverse"
          >
            <path d="M 0 1 L 10 5 L 0 9 z" className="fill-slate-300 dark:fill-slate-700 transition-colors duration-300" />
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
            <path d="M 0 1 L 10 5 L 0 9 z" className="fill-indigo-500 dark:fill-indigo-400 transition-colors duration-300" />
          </marker>

          <pattern
            id="grid-pattern"
            width="50"
            height="50"
            patternUnits="userSpaceOnUse"
          >
            <circle cx="2" cy="2" r="1" className="fill-slate-200 dark:fill-slate-800 transition-colors duration-300" />
          </pattern>
        </defs>

        <g ref={gRef}>
          <rect width="100000" height="100000" x="-50000" y="-50000" fill="url(#grid-pattern)" pointerEvents="none" />

          {/* Links Layer */}
          <g className="links-layer">
            {links.map((link, idx) => {
              const sourceId = typeof link.source === 'string' ? link.source : link.source.id;
              const targetId = typeof link.target === 'string' ? link.target : link.target.id;
              const isSelectedPath = selectedNode && (selectedNode.id === sourceId || selectedNode.id === targetId);

              return (
                <path
                  key={`link-${sourceId}-${targetId}-${idx}`}
                  className={`graph-link transition-colors duration-300 ${
                    isSelectedPath
                      ? 'stroke-indigo-500 dark:stroke-indigo-400'
                      : 'stroke-slate-200 dark:stroke-slate-850/80'
                  }`}
                  d={getLinkPath(link, nodes, layoutMode)}
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
                  {node.isRoot && (
                    <ellipse
                      cx="0"
                      cy="0"
                      rx={getNodeRadiusX(node) + 8}
                      ry={getNodeRadiusY(node) + 8}
                      className="fill-transparent stroke-indigo-100 dark:stroke-indigo-950/60 stroke-[4px] animate-pulse pointer-events-none opacity-60"
                    />
                  )}
                  {isSelected && !node.isRoot && (
                    <ellipse
                      cx="0"
                      cy="0"
                      rx={getNodeRadiusX(node) + 6}
                      ry={getNodeRadiusY(node) + 6}
                      className="fill-transparent stroke-sky-100 dark:stroke-sky-950/60 stroke-[4px] pointer-events-none opacity-85 animate-pulse"
                    />
                  )}

                  <ellipse
                     cx="0"
                     cy="0"
                     rx={getNodeRadiusX(node)}
                     ry={getNodeRadiusY(node)}
                     className={getNodeClasses(node, selectedNode)}
                     style={{ transition: 'fill 0.2s, stroke 0.2s, stroke-width 0.2s' }}
                  />

                  {node.isRoot && (
                    <g transform="translate(0, -22)" className="fill-amber-500 text-amber-500 pointer-events-none">
                      <polygon points="0,-4 3,2 -3,2" />
                      <circle cx="0" cy="-6" r="1.5" />
                    </g>
                  )}

                  <text
                    textAnchor="middle"
                    dy=".3em"
                    className={`text-[13px] font-bold pointer-events-none select-none tracking-tight transition-colors duration-200 ${
                      node.isDeadEnd 
                        ? 'fill-slate-400 dark:fill-slate-500' 
                        : isSelected 
                          ? 'fill-indigo-900 dark:fill-indigo-200 font-bold' 
                          : 'fill-slate-700 dark:fill-slate-350'
                    }`}
                  >
                    {formatLabel(node.label)}
                  </text>

                  {node.loaded && (
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
                      <circle
                        cx="0"
                        cy="3"
                        r="10"
                        className={`transition-all duration-300 ${
                          expandedNodeIds.has(node.id)
                            ? 'fill-indigo-50/80 dark:fill-indigo-950/85 stroke-indigo-200/50 dark:stroke-indigo-900/50'
                            : 'fill-slate-50/50 dark:fill-slate-900/50 stroke-transparent group-hover/toggle:fill-slate-100 dark:group-hover/toggle:fill-slate-800 group-hover/toggle:stroke-slate-200 dark:group-hover/toggle:stroke-slate-700'
                        }`}
                        strokeWidth="1"
                      />
                      
                      <g transform="translate(0, 1)" className="transition-all duration-300">
                        <path
                          d={
                            expandedNodeIds.has(node.id)
                              ? "M -3 -1 V -4 A 3 3 0 0 1 3 -4 V -1"
                              : "M -3 -1 V -4 A 3 3 0 0 1 3 -4 V -2"
                          }
                          fill="none"
                          className={`transition-all duration-300 ${
                            expandedNodeIds.has(node.id)
                              ? 'stroke-indigo-600 dark:stroke-indigo-400'
                              : 'stroke-slate-400 dark:stroke-slate-500 group-hover/toggle:stroke-indigo-500 dark:group-hover/toggle:stroke-indigo-400'
                          }`}
                          strokeWidth="1.5"
                          strokeLinecap="round"
                        />
                        <rect
                          x="-5"
                          y="-1"
                          width="10"
                          height="7.5"
                          rx="1.5"
                          className={`transition-all duration-300 ${
                            expandedNodeIds.has(node.id)
                              ? 'fill-indigo-600 dark:fill-indigo-400 stroke-indigo-600 dark:stroke-indigo-400'
                              : 'fill-white dark:fill-slate-900 stroke-slate-400 dark:stroke-slate-500 group-hover/toggle:stroke-indigo-500 dark:group-hover/toggle:stroke-indigo-400'
                          }`}
                          strokeWidth="1"
                        />
                        <circle
                          cx="0"
                          cy="2.5"
                          r="1"
                          className={`transition-all duration-300 ${
                            expandedNodeIds.has(node.id) ? 'fill-white dark:fill-slate-900' : 'fill-slate-400 dark:fill-slate-500 group-hover/toggle:fill-indigo-500 dark:group-hover/toggle:fill-indigo-400'
                          }`}
                        />
                      </g>
                      <title>{expandedNodeIds.has(node.id) ? t.unlockExpand : t.lockExpand}</title>
                    </g>
                  )}

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

                  <title>{node.id}</title>
                </g>
              );
            })}
          </g>
        </g>
      </svg>

      <HoverCard
        hoveredNode={hoveredNode}
        hoverPosition={hoverPosition}
        hoverCardData={hoverCardData}
        darkMode={theme === 'dark'}
      />
    </div>
  );
};
