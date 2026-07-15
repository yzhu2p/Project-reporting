import React from 'react';
import { ClipboardList, AlertTriangle, Calendar, ShoppingCart, ShoppingBag } from 'lucide-react';

const TRACKED_ITEMS = [
  { partNo: 'HPN12964099', desc: 'XT4 (Revision 3)' },
  { partNo: 'HPN12964068', desc: 'XT5 (Revision 3)' },
  { partNo: 'HPN12809364', desc: 'XT6 (Revision 3)' },
  { partNo: 'HPN13046137', desc: 'XT5 (4 pole)' },
  { partNo: 'HPN13046074', desc: 'XT4 (4 pole)' },
  { partNo: 'HPN14068686', desc: 'XT2 (Revision 2)' },
];

export default function CustomerPOs() {
  return (
    <div className="w-full space-y-8 animate-fade-in">
      {/* Alert Warning for Pending Query */}
      <div className="bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 text-amber-800 dark:text-amber-400 p-4 rounded-xl flex items-start space-x-3 max-w-3xl mx-auto shadow-sm">
        <AlertTriangle className="h-5 w-5 mt-0.5 flex-shrink-0 text-amber-600 dark:text-amber-450" />
        <div>
          <h4 className="font-bold text-sm">Database Query Connection Pending</h4>
          <p className="text-xs mt-1 text-slate-655 dark:text-slate-400 leading-relaxed">
            The biweekly SQL query configuration for tracking active customer sales orders and YTD sales volume is currently pending. The items listed below are pre-registered for tracking.
          </p>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-6 sm:grid-cols-3 max-w-5xl mx-auto">
        <div className="bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-sm flex items-center space-x-4">
          <div className="p-3.5 rounded-lg bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400">
            <ShoppingBag className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs text-slate-500 dark:text-slate-400 font-semibold uppercase tracking-wider block">Active Customer POs</span>
            <span className="text-xl font-bold text-proax-navy dark:text-slate-100">Pending</span>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-sm flex items-center space-x-4">
          <div className="p-3.5 rounded-lg bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
            <ShoppingCart className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs text-slate-500 dark:text-slate-400 font-semibold uppercase tracking-wider block">YTD Qty Sold (SO Date)</span>
            <span className="text-xl font-bold text-proax-navy dark:text-slate-100">Pending</span>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-sm flex items-center space-x-4">
          <div className="p-3.5 rounded-lg bg-purple-50 dark:bg-purple-500/10 text-purple-600 dark:text-purple-400">
            <Calendar className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs text-slate-500 dark:text-slate-400 font-semibold uppercase tracking-wider block">Last Biweekly Check</span>
            <span className="text-xl font-bold text-proax-navy dark:text-slate-100">Pending</span>
          </div>
        </div>
      </div>

      {/* Main Table Card */}
      <div className="bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 rounded-xl shadow-md dark:shadow-xl max-w-5xl mx-auto overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-550/5 dark:bg-slate-900/30">
          <div className="flex items-center space-x-2">
            <ClipboardList className="w-5 h-5 text-proax-primary" />
            <h2 className="text-lg font-bold text-proax-navy dark:text-slate-200">
              Tracked Items List
            </h2>
          </div>
          <span className="text-xs font-semibold bg-blue-50 dark:bg-blue-900/30 text-proax-primary dark:text-blue-450 px-2.5 py-1 rounded-full">
            Active Tracking List
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left border-collapse">
            <thead className="bg-slate-100 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 text-xs text-slate-600 dark:text-slate-400 uppercase tracking-wider">
              <tr>
                <th scope="col" className="px-6 py-4 font-semibold">Part Number</th>
                <th scope="col" className="px-6 py-4 font-semibold">Description</th>
                <th scope="col" className="px-6 py-4 text-center font-semibold">Active Customer POs</th>
                <th scope="col" className="px-6 py-4 text-center font-semibold">Sold This Year (YTD)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
              {TRACKED_ITEMS.map((item) => (
                <tr key={item.partNo} className="hover:bg-slate-50 dark:hover:bg-slate-800/10 transition-colors">
                  <td className="px-6 py-4 font-bold text-proax-navy dark:text-slate-100 font-mono">
                    {item.partNo}
                  </td>
                  <td className="px-6 py-4 font-medium">
                    {item.desc}
                  </td>
                  <td className="px-6 py-4 text-center text-slate-400 font-semibold italic">
                    Pending Connection
                  </td>
                  <td className="px-6 py-4 text-center text-slate-400 font-semibold italic">
                    Pending Connection
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
