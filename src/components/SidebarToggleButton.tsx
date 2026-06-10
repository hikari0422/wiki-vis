import React from 'react';
import { Info } from 'lucide-react';

interface SidebarToggleButtonProps {
  onClick: () => void;
}

export const SidebarToggleButton: React.FC<SidebarToggleButtonProps> = ({ onClick }) => {
  return (
    <button
      onClick={onClick}
      className="fixed right-6 top-1/2 -translate-y-1/2 z-30 p-3.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-full shadow-lg hover:shadow-xl hover:scale-110 active:scale-95 cursor-pointer transition-all duration-300 flex items-center justify-center border border-indigo-500/20"
      title="開啟詳細資訊面板"
    >
      <Info className="w-5 h-5" />
    </button>
  );
};
