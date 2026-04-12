import { useState, useEffect } from 'react';
import { FiEye, FiCheck, FiX, FiTruck, FiPackage, FiShoppingBag, FiTrash, FiArrowLeft, FiDownload } from 'react-icons/fi';
import toast from 'react-hot-toast';
import api from '../lib/api';
import { getImgUrl } from '../utils/image';

const STATUS_ICONS = {
  pending: '🕒', confirmed: '✅', shipped: '🚚', delivered: '📦', rejected: '❌', cancelled: '🚫'
};

export default function OrdersPage() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('');
  const [selected, setSelected] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [rejectionModal, setRejectionModal] = useState({ open: false, orderId: '', reason: '' });

  useEffect(() => { 
    fetchOrders(); 
    api.post('/orders/stats/mark-seen')
      .then(() => window.dispatchEvent(new Event('ordersMarkedSeen')))
      .catch(e => console.error('Error marking orders seen', e));

    // Poll for new orders every 5 seconds for a "direct" feeling
    const interval = setInterval(fetchOrders, 5000);
    return () => clearInterval(interval);
  }, [filter]);

  const fetchOrders = async () => {
    try {
      const qs = filter && filter !== 'all' ? `?status=${filter}` : '';
      const res = await api.get(`/orders${qs}`);
      setOrders(res.data.orders || []);
    } catch { toast.error('Failed to load orders'); }
    finally { setLoading(false); }
  };

  const updateStatus = async (id, status, reason = '') => {
    try {
      await api.put(`/orders/${id}/status`, { status, reason });
      toast.success(`Order marked as ${status}`);
      if (selected?.id === id) setSelected({ ...selected, status, rejectionReason: reason });
      setOrders(prev => prev.map(o => o.id === id ? { ...o, status, rejectionReason: reason } : o));
      setRejectionModal({ open: false, orderId: '', reason: '' });
    } catch { toast.error('Failed to update status'); }
  };

  const handleRejectClick = (id) => {
    setRejectionModal({ open: true, orderId: id, reason: '' });
  };

  const deleteOrder = async (id) => {
    if (!confirm('Are you sure you want to permanentely delete this order? This action cannot be undone.')) return;
    setDeleting(true);
    try {
      await api.delete(`/orders/${id}`);
      toast.success('Order deleted successfully');
      setOrders(prev => prev.filter(o => o.id !== id));
      if (selected?.id === id) setSelected(null);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete order');
    } finally {
      setDeleting(false);
    }
  };

  const downloadLabel = async (id) => {
    try {
      const res = await api.get(`/orders/${id}/label`, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `label-${id}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to download label';
      toast.error(msg);
    }
  };

  if (loading) return <div className="p-8 text-center text-gray-500 animate-pulse">Loading orders...</div>;

  return (
    <div className="flex flex-col md:flex-row gap-6 h-[calc(100vh-140px)] md:h-[calc(100vh-112px)] overflow-hidden">
      {/* List */}
      <div className={`w-full md:w-1/2 flex flex-col card overflow-hidden ${selected ? 'hidden md:flex' : 'flex'}`}>
        <div className="p-4 border-b border-gray-100 dark:border-dark-border flex items-center justify-between bg-white dark:bg-dark-card sticky top-0 z-10">
          <h1 className="text-xl font-bold text-gray-900 dark:text-white">Orders List</h1>
          <select className="input-field w-32 py-1.5 text-sm" value={filter} onChange={e => setFilter(e.target.value)}>
            <option value="all">All Status</option>
            <option value="pending">Pending</option>
            <option value="confirmed">Confirmed</option>
            <option value="shipped">Shipped</option>
            <option value="delivered">Delivered</option>
            <option value="rejected">Rejected</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>
        <div className="overflow-y-auto flex-1 p-4 space-y-3">
          {orders.map(o => (
            <div key={o.id} onClick={() => setSelected(o)}
              className={`p-4 rounded-xl border cursor-pointer transition-all ${
                selected?.id === o.id
                  ? 'border-primary-500 bg-primary-50/50 dark:bg-primary-500/10'
                  : 'border-gray-200 dark:border-dark-border hover:border-primary-300 dark:hover:border-primary-700 hover:shadow-md'
              }`}>
              <div className="flex items-start justify-between mb-2">
                <div>
                  <p className="font-bold text-gray-900 dark:text-white text-sm">#{o.id.slice(-8).toUpperCase()}</p>
                  <p className="text-[10px] text-gray-500">{new Date(o.createdAt).toLocaleString()}</p>
                </div>
                <div className="text-right">
                  <p className="font-bold text-gray-900 dark:text-white text-sm">₹{o.totalAmount?.toLocaleString()}</p>
                  <span className={`badge uppercase text-[8px] mt-1 ${
                    o.status === 'delivered' ? 'badge-success' : o.status === 'rejected' || o.status === 'cancelled' ? 'badge-danger' : 'badge-warning'
                  }`}>
                    {STATUS_ICONS[o.status]} {o.status}
                  </span>
                </div>
              </div>
              <p className="text-xs font-medium text-gray-700 dark:text-gray-300 truncate">{o.userName || o.userEmail}</p>
            </div>
          ))}
          {orders.length === 0 && <div className="text-center py-12 text-gray-500">No orders found.</div>}
        </div>
      </div>

      {/* Details pane */}
      <div className={`w-full md:w-1/2 flex flex-col card overflow-hidden bg-gray-50 dark:bg-dark-bg ${selected ? 'flex' : 'hidden md:flex'}`}>
        {selected ? (
          <>
            <div className="p-4 border-b border-gray-200 dark:border-dark-border bg-white dark:bg-dark-card sticky top-0 z-10">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <button onClick={() => setSelected(null)} className="md:hidden p-2 -ml-2 text-gray-500 hover:text-gray-900">
                    <FiArrowLeft className="w-6 h-6" />
                  </button>
                  <h2 className="text-lg font-bold text-gray-900 dark:text-white">Order Details</h2>
                </div>
                <button onClick={() => deleteOrder(selected.id)} disabled={deleting}
                  className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg transition-colors">
                  <FiTrash className="w-5 h-5" />
                </button>
              </div>

              <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
                {selected.status === 'pending' && (
                  <>
                    <button onClick={() => updateStatus(selected.id, 'confirmed')} className="btn-primary py-1.5 px-3 text-xs whitespace-nowrap bg-blue-600 hover:bg-blue-700"><FiCheck /> Confirm</button>
                    <button onClick={() => handleRejectClick(selected.id)} className="btn-danger py-1.5 px-3 text-xs whitespace-nowrap"><FiX /> Reject</button>
                  </>
                )}
                {selected.status === 'confirmed' && (
                  <button onClick={() => updateStatus(selected.id, 'shipped')} className="btn-primary py-1.5 px-3 text-xs whitespace-nowrap bg-purple-600 hover:bg-purple-700"><FiTruck /> Ship Order</button>
                )}
                {selected.status === 'shipped' && (
                  <button onClick={() => updateStatus(selected.id, 'delivered')} className="btn-primary py-1.5 px-3 text-xs whitespace-nowrap bg-green-600 hover:bg-green-700"><FiPackage /> Mark Delivered</button>
                )}
                {['confirmed','shipped','delivered'].includes(selected.status) && (
                  <button onClick={() => downloadLabel(selected.id)}
                    className="flex items-center gap-1.5 py-1.5 px-3 text-xs font-bold whitespace-nowrap rounded-lg text-blue-700 bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/30 hover:bg-blue-100 transition-all">
                    <FiDownload className="w-3.5 h-3.5" /> Download Label
                  </button>
                )}
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6">
              {/* Customer */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-4 bg-white dark:bg-dark-card border border-gray-200 dark:border-dark-border rounded-xl">
                  <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Customer Info</h3>
                  <p className="font-bold text-gray-900 dark:text-white mb-1">{selected.userName}</p>
                  <p className="text-xs text-gray-500 truncate">{selected.userEmail}</p>
                </div>
                <div className="p-4 bg-white dark:bg-dark-card border border-gray-200 dark:border-dark-border rounded-xl">
                  <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Payment Info</h3>
                  <div className="text-xs space-y-2">
                    <p className="flex justify-between font-mono"><span>ID:</span> <span className="font-bold text-gray-900 dark:text-white">{selected.transactionId}</span></p>
                    <p className="flex justify-between"><span>Phone:</span> <span className="font-bold text-gray-900 dark:text-white">{selected.phone}</span></p>
                  </div>
                </div>
              </div>

              {selected.paymentProof && (
                <div className="p-4 bg-white dark:bg-dark-card border border-gray-200 dark:border-dark-border rounded-xl">
                  <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Payment Proof</h3>
                  <a href={getImgUrl(selected.paymentProof)} target="_blank" rel="noreferrer" className="block w-full text-center p-3 border-2 border-dashed border-primary-300 dark:border-primary-700 rounded-lg hover:bg-primary-50 dark:hover:bg-primary-500/10 text-primary-600 dark:text-primary-400 text-xs font-bold transition-colors">
                    <FiEye className="inline mr-2" /> View Full Screenshot
                  </a>
                </div>
              )}

              {selected.status === 'rejected' && selected.rejectionReason && (
                <div className="p-4 bg-red-50 dark:bg-red-500/5 border border-red-100 dark:border-red-500/20 rounded-xl">
                  <h3 className="text-xs font-bold text-red-500 uppercase tracking-wider mb-2">Rejection Reason</h3>
                  <p className="text-sm text-red-700 dark:text-red-400 font-medium italic">"{selected.rejectionReason}"</p>
                </div>
              )}

              {/* Items */}
              <div className="p-4 bg-white dark:bg-dark-card border border-gray-200 dark:border-dark-border rounded-xl">
                <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4">Ordered Items</h3>
                <div className="space-y-4">
                  {selected.items?.map((item, i) => (
                    <div key={i} className="flex gap-3 text-sm">
                      <img src={getImgUrl(item.image)} alt={item.name} className="w-12 h-12 object-cover rounded-lg border border-gray-100 dark:border-dark-border" />
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-gray-900 dark:text-white truncate">{item.name}</p>
                        <p className="text-[10px] text-gray-500 mt-0.5">Sz: {item.size} | Clr: {item.color}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-gray-900 dark:text-white">₹{(item.price * item.quantity).toLocaleString()}</p>
                        <p className="text-[10px] text-gray-500">Qty: {item.quantity}</p>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="border-t border-gray-100 dark:border-dark-border mt-4 pt-4 flex justify-between font-bold text-sm md:text-base text-gray-900 dark:text-white uppercase tracking-wider">
                  <span>Grand Total</span>
                  <span className="text-primary-600 dark:text-primary-400">₹{selected.totalAmount?.toLocaleString()}</span>
                </div>
              </div>

              {/* Delivery Address */}
              <div className="p-4 bg-white dark:bg-dark-card border border-gray-200 dark:border-dark-border rounded-xl">
                <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Delivery Address</h3>
                <div className="text-xs text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-dark-bg p-3 rounded-lg leading-relaxed">
                  <p className="font-bold text-gray-800 dark:text-gray-200 mb-1">{selected.address?.label || 'Address'}</p>
                  <p>{selected.address?.street}</p>
                  <p>{selected.address?.city}, {selected.address?.state}</p>
                  <p className="font-mono">{selected.address?.pincode}</p>
                  <div className="mt-2 pt-2 border-t border-gray-200 dark:border-dark-border/50">
                    <p className="font-bold text-primary-600 dark:text-primary-400">Mob 1: {selected.address?.mobile1 || 'N/A'}</p>
                    {selected.address?.mobile2 && (
                      <p className="font-bold text-primary-600 dark:text-primary-400">Mob 2: {selected.address?.mobile2}</p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-gray-500 p-8 text-center">
            <FiShoppingBag className="w-16 h-16 mb-4 opacity-20" />
            <p className="max-w-[200px]">Select an order from the list to view full details</p>
          </div>
        )}
      </div>

      {/* Rejection Modal */}
      {rejectionModal.open && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white dark:bg-dark-card w-full max-w-sm rounded-3xl shadow-2xl overflow-hidden animate-slide-up">
            <div className="p-6">
              <div className="w-12 h-12 bg-red-100 dark:bg-red-500/10 rounded-full flex items-center justify-center mb-4">
                <FiX className="text-red-600 w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">Reject Order</h3>
              <p className="text-sm text-gray-500 mb-4">Please provide a reason for rejecting this order so the customer understands why.</p>
              <textarea 
                className="input-field w-full min-h-[100px] py-3 text-sm" 
                placeholder="Ex: Payment screenshot mismatch, Out of stock, Incorrect address..."
                value={rejectionModal.reason}
                onChange={e => setRejectionModal({...rejectionModal, reason: e.target.value})}
                autoFocus
              />
            </div>
            <div className="p-4 bg-gray-50 dark:bg-dark-bg flex justify-end gap-3">
              <button onClick={() => setRejectionModal({ open: false, orderId: '', reason: '' })}
                className="px-4 py-2 text-sm font-bold text-gray-500 hover:text-gray-700">Cancel</button>
              <button 
                onClick={() => updateStatus(rejectionModal.orderId, 'rejected', rejectionModal.reason)}
                disabled={!rejectionModal.reason.trim()}
                className="px-6 py-2 bg-red-600 text-white rounded-xl text-sm font-bold hover:bg-red-700 disabled:opacity-50 transition-all">
                Submit Rejection
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
