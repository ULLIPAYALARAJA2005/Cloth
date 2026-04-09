import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FiPackage, FiTruck, FiCheck, FiX, FiClock, FiStar, FiShoppingBag, FiEdit2, FiTrash, FiTrash2, FiDownload } from 'react-icons/fi';
import toast from 'react-hot-toast';
import api from '../lib/api';
import useAuthStore from '../store/authStore';
import useCartStore from '../store/cartStore';
import { getImgUrl } from '../utils/image';

const STATUS_STEPS = ['pending', 'confirmed', 'shipped', 'delivered'];
const STATUS_ICONS = { pending: FiClock, confirmed: FiCheck, shipped: FiTruck, delivered: FiPackage };
const STATUS_COLORS = {
  pending: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-500/20 dark:text-yellow-400',
  confirmed: 'bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-400',
  shipped: 'bg-purple-100 text-purple-700 dark:bg-purple-500/20 dark:text-purple-400',
  delivered: 'bg-green-100 text-green-700 dark:bg-green-500/20 dark:text-green-400',
  cancelled: 'bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-400',
  rejected: 'bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-400',
};

export default function OrdersPage() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [orders, setOrders] = useState([]);
  const [userReviews, setUserReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [reviewModal, setReviewModal] = useState(null); // { productId, orderId, name, reviewId? }
  const [reviewData, setReviewData] = useState({ rating: 5, comment: '' });
  const [cancelling, setCancelling] = useState(false);
  const [deletingId, setDeletingId] = useState(null);

  const fetchOrders = async () => {
    try {
      const [ordersRes, reviewsRes] = await Promise.all([
        api.get('/orders/my'),
        api.get('/reviews/my').catch(() => ({ data: [] }))
      ]);
      setOrders(ordersRes.data);
      setUserReviews(reviewsRes.data);
    } catch {
      toast.error('Failed to load orders');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!user) return;
    fetchOrders();
    const interval = setInterval(fetchOrders, 4000);
    return () => clearInterval(interval);
  }, [user]);

  const cancelOrder = async (orderId) => {
    setCancelling(true);
    try {
      await api.put(`/orders/${orderId}/cancel`);
      setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: 'cancelled' } : o));
      toast.success('Order cancelled');
    } catch (err) { toast.error(err.response?.data?.message || 'Failed to cancel'); }
    finally { setCancelling(false); }
  };

  const deleteOrder = async (orderId) => {
    if (!confirm('Remove this order from your history? Feedback/Reviews will remain.')) return;
    setDeletingId(orderId);
    try {
      await api.put(`/orders/${orderId}/user-delete`);
      setOrders(prev => prev.filter(o => o.id !== orderId));
      toast.success('Order removed');
    } catch { toast.error('Failed to remove order'); }
    finally { setDeletingId(null); }
  };

  const downloadInvoice = async (orderId) => {
    try {
      const res = await api.get(`/orders/${orderId}/invoice`, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `invoice-${orderId}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch {
      toast.error('Failed to download invoice');
    }
  };

  const submitReview = async () => {
    try {
      if (reviewModal.reviewId) {
        // Edit existing review
        await api.put(`/reviews/${reviewModal.reviewId}`, reviewData);
        toast.success('Review updated!');
        setUserReviews(prev => prev.map(r => r.id === reviewModal.reviewId ? { ...r, rating: reviewData.rating, comment: reviewData.comment } : r));
      } else {
        // Submit new review
        const res = await api.post('/reviews', { productId: reviewModal.productId, orderId: reviewModal.orderId, ...reviewData });
        toast.success('Review submitted!');
        setUserReviews(prev => [res.data, ...prev]);
      }
      setReviewModal(null);
      setReviewData({ rating: 5, comment: '' });
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to submit review');
      console.error(err);
    }
  };

  const deleteReview = async (reviewId) => {
    if (!confirm('Are you sure you want to delete this review?')) return;
    try {
      await api.delete(`/reviews/${reviewId}`);
      setUserReviews(prev => prev.filter(r => r.id !== reviewId));
      toast.success('Review deleted');
    } catch (err) {
      toast.error('Failed to delete review');
      console.error(err);
    }
  };

  const currentStep = (status) => STATUS_STEPS.indexOf(status);

  if (loading) return (
    <div className="max-w-5xl mx-auto px-4 py-8 space-y-4">
      {[1, 2, 3].map(i => <div key={i} className="skeleton h-32 rounded-2xl animate-pulse" />)}
    </div>
  );

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 animate-fade-in">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">My Orders</h1>
        <p className="text-xs text-gray-500 uppercase tracking-widest font-bold">{orders.length} TOTAL</p>
      </div>

      {orders.length === 0 ? (
        <div className="text-center py-24 card border-dashed border-2">
          <div className="text-7xl mb-4 grayscale opacity-30">🛍️</div>
          <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Empty History</h3>
          <p className="text-gray-500 mb-8 max-w-xs mx-auto">You haven't placed any orders yet. Discover our latest collections!</p>
          <Link to="/" className="btn-primary py-3 px-8">Start Shopping</Link>
        </div>
      ) : (
        <div className="space-y-6">
          {orders.map(order => {
            const step = currentStep(order.status);
            const isActive = !['cancelled', 'rejected'].includes(order.status);
            return (
              <div key={order.id} className="card p-6 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden">
                {order.status === 'rejected' && (
                  <div className="absolute top-0 left-0 w-1 h-full bg-red-500" />
                )}

                <div className="flex items-start justify-between flex-wrap gap-4 mb-6">
                  <div className="flex items-center gap-4">
                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${STATUS_COLORS[order.status]} shadow-sm`}>
                      <FiShoppingBag className="w-6 h-6" />
                    </div>
                    <div>
                      <p className="font-bold text-gray-900 dark:text-white text-lg">Order #{order.id.slice(-8).toUpperCase()}</p>
                      <p className="text-xs text-gray-500 font-medium">{new Date(order.createdAt).toLocaleDateString(undefined, { dateStyle: 'long' })}</p>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <span className={`badge px-3 py-1 font-bold text-[10px] uppercase tracking-wider ${STATUS_COLORS[order.status]}`}>
                      {order.status}
                    </span>
                    <p className="font-extrabold text-gray-900 dark:text-white text-xl">₹{order.totalAmount?.toLocaleString()}</p>
                  </div>
                </div>

                {/* Rejection Reason Alert */}
                {order.status === 'rejected' && order.rejectionReason && (
                  <div className="mb-6 p-4 bg-red-50 dark:bg-red-500/5 border border-red-100 dark:border-red-500/20 rounded-2xl flex gap-3 items-start">
                    <div className="p-1 bg-red-100 dark:bg-red-500/20 rounded-lg">
                      <FiX className="text-red-600 w-4 h-4" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-red-600 uppercase mb-1">Rejection Reason</p>
                      <p className="text-sm text-red-700 dark:text-red-400 font-medium italic">"{order.rejectionReason}"</p>
                    </div>
                  </div>
                )}

                {/* Progress Bar */}
                {isActive && (
                  <div className="mb-6">
                    <div className="flex items-center justify-between mb-4 px-2">
                      {STATUS_STEPS.map((s, i) => {
                        const Icon = STATUS_ICONS[s];
                        const done = i <= step;
                        return (
                          <div key={s} className="flex flex-col items-center flex-1 relative">
                            <div className={`w-10 h-10 rounded-2xl flex items-center justify-center transition-all duration-500 z-10 ${done ? 'bg-primary-600 text-white shadow-lg shadow-primary-500/30' : 'bg-gray-100 dark:bg-dark-border text-gray-400'
                              }`}>
                              <Icon className="w-5 h-5" />
                            </div>
                            <span className={`text-[10px] sm:text-xs mt-2 font-bold uppercase tracking-tight ${done ? 'text-primary-600 dark:text-primary-400' : 'text-gray-400'}`}>{s}</span>
                            {/* Connector line */}
                            {i < STATUS_STEPS.length - 1 && (
                              <div className={`absolute h-1 w-full left-1/2 top-5 -z-0 transition-colors duration-500 ${i < step ? 'bg-primary-600' : 'bg-gray-100 dark:bg-dark-border'}`} />
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Items Grid */}
                <div className="flex flex-col gap-4 mb-6">
                  {order.items?.map((item, i) => {
                    const existingReview = userReviews.find(r => r.productId === item.productId && r.orderId === order.id);
                    return (
                      <div key={i} className="flex flex-col gap-3 bg-gray-50 dark:bg-dark-bg border border-gray-100 dark:border-dark-border rounded-2xl p-4 hover:border-primary-200 transition-colors">
                        <div className="flex items-center gap-3">
                          <img src={getImgUrl(item.image)} alt={item.name} className="w-16 h-16 rounded-xl object-cover shadow-sm bg-white dark:bg-dark-card" />
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-bold text-gray-900 dark:text-white truncate">{item.name}</p>
                            <div className="flex items-center gap-2 mt-1">
                              <span className="text-[10px] font-bold px-2 py-0.5 bg-gray-200 dark:bg-dark-border rounded text-gray-600 dark:text-gray-400">{item.size}</span>
                              <span className="text-xs font-medium text-gray-500">Qty: {item.quantity}</span>
                            </div>
                          </div>
                        </div>

                        {/* Review Block */}
                        {order.status === 'delivered' && (
                          <div className="mt-2 pt-3 border-t border-gray-200 dark:border-dark-border/50">
                            {existingReview ? (
                              <div className="flex flex-col gap-2">
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-0.5 text-base">
                                    {Array.from({ length: 5 }).map((_, idx) => (
                                      <span key={idx} className={idx < existingReview.rating ? "text-yellow-400" : "text-gray-200 dark:text-dark-border"}>★</span>
                                    ))}
                                  </div>
                                  <span className="text-[10px] font-bold text-gray-400 tracking-wider">
                                    {new Date(existingReview.createdAt).toLocaleDateString()}
                                  </span>
                                </div>
                                {existingReview.comment && (
                                  <p className="text-xs text-gray-700 dark:text-gray-300 italic mb-1">"{existingReview.comment}"</p>
                                )}
                                <div className="flex items-center justify-end gap-2 mt-2">
                                  <button onClick={() => {
                                    setReviewModal({ productId: item.productId, orderId: order.id, name: item.name, reviewId: existingReview.id });
                                    setReviewData({ rating: existingReview.rating, comment: existingReview.comment || '' });
                                  }} className="flex items-center gap-1.5 text-[10px] font-bold text-amber-600 bg-amber-50 dark:bg-amber-500/10 px-3 py-1.5 rounded-lg border border-transparent hover:border-amber-200 transition-colors">
                                    <FiEdit2 className="w-3 h-3" /> Edit Feedback
                                  </button>
                                  <button onClick={() => deleteReview(existingReview.id)} className="flex items-center gap-1.5 text-[10px] font-bold text-red-600 bg-red-50 dark:bg-red-500/10 px-3 py-1.5 rounded-lg border border-transparent hover:border-red-200 transition-colors">
                                    <FiTrash2 className="w-3 h-3" /> Delete Feedback
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <button onClick={() => {
                                setReviewModal({ productId: item.productId, orderId: order.id, name: item.name });
                                setReviewData({ rating: 5, comment: '' });
                              }} className="w-full flex items-center justify-center gap-2 text-xs font-bold text-primary-600 bg-primary-50 dark:bg-primary-500/10 px-4 py-2.5 rounded-xl hover:bg-primary-100 transition-colors border border-transparent hover:border-primary-200">
                                <FiStar className="w-4 h-4 fill-current" /> Add Feedback
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Actions Footer */}
                <div className="flex flex-wrap items-center justify-between gap-4 pt-4 border-t border-gray-100 dark:border-dark-border/50">
                  <div className="flex gap-2">
                    {order.status === 'pending' && (
                      <button onClick={() => cancelOrder(order.id)} disabled={cancelling}
                        className="flex items-center gap-2 text-xs font-bold text-red-500 bg-red-50 dark:bg-red-500/10 px-5 py-2.5 rounded-xl hover:bg-red-100 transition-all border border-transparent hover:border-red-200">
                        <FiX className="w-4 h-4" /> Cancel Order
                      </button>
                    )}
                    {['delivered', 'cancelled', 'rejected'].includes(order.status) && (
                      <button onClick={() => deleteOrder(order.id)} disabled={deletingId === order.id}
                        className="flex items-center gap-2 text-xs font-bold text-gray-500 bg-gray-50 dark:bg-dark-border px-5 py-2.5 rounded-xl hover:bg-gray-100 transition-all border border-transparent hover:border-gray-200">
                        <FiTrash className="w-4 h-4" /> Remove
                      </button>
                    )}

                    {['confirmed', 'shipped', 'delivered'].includes(order.status) && (
                      <button onClick={() => downloadInvoice(order.id)}
                        className="flex items-center gap-2 text-xs font-bold text-blue-600 bg-blue-50 dark:bg-blue-500/10 px-5 py-2.5 rounded-xl hover:bg-blue-100 transition-all border border-transparent hover:border-blue-200">
                        <FiDownload className="w-4 h-4" /> Invoice
                      </button>
                    )}

                    {order.status === 'delivered' && (
                      <button onClick={() => {
                        order.items.forEach(async item => {
                          try {
                            const res = await api.get(`/products/${item.productId}`);
                            useCartStore.getState().addItem(res.data, item.size, item.color, item.quantity);
                          } catch (e) { console.error(e); }
                        });
                        toast.success('Items added to cart!');
                        navigate('/cart');
                      }}
                        className="flex items-center gap-2 text-xs font-bold text-green-600 bg-green-50 dark:bg-green-500/10 px-5 py-2.5 rounded-xl hover:bg-green-100 transition-all border border-transparent hover:border-green-200 ml-auto">
                        <FiShoppingBag className="w-4 h-4" /> Re-order All
                      </button>
                    )}
                  </div>

                  <div className="flex items-center gap-2 text-[10px] font-bold tracking-widest text-gray-400 uppercase mt-4 md:mt-0">
                    {order.status === 'pending' && <><FiClock className="animate-pulse" /> Awaiting Confirmation</>}
                    {order.status === 'confirmed' && <><FiCheck /> Order Confirmed</>}
                    {order.status === 'shipped' && <><FiTruck className="translate-x-1 duration-1000 infinite" /> In Transit</>}
                    {order.status === 'delivered' && <><FiPackage /> Product Delivered</>}
                    {order.status === 'cancelled' && <><FiX /> Order Cancelled</>}
                    {order.status === 'rejected' && <><FiX /> Rejected</>}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Review Modal */}
      {reviewModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 px-4 animate-fade-in">
          <div className="card p-8 w-full max-w-md shadow-2xl">
            <h3 className="font-bold text-2xl text-gray-900 dark:text-white mb-1">Product Feedback</h3>
            <p className="text-sm text-gray-500 mb-6">{reviewModal.name}</p>
            <div className="flex gap-2 mb-6 justify-center">
              {[1, 2, 3, 4, 5].map(i => (
                <button key={i} onClick={() => setReviewData(d => ({ ...d, rating: i }))}
                  className={`text-4xl transition-transform hover:scale-125 ${i <= reviewData.rating ? 'text-yellow-400' : 'text-gray-200 dark:text-dark-border'}`}>
                  ★
                </button>
              ))}
            </div>
            <textarea className="input-field mb-6 text-sm py-4" rows={4} placeholder="What did you like or dislike about the product?"
              value={reviewData.comment} onChange={e => setReviewData(d => ({ ...d, comment: e.target.value }))} />
            <div className="flex gap-4">
              <button onClick={submitReview} className="btn-primary flex-1 justify-center py-4 text-sm tracking-widest uppercase">Submit Review</button>
              <button onClick={() => setReviewModal(null)} className="px-6 text-sm font-bold text-gray-500 hover:text-gray-800">Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
