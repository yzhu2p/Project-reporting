import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Moon, Sun } from 'lucide-react';

export default function Layout({ children, theme, setTheme }) {
  const navigate = useNavigate();
  const location = useLocation();
  
  const pathParts = location.pathname.split('/');
  const activeReport = pathParts[2] || 'backorders';
  const currentParam = pathParts[3] || '';

  const handleTabClick = (tab) => {
    if (currentParam) {
      navigate(`/project/${tab}/${currentParam}`);
    } else {
      navigate(`/project/${tab}`);
    }
  };

  const getHeaderTitle = () => {
    return activeReport === 'costing' 
      ? 'Project Costing Report' 
      : 'Project Component Backorder Report';
  };

  const getHeaderSubtitle = () => {
    return activeReport === 'costing'
      ? 'Detailed project line-item cost estimations'
      : 'Track and resolve components requiring attention';
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl relative text-proax-navy dark:text-slate-100 font-sans min-h-screen">
      
      {/* Light / Dark Mode toggle button floating in top-right */}
      <div className="absolute top-4 right-4 z-50">
        <button
          onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
          className="p-2 rounded-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm text-slate-655 dark:text-slate-350 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors focus:outline-none"
          title={`Switch to ${theme === 'light' ? 'Dark' : 'Light'} Mode`}
        >
          {theme === 'light' ? <Moon className="w-5 h-5 text-slate-650" /> : <Sun className="w-5 h-5 text-amber-400" />}
        </button>
      </div>

      <header className="mb-6 text-center">
        <h1 className="text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-blue-500 to-emerald-500 dark:from-blue-400 dark:to-emerald-400 mb-2 tracking-tight">
          {getHeaderTitle()}
        </h1>
        <p className="text-proax-deep dark:text-slate-400 text-sm font-medium">
          {getHeaderSubtitle()}
        </p>
      </header>

      {/* Navigation Tab Bar */}
      <div className="flex justify-center mb-10">
        <div className="bg-slate-100 dark:bg-slate-850 p-1.5 rounded-full flex space-x-1 shadow-inner border border-slate-200/50 dark:border-slate-800/50">
          <button
            onClick={() => handleTabClick('backorders')}
            className={`px-6 py-2 rounded-full text-sm font-semibold transition-all duration-200 focus:outline-none ${
              activeReport === 'backorders'
                ? 'bg-white dark:bg-slate-900 text-proax-primary dark:text-blue-400 shadow-sm'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
            }`}
          >
            Backorders
          </button>
          <button
            onClick={() => handleTabClick('costing')}
            className={`px-6 py-2 rounded-full text-sm font-semibold transition-all duration-200 focus:outline-none ${
              activeReport === 'costing'
                ? 'bg-white dark:bg-slate-900 text-proax-primary dark:text-blue-400 shadow-sm'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
            }`}
          >
            Project Costing
          </button>
        </div>
      </div>

      {children}
    </div>
  );
}
