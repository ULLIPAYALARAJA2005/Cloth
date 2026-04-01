import { useState, useEffect } from 'react';
import { FiPlus, FiTrash2, FiEdit2, FiX } from 'react-icons/fi';
import toast from 'react-hot-toast';
import api from '../lib/api';

export default function CouponsPage() {
  const [coupons, setCoupons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [isEdit, setIsEdit] = useState(false);
  const [form, setForm] = useState({
    code: '', discountType: 'percent', discountValue: '',
    minOrder: '', maxUses: '', expiryDate: '', terms: '', active: true, id: null
  });

  useEffect(() => { fetchCoupons(); }, []);

  const fetchCoupons = async () => {
    try {
      const res = await api.get('/coupons');
      setCoupons(res.data);
    } catch { toast.error('Failed to load coupons'); }
    finally { setLoading(false); }
  };

  const openAdd = () => {
    setIsEdit(false);
    setForm({ code: '', discountType: 'percent', discountValue: '', minOrder: '', maxUses: '', expiryDate: '', terms: '', active: true, id: null });
    setModalOpen(true);
  };

  const openEdit = (c) => {
    setIsEdit(true);
    setForm({
      code: c.code, 
      discountType: c.discountType, 
      discountValue: c.discountValue || c.amount || '',
      minOrder: c.minOrder || '', 
      maxUses: c.maxUses || c.usageLimit || '', 
      expiryDate: (c.expiryDate || c.expiry)?.split('T')[0] || '',
      terms: c.terms || '', 
      active: c.active, 
      id: c.id
    });
    setModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (isEdit) {
        await api.put(`/coupons/${form.id}`, form);
        toast.success('Coupon updated');
      } else {
        await api.post('/coupons', form);
        toast.success('Coupon created');
      }
      setModalOpen(false);
      fetchCoupons();
    } catch (err) { toast.error(err.response?.data?.message || 'Error saving coupon'); }
  };

  const toggleActive = async (c) => {
    try {
      await api.put(`/coupons/${c.id}`, { active: !c.active });
      setCoupons(prev => prev.map(x => x.id === c.id ? { ...x, active: !c.active } : x));
      toast.success(c.active ? 'Coupon disabled' : 'Coupon enabled');
    } catch { toast.error('Error toggling status'); }
  };

  const deleteCoupon = async (id) => {
    if(!confirm('Delete this coupon?')) return;
    try {
      await api.delete(`/coupons/${id}`);
      setCoupons(prev => prev.filter(c => c.id !== id));
      toast.success('Coupon deleted');
    } catch { toast.error('Error deleting coupon'); }
  };

  if (loading) return <div className="p-8">Loading coupons...</div>;

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white tracking-tight">Coupons Management</h1>
        <button onClick={openAdd} className="btn-primary"><FiPlus /> Create Coupon</button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {coupons.map(c => {
          const discountVal = c.discountValue || c.amount;
          const maxLimit = c.maxUses || c.usageLimit;
          const expDate = c.expiryDate || c.expiry;
          
          const isExpired = expDate && new Date(expDate) < new Date();
          const isExhausted = maxLimit && c.usedCount >= maxLimit;
          const status = !c.active ? 'Disabled' : isExpired ? 'Expired' : isExhausted ? 'Exhausted' : 'Active';

          return (
            <div key={c.id} className={`card p-5 border-l-4 transition-all hover:shadow-lg ${status === 'Active' ? 'border-primary-500 bg-white dark:bg-dark-card' : 'border-gray-300 dark:border-dark-border bg-gray-50 dark:bg-dark-bg opacity-75'}`}>
              <div className="flex justify-between items-start mb-3">
                <span className="px-3 py-1 bg-gray-100 dark:bg-dark-border rounded font-mono font-bold text-lg tracking-wider text-gray-900 dark:text-white border border-gray-200 dark:border-dark-border box-content">
                  {c.code}
                </span>
                <span className={`badge ${status === 'Active' ? 'badge-success' : 'badge-warning'}`}>{status}</span>
              </div>
              <h2 className="text-2xl font-extrabold text-primary-600 dark:text-primary-400 mb-2">
                {c.discountType === 'percent' ? `${discountVal}% OFF` : `₹${discountVal} OFF`}
              </h2>
              
              <div className="grid grid-cols-2 gap-y-3 gap-x-2 py-4 border-y border-gray-50 dark:border-dark-border mb-4">
                <div className="flex flex-col">
                  <span className="text-[10px] text-gray-500 uppercase tracking-wider font-bold">Min Order</span>
                  <span className="text-sm font-semibold text-gray-900 dark:text-white">{c.minOrder ? `₹${c.minOrder}` : 'No minimum'}</span>
                </div>
                <div className="flex flex-col">
                  <span className="text-[10px] text-gray-500 uppercase tracking-wider font-bold">Limit / Used</span>
                  <span className="text-sm font-semibold text-gray-900 dark:text-white">{c.usedCount} / {maxLimit || '∞'}</span>
                </div>
                <div className="flex flex-col col-span-2">
                  <span className="text-[10px] text-gray-500 uppercase tracking-wider font-bold">Valid Until</span>
                  <span className="text-sm font-semibold text-gray-900 dark:text-white">
                    {expDate ? new Date(expDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : 'Never Expires'}
                  </span>
                </div>
              </div>

              <div className="flex justify-between items-center pt-2">
                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <input type="checkbox" className="w-4 h-4 rounded text-primary-600 focus:ring-primary-500 border-gray-300"
                    checked={c.active} onChange={() => toggleActive(c)} />
                  <span className="font-semibold">{c.active ? 'Enabled' : 'Disabled'}</span>
                </label>
                <div className="flex gap-2">
                  <button onClick={() => openEdit(c)} className="p-2 text-gray-500 hover:text-primary-600 bg-white dark:bg-dark-card rounded-xl shadow-sm border border-gray-200 dark:border-dark-border transition-colors"><FiEdit2 className="w-4.5 h-4.5" /></button>
                  <button onClick={() => deleteCoupon(c.id)} className="p-2 text-gray-500 hover:text-red-600 bg-white dark:bg-dark-card rounded-xl shadow-sm border border-gray-200 dark:border-dark-border transition-colors"><FiTrash2 className="w-4.5 h-4.5" /></button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {modalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
          <div className="card p-6 w-full max-w-lg shadow-2xl scale-in">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">{isEdit ? '✏️ Edit Coupon' : '🎟️ Create Coupon'}</h2>
              <button onClick={() => setModalOpen(false)} className="p-2 text-gray-400 hover:text-gray-600 rounded-lg bg-gray-50 dark:bg-dark-border/50"><FiX className="w-6 h-6"/></button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2 sm:col-span-1">
                  <label className="block text-xs font-bold text-gray-550 mb-1 uppercase tracking-wider">Coupon Code *</label>
                  <input className="input-field uppercase font-mono text-lg" value={form.code} onChange={e => setForm({...form, code: e.target.value})} required placeholder="SAVE20" />
                </div>
                <div className="col-span-2 sm:col-span-1">
                  <label className="block text-xs font-bold text-gray-550 mb-1 uppercase tracking-wider">Discount Type</label>
                  <select className="input-field" value={form.discountType} onChange={e => setForm({...form, discountType: e.target.value})}>
                    <option value="percent">Percentage (%)</option>
                    <option value="fixed">Fixed Amount (₹)</option>
                  </select>
                </div>
                <div className="col-span-2 sm:col-span-1">
                  <label className="block text-xs font-bold text-gray-550 mb-1 uppercase tracking-wider">Discount Value *</label>
                  <input type="number" className="input-field" value={form.discountValue} onChange={e => setForm({...form, discountValue: e.target.value})} required />
                </div>
                <div className="col-span-2 sm:col-span-1">
                  <label className="block text-xs font-bold text-gray-550 mb-1 uppercase tracking-wider">Minimum Order (₹)</label>
                  <input type="number" className="input-field" value={form.minOrder} onChange={e => setForm({...form, minOrder: e.target.value})} placeholder="Optional" />
                </div>
                <div className="col-span-2 sm:col-span-1">
                  <label className="block text-xs font-bold text-gray-550 mb-1 uppercase tracking-wider">Usage Limit</label>
                  <input type="number" className="input-field" value={form.maxUses} onChange={e => setForm({...form, maxUses: e.target.value})} placeholder="Unlimited" />
                </div>
                <div className="col-span-2 sm:col-span-1">
                  <label className="block text-xs font-bold text-gray-550 mb-1 uppercase tracking-wider">Expiry Date</label>
                  <input type="date" className="input-field" value={form.expiryDate} onChange={e => setForm({...form, expiryDate: e.target.value})} />
                </div>
                <div className="col-span-2">
                  <label className="block text-xs font-bold text-gray-550 mb-1 uppercase tracking-wider">Terms & Conditions</label>
                  <textarea rows={2} className="input-field resize-none text-sm" value={form.terms} onChange={e => setForm({...form, terms: e.target.value})} placeholder="e.g. Applicable on ethnic wear only" />
                </div>
              </div>
              <div className="flex gap-3 mt-6">
                <button type="button" onClick={() => setModalOpen(false)} className="flex-1 bg-gray-100 dark:bg-dark-border/50 text-gray-700 dark:text-gray-300 font-bold py-3 rounded-xl hover:bg-gray-200 transition-colors">Cancel</button>
                <button type="submit" className="flex-[2] btn-primary justify-center font-bold py-3 shadow-lg shadow-primary-500/30">Save Coupon</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
