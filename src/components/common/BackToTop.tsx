import React, { useState, useEffect } from 'react';
import { ChevronUp } from 'lucide-react';

export const BackToTop: React.FC = () => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const toggleVisibility = () => {
      if (window.scrollY > 350) {
        setIsVisible(true);
      } else {
        setIsVisible(false);
      }
    };

    window.addEventListener('scroll', toggleVisibility, { passive: true });
    return () => window.removeEventListener('scroll', toggleVisibility);
  }, []);

  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: 'smooth',
    });
  };

  return (
    <div
      className={`fixed bottom-6 right-6 sm:bottom-8 sm:right-8 z-40 transition-all duration-300 ${
        isVisible 
          ? 'opacity-100 translate-y-0 scale-100 pointer-events-auto' 
          : 'opacity-0 translate-y-6 scale-90 pointer-events-none'
      }`}
    >
      <button
        onClick={scrollToTop}
        aria-label="Back to top"
        className="group relative w-12 h-12 rounded-xl bg-slate-900/90 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-700 hover:border-blue-500 shadow-2xl hover:shadow-glow-blue flex items-center justify-center transition-all duration-300 backdrop-blur-xl active:scale-95"
      >
        {/* Glow pulse behind button */}
        <span className="absolute inset-0 rounded-xl bg-blue-500/10 group-hover:bg-blue-500/20 transition-all"></span>

        {/* Tactical corner crosshairs */}
        <div className="absolute top-0.5 left-0.5 w-1.5 h-1.5 border-t border-l border-blue-400 opacity-60 group-hover:opacity-100"></div>
        <div className="absolute top-0.5 right-0.5 w-1.5 h-1.5 border-t border-r border-blue-400 opacity-60 group-hover:opacity-100"></div>
        <div className="absolute bottom-0.5 left-0.5 w-1.5 h-1.5 border-b border-l border-blue-400 opacity-60 group-hover:opacity-100"></div>
        <div className="absolute bottom-0.5 right-0.5 w-1.5 h-1.5 border-b border-r border-blue-400 opacity-60 group-hover:opacity-100"></div>

        {/* Icon */}
        <ChevronUp className="w-5 h-5 text-blue-400 group-hover:text-white group-hover:-translate-y-1 transition-all duration-200" />

        {/* Tooltip on hover */}
        <span className="absolute -top-9 left-1/2 -translate-x-1/2 px-2.5 py-1 rounded-md bg-slate-900 border border-slate-700 text-[10px] font-mono-data text-slate-200 uppercase tracking-wider opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap shadow-lg">
          Top
        </span>
      </button>
    </div>
  );
};
