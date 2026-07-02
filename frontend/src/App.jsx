import { useState } from 'react';
import axios from 'axios';
import { Search, AlertCircle, CheckCircle2, Truck, ShoppingCart, Clock } from 'lucide-react';

export default function App() {
  const [orderNumber, setOrderNumber] = useState('');
  const [components, setComponents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!orderNumber) return;
    
    setLoading(true);
    setError(null);
    try {
      const res = await axios.get(`http://localhost:5000/api/backorders/${orderNumber}`);
      setComponents(res.data);
    } catch (err) {
      setError("Failed to fetch backorder data. Ensure backend is running.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      <header className="mb-12 text-center">
        <h1 className="text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-emerald-400 mb-4 tracking-tight">
          Production Material Resolution
        </h1>
        <p className="text-slate-400 text-lg">Quickly resolve backordered components for your production orders.</p>
      </header>

      <form onSubmit={handleSearch} className="max-w-xl mx-auto mb-12">
        <div className="relative group">
          <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400 group-focus-within:text-blue-400 transition-colors">
            <Search className="h-5 w-5" />
          </div>
          <input
            type="text"
            className="w-full bg-slate-900/80 border border-slate-700 text-slate-100 rounded-full py-4 pl-12 pr-32 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all shadow-lg text-lg"
            placeholder="e.g. 1019081"
            value={orderNumber}
            onChange={(e) => setOrderNumber(e.target.value)}
          />
          <button
            type="submit"
            disabled={loading}
            className="absolute inset-y-2 right-2 bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 text-white font-semibold py-2 px-6 rounded-full transition-all disabled:opacity-50"
          >
            {loading ? 'Searching...' : 'Search'}
          </button>
        </div>
      </form>

      {error && (
        <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-4 rounded-lg flex items-center mb-8 max-w-xl mx-auto">
          <AlertCircle className="h-5 w-5 mr-3 flex-shrink-0" />
          <p>{error}</p>
        </div>
      )}

      {components.length > 0 && (
        <div className="space-y-6">
          <div className="flex justify-between items-end border-b border-slate-800 pb-4 mb-6">
            <h2 className="text-2xl font-semibold text-slate-200">
              Backordered Components <span className="text-slate-500 text-lg font-normal ml-2">({components.length})</span>
            </h2>
          </div>
          
          <div className="grid gap-6 md:grid-cols-1">
            {components.map((comp) => (
              <ComponentCard key={comp.item_id} component={comp} />
            ))}
          </div>
        </div>
      )}

      {components.length === 0 && !loading && !error && orderNumber && (
         <div className="text-center text-slate-500 mt-12">
            <CheckCircle2 className="h-12 w-12 mx-auto mb-4 text-emerald-500/50" />
            <p className="text-xl">No backordered components found for {orderNumber}</p>
         </div>
      )}
    </div>
  );
}

function ComponentCard({ component }) {
  const getRecColor = (rec) => {
    switch (rec) {
      case 'Await Transfer': return 'text-emerald-400 border-emerald-400/30 bg-emerald-400/10';
      case 'Recommend Transfer': return 'text-blue-400 border-blue-400/30 bg-blue-400/10';
      case 'Await Purchase Order': return 'text-amber-400 border-amber-400/30 bg-amber-400/10';
      case 'Suggest Purchase': return 'text-rose-400 border-rose-400/30 bg-rose-400/10';
      default: return 'text-slate-400 border-slate-400/30 bg-slate-400/10';
    }
  };

  const getRecIcon = (rec) => {
    switch (rec) {
      case 'Await Transfer': return <Clock className="h-4 w-4 mr-1.5" />;
      case 'Recommend Transfer': return <Truck className="h-4 w-4 mr-1.5" />;
      case 'Await Purchase Order': return <Clock className="h-4 w-4 mr-1.5" />;
      case 'Suggest Purchase': return <ShoppingCart className="h-4 w-4 mr-1.5" />;
      default: return <AlertCircle className="h-4 w-4 mr-1.5" />;
    }
  };

  return (
    <div className="glass-card p-6 flex flex-col lg:flex-row gap-6">
      {/* Left side: Item Details */}
      <div className="flex-1">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h3 className="text-xl font-bold text-slate-100 mb-1">{component.item_id}</h3>
            <p className="text-slate-400 text-sm">{component.item_desc}</p>
          </div>
          <div className={`px-4 py-1.5 rounded-full border flex items-center font-medium text-sm whitespace-nowrap ml-4 ${getRecColor(component.recommendation)}`}>
            {getRecIcon(component.recommendation)}
            {component.recommendation}
            {component.recommendation === 'Recommend Transfer' && component.recommendedTransferLocation && (
               <span className="ml-1">from Loc {component.recommendedTransferLocation}</span>
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
          <div className="bg-slate-800/50 rounded-lg p-3">
            <div className="text-slate-500 text-xs font-semibold uppercase tracking-wider mb-1">Requested</div>
            <div className="text-lg font-medium text-slate-200">{component.qty_requested}</div>
          </div>
          <div className="bg-slate-800/50 rounded-lg p-3">
            <div className="text-slate-500 text-xs font-semibold uppercase tracking-wider mb-1">Allocated</div>
            <div className="text-lg font-medium text-slate-200">{component.qty_allocated}</div>
          </div>
          <div className="bg-rose-900/20 border border-rose-500/20 rounded-lg p-3 sm:col-span-2 flex flex-col items-end">
            <div className="text-rose-400/80 text-xs font-semibold uppercase tracking-wider mb-1">Shortage</div>
            <div className="text-lg font-bold text-rose-400">{component.qty_requested - component.qty_allocated}</div>
          </div>
        </div>

        {/* PO Details */}
        {component.po_no ? (
          <div className="bg-amber-500/5 border border-amber-500/10 rounded-lg p-4 mb-4">
            <div className="flex items-center mb-2">
              <ShoppingCart className="h-4 w-4 text-amber-500 mr-2" />
              <h4 className="text-sm font-semibold text-amber-500">Open Purchase Order: {component.po_no}</h4>
            </div>
            <div className="flex flex-wrap gap-6 text-sm text-slate-300 mt-2">
              <div>Due: <span className="font-medium text-slate-200">{new Date(component.date_due).toLocaleDateString()}</span></div>
              <div>Ordered: <span className="font-medium text-slate-200">{component.qty_ordered}</span></div>
              <div>Received: <span className="font-medium text-slate-200">{component.qty_received}</span></div>
            </div>
          </div>
        ) : (
          <div className="bg-slate-800/30 rounded-lg p-4 mb-4 text-sm text-slate-500 flex items-center">
            <AlertCircle className="h-4 w-4 mr-2" /> No open purchase orders found.
          </div>
        )}
      </div>

      {/* Right side: Inventory & Transfers */}
      <div className="flex-1 space-y-4">
        {/* Inventory Table */}
        <div className="bg-slate-800/30 rounded-xl overflow-hidden border border-slate-700/50">
          <div className="bg-slate-800/50 px-4 py-2 border-b border-slate-700/50 font-medium text-sm text-slate-300">
            Available Inventory Locations
          </div>
          {component.inventory.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="text-xs text-slate-500 uppercase bg-slate-800/30">
                  <tr>
                    <th className="px-4 py-2">Loc</th>
                    <th className="px-4 py-2 text-right">On Hand</th>
                    <th className="px-4 py-2 text-right">Alloc</th>
                    <th className="px-4 py-2 text-right text-emerald-400">Avail</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-700/50">
                  {component.inventory.map((inv) => (
                    <tr key={inv.location_id} className={`hover:bg-slate-800/50 transition-colors ${component.recommendedTransferLocation === inv.location_id ? 'bg-blue-500/10' : ''}`}>
                      <td className="px-4 py-2 font-medium text-slate-300">
                        {inv.location_id}
                        {component.recommendedTransferLocation === inv.location_id && <span className="ml-2 text-xs text-blue-400 uppercase font-bold tracking-wider">Suggested</span>}
                      </td>
                      <td className="px-4 py-2 text-right text-slate-400">{inv.qty_on_hand}</td>
                      <td className="px-4 py-2 text-right text-slate-400">{inv.qty_allocated}</td>
                      <td className="px-4 py-2 text-right font-semibold text-emerald-400">{inv.qty_available}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="p-4 text-sm text-slate-500">No inventory available at other locations.</div>
          )}
        </div>

        {/* Transfers Table */}
        <div className="bg-slate-800/30 rounded-xl overflow-hidden border border-slate-700/50">
          <div className="bg-slate-800/50 px-4 py-2 border-b border-slate-700/50 font-medium text-sm text-slate-300">
            Active Transfers
          </div>
          {component.transfers.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="text-xs text-slate-500 uppercase bg-slate-800/30">
                  <tr>
                    <th className="px-4 py-2">Transfer #</th>
                    <th className="px-4 py-2">Route</th>
                    <th className="px-4 py-2">Due Date</th>
                    <th className="px-4 py-2 text-right">Qty</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-700/50">
                  {component.transfers.map((tx) => (
                    <tr key={tx.transfer_no} className="hover:bg-slate-800/50 transition-colors">
                      <td className="px-4 py-2 font-medium text-slate-300">{tx.transfer_no}</td>
                      <td className="px-4 py-2 text-slate-400">{tx.from_location_id} &rarr; {tx.to_location_id}</td>
                      <td className="px-4 py-2 text-slate-400">{tx.planned_recpt_date ? new Date(tx.planned_recpt_date).toLocaleDateString() : '-'}</td>
                      <td className="px-4 py-2 text-right font-medium text-slate-300">{tx.qty_to_transfer}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="p-4 text-sm text-slate-500">No active transfers found for this item.</div>
          )}
        </div>
      </div>
    </div>
  );
}
