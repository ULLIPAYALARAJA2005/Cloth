import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import api from '../lib/api';
import { FiDatabase, FiAlertTriangle, FiCheckCircle, FiSearch } from 'react-icons/fi';

export default function InventoryPage() {
  const [inventory, setInventory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');

  useEffect(() => {
    const fetch = async () => {
      try {
        const res = await api.get('/admin/inventory');
        setInventory(res.data);
      } catch { toast.error('Failed to load inventory'); }
      finally { setLoading(false); }
    };
    fetch();
  }, []);

  const filtered = inventory.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(search.toLowerCase()) || p.category.toLowerCase().includes(search.toLowerCase());
    if (!matchesSearch) return false;
    if (filter === 'oos') return p.outOfStock;
    if (filter === 'low') return p.totalQty > 0 && p.totalQty <= 10;
    return true;
  });

  if (loading) return <div className="p-8 text-center text-gray-500 animate-pulse">Loading inventory data...</div>;

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Inventory Tracking</h1>
          <p className="text-sm text-gray-500">Monitor stock levels across all variations</p>
        </div>
        <div className="flex gap-2 w-full sm:w-auto">
          <select className="input-field py-2 text-sm" value={filter} onChange={e => setFilter(e.target.value)}>
            <option value="all">All Products</option>
            <option value="low">Low Stock (≤10)</option>
            <option value="oos">Out of Stock</option>
          </select>
        </div>
      </div>

      {/* Search Bar */}
      <div className="relative">
        <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input 
          type="text" 
          placeholder="Search by product name..." 
          className="input-field pl-10 py-2 text-sm"
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      {/* Desktop View */}
      <div className="hidden md:block card overflow-hidden border-gray-200 dark:border-dark-border">
        <table className="w-full text-left">
          <thead className="bg-gray-50 dark:bg-dark-border/50 text-[11px] uppercase tracking-wider text-gray-500 font-bold border-b border-gray-100 dark:border-dark-border">
            <tr>
              <th className="p-4 w-16">Item</th>
              <th className="p-4">Product & Category</th>
              <th className="p-4">Variations (Size: Qty)</th>
              <th className="p-4">Current Stock</th>
              <th className="p-4">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-dark-border text-sm">
            {filtered.map(p => (
              <tr key={p.id} className="hover:bg-gray-50 dark:hover:bg-dark-border/50 transition-colors">
                <td className="p-4"><img src={p.image || 'https://via.placeholder.com/48'} className="w-10 h-10 rounded-lg object-cover" /></td>
                <td className="p-4">
                  <p className="font-bold text-gray-900 dark:text-white mb-0.5">{p.name}</p>
                  <span className="text-[10px] font-bold text-primary-500 uppercase">{p.category}</span>
                </td>
                <td className="p-4">
                  <div className="flex flex-wrap gap-1.5">
                    {p.sizes?.map(s => (
                      <span key={s.size} className={`px-2 py-0.5 rounded text-[10px] font-bold border ${s.qty === 0 ? 'bg-red-50 dark:bg-red-500/10 text-red-600 border-red-200 dark:border-red-500/30' : 'bg-gray-100 dark:bg-dark-card text-gray-700 dark:text-gray-300 border-gray-200 dark:border-dark-border'}`}>
                        {s.size}: {s.qty}
                      </span>
                    ))}
                  </div>
                </td>
                <td className="p-4 font-black text-gray-900 dark:text-white text-base">{p.totalQty}</td>
                <td className="p-4">
                  {p.outOfStock ? <span className="badge badge-danger text-[10px] uppercase font-bold tracking-tighter">Out of Stock</span> :
                   p.totalQty <= 10 ? <span className="badge badge-warning text-[10px] uppercase font-bold tracking-tighter">Low Stock</span> :
                   <span className="badge badge-success text-[10px] uppercase font-bold tracking-tighter">Healthy Stock</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile View */}
      <div className="grid grid-cols-1 gap-4 md:hidden">
        {filtered.map(p => (
          <div key={p.id} className="card p-4 space-y-4 border-l-4 border-l-primary-500">
            <div className="flex items-center gap-3">
              <img src={p.image || 'https://via.placeholder.com/64'} className="w-12 h-12 rounded-lg object-cover" />
              <div className="min-w-0 flex-1">
                <h3 className="font-bold text-gray-900 dark:text-white text-sm truncate">{p.name}</h3>
                <p className="text-[10px] text-primary-600 font-bold uppercase tracking-wider">{p.category}</p>
              </div>
              <div className="text-right">
                <p className="text-lg font-black text-gray-900 dark:text-white leading-none">{p.totalQty}</p>
                <p className="text-[9px] text-gray-500 uppercase font-bold">Total</p>
              </div>
            </div>
            
            <div className="bg-gray-50 dark:bg-dark-bg p-3 rounded-xl border border-gray-100 dark:border-dark-border">
              <p className="text-[9px] font-black text-gray-400 uppercase mb-2 tracking-widest">Variation Stock</p>
              <div className="grid grid-cols-3 gap-2">
                {p.sizes?.map(s => (
                  <div key={s.size} className={`p-2 rounded-lg border text-center ${s.qty === 0 ? 'bg-red-50 border-red-100 dark:bg-red-500/10 dark:border-red-900/40' : 'bg-white border-gray-100 dark:bg-dark-card dark:border-dark-border'}`}>
                    <p className="text-[10px] font-bold text-gray-400">{s.size}</p>
                    <p className={`text-xs font-black ${s.qty === 0 ? 'text-red-600' : 'text-gray-900 dark:text-white'}`}>{s.qty}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex justify-between items-center pt-2">
              {p.outOfStock ? (
                <span className="flex items-center gap-1.5 text-xs font-bold text-red-600"><FiAlertTriangle className="w-4 h-4"/> OUT OF STOCK</span>
              ) : p.totalQty <= 10 ? (
                <span className="flex items-center gap-1.5 text-xs font-bold text-yellow-600"><FiAlertTriangle className="w-4 h-4"/> LOW STOCK WARNING</span>
              ) : (
                <span className="flex items-center gap-1.5 text-xs font-bold text-green-600"><FiCheckCircle className="w-4 h-4"/> STOCK HEALTHY</span>
              )}
            </div>
          </div>
        ))}
      </div>

      {filtered.length === 0 && <div className="p-12 text-center text-gray-500 card">No inventory items match your search or filter.</div>}
    </div>
  );
}
