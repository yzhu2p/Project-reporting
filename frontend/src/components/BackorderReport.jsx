import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import { useNavigate, useParams } from 'react-router-dom';
import { 
  Search, 
  AlertCircle, 
  Truck, 
  ShoppingCart, 
  Clock, 
  Download,
  RefreshCw,
  ArrowUpDown,
  ArrowUp,
  ArrowDown
} from 'lucide-react';

export default function BackorderReport() {
  const [orderNumber, setOrderNumber] = useState('');
  const [searchedOrderNumber, setSearchedOrderNumber] = useState('');
  const [components, setComponents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [expandedRows, setExpandedRows] = useState({});
  const [sortConfig, setSortConfig] = useState(null);

  const { orderNumberParam } = useParams();
  const navigate = useNavigate();

  // Perform search query
  const performSearch = async (num) => {
    setLoading(true);
    setError(null);
    setExpandedRows({});
    try {
      const res = await axios.get(`/project-availability/api/backorders/${num}`);
      if (res.data && res.data.status === 'closed') {
        setError(res.data.message || "Production order is completed/closed");
        setComponents([]);
        setSearchedOrderNumber('');
      } else {
        setComponents(res.data);
        setSearchedOrderNumber(num);
      }
    } catch (err) {
      setComponents([]);
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
        setError("Failed to fetch backorder data. Ensure backend is running.");
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
      setComponents([]);
      setSearchedOrderNumber('');
      setOrderNumber('');
      setExpandedRows({});
      setError(null);
    }
  }, [orderNumberParam]);

  const handleSearch = (e) => {
    e.preventDefault();
    if (orderNumber.trim()) {
      navigate(`/backorders/${orderNumber.trim()}`);
    } else {
      navigate('/backorders');
    }
  };

  const downloadCSV = () => {
    const projectLocId = components[0]?.source_location_id || '*00';
    const headers = [
      'Item ID',
      'Qty Requested',
      'Qty Allocated',
      'MIS (200)',
      'Barrie (250)',
      'Laval (100)',
      'NS (360)',
      'BC (400)',
      'Other Locations',
      `PO to ${projectLocId}`,
      'Recommended Action'
    ];

    const rows = components.map(comp => {
      const mis = getLocAvail(comp.inventory, 200);
      const barrie = getLocAvail(comp.inventory, 250);
      const laval = getLocAvail(comp.inventory, 100);
      const ns = getLocAvail(comp.inventory, 360);
      const bc = getLocAvail(comp.inventory, 400);
      const { total: otherTotal } = getOthersAvail(comp.inventory);
      
      const nearestPO = getNearestPODate(comp.pos, comp.source_location_id);

      return [
        comp.item_id,
        comp.qty_requested,
        comp.qty_allocated,
        mis,
        barrie,
        laval,
        ns,
        bc,
        otherTotal,
        nearestPO,
        comp.recommendation
      ];
    });

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
    link.setAttribute('download', `Backorder_Report_Project_${searchedOrderNumber || 'export'}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const toggleRow = (itemId) => {
    setExpandedRows(prev => ({
      ...prev,
      [itemId]: !prev[itemId]
    }));
  };

  // Helper to extract inventory for specific locations
  const getLocAvail = (inventory, locId) => {
    const loc = inventory.find(i => Number(i.location_id) === locId);
    return loc ? loc.qty_available : 0;
  };

  // Get aggregated "Other" locations
  const getOthersAvail = (inventory) => {
    const mainLocs = [100, 400, 360, 250, 200];
    const others = inventory.filter(i => !mainLocs.includes(Number(i.location_id)));
    const total = others.reduce((acc, curr) => acc + curr.qty_available, 0);
    const details = others.map(o => `Loc ${o.location_id}: ${o.qty_available}`).join(', ');
    return { total, details };
  };

  // Helper to get nearest PO date for source location
  const getNearestPODate = (pos, sourceLocationId) => {
    if (!pos) return '-';
    const projectPOs = pos.filter(po => Number(po.location_id) === Number(sourceLocationId));
    if (projectPOs.length === 0) return '-';
    const firstPO = projectPOs[0];
    if (!firstPO.date_due) return 'Yes';
    try {
      const d = new Date(firstPO.date_due);
      if (isNaN(d.getTime())) return 'Yes';
      return d.toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' });
    } catch (e) {
      return 'Yes';
    }
  };

  const requestSort = (key) => {
    let direction = 'asc';
    if (key !== 'item_id') {
      direction = 'desc';
    }
    if (sortConfig && sortConfig.key === key) {
      direction = sortConfig.direction === 'asc' ? 'desc' : 'asc';
    }
    setSortConfig({ key, direction });
  };

  const sortedComponents = useMemo(() => {
    let sortableItems = [...components];
    if (sortConfig !== null) {
      sortableItems.sort((a, b) => {
        let aVal, bVal;
        
        switch (sortConfig.key) {
          case 'item_id':
            aVal = a.item_id || '';
            bVal = b.item_id || '';
            break;
          case 'qty_requested':
            aVal = Number(a.qty_requested) || 0;
            bVal = Number(b.qty_requested) || 0;
            break;
          case 'mis':
            aVal = getLocAvail(a.inventory || [], 200);
            bVal = getLocAvail(b.inventory || [], 200);
            break;
          case 'barrie':
            aVal = getLocAvail(a.inventory || [], 250);
            bVal = getLocAvail(b.inventory || [], 250);
            break;
          case 'laval':
            aVal = getLocAvail(a.inventory || [], 100);
            bVal = getLocAvail(b.inventory || [], 100);
            break;
          case 'ns':
            aVal = getLocAvail(a.inventory || [], 360);
            bVal = getLocAvail(b.inventory || [], 360);
            break;
          case 'bc':
            aVal = getLocAvail(a.inventory || [], 400);
            bVal = getLocAvail(b.inventory || [], 400);
            break;
          case 'other':
            aVal = getOthersAvail(a.inventory || []).total;
            bVal = getOthersAvail(b.inventory || []).total;
            break;
          case 'transfers':
            aVal = a.transfers ? a.transfers.length : 0;
            bVal = b.transfers ? b.transfers.length : 0;
            break;
          case 'po':
            const aProjectPOs = a.pos ? a.pos.filter(po => Number(po.location_id) === Number(a.source_location_id)) : [];
            const bProjectPOs = b.pos ? b.pos.filter(po => Number(po.location_id) === Number(b.source_location_id)) : [];
            
            const noPOValue = sortConfig.direction === 'asc' ? Infinity : -Infinity;
            
            aVal = aProjectPOs.length > 0 && aProjectPOs[0].date_due ? new Date(aProjectPOs[0].date_due).getTime() : noPOValue;
            bVal = bProjectPOs.length > 0 && bProjectPOs[0].date_due ? new Date(bProjectPOs[0].date_due).getTime() : noPOValue;
            break;
          default:
            return 0;
        }

        if (aVal < bVal) {
          return sortConfig.direction === 'asc' ? -1 : 1;
        }
        if (aVal > bVal) {
          return sortConfig.direction === 'asc' ? 1 : -1;
        }
        return 0;
      });
    }
    return sortableItems;
  }, [components, sortConfig]);

  const renderSortHeader = (label, sortKey, align = 'left', extraClass = '') => {
    const isActive = sortConfig && sortConfig.key === sortKey;
    const direction = isActive ? sortConfig.direction : null;
    
    const getIcon = () => {
      if (!isActive) return <ArrowUpDown className="w-3 h-3 ml-1.5 opacity-40 group-hover:opacity-100 transition-opacity flex-shrink-0" />;
      return direction === 'asc' 
        ? <ArrowUp className="w-3 h-3 ml-1.5 text-proax-primary dark:text-blue-400 flex-shrink-0" />
        : <ArrowDown className="w-3 h-3 ml-1.5 text-proax-primary dark:text-blue-400 flex-shrink-0" />;
    };

    const alignClass = align === 'center' ? 'justify-center' : align === 'right' ? 'justify-end' : 'justify-start';

    return (
      <th 
        scope="col" 
        onClick={() => requestSort(sortKey)}
        className={`px-3 py-3 font-semibold cursor-pointer select-none hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors group ${extraClass}`}
      >
        <div className={`flex items-center ${alignClass}`}>
          <span>{label}</span>
          {getIcon()}
        </div>
      </th>
    );
  };

  // Group transfer recommendations by source location
  const getGroupedTransfers = () => {
    const groups = {};
    components.forEach(comp => {
      if (comp.recommendation === 'Recommend Transfer' && comp.recommendedTransferLocation) {
        const src = comp.recommendedTransferLocation;
        if (!groups[src]) {
          groups[src] = [];
        }
        groups[src].push({
          itemId: comp.item_id,
          desc: comp.item_desc,
          shortage: comp.qty_requested - comp.qty_allocated,
          available: getLocAvail(comp.inventory, Number(src))
        });
      }
    });
    return groups;
  };

  const getLocName = (locId) => {
    if (!locId) return 'N/A';
    switch (Number(locId)) {
      case 100: return 'Laval';
      case 200: return 'Mississauga (MIS)';
      case 250: return 'Barrie';
      case 360: return 'Nova Scotia (NS)';
      case 400: return 'BC Surrey';
      default: return `Location ${locId}`;
    }
  };

  const getRecBadge = (rec) => {
    switch (rec) {
      case 'Await Transfer':
        return (
          <span className="inline-flex items-center px-2.5 py-1 rounded-md text-[11px] font-semibold bg-emerald-100 dark:bg-emerald-400/10 text-emerald-800 dark:text-emerald-400 border border-emerald-250 dark:border-emerald-400/20">
            <Clock className="w-3 h-3 mr-1" /> Await Transfer
          </span>
        );
      case 'Recommend Transfer':
        return (
          <span className="inline-flex items-center px-2.5 py-1 rounded-md text-[11px] font-semibold bg-proax-primary/10 dark:bg-blue-400/10 text-proax-primary dark:text-blue-400 border border-proax-primary/20 dark:border-blue-400/20">
            <Truck className="w-3 h-3 mr-1" /> Recommend Transfer
          </span>
        );
      case 'Await Purchase Order':
        return (
          <span className="inline-flex items-center px-2.5 py-1 rounded-md text-[11px] font-semibold bg-amber-100 dark:bg-amber-400/10 text-amber-800 dark:text-amber-400 border border-amber-250 dark:border-amber-400/20">
            <Clock className="w-3 h-3 mr-1" /> Await PO
          </span>
        );
      case 'Suggest Purchase':
        return (
          <span className="inline-flex items-center px-2.5 py-1 rounded-md text-[11px] font-semibold bg-rose-100 dark:bg-rose-400/10 text-rose-800 dark:text-rose-400 border border-rose-250 dark:border-rose-400/20">
            <ShoppingCart className="w-3 h-3 mr-1" /> Suggest Purchase
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2.5 py-1 rounded-md text-[11px] font-semibold bg-slate-100 dark:bg-slate-400/10 text-slate-700 dark:text-slate-400 border border-slate-200 dark:border-slate-400/20">
            Unknown
          </span>
        );
    }
  };

  const groupedTransfers = getGroupedTransfers();
  const projectLocationId = components[0]?.source_location_id || '';

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

      {components.length > 0 && (
        <div className="space-y-10 animate-fade-in">
          
          {/* Grouped Transfers Section */}
          {Object.keys(groupedTransfers).length > 0 && (
            <div className="bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-md dark:shadow-xl">
              <h3 className="text-xl font-bold text-proax-navy dark:text-slate-200 mb-4 flex items-center">
                <Truck className="w-5 h-5 mr-2 text-proax-primary" />
                Suggested Grouped Transfer Orders (Optimized by Source)
              </h3>
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {Object.entries(groupedTransfers).map(([srcLoc, items]) => (
                  <div key={srcLoc} className="bg-proax-lightgrey/50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700/50 rounded-lg p-4 flex flex-col justify-between shadow-sm dark:shadow-none">
                    <div>
                      <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-700 mb-3">
                        <span className="font-semibold text-proax-navy dark:text-slate-150">From: {getLocName(srcLoc)} ({srcLoc})</span>
                        <span className="px-2 py-0.5 rounded text-xs font-medium bg-proax-primary/10 dark:bg-blue-500/10 text-proax-primary dark:text-blue-400 border border-proax-primary/20 dark:border-blue-500/20">
                          {items.length} {items.length === 1 ? 'item' : 'items'}
                        </span>
                      </div>
                      <ul className="space-y-2 text-sm">
                        {items.map((item) => (
                          <li key={item.itemId} className="flex justify-between items-start text-slate-700 dark:text-slate-300">
                            <span className="truncate pr-2" title={item.desc}>
                              <span className="font-medium text-proax-navy dark:text-slate-100">{item.itemId}</span>
                            </span>
                            <span className="whitespace-nowrap flex items-center text-xs text-slate-550 dark:text-slate-400">
                              Transfer <span className="font-bold text-proax-primary dark:text-blue-400 mx-1">{item.shortage}</span> 
                              (Avail: {item.available})
                            </span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Main Table Section */}
          <div className="bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 rounded-xl shadow-md dark:shadow-xl min-w-full w-max">
            <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center bg-slate-550/5 dark:bg-slate-900/30">
              <div className="flex items-center space-x-3">
                <h2 className="text-lg font-bold text-proax-navy dark:text-slate-200">
                  Backordered Components List
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
                  className="inline-flex items-center px-2.5 py-1 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-semibold shadow-sm transition-colors focus:outline-none hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-50"
                  title="Refresh Data"
                >
                  <RefreshCw className={`w-3.5 h-3.5 mr-1 ${loading ? 'animate-spin' : ''}`} /> Refresh
                </button>
              </div>
              <span className="text-xs text-slate-655 dark:text-slate-500 font-medium bg-slate-100 dark:bg-slate-800 px-2.5 py-1 rounded-full">
                {components.length} components requiring attention
              </span>
            </div>

            <div className="relative">
              <table className="w-full text-xs text-left border-collapse">
                <thead className="sticky top-0 bg-slate-100 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 z-10 text-[11px] text-slate-600 dark:text-slate-400 uppercase tracking-wider shadow-sm">
                  <tr>
                    {renderSortHeader("Item", "item_id", "left", "px-2 py-2")}
                    {renderSortHeader(<div className="text-center leading-tight">Req /<br/>Alloc</div>, "qty_requested", "center", "px-1.5 py-2")}
                    {renderSortHeader(<div className="text-center leading-tight">MIS<br/>200</div>, "mis", "center", "px-1 py-2 bg-proax-primary/5 dark:bg-blue-500/5")}
                    {renderSortHeader(<div className="text-center leading-tight">Barrie<br/>250</div>, "barrie", "center", "px-1 py-2 bg-proax-primary/5 dark:bg-blue-500/5")}
                    {renderSortHeader(<div className="text-center leading-tight">Laval<br/>100</div>, "laval", "center", "px-1 py-2 bg-proax-primary/5 dark:bg-blue-500/5")}
                    {renderSortHeader(<div className="text-center leading-tight">NS<br/>360</div>, "ns", "center", "px-1 py-2 bg-proax-primary/5 dark:bg-blue-500/5")}
                    {renderSortHeader(<div className="text-center leading-tight">BC<br/>400</div>, "bc", "center", "px-1 py-2 bg-proax-primary/5 dark:bg-blue-500/5")}
                    {renderSortHeader("Other", "other", "center", "px-1 py-2 bg-proax-primary/5 dark:bg-blue-500/5")}
                    {renderSortHeader(<div className="text-center leading-tight">Active<br/>Trans</div>, "transfers", "center", "px-1.5 py-2")}
                    {renderSortHeader(<div className="text-center leading-tight">PO to<br/>{projectLocationId || '*00'}</div>, "po", "center", "px-1.5 py-2")}
                    <th scope="col" className="px-1.5 py-2 text-center font-semibold">Action</th>
                    <th scope="col" className="px-2 py-2 text-center font-semibold">Details</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                  {sortedComponents.map((comp, idx) => {
                    const mis = getLocAvail(comp.inventory, 200);
                    const barrie = getLocAvail(comp.inventory, 250);
                    const laval = getLocAvail(comp.inventory, 100);
                    const ns = getLocAvail(comp.inventory, 360);
                    const bc = getLocAvail(comp.inventory, 400);
                    const { total: otherTotal, details: otherDetails } = getOthersAvail(comp.inventory);
                    
                    const isExpanded = !!expandedRows[comp.item_id];
                    const hasTransfers = comp.transfers.length > 0;
                    
                    const projectPOs = comp.pos.filter(po => Number(po.location_id) === Number(comp.source_location_id));
                    const hasProjectPO = projectPOs.length > 0;
                    const hasAnyPO = comp.pos.length > 0;

                    return (
                      <React.Fragment key={`${comp.item_id}_${idx}`}>
                        <tr 
                          className={`hover:bg-slate-50 dark:hover:bg-slate-800/10 transition-colors ${isExpanded ? 'bg-slate-100/50 dark:bg-slate-800/20' : ''}`}
                        >
                          <td className="px-2 py-1.5 font-bold text-proax-navy dark:text-slate-100">
                            <div 
                              className="max-w-[100px] sm:max-w-[140px] md:max-w-[180px] lg:max-w-none truncate"
                              title={comp.item_id}
                            >
                              {comp.item_id}
                            </div>
                          </td>
                          <td className="px-1.5 py-1.5 text-center text-slate-700 dark:text-slate-300 font-medium whitespace-nowrap">
                            {comp.qty_requested} / {comp.qty_allocated}
                          </td>
                          
                          {/* MIS 200 */}
                          <td className={`px-1 py-1.5 text-center font-medium ${comp.recommendedTransferLocation === '200' ? 'bg-proax-primary/10 dark:bg-blue-500/10 text-proax-navy dark:text-blue-400 border-x border-slate-200/50 dark:border-slate-800/50' : 'text-slate-400'}`}>
                            {mis > 0 ? (
                              <span className={`px-1 rounded text-xs ${comp.recommendedTransferLocation === '200' ? 'bg-proax-primary/20 dark:bg-blue-500/20 font-bold text-proax-navy dark:text-blue-300' : 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-800 dark:text-emerald-400'}`}>
                                {mis}
                              </span>
                            ) : '-'}
                          </td>
                          
                          {/* Barrie 250 */}
                          <td className={`px-1 py-1.5 text-center font-medium ${comp.recommendedTransferLocation === '250' ? 'bg-proax-primary/10 dark:bg-blue-500/10 text-proax-navy dark:text-blue-400 border-x border-slate-200/50 dark:border-slate-800/50' : 'text-slate-400'}`}>
                            {barrie > 0 ? (
                              <span className={`px-1 rounded text-xs ${comp.recommendedTransferLocation === '250' ? 'bg-proax-primary/20 dark:bg-blue-500/20 font-bold text-proax-navy dark:text-blue-300' : 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-800 dark:text-emerald-400'}`}>
                                {barrie}
                              </span>
                            ) : '-'}
                          </td>
                          
                          {/* Laval 100 */}
                          <td className={`px-1 py-1.5 text-center font-medium ${comp.recommendedTransferLocation === '100' ? 'bg-proax-primary/10 dark:bg-blue-500/10 text-proax-navy dark:text-blue-400 border-x border-slate-200/50 dark:border-slate-800/50' : 'text-slate-400'}`}>
                            {laval > 0 ? (
                              <span className={`px-1 rounded text-xs ${comp.recommendedTransferLocation === '100' ? 'bg-proax-primary/20 dark:bg-blue-500/20 font-bold text-proax-navy dark:text-blue-300' : 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-800 dark:text-emerald-400'}`}>
                                {laval}
                              </span>
                            ) : '-'}
                          </td>
                          
                          {/* NS 360 */}
                          <td className={`px-1 py-1.5 text-center font-medium ${comp.recommendedTransferLocation === '360' ? 'bg-proax-primary/10 dark:bg-blue-500/10 text-proax-navy dark:text-blue-400 border-x border-slate-200/50 dark:border-slate-800/50' : 'text-slate-400'}`}>
                            {ns > 0 ? (
                              <span className={`px-1 rounded text-xs ${comp.recommendedTransferLocation === '360' ? 'bg-proax-primary/20 dark:bg-blue-500/20 font-bold text-proax-navy dark:text-blue-300' : 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-800 dark:text-emerald-400'}`}>
                                {ns}
                              </span>
                            ) : '-'}
                          </td>
                          
                          {/* BC 400 */}
                          <td className={`px-1 py-1.5 text-center font-medium ${comp.recommendedTransferLocation === '400' ? 'bg-proax-primary/10 dark:bg-blue-500/10 text-proax-navy dark:text-blue-400 border-x border-slate-200/50 dark:border-slate-800/50' : 'text-slate-400'}`}>
                            {bc > 0 ? (
                              <span className={`px-1 rounded text-xs ${comp.recommendedTransferLocation === '400' ? 'bg-proax-primary/20 dark:bg-blue-500/20 font-bold text-proax-navy dark:text-blue-300' : 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-800 dark:text-emerald-400'}`}>
                                {bc}
                              </span>
                            ) : '-'}
                          </td>
                          
                          {/* Other */}
                          <td className="px-1 py-1.5 text-center text-slate-500 font-medium" title={otherDetails || 'No other locations'}>
                            {otherTotal > 0 ? (
                              <span className="text-slate-600 dark:text-slate-400 font-semibold">
                                {otherTotal}
                              </span>
                            ) : '-'}
                          </td>

                          {/* Active Transfers count */}
                          <td className="px-1.5 py-1.5 text-center font-semibold text-proax-primary dark:text-blue-450">
                            {hasTransfers ? comp.transfers.length : '-'}
                          </td>

                          {/* Active PO target location (displays nearest date / -) */}
                          <td className={`px-1.5 py-1.5 text-center text-xs font-semibold ${hasProjectPO ? 'text-slate-700 dark:text-slate-350' : 'text-slate-400 dark:text-slate-500'}`}>
                            {getNearestPODate(comp.pos, comp.source_location_id)}
                          </td>
                          <td className="px-1.5 py-1.5 text-center whitespace-nowrap">
                            {getRecBadge(comp.recommendation)}
                          </td>
                          <td className="px-2 py-1.5 text-center">
                            {(hasTransfers || hasAnyPO) ? (
                              <button
                                onClick={() => toggleRow(comp.item_id)}
                                className="text-xs text-proax-primary dark:text-blue-400 hover:text-proax-deep dark:hover:text-blue-300 font-semibold transition-colors hover:underline focus:outline-none whitespace-nowrap"
                              >
                                {isExpanded ? 'Hide Details' : 'See transfers & POs'}
                              </button>
                            ) : (
                              <span className="text-slate-400 text-xs">-</span>
                            )}
                          </td>
                        </tr>

                        {/* Collapsible Details Sub-row */}
                        {isExpanded && (
                          <tr className="bg-slate-50/50 dark:bg-slate-950/50">
                            <td colSpan={12} className="px-6 py-4 border-t border-slate-200 dark:border-slate-800">
                              <div className="grid md:grid-cols-2 gap-6 text-sm">
                                
                                {/* Active Transfers Details */}
                                <div>
                                  <h4 className="font-bold text-proax-navy dark:text-slate-200 mb-2 flex items-center">
                                    <Clock className="w-4 h-4 mr-2 text-proax-primary" /> Active Transfer Details
                                  </h4>
                                  {hasTransfers ? (
                                    <div className="bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-lg p-3 shadow-sm dark:shadow-none overflow-x-auto">
                                      <table className="w-full text-xs text-left">
                                        <thead>
                                          <tr className="text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800">
                                            <th className="pb-1.5 font-medium">Tx #</th>
                                            <th className="pb-1.5 font-medium">From &rarr; To</th>
                                            <th className="pb-1.5 font-medium">Planned Rec.</th>
                                            <th className="pb-1.5 text-right font-medium">Qty</th>
                                          </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800/50 text-slate-700 dark:text-slate-300">
                                          {comp.transfers.map(tx => (
                                            <tr key={tx.transfer_no}>
                                              <td className="py-1.5 font-medium text-proax-navy dark:text-slate-200">{tx.transfer_no}</td>
                                              <td className="py-1.5">{tx.from_location_id} &rarr; {tx.to_location_id}</td>
                                              <td className="py-1.5">{tx.planned_recpt_date ? new Date(tx.planned_recpt_date).toLocaleDateString() : '-'}</td>
                                              <td className="py-1.5 text-right font-medium">{tx.qty_to_transfer}</td>
                                            </tr>
                                          ))}
                                        </tbody>
                                      </table>
                                    </div>
                                  ) : (
                                    <p className="text-slate-400 italic text-xs">No active transfers currently moving this item.</p>
                                  )}
                                </div>

                                {/* Purchase Order Details */}
                                <div>
                                  <h4 className="font-bold text-proax-navy dark:text-slate-200 mb-2 flex items-center">
                                    <ShoppingCart className="w-4 h-4 mr-2 text-amber-600 dark:text-amber-400" /> Active Purchase Order Details
                                  </h4>
                                  {hasAnyPO ? (
                                    <div className="bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-lg p-3 shadow-sm dark:shadow-none overflow-x-auto">
                                      <table className="w-full text-xs text-left">
                                        <thead>
                                          <tr className="text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800">
                                            <th className="pb-1.5 font-medium">PO #</th>
                                            <th className="pb-1.5 font-medium">Target Loc</th>
                                            <th className="pb-1.5 font-medium">Due Date</th>
                                            <th className="pb-1.5 text-right font-medium">Qty Ord</th>
                                            <th className="pb-1.5 text-right font-medium">Qty Recv</th>
                                          </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800/50 text-slate-700 dark:text-slate-300">
                                          {comp.pos.map(po => {
                                            const isTargetLoc = Number(po.location_id) === Number(comp.source_location_id);
                                            return (
                                              <tr key={po.po_no} className={isTargetLoc ? 'bg-amber-50/50 dark:bg-amber-500/5 font-semibold text-amber-900 dark:text-amber-300' : ''}>
                                                <td className="py-1.5 font-medium text-proax-navy dark:text-slate-200">{po.po_no}</td>
                                                <td className="py-1.5">{getLocName(po.location_id)} ({po.location_id})</td>
                                                <td className="py-1.5">{po.date_due ? new Date(po.date_due).toLocaleDateString() : '-'}</td>
                                                <td className="py-1.5 text-right">{po.qty_ordered}</td>
                                                <td className="py-1.5 text-right">{po.qty_received}</td>
                                              </tr>
                                            );
                                          })}
                                        </tbody>
                                      </table>
                                    </div>
                                  ) : (
                                    <p className="text-slate-455 italic text-xs">No active POs found for this item.</p>
                                  )}
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
