import React, { createContext, useContext, useState } from 'react';

export type Language = 'zh' | 'en';

export interface TranslationDict {
  // Brand
  brandTitleEmpty: string;
  brandTitleFloating: string;
  brandSub: string;
  // Search
  searchPlaceholder: string;
  searchLoading: string;
  searchTooltip: string;
  // Quick suggestions
  recommendTitle: string;
  recommendUniverse: string;
  recommendAI: string;
  // Toolbar tooltips
  resetView: string;
  historyTimeline: string;
  subArticles: string;
  settingsStats: string;
  clearBoard: string;
  moreOptions: string;
  // Drawer settings
  branchLimitTitle: string;
  showAll: string;
  showAllNoLimit: string;
  randomShowN: (n: number) => string;
  customN: (n: number) => string;
  cloudSaveTitle: string;
  unsavedChanges: string;
  savedToCloud: string;
  cloudSaveLoginHelper: string;
  cloudSaveCreateHelper: string;
  graphTheme: string;
  manualSave: string;
  saving: string;
  boardStats: string;
  totalNodes: string;
  totalLinks: string;
  confirmClearBoard: string;
  // Layout selector
  view2D: string;
  view3D: string;
  layoutHierarchical: string;
  layoutRadial: string;
  titleHierarchical: string;
  titleRadial: string;
  cameraLens: string;
  cameraFocusSelected: (title: string) => string;
  cameraFocusPrompt: string;
  cameraFitScreen: string;
  cameraFocusRoot: string;
  // Sidebar Details
  wikipediaItem: string;
  langPrefix: string;
  loadingSummary: string;
  failedSummary: string;
  noSummary: string;
  notFoundSummary: string;
  statsTitle: string;
  linkedCount: string;
  connectedSuffix: string;
  loadingStatus: string;
  statusLoading: string;
  statusDeadEnd: string;
  statusLoaded: string;
  statusNotLoaded: string;
  keepExpanded: string;
  expandNetwork: string;
  researchNode: string;
  researchTooltip: string;
  setAsRoot: string;
  readFullArticle: string;
  removeNode: string;
  // User auth
  displayNamePlaceholder: string;
  mySavedHistory: string;
  logout: string;
  loginGoogle: string;
  needApiConfig: string;
  firebaseEnvError: string;
  quickConfigGuide: string;
  quickStep1: string;
  quickStep2: string;
  quickStep3: string;
  quickStep4: string;
  understandBtn: string;
  // Saved history modal
  historyTitle: string;
  loadingSaved: string;
  loadSavedError: string;
  retryBtn: string;
  noSavedTitle: string;
  noSavedDesc: string;
  createdAt: string;
  lastModified: string;
  nodeCountLabel: string;
  linkCountLabel: string;
  layoutLabel: string;
  layoutHierarchicalShort: string;
  layoutRadialShort: string;
  layoutFreeShort: string;
  deleteSavedTooltip: string;
  confirmDeleteSaved: string;
  deleteFailed: string;
  closeBtn: string;
  unnamedGraph: string;
  unknownTime: string;
  // Context Menu
  exploreNode: string;
  // History panel
  historyTimelineTitle: string;
  depthPrefix: string;
  // Sub articles
  hiddenArticlesTitle: string;
  hiddenCount: (len: number) => string;
  searchHiddenPlaceholder: string;
  selectAddLabel: string;
  noMatchingHidden: string;
  addAndExplore: string;
  // Hover card
  hoverCardLoading: string;
  hoverFailed: string;
  unlockExpand: string;
  lockExpand: string;
}

const translations: Record<Language, TranslationDict> = {
  zh: {
    // Brand
    brandTitleEmpty: "Wiki Vision",
    brandTitleFloating: "Wiki Vision",
    brandSub: "探索wiki條目之間的關係",
    // Search
    searchPlaceholder: "貼上維基網址或輸入關鍵字搜尋...",
    searchLoading: "搜尋中...",
    searchTooltip: "搜尋頁面",
    // Quick suggestions
    recommendTitle: "推薦探索:",
    recommendUniverse: "宇宙 🚀",
    recommendAI: "人工智能 🧠",
    // Toolbar tooltips
    resetView: "重設視角",
    historyTimeline: "探索歷史軌跡",
    subArticles: "未顯示關聯條目",
    settingsStats: "物理配置與統計",
    clearBoard: "清除畫布",
    moreOptions: "更多功能選項",
    // Drawer settings
    branchLimitTitle: "分支條目數量設定",
    showAll: "全部顯示",
    showAllNoLimit: "全部顯示 (無限制)",
    randomShowN: (n: number) => `隨機顯示 ${n} 個`,
    customN: (n: number) => `${n}個`,
    cloudSaveTitle: "雲端備份存檔",
    unsavedChanges: "未儲存變更 (關閉時自動儲存)",
    savedToCloud: "已儲存至雲端",
    cloudSaveLoginHelper: "請先在右上角登入 Google 帳戶以使用雲端存檔功能。",
    cloudSaveCreateHelper: "請先搜尋並建立圖譜後再進行儲存。",
    graphTheme: "圖譜主題",
    manualSave: "手動儲存",
    saving: "儲存中...",
    boardStats: "目前看板資訊:",
    totalNodes: "總節點數",
    totalLinks: "連線數量",
    confirmClearBoard: "確定要清除整個畫布的節點與連線嗎？",
    // Layout selector
    view2D: "2D 視角",
    view3D: "3D 拓撲",
    layoutHierarchical: "階層排列",
    layoutRadial: "放射排列",
    titleHierarchical: "直線階層排列",
    titleRadial: "放射網絡排列",
    cameraLens: "相機鏡頭:",
    cameraFocusSelected: (title: string) => `鏡頭聚焦選中節點：「${title}」`,
    cameraFocusPrompt: "請先選擇畫布上的任何節點來進行鏡頭聚焦",
    cameraFitScreen: "相機全局適應 (將整顆樹縮小塞滿視窗並置中)",
    cameraFocusRoot: "定位聚焦到最初搜尋的根節點 (Root)",
    // Sidebar Details
    wikipediaItem: "WIKIPEDIA ITEM",
    langPrefix: "語系: ",
    loadingSummary: "正在從 Wikipedia 載入摘要...",
    failedSummary: "無法加載此維基條目的摘要內容。",
    noSummary: "此條目目前無引言摘要。",
    notFoundSummary: "此條目可能不存在或已被移除。",
    statsTitle: "白板狀態統計",
    linkedCount: "關聯連線數",
    connectedSuffix: " 條",
    loadingStatus: "加載狀態",
    statusLoading: "正在讀取...",
    statusDeadEnd: "終點無外連",
    statusLoaded: "已加載展開",
    statusNotLoaded: "未加載",
    keepExpanded: "保持此分支網路展開 (鎖定)",
    expandNetwork: "展開此節點網絡",
    researchNode: "重新搜尋此節點",
    researchTooltip: "手動重新自維基百科搜尋此條目，並強制重新解析其內文的所有知識超連結與引言摘要",
    setAsRoot: "重設以此為探索中心",
    readFullArticle: "閱讀維基完整條目",
    removeNode: "從畫布中刪除節點",
    // User auth
    displayNamePlaceholder: "已登入",
    mySavedHistory: "我的歷史存檔",
    logout: "登出帳戶",
    loginGoogle: "使用 Google 登入",
    needApiConfig: "需要設定 API",
    firebaseEnvError: "請先設定您的 Firebase 環境變數。請在根目錄建立 .env 檔案並填入參數。",
    quickConfigGuide: "快速設定指南：",
    quickStep1: "請複製專案根目錄的 .env.example 為 .env",
    quickStep2: "前往 Firebase 啟用 Google Auth",
    quickStep3: "填入對應的 API 金鑰與相關欄位",
    quickStep4: "重啟 Vite 開發伺服器 (npm run dev)",
    understandBtn: "我瞭解了",
    // Saved history modal
    historyTitle: "我的歷史存檔紀錄",
    loadingSaved: "正在載入您的存檔...",
    loadSavedError: "載入雲端存檔失敗，請確認資料庫已正確設定。",
    retryBtn: "重新整理",
    noSavedTitle: "尚無雲端存檔",
    noSavedDesc: "展開維基圖譜後，可於下方設定面板點擊「儲存目前的圖譜」來建立存檔。",
    createdAt: "建立時間: ",
    lastModified: "最後修改: ",
    nodeCountLabel: "節點: ",
    linkCountLabel: "連線: ",
    layoutLabel: "排版: ",
    layoutHierarchicalShort: "階層",
    layoutRadialShort: "放射",
    layoutFreeShort: "自由",
    deleteSavedTooltip: "刪除此存檔",
    confirmDeleteSaved: "確定要刪除此存檔嗎？此動作無法復原。",
    deleteFailed: "刪除失敗，請稍後再試。",
    closeBtn: "關閉",
    unnamedGraph: "無主題",
    unknownTime: "未知時間",
    // Context Menu
    exploreNode: "展開節點連結",
    // History panel
    historyTimelineTitle: "探索歷史軌跡",
    depthPrefix: "深度: ",
    // Sub articles
    hiddenArticlesTitle: "未顯示關聯條目",
    hiddenCount: (len: number) => `共 ${len} 個`,
    searchHiddenPlaceholder: "搜尋隱藏條目...",
    selectAddLabel: "選擇欲加入的條目:",
    noMatchingHidden: "無符合的隱藏條目",
    addAndExplore: "加入畫布並探索",
    // Hover card
    hoverCardLoading: "正在加載預覽...",
    hoverFailed: "無法取得此條目的預覽資料。",
    unlockExpand: "取消鎖定展開此分支",
    lockExpand: "鎖定展開此分支網路",
  },
  en: {
    // Brand
    brandTitleEmpty: "Wiki Vision",
    brandTitleFloating: "Wiki Vision",
    brandSub: "Explore relationships between Wikipedia articles",
    // Search
    searchPlaceholder: "Paste Wikipedia URL or enter keywords...",
    searchLoading: "Searching...",
    searchTooltip: "Search page",
    // Quick suggestions
    recommendTitle: "Suggestions:",
    recommendUniverse: "Universe 🚀",
    recommendAI: "Artificial Intelligence 🧠",
    // Toolbar tooltips
    resetView: "Reset View",
    historyTimeline: "Explore History Path",
    subArticles: "Hidden Linked Articles",
    settingsStats: "Settings & Analytics",
    clearBoard: "Clear Whiteboard",
    moreOptions: "More Options",
    // Drawer settings
    branchLimitTitle: "Branch limit size",
    showAll: "Show All",
    showAllNoLimit: "Show All (No Limit)",
    randomShowN: (n: number) => `Show ${n} randomly`,
    customN: (n: number) => `${n} items`,
    cloudSaveTitle: "Cloud Backup & Save",
    unsavedChanges: "Unsaved changes (auto-saved on exit)",
    savedToCloud: "Saved to cloud",
    cloudSaveLoginHelper: "Sign in with Google in the top right to enable cloud saving.",
    cloudSaveCreateHelper: "Search and build a graph before saving.",
    graphTheme: "Graph Topic",
    manualSave: "Save Now",
    saving: "Saving...",
    boardStats: "Board Analytics:",
    totalNodes: "Total Nodes",
    totalLinks: "Total Links",
    confirmClearBoard: "Are you sure you want to clear all nodes and links on the whiteboard?",
    // Layout selector
    view2D: "2D View",
    view3D: "3D Space",
    layoutHierarchical: "Hierarchy",
    layoutRadial: "Radial",
    titleHierarchical: "Vertical Hierarchy Layout",
    titleRadial: "Radial Network Layout",
    cameraLens: "Camera:",
    cameraFocusSelected: (title: string) => `Focus camera on selected node: "${title}"`,
    cameraFocusPrompt: "Select any node on the whiteboard to focus the camera",
    cameraFitScreen: "Fit Screen (Zoom out and center the whole graph)",
    cameraFocusRoot: "Focus on the initial Search Root node",
    // Sidebar Details
    wikipediaItem: "WIKIPEDIA ITEM",
    langPrefix: "Lang: ",
    loadingSummary: "Loading extract from Wikipedia...",
    failedSummary: "Failed to load summary for this Wikipedia article.",
    noSummary: "No summary text is available for this article.",
    notFoundSummary: "This article might not exist or has been removed.",
    statsTitle: "Whiteboard Statistics",
    linkedCount: "Connections",
    connectedSuffix: "",
    loadingStatus: "Load Status",
    statusLoading: "Loading...",
    statusDeadEnd: "No Outgoing Links",
    statusLoaded: "Expanded",
    statusNotLoaded: "Unloaded",
    keepExpanded: "Keep branch expanded (Lock)",
    expandNetwork: "Expand node network",
    researchNode: "Re-explore node",
    researchTooltip: "Manually re-search this node from Wikipedia, forcing it to refresh all links and summary text",
    setAsRoot: "Set as Explore Center",
    readFullArticle: "Read Full Wikipedia Article",
    removeNode: "Delete Node from Whiteboard",
    // User auth
    displayNamePlaceholder: "Logged In",
    mySavedHistory: "My Cloud Archives",
    logout: "Log Out",
    loginGoogle: "Sign in with Google",
    needApiConfig: "Firebase config needed",
    firebaseEnvError: "Please configure Firebase environment variables. Create a .env file in the root directory and fill in the parameters.",
    quickConfigGuide: "Quick Setup Guide:",
    quickStep1: "Copy .env.example to .env in the root directory",
    quickStep2: "Enable Google Auth in your Firebase Console",
    quickStep3: "Fill in the API keys and fields in the .env file",
    quickStep4: "Restart the Vite dev server (npm run dev)",
    understandBtn: "Got it",
    // Saved history modal
    historyTitle: "My History",
    loadingSaved: "Loading your saves...",
    loadSavedError: "Failed to load saved archives. Make sure database rules are set up correctly.",
    retryBtn: "Refresh",
    noSavedTitle: "No Archives Saved",
    noSavedDesc: "Explore Wikipedia articles and click 'Save Now' in the settings panel to create an archive.",
    createdAt: "Created: ",
    lastModified: "Modified: ",
    nodeCountLabel: "Nodes: ",
    linkCountLabel: "Links: ",
    layoutLabel: "Layout: ",
    layoutHierarchicalShort: "Hierarchy",
    layoutRadialShort: "Radial",
    layoutFreeShort: "Free",
    deleteSavedTooltip: "Delete this archive",
    confirmDeleteSaved: "Are you sure you want to delete this archive? This action cannot be undone.",
    deleteFailed: "Failed to delete, please try again later.",
    closeBtn: "Close",
    unnamedGraph: "Untitled",
    unknownTime: "Unknown Time",
    // Context Menu
    exploreNode: "Expand Links",
    // History panel
    historyTimelineTitle: "Exploration History",
    depthPrefix: "Depth: ",
    // Sub articles
    hiddenArticlesTitle: "Hidden Linked Articles",
    hiddenCount: (len: number) => `${len} items hidden`,
    searchHiddenPlaceholder: "Search hidden articles...",
    selectAddLabel: "Select article to add:",
    noMatchingHidden: "No matching hidden articles",
    addAndExplore: "Add to Canvas & Explore",
    // Hover card
    hoverCardLoading: "Loading preview...",
    hoverFailed: "Failed to load preview for this article.",
    unlockExpand: "Unlock this branch",
    lockExpand: "Lock expand this branch",
  }
};

interface LanguageContextProps {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: TranslationDict;
}

const LanguageContext = createContext<LanguageContextProps | undefined>(undefined);

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguageState] = useState<Language>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('wiki-vis-language');
      if (saved === 'zh' || saved === 'en') return saved;
      
      // Auto-detect browser preferred language
      const browserLang = navigator.language.toLowerCase();
      if (browserLang.startsWith('en')) return 'en';
    }
    return 'zh';
  });

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    localStorage.setItem('wiki-vis-language', lang);
  };

  const t = translations[language];

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};
