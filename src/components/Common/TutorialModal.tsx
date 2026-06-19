import React, { useState } from 'react';
import { BookOpen, X } from 'lucide-react';
import readmeRaw from '../../../README.md?raw';

export function TutorialModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  if (!isOpen) return null;

  const renderMarkdown = (text: string) => {
    const lines = text.split('\n');
    const elements: React.ReactNode[] = [];
    let listItems: React.ReactNode[] = [];
    let isOrdered = false;

    const flushList = () => {
      if (listItems.length > 0) {
        if (isOrdered) {
          elements.push(
            <ol key={`ol-${elements.length}`} className="list-decimal pl-6 mb-4 space-y-2 text-slate-700 dark:text-slate-300">
              {[...listItems]}
            </ol>
          );
        } else {
          elements.push(
            <ul key={`ul-${elements.length}`} className="list-disc pl-6 mb-4 space-y-2 text-slate-700 dark:text-slate-300">
              {[...listItems]}
            </ul>
          );
        }
        listItems = [];
      }
    };

    const parseInline = (lineText: string) => {
      // Very basic inline parsing for bold text
      return lineText.replace(/\*\*([^*]+)\*\*/g, '<strong class="font-bold text-slate-900 dark:text-slate-100">$1</strong>');
    };

    lines.forEach((line, index) => {
      const trimmed = line.trim();
      if (!trimmed) {
        flushList();
        return;
      }

      // Headings
      if (trimmed.startsWith('### ')) {
        flushList();
        elements.push(
          <h3 key={index} className="text-xl font-bold mt-6 mb-3 text-slate-800 dark:text-slate-200">
            {trimmed.replace('### ', '')}
          </h3>
        );
        return;
      }
      if (trimmed.startsWith('## ')) {
        flushList();
        elements.push(
          <h2 key={index} className="text-2xl font-bold mt-8 mb-4 border-b border-slate-200 dark:border-slate-700 pb-2 text-slate-800 dark:text-slate-200">
            {trimmed.replace('## ', '')}
          </h2>
        );
        return;
      }
      if (trimmed.startsWith('# ')) {
        flushList();
        elements.push(
          <h1 key={index} className="text-3xl font-extrabold mt-4 mb-6 text-slate-900 dark:text-slate-100">
            {trimmed.replace('# ', '')}
          </h1>
        );
        return;
      }
      if (trimmed === '---') {
        flushList();
        elements.push(<hr key={index} className="my-8 border-slate-200 dark:border-slate-700" />);
        return;
      }

      // Lists
      if (trimmed.match(/^-\s/)) {
        isOrdered = false;
        listItems.push(
          <li key={index} dangerouslySetInnerHTML={{ __html: parseInline(trimmed.replace(/^-\s/, '')) }} />
        );
        return;
      }
      if (trimmed.match(/^\d+\.\s/)) {
        isOrdered = true;
        listItems.push(
          <li key={index} dangerouslySetInnerHTML={{ __html: parseInline(trimmed.replace(/^\d+\.\s/, '')) }} />
        );
        return;
      }

      // Images
      const imgMatch = trimmed.match(/!\[([^\]]*)\]\(([^)]+)\)/);
      if (imgMatch) {
        flushList();
        const alt = imgMatch[1];
        let src = imgMatch[2];
        // Convert markdown local path to web path
        if (src.startsWith('./public/')) {
          src = src.replace('./public/', '/');
        } else if (src.startsWith('public/')) {
          src = src.replace('public/', '/');
        }
        elements.push(
          <div key={index} className="my-6 rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700 shadow-md bg-slate-50 dark:bg-slate-800">
            <img src={src} alt={alt} className="w-full h-auto object-contain max-h-[500px]" loading="lazy" />
          </div>
        );
        return;
      }

      // Paragraphs
      flushList();
      elements.push(
        <p key={index} className="mb-4 leading-relaxed text-slate-700 dark:text-slate-300" dangerouslySetInnerHTML={{ __html: parseInline(trimmed) }} />
      );
    });

    flushList();
    return elements;
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 pointer-events-auto">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity" 
        onClick={onClose} 
      />
      
      {/* Modal */}
      <div className="relative w-full max-w-4xl max-h-[85vh] flex flex-col bg-white dark:bg-slate-900 rounded-2xl shadow-2xl overflow-hidden">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 shrink-0">
          <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400">
            <BookOpen className="w-6 h-6" />
            <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-200">網站教學</h2>
          </div>
          <button 
            onClick={onClose}
            className="p-2 rounded-full hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-500 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-6 sm:p-8">
          <div className="max-w-3xl mx-auto pb-8">
            {renderMarkdown(readmeRaw)}
          </div>
        </div>

      </div>
    </div>
  );
}

export function TutorialButton({ onClick, className = '' }: { onClick: () => void, className?: string }) {
  return (
    <button
      onClick={onClick}
      className={`fixed z-40 p-3 bg-white/80 dark:bg-slate-800/80 backdrop-blur-xl border border-slate-200/50 dark:border-slate-700/50 shadow-lg rounded-full hover:bg-slate-50 dark:hover:bg-slate-700 transition-all hover:scale-105 active:scale-95 group flex items-center justify-center cursor-pointer ${className}`}
      title="網站教學"
    >
      <BookOpen className="w-5 h-5 text-indigo-600 dark:text-indigo-400 group-hover:text-indigo-700 dark:group-hover:text-indigo-300" />
    </button>
  );
}
