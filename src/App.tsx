import { useState, useEffect } from 'react';
import { WikiGraph } from './components/WikiGraph/WikiGraph';
import { WikiGraph3D } from './components/WikiGraph3D';
import { ControlPanel } from './components/ControlPanel';
import { DetailSidebar } from './components/DetailSidebar';
import { ContextMenu } from './components/ContextMenu';
import { HistoryPanel } from './components/HistoryPanel';
import { SubArticlesPanel } from './components/SubArticlesPanel';
import { UserAuth } from './components/UserAuth';
import { LayoutCameraSelector } from './components/LayoutCameraSelector';
import { SidebarToggleButton } from './components/SidebarToggleButton';
import { ThemeToggle } from './components/ThemeToggle';

import { useWikiAuth } from './hooks/useWikiAuth';
import { useWikiGraph } from './hooks/wiki-graph';

export default function App() {
  // Theme state management
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('wiki-vis-theme');
      if (saved === 'light' || saved === 'dark') return saved;
      if (window.matchMedia('(prefers-color-scheme: dark)').matches) return 'dark';
    }
    return 'light';
  });

  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    localStorage.setItem('wiki-vis-theme', theme);
  }, [theme]);

  // 1. Authentication hook
  const { user } = useWikiAuth();

  // 2. Graph state machine hook
  const {
    nodes,
    links,
    limit,
    changeLimit,
    layoutMode,
    viewMode,
    setViewMode,
    expandedNodeIds,
    selectedNode,
    isSidebarOpen,
    setIsSidebarOpen,
    exploredLinksMap,
    clickHistory,
    isMobile,
    isHistoryOpen,
    setIsHistoryOpen,
    isSubArticlesOpen,
    setIsSubArticlesOpen,
    searchLoading,
    saveLoading,
    isDirty,
    contextMenu,
    setContextMenu,
    
    // Handlers
    handleSearch,
    handleExplore,
    handleNodeClick,
    handleToggleNodeExpand,
    handleAddSubArticle,
    handleReSearch,
    handleSetRoot,
    handleRemoveNode,
    handleClearBoard,
    handleBackgroundClick,
    handleLayoutModeChange,
    handleMarkDeadEnd,
    handleUpdateNodeLabel,
    handleSaveGraph,
    handleLoadGraph,
    toggleHistory,
    toggleSubArticles,
    handleNodeRightClick,

    // Derived properties & operations
    activePathSet,
    visibleNodes,
    visibleLinks,
    getConnectedLinksCount,
    resetZoomTrigger,
    setResetZoomTrigger,
    focusSelectedTrigger,
    setFocusSelectedTrigger,
    fitScreenTrigger,
    setFitScreenTrigger,
    focusRootTrigger,
    setFocusRootTrigger,
  } = useWikiGraph(user);

  const rootNode = nodes.find(n => n.isRoot) || nodes[0];
  const lastClickedNode = clickHistory[clickHistory.length - 1] || null;

  return (
    <main className="w-full h-full relative overflow-hidden bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors duration-300">
      {/* Top Right Actions */}
      <div className="fixed top-4 right-4 z-40 flex items-center gap-2.5 pointer-events-none">
        <ThemeToggle theme={theme} toggleTheme={() => setTheme(t => t === 'dark' ? 'light' : 'dark')} />
        <UserAuth user={user} onLoadGraph={handleLoadGraph} />
      </div>
      
      {/* 1. Core Force-Directed Canvas Layer */}
      {nodes.length > 0 ? (
        viewMode === '3d' ? (
          <WikiGraph3D
            nodes={nodes}
            links={links}
            onNodeClick={handleNodeClick}
            onBackgroundClick={handleBackgroundClick}
            onNodeRightClick={handleNodeRightClick}
            onMarkDeadEnd={handleMarkDeadEnd}
            selectedNode={selectedNode}
            resetZoomTrigger={resetZoomTrigger}
            focusSelectedTrigger={focusSelectedTrigger}
            fitScreenTrigger={fitScreenTrigger}
            focusRootTrigger={focusRootTrigger}
            expandedNodeIds={expandedNodeIds}
            onToggleNodeExpand={handleToggleNodeExpand}
            activePathSet={activePathSet}
            theme={theme}
          />
        ) : (
          <WikiGraph
            nodes={visibleNodes}
            links={visibleLinks}
            layoutMode={layoutMode}
            onNodeClick={handleNodeClick}
            onBackgroundClick={handleBackgroundClick}
            onNodeRightClick={handleNodeRightClick}
            onMarkDeadEnd={handleMarkDeadEnd}
            selectedNode={selectedNode}
            resetZoomTrigger={resetZoomTrigger}
            focusSelectedTrigger={focusSelectedTrigger}
            fitScreenTrigger={fitScreenTrigger}
            focusRootTrigger={focusRootTrigger}
            expandedNodeIds={expandedNodeIds}
            onToggleNodeExpand={handleToggleNodeExpand}
            theme={theme}
          />
        )
      ) : (
        /* Empty canvas whiteboard background */
        <div className="w-full h-full bg-grid-whiteboard relative overflow-hidden bg-slate-50 dark:bg-slate-950 transition-colors duration-300" />
      )}

      {/* Exploration Time Machine History Panel (Top Left Corner) */}
      <HistoryPanel
        history={clickHistory}
        selectedNode={selectedNode}
        onNodeClick={handleNodeClick}
        isOpen={isHistoryOpen}
      />

      {/* Search & Dropdown Filter Panel for nodes with >50 sub-articles */}
      <SubArticlesPanel
        key={selectedNode ? selectedNode.id : 'empty'}
        selectedNode={selectedNode}
        allSubArticles={selectedNode ? (exploredLinksMap[selectedNode.id] || []) : []}
        visibleNodeIds={new Set(nodes.map(n => n.id))}
        onAddSubArticle={handleAddSubArticle}
        isOpen={isSubArticlesOpen}
      />

      {/* 2. Floating Dashboard Search & Controls Layer */}
      <ControlPanel
        onSearch={handleSearch}
        onResetView={() => setResetZoomTrigger((prev) => prev + 1)}
        onClearBoard={handleClearBoard}
        nodeCount={nodes.length}
        linkCount={links.length}
        limit={limit}
        onLimitChange={changeLimit}
        searchLoading={searchLoading}
        hasNodes={nodes.length > 0}
        isHistoryOpen={isHistoryOpen}
        onToggleHistory={toggleHistory}
        showHistoryButton={clickHistory.length > 0}
        isSubArticlesOpen={isSubArticlesOpen}
        onToggleSubArticles={toggleSubArticles}
        showSubArticlesButton={selectedNode !== null && (exploredLinksMap[selectedNode.id] || []).length > 0}
        isLoggedIn={!!user}
        isDirty={isDirty}
        onSaveGraph={handleSaveGraph}
        saveLoading={saveLoading}
        rootTitle={rootNode?.id || ''}
      />

      {/* 3. Sliding Detail Reader Panel */}
      <DetailSidebar
        node={selectedNode || lastClickedNode}
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
        onExplore={handleExplore}
        onSetRoot={handleSetRoot}
        onRemove={handleRemoveNode}
        onMarkDeadEnd={handleMarkDeadEnd}
        connectedLinksCount={selectedNode ? getConnectedLinksCount(selectedNode.id) : (lastClickedNode ? getConnectedLinksCount(lastClickedNode.id) : 0)}
        onReSearch={handleReSearch}
        isExpanded={selectedNode ? expandedNodeIds.has(selectedNode.id) : (lastClickedNode ? expandedNodeIds.has(lastClickedNode.id) : false)}
        onToggleExpand={() => {
          const activeNode = selectedNode || lastClickedNode;
          if (activeNode) handleToggleNodeExpand(activeNode.id);
        }}
        onUpdateNodeLabel={handleUpdateNodeLabel}
      />

      {/* 4. Customized Right-Click Operations overlay */}
      {contextMenu && (
        <ContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          node={contextMenu.node}
          onClose={() => setContextMenu(null)}
          onExplore={handleExplore}
          onSetRoot={handleSetRoot}
          onRemove={handleRemoveNode}
        />
      )}

      {/* 5. Floating Layout & Camera Selector at the bottom-left corner */}
      {nodes.length > 0 && (
        <LayoutCameraSelector
          viewMode={viewMode}
          onViewModeChange={setViewMode}
          layoutMode={layoutMode}
          onLayoutModeChange={handleLayoutModeChange}
          selectedNode={selectedNode}
          onResetView={() => setResetZoomTrigger(prev => prev + 1)}
          onFocusSelected={() => setFocusSelectedTrigger(prev => prev + 1)}
          onFitScreen={() => setFitScreenTrigger(prev => prev + 1)}
          onFocusRoot={() => setFocusRootTrigger(prev => prev + 1)}
        />
      )}

      {/* Floating Sidebar Toggle Button (always shown when graph has nodes and sidebar is closed) */}
      {nodes.length > 0 && !isSidebarOpen && (
        <SidebarToggleButton
          onClick={() => {
            setIsSidebarOpen(true);
            if (isMobile) {
              setIsHistoryOpen(false);
              setIsSubArticlesOpen(false);
            }
          }}
        />
      )}
    </main>
  );
}
