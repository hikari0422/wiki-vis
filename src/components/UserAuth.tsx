import React, { useState, useRef, useEffect } from 'react';
import type { User } from 'firebase/auth';
import { LogOut, User as UserIcon, Mail, AlertTriangle, ShieldAlert, FolderOpen } from 'lucide-react';
import { signInWithGoogle, logout, isConfigured, type SavedGraph } from '../services/firebase';
import { SavedHistoryModal } from './SavedHistoryModal';

interface UserAuthProps {
  user: User | null;
  onLoadGraph: (graph: SavedGraph) => void;
}

export const UserAuth: React.FC<UserAuthProps> = ({ user, onLoadGraph }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogin = async () => {
    if (!isConfigured) {
      setError('請先設定您的 Firebase 環境變數。請在根目錄建立 .env 檔案並填入參數。');
      setIsOpen(true); // Open configuration helper dropdown
      return;
    }

    setLoading(true);
    setError(null);
    try {
      await signInWithGoogle();
      setIsOpen(false);
    } catch (err: any) {
      console.error(err);
      setError(err?.message || '登入失敗，請稍後再試。');
      setIsOpen(true);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    setLoading(true);
    try {
      await logout();
      setIsOpen(false);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Google SVG Icon
  const GoogleIcon = () => (
    <svg className="w-4 h-4 mr-2" viewBox="0 0 24 24" width="24" height="24" xmlns="http://www.w3.org/2000/svg">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" fill="#FBBC05" />
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" fill="#EA4335" />
    </svg>
  );

  return (
    <div className="relative" ref={dropdownRef}>
      {user ? (
        // Logged In Status
        <div className="relative">
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="flex items-center gap-2 p-1.5 bg-white/85 hover:bg-white dark:bg-slate-900/80 dark:hover:bg-slate-900 backdrop-blur-xl border border-slate-200/60 dark:border-slate-800/60 rounded-full shadow-md hover:shadow-lg hover:scale-105 active:scale-95 transition-all duration-300 cursor-pointer pointer-events-auto"
            title={user.displayName || '使用者資訊'}
          >
            {user.photoURL ? (
              <img
                src={user.photoURL}
                alt={user.displayName || '頭像'}
                className="w-8 h-8 rounded-full border border-slate-100 dark:border-slate-800"
                referrerPolicy="no-referrer"
              />
            ) : (
              <div className="w-8 h-8 rounded-full bg-indigo-600 dark:bg-indigo-500 text-white flex items-center justify-center font-bold text-sm">
                {(user.displayName || user.email || 'U').charAt(0).toUpperCase()}
              </div>
            )}
            <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 pr-2 max-w-[100px] truncate hidden sm:inline-block">
              {user.displayName || '已登入'}
            </span>
          </button>

          {/* Dropdown Menu */}
          {isOpen && (
            <div className="absolute right-0 mt-2.5 w-64 bg-white/90 dark:bg-slate-900/90 backdrop-blur-2xl border border-slate-200/50 dark:border-slate-800/50 rounded-2xl shadow-xl p-4 flex flex-col gap-3.5 pointer-events-auto animate-in slide-in-from-top-2 duration-200">
              {/* User basic info */}
              <div className="flex items-center gap-3 border-b border-slate-100 dark:border-slate-800 pb-3">
                {user.photoURL ? (
                  <img
                    src={user.photoURL}
                    alt={user.displayName || '頭像'}
                    className="w-10 h-10 rounded-full border border-slate-100 dark:border-slate-800"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-indigo-600 dark:bg-indigo-500 text-white flex items-center justify-center font-bold text-base shrink-0">
                    {(user.displayName || user.email || 'U').charAt(0).toUpperCase()}
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <h4 className="text-sm font-bold text-slate-800 dark:text-slate-100 truncate flex items-center gap-1.5">
                    <UserIcon className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500 shrink-0" />
                    <span className="truncate">{user.displayName || '未設定名稱'}</span>
                  </h4>
                  <p className="text-[11px] font-medium text-slate-400 dark:text-slate-500 truncate flex items-center gap-1.5 mt-0.5">
                    <Mail className="w-3 h-3 text-slate-400 dark:text-slate-500 shrink-0" />
                    <span className="truncate">{user.email}</span>
                  </p>
                </div>
              </div>

              {/* History list button */}
              <button
                onClick={() => {
                  setIsHistoryOpen(true);
                  setIsOpen(false); // Close dropdown
                }}
                className="w-full flex items-center justify-center gap-2 py-2 px-4 rounded-xl text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:text-white dark:hover:text-white bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-100/50 dark:border-indigo-900/50 hover:border-indigo-100 transition-all duration-300 active:scale-95 cursor-pointer"
              >
                <FolderOpen className="w-4 h-4" />
                <span>我的歷史存檔</span>
              </button>

              {/* Action Buttons */}
              <button
                onClick={handleLogout}
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 py-2 px-4 rounded-xl text-xs font-bold text-rose-600 dark:text-rose-400 hover:text-white dark:hover:text-white bg-rose-50 dark:bg-rose-950/40 border border-rose-100/50 dark:border-rose-900/50 hover:border-rose-600 transition-all duration-300 active:scale-95 cursor-pointer disabled:opacity-50"
              >
                {loading ? (
                  <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin"></span>
                ) : (
                  <>
                    <LogOut className="w-4 h-4" />
                    <span>登出帳戶</span>
                  </>
                )}
              </button>
            </div>
          )}
        </div>
      ) : (
        // Logged Out / Not Logged In
        <div className="relative">
          <button
            onClick={handleLogin}
            disabled={loading}
            className="flex items-center justify-center py-2.5 px-4 bg-white/90 hover:bg-white dark:bg-slate-900/80 hover:text-indigo-700 dark:hover:text-indigo-400 border border-slate-200/50 dark:border-slate-800/50 rounded-2xl shadow-md hover:shadow-lg hover:scale-105 active:scale-95 transition-all duration-300 cursor-pointer pointer-events-auto text-xs font-extrabold text-slate-700 dark:text-slate-200"
          >
            {loading ? (
              <span className="w-4 h-4 border-2 border-indigo-600 dark:border-indigo-500 border-t-transparent rounded-full animate-spin"></span>
            ) : (
              <>
                <GoogleIcon />
                <span>使用 Google 登入</span>
              </>
            )}
          </button>

          {/* Configuration / Error Helper */}
          {isOpen && error && (
            <div className="absolute right-0 mt-2.5 w-72 bg-amber-50/95 dark:bg-amber-950/95 backdrop-blur-2xl border border-amber-200/50 dark:border-amber-900/50 rounded-2xl shadow-xl p-4 flex flex-col gap-3 pointer-events-auto animate-in slide-in-from-top-2 duration-200">
              <div className="flex gap-2">
                <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                <div className="flex flex-col gap-1">
                  <h4 className="text-xs font-bold text-amber-800 dark:text-amber-300">需要設定 API</h4>
                  <p className="text-[11px] leading-relaxed text-amber-700 dark:text-amber-400 font-medium">{error}</p>
                </div>
              </div>

              <div className="bg-white/60 dark:bg-slate-900/60 rounded-xl p-2.5 border border-amber-200/20 dark:border-amber-900/20 text-[10px] font-semibold text-slate-500 dark:text-slate-450 flex flex-col gap-1.5">
                <span className="text-amber-800 dark:text-amber-300 font-bold flex items-center gap-1">
                  <ShieldAlert className="w-3.5 h-3.5" /> 快速設定指南：
                </span>
                <ol className="list-decimal list-inside flex flex-col gap-1">
                  <li>請複製專案根目錄的 <code className="bg-slate-100 dark:bg-slate-800 px-1 py-0.5 rounded">.env.example</code> 為 <code className="bg-slate-100 dark:bg-slate-800 px-1 py-0.5 rounded">.env</code></li>
                  <li>前往 Firebase 啟用 Google Auth</li>
                  <li>填入對應的 API 金鑰與相關欄位</li>
                  <li>重啟 Vite 開發伺服器 (<code className="bg-slate-100 dark:bg-slate-800 px-1 py-0.5 rounded">npm run dev</code>)</li>
                </ol>
              </div>

              <button
                onClick={() => setIsOpen(false)}
                className="w-full py-1.5 px-3 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-[10px] font-bold transition-colors cursor-pointer"
              >
                我瞭解了
              </button>
            </div>
          )}
        </div>
      )}

      {/* Cloud History Saved Modal */}
      {user && (
        <SavedHistoryModal
          userId={user.uid}
          isOpen={isHistoryOpen}
          onClose={() => setIsHistoryOpen(false)}
          onLoadGraph={(graph) => {
            onLoadGraph(graph);
            setIsHistoryOpen(false);
          }}
        />
      )}
    </div>
  );
};
