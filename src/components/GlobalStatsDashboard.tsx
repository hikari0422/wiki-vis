import React, { useEffect, useState, useRef } from 'react';
import * as d3 from 'd3';
import { X, TrendingUp, Compass, Network } from 'lucide-react';
import { getGlobalStats } from '../services/firebase';

interface GlobalStatsDashboardProps {
  isOpen: boolean;
  onClose: () => void;
}

export const GlobalStatsDashboard: React.FC<GlobalStatsDashboardProps> = ({ isOpen, onClose }) => {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<{ topNodes: any[]; averageNodes: number; averageDepth: number }>({
    topNodes: [],
    averageNodes: 0,
    averageDepth: 0
  });
  const chartRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    
    let isMounted = true;
    setLoading(true);
    
    getGlobalStats().then((data) => {
      if (isMounted) {
        setStats(data);
        setLoading(false);
      }
    });

    return () => { isMounted = false; };
  }, [isOpen]);

  // D3 Chart rendering
  useEffect(() => {
    if (loading || !isOpen || !chartRef.current || stats.topNodes.length === 0) return;

    const container = chartRef.current;
    container.innerHTML = ''; // Clear previous chart

    const margin = { top: 30, right: 30, bottom: 60, left: 80 };
    const width = container.clientWidth - margin.left - margin.right;
    const height = 300 - margin.top - margin.bottom;

    const svg = d3.select(container)
      .append('svg')
      .attr('width', width + margin.left + margin.right)
      .attr('height', height + margin.top + margin.bottom)
      .append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`);

    const data = stats.topNodes;

    // X Axis
    const x = d3.scaleBand()
      .range([0, width])
      .domain(data.map(d => d.title))
      .padding(0.2);
    
    svg.append('g')
      .attr('transform', `translate(0,${height})`)
      .call(d3.axisBottom(x))
      .selectAll('text')
      .attr('transform', 'translate(-10,0)rotate(-45)')
      .style('text-anchor', 'end')
      .attr('class', 'text-xs font-semibold fill-slate-500 dark:fill-slate-400');

    // Y Axis
    const maxVal = d3.max(data, d => d.clickCount) || 10;
    const y = d3.scaleLinear()
      .domain([0, maxVal])
      .range([height, 0]);

    svg.append('g')
      .call(d3.axisLeft(y).ticks(5))
      .selectAll('text')
      .attr('class', 'text-xs font-semibold fill-slate-500 dark:fill-slate-400');

    // Remove domain lines for cleaner look
    svg.selectAll('.domain').remove();
    svg.selectAll('.tick line').attr('stroke', 'rgba(156, 163, 175, 0.2)');

    // Add horizontal grid lines
    svg.append('g')
      .attr('class', 'grid')
      .call(d3.axisLeft(y).tickSize(-width).tickFormat(() => '').ticks(5))
      .selectAll('.tick line')
      .attr('stroke', 'rgba(156, 163, 175, 0.2)')
      .attr('stroke-dasharray', '3,3');
    svg.select('.grid .domain').remove();

    // Bars
    const bars = svg.selectAll('mybar')
      .data(data)
      .enter()
      .append('rect')
      .attr('x', d => x(d.title) || 0)
      .attr('y', d => y(0))
      .attr('width', x.bandwidth())
      .attr('height', d => height - y(0))
      .attr('fill', 'url(#barGradient)')
      .attr('rx', 4)
      .attr('ry', 4);

    // Gradient definition
    const defs = svg.append('defs');
    const gradient = defs.append('linearGradient')
      .attr('id', 'barGradient')
      .attr('x1', '0%')
      .attr('y1', '0%')
      .attr('x2', '0%')
      .attr('y2', '100%');
    
    gradient.append('stop')
      .attr('offset', '0%')
      .attr('stop-color', '#818cf8');
    gradient.append('stop')
      .attr('offset', '100%')
      .attr('stop-color', '#4f46e5');

    // Animation
    bars.transition()
      .duration(800)
      .attr('y', d => y(d.clickCount))
      .attr('height', d => height - y(d.clickCount))
      .delay((_, i) => i * 50);

    // Hover effects
    bars.on('mouseenter', function(event, d) {
      d3.select(this)
        .transition()
        .duration(200)
        .attr('opacity', 0.8);
      
      const tooltip = d3.select(container).append('div')
        .attr('class', 'absolute bg-slate-800 text-white text-xs px-2 py-1 rounded shadow-lg pointer-events-none transition-opacity')
        .style('opacity', 0)
        .style('left', `${event.pageX - container.getBoundingClientRect().left}px`)
        .style('top', `${event.pageY - container.getBoundingClientRect().top - 40}px`)
        .html(`<b>${d.title}</b>: ${d.clickCount}`);
      
      tooltip.transition().duration(200).style('opacity', 1);
    })
    .on('mouseleave', function() {
      d3.select(this)
        .transition()
        .duration(200)
        .attr('opacity', 1);
      
      d3.select(container).selectAll('div').remove();
    });

  }, [loading, isOpen, stats]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
      <div 
        className="absolute inset-0 bg-slate-900/40 dark:bg-slate-900/60 backdrop-blur-sm transition-opacity" 
        onClick={onClose}
      />
      
      <div className="relative w-full max-w-4xl bg-white/90 dark:bg-slate-900/90 backdrop-blur-2xl rounded-3xl shadow-2xl border border-slate-200/50 dark:border-slate-700/50 overflow-hidden flex flex-col animate-in zoom-in-95 duration-300">
        
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-200/50 dark:border-slate-700/50">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-indigo-100 dark:bg-indigo-900/50 rounded-xl">
              <TrendingUp className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
            </div>
            <div>
              <h2 className="text-xl font-bold bg-linear-to-r from-indigo-700 to-indigo-500 dark:from-indigo-400 dark:to-indigo-305 bg-clip-text text-transparent">
                全站探索統計數據
              </h2>
              <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">Global Exploration Statistics</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-all"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 md:p-8 overflow-y-auto max-h-[80vh]">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20">
              <div className="w-10 h-10 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div>
              <p className="mt-4 text-slate-500 font-medium">載入數據中...</p>
            </div>
          ) : (
            <div className="flex flex-col gap-8">
              
              {/* Top Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-linear-to-br from-indigo-50 to-white dark:from-indigo-950/30 dark:to-slate-900/50 border border-indigo-100 dark:border-indigo-900/30 p-6 rounded-2xl flex items-center gap-6 group hover:shadow-md transition-all">
                  <div className="p-4 bg-indigo-100 dark:bg-indigo-900/50 rounded-2xl group-hover:scale-110 transition-transform">
                    <Compass className="w-8 h-8 text-indigo-600 dark:text-indigo-400" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">平均探索節點數</p>
                    <div className="flex items-baseline gap-2">
                      <span className="text-4xl font-extrabold text-slate-800 dark:text-slate-100">{stats.averageNodes}</span>
                      <span className="text-sm font-medium text-slate-500">個/次</span>
                    </div>
                  </div>
                </div>

                <div className="bg-linear-to-br from-emerald-50 to-white dark:from-emerald-950/30 dark:to-slate-900/50 border border-emerald-100 dark:border-emerald-900/30 p-6 rounded-2xl flex items-center gap-6 group hover:shadow-md transition-all">
                  <div className="p-4 bg-emerald-100 dark:bg-emerald-900/50 rounded-2xl group-hover:scale-110 transition-transform">
                    <Network className="w-8 h-8 text-emerald-600 dark:text-emerald-400" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">平均探索深度</p>
                    <div className="flex items-baseline gap-2">
                      <span className="text-4xl font-extrabold text-slate-800 dark:text-slate-100">{stats.averageDepth}</span>
                      <span className="text-sm font-medium text-slate-500">層</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Chart Section */}
              <div className="bg-slate-50 dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-700/60 rounded-2xl p-6">
                <h3 className="text-lg font-bold text-slate-800 dark:text-slate-200 mb-4 flex items-center gap-2">
                  <span className="w-1.5 h-6 bg-indigo-500 rounded-full block"></span>
                  Top 10 最熱門探索條目
                </h3>
                
                {stats.topNodes.length > 0 ? (
                  <div className="w-full overflow-x-auto">
                    <div ref={chartRef} className="min-w-[600px] relative" />
                  </div>
                ) : (
                  <div className="py-10 text-center text-slate-500">
                    目前還沒有足夠的數據喔！
                  </div>
                )}
              </div>

            </div>
          )}
        </div>
      </div>
    </div>
  );
};
