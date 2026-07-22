import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { 
  ClipboardList, 
  AlertTriangle, 
  Calendar, 
  ShoppingCart, 
  ShoppingBag,
  RefreshCw,
  Clock,
  ChevronDown,
  ChevronUp,
  DollarSign,
  Download
} from 'lucide-react';

export default function CustomerPOs() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastCheck, setLastCheck] = useState(null);
  const [expandedRows, setExpandedRows] = useState({});

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await axios.get('/project-availability/api/customer-pos');
      if (res.data && res.data.status === 'success') {
        setItems(res.data.data);
        setLastCheck(res.data.lastCheckDate);
      } else {
        setError('Unexpected data format returned from server.');
      }
    } catch (err) {
      setError(err.response?.data?.details || err.message || 'Failed to fetch Customer POs data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const toggleRow = (partNo) => {
    setExpandedRows(prev => ({
      ...prev,
      [partNo]: !prev[partNo]
    }));
  };

  const formatCurrency = (val) => {
    if (val === null || val === undefined) return '-';
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(val);
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return '-';
      return d.toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' });
    } catch (e) {
      return '-';
    }
  };

  const exportExcel = () => {
    // 1. Flatten all order lines across all tracked items
    const allLines = [];
    items.forEach(item => {
      (item.orders || []).forEach(order => {
        const remaining = Number(order.qty_remaining) || 0;
        const price = Number(order.unit_price) || 0;
        allLines.push({
          partNo: item.partNo,
          desc: item.desc || '',
          salesOrderNo: String(order.sales_order_no || ''),
          customerPoNo: order.customer_po_no || '',
          customerId: order.customer_id || '',
          customerName: order.customer_name || '',
          orderDate: order.order_date,
          requiredDate: order.required_date,
          qtyOrdered: Number(order.qty_ordered) || 0,
          qtyInvoiced: Number(order.qty_invoiced) || 0,
          qtyCanceled: Number(order.qty_canceled) || 0,
          qtyRemaining: remaining,
          unitPrice: price,
          totalValue: remaining * price
        });
      });
    });

    if (allLines.length === 0) return;

    // 2. Sort lines by Order Date -> Sales Order # -> Part Number
    allLines.sort((a, b) => {
      const dateA = new Date(a.orderDate).getTime() || 0;
      const dateB = new Date(b.orderDate).getTime() || 0;
      if (dateA !== dateB) return dateA - dateB;
      if (a.salesOrderNo !== b.salesOrderNo) return a.salesOrderNo.localeCompare(b.salesOrderNo);
      return a.partNo.localeCompare(b.partNo);
    });

    // 3. Count occurrences of each Sales Order #
    const soCounts = {};
    allLines.forEach(line => {
      soCounts[line.salesOrderNo] = (soCounts[line.salesOrderNo] || 0) + 1;
    });

    // 4. Assign pastel highlight colors for multi-line Sales Orders
    const PASTEL_COLORS = [
      '#FEF08A', // Yellow
      '#FED7AA', // Orange
      '#BBF7D0', // Green
      '#BFDBFE', // Blue
      '#E9D5FF', // Purple
      '#FBCFE8', // Pink
      '#FDE68A', // Amber
      '#A7F3D0', // Emerald
      '#C7D2FE', // Indigo
      '#F5D0FE'  // Fuchsia
    ];

    const soColors = {};
    let colorIndex = 0;
    allLines.forEach(line => {
      if (soCounts[line.salesOrderNo] > 1 && !soColors[line.salesOrderNo]) {
        soColors[line.salesOrderNo] = PASTEL_COLORS[colorIndex % PASTEL_COLORS.length];
        colorIndex++;
      }
    });

    // 5. Build HTML table representation for Excel
    const headers = [
      'Part Number',
      'Description',
      'Sales Order #',
      'Customer Name',
      'Order Date',
      'Required Date',
      'Qty Ordered',
      'Qty Invoiced',
      'Qty Canceled',
      'Qty Remaining',
      'Unit Price',
      'Total Value'
    ];

    let tableRows = '';
    allLines.forEach(line => {
      const bgColor = soColors[line.salesOrderNo] || '';
      const soCellStyle = bgColor 
        ? `style="background-color: ${bgColor}; font-weight: bold; text-align: center;"`
        : `style="text-align: center;"`;

      tableRows += `
        <tr>
          <td>${line.partNo}</td>
          <td>${line.desc}</td>
          <td ${soCellStyle}>${line.salesOrderNo}</td>
          <td>${line.customerName}</td>
          <td style="text-align: center;">${formatDate(line.orderDate)}</td>
          <td style="text-align: center;">${formatDate(line.requiredDate)}</td>
          <td style="text-align: right;">${line.qtyOrdered}</td>
          <td style="text-align: right;">${line.qtyInvoiced}</td>
          <td style="text-align: right;">${line.qtyCanceled}</td>
          <td style="text-align: right;">${line.qtyRemaining}</td>
          <td style="text-align: right;">$${line.unitPrice.toFixed(2)}</td>
          <td style="text-align: right;">$${line.totalValue.toFixed(2)}</td>
        </tr>
      `;
    });

    const excelTemplate = `
      <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
      <head>
        <meta charset="utf-8">
        <!--[if gte mso 9]>
        <xml>
          <x:ExcelWorkbook>
            <x:ExcelWorksheets>
              <x:ExcelWorksheet>
                <x:Name>Customer POs</x:Name>
                <x:WorksheetOptions>
                  <x:DisplayGridlines/>
                </x:WorksheetOptions>
              </x:ExcelWorksheet>
            </x:ExcelWorksheets>
          </x:ExcelWorkbook>
        </xml>
        <![endif]-->
        <style>
          th { background-color: #E2E8F0; font-weight: bold; padding: 8px; border: 1px solid #CBD5E1; text-align: left; }
          td { padding: 6px; border: 1px solid #E2E8F0; vertical-align: middle; }
        </style>
      </head>
      <body>
        <table>
          <thead>
            <tr>
              ${headers.map(h => `<th>${h}</th>`).join('')}
            </tr>
          </thead>
          <tbody>
            ${tableRows}
          </tbody>
        </table>
      </body>
      </html>
    `;

    const blob = new Blob([excelTemplate], { type: 'application/vnd.ms-excel;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `Open_Customer_POs_${new Date().toISOString().slice(0, 10)}.xls`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Metrics
  const getItemActiveValue = (item) => {
    return (item.orders || []).reduce((sum, order) => {
      const remaining = Number(order.qty_remaining) || 0;
      const price = Number(order.unit_price) || 0;
      return sum + (remaining * price);
    }, 0);
  };

  const totalActiveValue = items.reduce((sum, item) => sum + getItemActiveValue(item), 0);
  const totalYtdQtySold = items.reduce((sum, item) => sum + (item.ytdQtySold || 0), 0);
  const totalYtdPOCount = items.reduce((sum, item) => sum + (item.ytdPOCount || 0), 0);

  return (
    <div className="w-full space-y-8 animate-fade-in">
      
      {error && (
        <div className="bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 text-red-700 dark:text-red-400 p-4 rounded-xl flex items-start space-x-3 max-w-3xl mx-auto shadow-sm">
          <AlertTriangle className="h-5 w-5 mt-0.5 flex-shrink-0 text-red-600" />
          <div>
            <h4 className="font-bold text-sm">Failed to Load Data</h4>
            <p className="text-xs mt-1 leading-relaxed">{error}</p>
          </div>
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid gap-6 sm:grid-cols-3 max-w-5xl mx-auto">
        <div className="bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-sm flex items-center space-x-4">
          <div className="p-3.5 rounded-lg bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400">
            <DollarSign className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs text-slate-500 dark:text-slate-400 font-semibold uppercase tracking-wider block">Active POs Total Value</span>
            <span className="text-xl font-bold text-proax-navy dark:text-slate-100 font-bold">
              {loading ? 'Loading...' : formatCurrency(totalActiveValue)}
            </span>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-sm flex items-center space-x-4">
          <div className="p-3.5 rounded-lg bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
            <ShoppingCart className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs text-slate-500 dark:text-slate-400 font-semibold uppercase tracking-wider block">YTD Qty Sold (SO Date)</span>
            <span className="text-xl font-bold text-proax-navy dark:text-slate-100">
              {loading ? 'Loading...' : totalYtdQtySold}
            </span>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-sm flex items-center space-x-4">
          <div className="p-3.5 rounded-lg bg-purple-50 dark:bg-purple-500/10 text-purple-600 dark:text-purple-400">
            <ClipboardList className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs text-slate-500 dark:text-slate-400 font-semibold uppercase tracking-wider block">YTD PO Count</span>
            <span className="text-xl font-bold text-proax-navy dark:text-slate-100">
              {loading ? 'Loading...' : totalYtdPOCount}
            </span>
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
          <div className="flex items-center space-x-2">
            <button
              onClick={exportExcel}
              disabled={loading || items.length === 0}
              className="inline-flex items-center px-2.5 py-1 rounded bg-proax-primary hover:bg-proax-navy text-white text-xs font-semibold shadow-sm transition-colors focus:outline-none disabled:opacity-50"
              title="Download Open Customer POs as Excel"
            >
              <Download className="w-3.5 h-3.5 mr-1" /> Export Excel
            </button>
            <button
              onClick={fetchData}
              disabled={loading}
              className="inline-flex items-center px-2.5 py-1 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-semibold shadow-sm transition-colors focus:outline-none hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-50"
              title="Refresh Data"
            >
              <RefreshCw className={`w-3.5 h-3.5 mr-1 ${loading ? 'animate-spin' : ''}`} /> Refresh
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left border-collapse">
            <thead className="bg-slate-100 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 text-xs text-slate-600 dark:text-slate-400 uppercase tracking-wider">
              <tr>
                <th scope="col" className="px-6 py-4 font-semibold">Part Number</th>
                <th scope="col" className="px-6 py-4 font-semibold">Description</th>
                <th scope="col" className="px-6 py-4 text-center font-semibold">Active Customer POs</th>
                <th scope="col" className="px-6 py-4 text-center font-semibold">Sold This Year (YTD)</th>
                <th scope="col" className="px-6 py-4 text-center font-semibold">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-6 py-10 text-center text-slate-400 font-semibold italic">
                    Loading tracked items data...
                  </td>
                </tr>
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-10 text-center text-slate-400 font-semibold italic">
                    No data found.
                  </td>
                </tr>
              ) : (
                items.map((item) => {
                  const isExpanded = !!expandedRows[item.partNo];
                  const hasOrders = item.orders && item.orders.length > 0;

                  return (
                    <React.Fragment key={item.partNo}>
                      <tr className={`hover:bg-slate-50 dark:hover:bg-slate-800/10 transition-colors ${isExpanded ? 'bg-slate-100/50 dark:bg-slate-800/20' : ''}`}>
                        <td className="px-6 py-4 font-bold text-proax-navy dark:text-slate-100 font-mono">
                          {item.partNo}
                        </td>
                        <td className="px-6 py-4 font-medium">
                          {item.desc}
                        </td>
                        <td className="px-6 py-4 text-center font-semibold">
                          {item.activeOrdersCount > 0 ? (
                            <span className="px-2.5 py-0.5 rounded text-xs font-bold bg-blue-100 dark:bg-blue-500/20 text-blue-800 dark:text-blue-400 border border-blue-200 dark:border-blue-500/30">
                              {item.activeOrdersCount} SO Line{item.activeOrdersCount > 1 ? 's' : ''}
                            </span>
                          ) : (
                            <span className="text-slate-400">-</span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-center font-semibold text-emerald-600 dark:text-emerald-400">
                          {item.ytdQtySold > 0 ? item.ytdQtySold : '-'}
                        </td>
                        <td className="px-6 py-4 text-center">
                          {hasOrders ? (
                            <button
                              onClick={() => toggleRow(item.partNo)}
                              className="text-xs text-proax-primary dark:text-blue-400 hover:text-proax-deep dark:hover:text-blue-300 font-semibold transition-colors hover:underline focus:outline-none inline-flex items-center space-x-1 mx-auto"
                            >
                              <span>{isExpanded ? 'Hide Details' : 'See details'}</span>
                              {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                            </button>
                          ) : (
                            <span className="text-slate-400 text-xs">No active orders</span>
                          )}
                        </td>
                      </tr>

                      {/* Collapsible Sub-row */}
                      {isExpanded && (
                        <tr className="bg-slate-50/50 dark:bg-slate-950/50">
                          <td colSpan={5} className="px-6 py-4 border-t border-slate-200 dark:border-slate-800">
                            <div className="space-y-3">
                              <h4 className="font-bold text-proax-navy dark:text-slate-200 flex items-center text-sm">
                                <Clock className="w-4 h-4 mr-2 text-proax-primary" /> Active Customer Purchase Orders for {item.partNo}
                              </h4>
                              
                              <div className="bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-lg shadow-sm dark:shadow-none overflow-x-auto">
                                <table className="w-full text-xs text-left min-w-[800px]">
                                  <thead>
                                    <tr className="text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/40">
                                      <th className="px-3 py-2 font-medium">SO #</th>
                                      <th className="px-3 py-2 font-medium">Customer PO #</th>
                                      <th className="px-3 py-2 font-medium">Customer Name (ID)</th>
                                      <th className="px-3 py-2 font-medium">Order Date</th>
                                      <th className="px-3 py-2 font-medium">Req Date</th>
                                      <th className="px-3 py-2 text-right font-medium">Qty Ord</th>
                                      <th className="px-3 py-2 text-right font-medium">Qty Inv</th>
                                      <th className="px-3 py-2 text-right font-medium">Qty Can</th>
                                      <th className="px-3 py-2 text-right font-medium">Qty Rem</th>
                                      <th className="px-3 py-2 text-right font-medium">Price</th>
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800/50 text-slate-700 dark:text-slate-300">
                                    {item.orders.map((ord, oIdx) => (
                                      <tr key={`${ord.sales_order_no}_${oIdx}`} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/20 transition-colors">
                                        <td className="px-3 py-2 font-semibold text-proax-navy dark:text-slate-200">
                                          {ord.sales_order_no}
                                        </td>
                                        <td className="px-3 py-2 font-mono text-slate-600 dark:text-slate-350 font-bold">
                                          {ord.customer_po_no || 'N/A'}
                                        </td>
                                        <td className="px-3 py-2">
                                          {ord.customer_name} <span className="text-[10px] text-slate-400">({ord.customer_id})</span>
                                        </td>
                                        <td className="px-3 py-2">
                                          {formatDate(ord.order_date)}
                                        </td>
                                        <td className="px-3 py-2">
                                          {formatDate(ord.required_date)}
                                        </td>
                                        <td className="px-3 py-2 text-right">{ord.qty_ordered}</td>
                                        <td className="px-3 py-2 text-right text-slate-550">{ord.qty_invoiced}</td>
                                        <td className="px-3 py-2 text-right text-rose-500">{ord.qty_canceled}</td>
                                        <td className="px-3 py-2 text-right font-bold text-proax-navy dark:text-slate-150">
                                          {ord.qty_remaining}
                                        </td>
                                        <td className="px-3 py-2 text-right font-semibold text-slate-700 dark:text-slate-300">
                                          {formatCurrency(ord.unit_price)}
                                        </td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
