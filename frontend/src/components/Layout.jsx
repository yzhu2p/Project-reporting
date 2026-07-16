import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Moon, Sun, Briefcase, ShoppingBag, LayoutDashboard } from 'lucide-react';

export default function Layout({ children, theme, setTheme }) {
  const navigate = useNavigate();
  const location = useLocation();
  
  const pathParts = location.pathname.split('/');
  const activeReport = pathParts[1] || 'backorders';
  const currentParam = pathParts[2] || '';
  
  const handleTabClick = (tab) => {
    if (currentParam) {
      navigate(`/${tab}/${currentParam}`);
    } else {
      navigate(`/${tab}`);
    }
  };

  const handleProjectToolsClick = () => {
    if (activeReport !== 'backorders' && activeReport !== 'costing') {
      if (currentParam) {
        navigate(`/backorders/${currentParam}`);
      } else {
        navigate('/backorders');
      }
    }
  };

  const getHeaderTitle = () => {
    if (activeReport === 'costing') return 'Project Costing';
    if (activeReport === 'customer-pos') return 'Customer Purchase Orders';
    return 'Component Backorder Report';
  };

  const getHeaderSubtitle = () => {
    if (activeReport === 'costing') return 'Detailed project line-item cost estimations and components';
    if (activeReport === 'customer-pos') return 'Biweekly tracking of tracked component customer sales orders';
    return 'Track and resolve components requiring transfer or purchase attention';
  };

  const isProjectTool = activeReport === 'backorders' || activeReport === 'costing';

  return (
    <div className="min-h-screen bg-[#EFF3F9] dark:bg-slate-950 text-slate-800 dark:text-slate-100 font-sans transition-colors duration-200">
      
      {/* Premium Top Navigation Bar */}
      <header className="w-full border-b border-slate-200/80 dark:border-slate-800/80 bg-white dark:bg-slate-900 shadow-sm">
        <div className="w-full max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          
          {/* Navigation Links (Aligned left now) */}
          <nav className="flex space-x-1 sm:space-x-2">
            <button
              onClick={handleProjectToolsClick}
              className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all flex items-center space-x-2 focus:outline-none ${
                isProjectTool
                  ? 'bg-blue-50 dark:bg-blue-950/40 text-proax-primary dark:text-blue-400 shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100/60 dark:hover:bg-slate-850 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              <Briefcase className="w-4 h-4" />
              <span className="hidden sm:inline">Project Reports</span>
              <span className="inline sm:hidden">Projects</span>
            </button>
            
            <button
              onClick={() => navigate('/customer-pos')}
              className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all flex items-center space-x-2 focus:outline-none ${
                activeReport === 'customer-pos'
                  ? 'bg-blue-50 dark:bg-blue-950/40 text-proax-primary dark:text-blue-400 shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100/60 dark:hover:bg-slate-850 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              <ShoppingBag className="w-4 h-4" />
              <span>Customer POs</span>
            </button>
          </nav>

          {/* Theme Switcher */}
          <div>
            <button
              onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
              className="p-2 rounded-lg bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors focus:outline-none shadow-sm"
              title={`Switch to ${theme === 'light' ? 'Dark' : 'Light'} Mode`}
            >
              {theme === 'light' ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4 text-amber-400" />}
            </button>
          </div>
          
        </div>
      </header>

      {/* Main Page Layout Container */}
      <main className="w-full max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        {/* Centered Header Block */}
        <header className="mb-6 text-center">
          <h1 className="text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-blue-500 to-emerald-500 dark:from-blue-400 dark:to-emerald-400 mb-2 tracking-tight">
            {getHeaderTitle()}
          </h1>
          <p className="text-proax-deep dark:text-slate-400 text-sm font-medium">
            {getHeaderSubtitle()}
          </p>
        </header>

        {/* Sub-Navigation Tabs (Visible only inside Project Reports, Centered) */}
        {isProjectTool && (
          <div className="flex justify-center border-b border-slate-250 dark:border-slate-800 mb-8">
            <div className="flex space-x-6">
              <button
                onClick={() => handleTabClick('backorders')}
                className={`pb-3 px-2 text-sm font-semibold border-b-2 transition-all duration-200 focus:outline-none -mb-[2px] ${
                  activeReport === 'backorders'
                    ? 'border-proax-primary text-proax-primary dark:border-blue-400 dark:text-blue-400'
                    : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'
                }`}
              >
                Backorder Report
              </button>
              <button
                onClick={() => handleTabClick('costing')}
                className={`pb-3 px-2 text-sm font-semibold border-b-2 transition-all duration-200 focus:outline-none -mb-[2px] ${
                  activeReport === 'costing'
                    ? 'border-proax-primary text-proax-primary dark:border-blue-400 dark:text-blue-400'
                    : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'
                }`}
              >
                Project Costing
              </button>
            </div>
          </div>
        )}

        {/* Page Content */}
        <div className="w-full">
          {children}
        </div>
        
      </main>

    </div>
  );
}
