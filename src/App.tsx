import { WikiGraph } from './components/WikiGraph/WikiGraph';
import { WikiGraph3D } from './components/WikiGraph3D';
import { ControlPanel } from './components/ControlPanel';
import { DetailSidebar } from './components/DetailSidebar';
import { ContextMenu } from './components/ContextMenu';
import { HistoryPanel } from './components/HistoryPanel';
import { SubArticlesPanel } from './components/SubArticlesPanel';
import { PathTimeline } from './components/PathTimeline';
import { UserAuth } from './components/UserAuth';
import { LayoutCameraSelector } from './components/LayoutCameraSelector';
import { SidebarToggleButton } from './components/SidebarToggleButton';

import { useWikiAuth } from './hooks/useWikiAuth';
import { useWikiGraph } from './hooks/wiki-graph';

export default function App() {
  // 1. Authentication hook
  const { user } = useWikiAuth();

  // 2. Graph state machine hook
  const {
    nodes,
    links,
    limit,
    setLimit,
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
    getActivePathList,
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

  return (
    <main className="w-full h-full relative overflow-hidden bg-slate-50">
      {/* Google Authentication Button/Dropdown */}
      <UserAuth user={user} onLoadGraph={handleLoadGraph} />
      
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
          />
        )
      ) : (
        /* Empty canvas whiteboard background */
        <div className="w-full h-full bg-grid-whiteboard relative overflow-hidden bg-slate-50" />
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
        onLimitChange={setLimit}
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
        node={selectedNode}
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
        onExplore={handleExplore}
        onSetRoot={handleSetRoot}
        onRemove={handleRemoveNode}
        onMarkDeadEnd={handleMarkDeadEnd}
        connectedLinksCount={selectedNode ? getConnectedLinksCount(selectedNode.id) : 0}
        onReSearch={handleReSearch}
        isExpanded={selectedNode ? expandedNodeIds.has(selectedNode.id) : false}
        onToggleExpand={() => selectedNode && handleToggleNodeExpand(selectedNode.id)}
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

      {/* Floating Sidebar Toggle Button (shown only when selectedNode is set but sidebar is closed) */}
      {selectedNode && !isSidebarOpen && (
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

      {/* 7. Bottom Center Breadcrumb Exploration Timeline */}
      <PathTimeline
        path={getActivePathList()}
        onNodeClick={handleNodeClick}
      />
    </main>
  );
}
