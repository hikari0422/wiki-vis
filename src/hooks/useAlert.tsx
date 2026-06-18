import React, { createContext, useContext, useState, useCallback } from 'react';
import { AlertTriangle, Info, HelpCircle, CheckCircle2 } from 'lucide-react';
import { useLanguage } from './useLanguage';

interface AlertState {
  message: string;
  type: 'alert' | 'confirm';
  title?: string;
  iconType?: 'info' | 'warning' | 'error' | 'success';
  resolve: (value: boolean) => void;
}

interface AlertContextProps {
  alert: (message: string, title?: string, iconType?: 'info' | 'warning' | 'error' | 'success') => Promise<void>;
  confirm: (message: string, title?: string, iconType?: 'info' | 'warning' | 'error' | 'success') => Promise<boolean>;
}

const AlertContext = createContext<AlertContextProps | undefined>(undefined);

export const AlertProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, setState] = useState<AlertState | null>(null);
  const { language } = useLanguage();

  const alert = useCallback((message: string, title?: string, iconType: 'info' | 'warning' | 'error' | 'success' = 'info') => {
    return new Promise<void>((resolve) => {
      setState({
        message,
        type: 'alert',
        title,
        iconType,
        resolve: () => {
          setState(null);
          resolve();
        },
      });
    });
  }, []);

  const confirm = useCallback((message: string, title?: string, iconType: 'info' | 'warning' | 'error' | 'success' = 'warning') => {
    return new Promise<boolean>((resolve) => {
      setState({
        message,
        type: 'confirm',
        title,
        iconType,
        resolve: (value: boolean) => {
          setState(null);
          resolve(value);
        },
      });
    });
  }, []);

  const handleClose = (value: boolean) => {
    if (state) {
      state.resolve(value);
    }
  };

  const getIcon = () => {
    if (!state) return null;
    const size = "w-10 h-10";
    switch (state.iconType) {
      case 'warning':
      case 'error':
        return <AlertTriangle className={`${size} text-amber-500 dark:text-amber-400`} />;
      case 'success':
        return <CheckCircle2 className={`${size} text-emerald-500 dark:text-emerald-400`} />;
      case 'info':
      default:
        return state.type === 'confirm' 
          ? <HelpCircle className={`${size} text-indigo-500 dark:text-indigo-400`} />
          : <Info className={`${size} text-indigo-500 dark:text-indigo-400`} />;
    }
  };

  const isZh = language === 'zh';
  const defaultConfirmText = isZh ? '確定' : 'OK';
  const defaultCancelText = isZh ? '取消' : 'Cancel';
  const defaultAlertTitle = isZh ? '系統提示' : 'System Notification';
  const defaultConfirmTitle = isZh ? '確認操作' : 'Confirm Action';

  return (
    <AlertContext.Provider value={{ alert, confirm }}>
      {children}
      {state && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-900/40 dark:bg-slate-950/60 backdrop-blur-sm pointer-events-auto animate-backdrop-fade">
          {/* Modal Container */}
          <div className="relative w-full max-w-sm bg-white/95 dark:bg-slate-900/95 backdrop-blur-2xl border border-slate-200/60 dark:border-slate-800/60 rounded-3xl shadow-2xl p-6 flex flex-col items-center gap-4 animate-modal-pop text-center">
            
            {/* Icon Wrapper */}
            <div className="p-3 bg-slate-50 dark:bg-slate-950/40 rounded-2xl border border-slate-100 dark:border-slate-800/30">
              {getIcon()}
            </div>

            {/* Content text */}
            <div className="flex flex-col gap-1 w-full">
              <h3 className="text-base font-extrabold text-slate-800 dark:text-slate-200 tracking-tight">
                {state.title || (state.type === 'confirm' ? defaultConfirmTitle : defaultAlertTitle)}
              </h3>
              <p className="text-sm font-semibold text-slate-500 dark:text-slate-400 leading-relaxed mt-1 break-all">
                {state.message}
              </p>
            </div>

            {/* Actions */}
            <div className="flex w-full gap-2.5 mt-2 justify-center">
              {state.type === 'confirm' && (
                <button
                  onClick={() => handleClose(false)}
                  className="flex-1 py-2.5 px-4 bg-slate-100 hover:bg-slate-200/80 dark:bg-slate-800 dark:hover:bg-slate-700/80 text-slate-600 dark:text-slate-300 rounded-2xl text-xs font-bold transition-all active:scale-95 cursor-pointer border border-transparent dark:border-slate-850"
                >
                  {defaultCancelText}
                </button>
              )}
              <button
                onClick={() => handleClose(true)}
                className={`py-2.5 px-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl text-xs font-bold transition-all active:scale-95 cursor-pointer shadow-lg hover:shadow-indigo-500/20 ${
                  state.type === 'confirm' ? 'flex-1' : 'w-2/3'
                }`}
              >
                {defaultConfirmText}
              </button>
            </div>

          </div>
        </div>
      )}
    </AlertContext.Provider>
  );
};

export const useAlert = () => {
  const context = useContext(AlertContext);
  if (!context) {
    throw new Error('useAlert must be used within an AlertProvider');
  }
  return context;
};
