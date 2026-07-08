import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate, useParams } from 'react-router-dom';
import { 
  Search, 
  AlertCircle, 
  Download,
  DollarSign,
  Package,
  CheckSquare,
  RefreshCw
} from 'lucide-react';

export default function ProjectCosting() {
  const [orderNumber, setOrderNumber] = useState('');
  const [searchedOrderNumber, setSearchedOrderNumber] = useState('');
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const { orderNumberParam } = useParams();
  const navigate = useNavigate();

  // Perform search query
  const performSearch = async (num) => {
    setLoading(true);
    setError(null);
    try {
      const res = await axios.get(`http://localhost:5000/api/costing/${num}`);
      if (res.data && res.data.status === 'closed') {
        setError(res.data.message || "Production order is completed/closed");
        setItems([]);
        setSearchedOrderNumber('');
      } else {
        setItems(res.data);
        setSearchedOrderNumber(num);
      }
    } catch (err) {
      setItems([]);
      setSearchedOrderNumber('');
      if (err.response && err.response.data) {
        const serverError = err.response.data.error;
        const serverDetails = err.response.data.details;
        if (err.response.status === 404) {
          setError("Production order not found.");
        } else if (serverError === 'SQL Error') {
          setError(`SQL Error: ${serverDetails || serverError}`);
        } else {
          setError(`${serverError || 'Error'}: ${serverDetails || err.message}`);
        }
      } else {
        setError("Failed to fetch costing data. Ensure backend is running.");
      }
    } finally {
      setLoading(false);
    }
  };

  // Sync URL parameter to component state and trigger search
  useEffect(() => {
    if (orderNumberParam) {
      const trimmed = orderNumberParam.trim();
      setOrderNumber(trimmed);
      performSearch(trimmed);
    } else {
      setItems([]);
      setSearchedOrderNumber('');
      setOrderNumber('');
      setError(null);
    }
  }, [orderNumberParam]);

  const handleSearch = (e) => {
    e.preventDefault();
    if (orderNumber.trim()) {
      navigate(`/project/costing/${orderNumber.trim()}`);
    } else {
      navigate('/project/costing');
    }
  };

  const formatCurrency = (val) => {
    if (val === null || val === undefined) return '-';
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(val);
  };

  const downloadCSV = () => {
    const headers = [
      'Item ID',
      'Description',
      'Qty Requested',
      'Qty Allocated',
      'Qty on Pick Tickets',
      'Disposition',
      'Supplier ID',
      'Unit Cost',
      'Extended Cost'
    ];

    const rows = items.map(item => [
      item.item_id,
      item.item_desc || '',
      item.qty_requested,
      item.qty_allocated,
      item.qty_on_pick_tickets,
      item.disposition || '',
      item.supplier_id || 'N/A',
      item.cost || 0,
      item.extended_cost || 0
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(val => {
        const strVal = String(val === null || val === undefined ? '' : val);
        if (strVal.includes(',') || strVal.includes('"') || strVal.includes('\n')) {
          return `"${strVal.replace(/"/g, '""')}"`;
        }
        return strVal;
      }).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `Project_Costing_Report_${searchedOrderNumber || 'export'}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getDispBadge = (disp) => {
    if (!disp) return '-';
    let classes = '';
    switch (disp) {
      case 'B':
        classes = 'bg-amber-100 dark:bg-amber-400/10 text-amber-800 dark:text-amber-400 border-amber-250 dark:border-amber-400/20';
        break;
      case 'P':
        classes = 'bg-blue-100 dark:bg-blue-400/10 text-blue-800 dark:text-blue-400 border-blue-200 dark:border-blue-400/20';
        break;
      default:
        classes = 'bg-slate-100 dark:bg-slate-400/10 text-slate-700 dark:text-slate-400 border-slate-200 dark:border-slate-400/20';
    }
    return (
      <span className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold border ${classes}`}>
        {disp}
      </span>
    );
  };

  // Metrics calculations
  const totalCost = items.reduce((sum, item) => sum + (item.extended_cost || 0), 0);

  return (
    <div className="w-full">
      <form onSubmit={handleSearch} className="max-w-xl mx-auto mb-10">
        <div className="relative group">
          <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400 group-focus-within:text-proax-primary transition-colors">
            <Search className="h-5 w-5" />
          </div>
          <input
            type="text"
            className="w-full bg-white dark:bg-slate-900/80 border border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-100 rounded-full py-3.5 pl-12 pr-32 focus:outline-none focus:ring-2 focus:ring-proax-primary/50 focus:border-proax-primary transition-all shadow-sm dark:shadow-lg text-base"
            placeholder="e.g. 1019081"
            value={orderNumber}
            onChange={(e) => setOrderNumber(e.target.value)}
          />
          <button
            type="submit"
            disabled={loading}
            className="absolute inset-y-2 right-2 bg-proax-primary hover:bg-proax-navy text-white font-semibold py-1.5 px-6 rounded-full transition-all disabled:opacity-50"
          >
            {loading ? 'Searching...' : 'Search'}
          </button>
        </div>
      </form>

      {error && (
        <div className="bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 text-red-700 dark:text-red-400 p-4 rounded-lg flex items-center mb-8 max-w-xl mx-auto">
          <AlertCircle className="h-5 w-5 mr-3 flex-shrink-0" />
          <p className="font-medium text-sm">{error}</p>
        </div>
      )}

      {items.length > 0 && (
        <div className="space-y-10 animate-fade-in">
          
          {/* Summary Cards */}
          <div className="grid gap-6 sm:grid-cols-3">
            
            {/* Total Cost */}
            <div className="bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-sm flex items-center space-x-4">
              <div className="p-3.5 rounded-lg bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                <DollarSign className="w-6 h-6" />
              </div>
              <div>
                <span className="text-xs text-slate-500 dark:text-slate-400 font-semibold uppercase tracking-wider block">Actual Item Cost</span>
                <span className="text-2xl font-bold text-proax-navy dark:text-slate-100">{formatCurrency(totalCost)}</span>
              </div>
            </div>

            {/* Total Items */}
            <div className="bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-sm flex items-center space-x-4">
              <div className="p-3.5 rounded-lg bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400">
                <Package className="w-6 h-6" />
              </div>
              <div>
                <span className="text-xs text-slate-500 dark:text-slate-400 font-semibold uppercase tracking-wider block">Line Items Count</span>
                <span className="text-2xl font-bold text-proax-navy dark:text-slate-100">{items.length}</span>
              </div>
            </div>

            {/* Percentage of SO Value Placeholder */}
            <div className="bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-sm flex items-center space-x-4">
              <div className="p-3.5 rounded-lg bg-purple-50 dark:bg-purple-500/10 text-purple-600 dark:text-purple-400">
                <CheckSquare className="w-6 h-6" />
              </div>
              <div>
                <span className="text-xs text-slate-500 dark:text-slate-400 font-semibold uppercase tracking-wider block">% of Total SO Value</span>
                <span className="text-2xl font-bold text-proax-navy dark:text-slate-100">-</span>
                <span className="text-[10px] text-slate-400 block font-medium mt-0.5">Query pending</span>
              </div>
            </div>

          </div>

          {/* Costing Table */}
          <div className="bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 rounded-xl shadow-md dark:shadow-xl">
            <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-slate-900/30">
              <div className="flex items-center space-x-3">
                <h2 className="text-lg font-bold text-proax-navy dark:text-slate-200">
                  Project Line Cost Breakdown
                </h2>
                <button
                  onClick={downloadCSV}
                  className="inline-flex items-center px-2.5 py-1 rounded bg-proax-primary hover:bg-proax-navy text-white text-xs font-semibold shadow-sm transition-colors focus:outline-none"
                  title="Download Table as CSV"
                >
                  <Download className="w-3.5 h-3.5 mr-1" /> Export CSV
                </button>
                <button
                  onClick={() => performSearch(searchedOrderNumber)}
                  disabled={loading || !searchedOrderNumber}
                  className="inline-flex items-center px-2.5 py-1 rounded border border-slate-355 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-semibold shadow-sm transition-colors focus:outline-none hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-50"
                  title="Refresh Data"
                >
                  <RefreshCw className={`w-3.5 h-3.5 mr-1 ${loading ? 'animate-spin' : ''}`} /> Refresh
                </button>
              </div>
              <span className="text-xs text-slate-655 dark:text-slate-500 font-medium bg-slate-100 dark:bg-slate-800 px-2.5 py-1 rounded-full">
                All components excluding complete (Disposition C)
              </span>
            </div>

            <div className="relative">
              <table className="w-full text-xs text-left border-collapse">
                <thead className="sticky top-0 bg-slate-100 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 z-10 text-[11px] text-slate-600 dark:text-slate-400 uppercase tracking-wider shadow-sm">
                  <tr>
                    <th scope="col" className="px-4 py-3 font-semibold">Item</th>
                    <th scope="col" className="px-4 py-3 font-semibold">Description</th>
                    <th scope="col" className="px-3 py-3 text-center font-semibold">Requested</th>
                    <th scope="col" className="px-3 py-3 text-center font-semibold">Allocated</th>
                    <th scope="col" className="px-3 py-3 text-center font-semibold">On Pick Tickets</th>
                    <th scope="col" className="px-3 py-3 text-center font-semibold">Disp</th>
                    <th scope="col" className="px-3 py-3 text-center font-semibold">Supplier ID</th>
                    <th scope="col" className="px-4 py-3 text-right font-semibold">Unit Cost</th>
                    <th scope="col" className="px-4 py-3 text-right font-semibold">Extended Cost</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
                  {items.map((item) => (
                    <tr key={item.item_id} className="hover:bg-slate-50 dark:hover:bg-slate-800/10 transition-colors">
                      <td 
                        className="px-4 py-2.5 font-bold text-proax-navy dark:text-slate-100 max-w-[180px] truncate whitespace-nowrap"
                        title={item.item_id}
                      >
                        {item.item_id}
                      </td>
                      <td 
                        className="px-4 py-2.5 max-w-[220px] truncate font-medium whitespace-nowrap"
                        title={item.item_desc || 'No description'}
                      >
                        {item.item_desc || 'No description'}
                      </td>
                      <td className="px-3 py-2.5 text-center font-medium">
                        {item.qty_requested}
                      </td>
                      <td className="px-3 py-2.5 text-center font-medium">
                        {item.qty_allocated}
                      </td>
                      <td className="px-3 py-2.5 text-center font-medium">
                        {item.qty_on_pick_tickets}
                      </td>
                      <td className="px-3 py-2.5 text-center">
                        {getDispBadge(item.disposition)}
                      </td>
                      <td className="px-3 py-2.5 text-center text-slate-550 font-medium">
                        {item.supplier_id || '-'}
                      </td>
                      <td className="px-4 py-2.5 text-right font-semibold">
                        {formatCurrency(item.cost)}
                      </td>
                      <td className="px-4 py-2.5 text-right font-bold text-proax-navy dark:text-slate-150">
                        {formatCurrency(item.extended_cost)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
