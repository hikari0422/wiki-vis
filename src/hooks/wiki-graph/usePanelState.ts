import { useState, useEffect } from 'react';

export function usePanelState() {
  const [isSidebarOpen, setIsSidebarOpen] = useState<boolean>(false);
  
  const isInitialMobile = typeof window !== 'undefined' ? window.innerWidth < 768 : false;
  const [isMobile, setIsMobile] = useState<boolean>(isInitialMobile);
  const [isHistoryOpen, setIsHistoryOpen] = useState<boolean>(!isInitialMobile);
  const [isSubArticlesOpen, setIsSubArticlesOpen] = useState<boolean>(!isInitialMobile);

  useEffect(() => {
    const checkMobile = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
    };
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const toggleHistory = () => {
    setIsHistoryOpen((prev) => {
      const next = !prev;
      if (next && isMobile) {
        setIsSubArticlesOpen(false);
        setIsSidebarOpen(false);
      }
      return next;
    });
  };

  const toggleSubArticles = () => {
    setIsSubArticlesOpen((prev) => {
      const next = !prev;
      if (next && isMobile) {
        setIsHistoryOpen(false);
        setIsSidebarOpen(false);
      }
      return next;
    });
  };

  return {
    isSidebarOpen,
    setIsSidebarOpen,
    isMobile,
    isHistoryOpen,
    setIsHistoryOpen,
    isSubArticlesOpen,
    setIsSubArticlesOpen,
    toggleHistory,
    toggleSubArticles,
  };
}
