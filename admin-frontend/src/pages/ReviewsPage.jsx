import { useState, useEffect } from 'react';
import { FiStar, FiEdit2, FiTrash2, FiClock, FiUser, FiPackage, FiSearch, FiX } from 'react-icons/fi';
import { FaStar, FaRegStar } from 'react-icons/fa';
import toast from 'react-hot-toast';
import api from '../lib/api';

export default function ReviewsPage() {
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [editModal, setEditModal] = useState(null);
  const [editData, setEditData] = useState({ rating: 5, comment: '' });

  const fetchReviews = async () => {
    try {
      const res = await api.get('/reviews');
      setReviews(res.data);
    } catch (err) {
      toast.error('Failed to load reviews');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReviews();
  }, []);

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this review?')) return;
    try {
      await api.delete(`/admin/reviews/${id}`);
      setReviews(reviews.filter(r => r.id !== id));
      toast.success('Review deleted');
    } catch (err) {
      toast.error('Failed to delete review');
    }
  };

  const handleEdit = async () => {
    try {
      await api.put(`/admin/reviews/${editModal.id}`, editData);
      setReviews(reviews.map(r => r.id === editModal.id ? { ...r, ...editData } : r));
      toast.success('Review updated');
      setEditModal(null);
    } catch (err) {
      toast.error('Failed to update review');
    }
  };

  const filteredReviews = reviews.filter(r => 
    r.userName?.toLowerCase().includes(search.toLowerCase()) || 
    r.productName?.toLowerCase().includes(search.toLowerCase()) ||
    r.comment?.toLowerCase().includes(search.toLowerCase())
  );

  if (loading) return (
    <div className="p-4 md:p-8 space-y-4">
      <div className="skeleton h-10 w-48 rounded-lg" />
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {[1,2,3,4,5,6].map(i => <div key={i} className="skeleton h-48 rounded-2xl" />)}
      </div>
    </div>
  );

  return (
    <div className="p-4 md:p-8 animate-fade-in max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Customer Reviews</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">Manage and moderate all product reviews</p>
        </div>
        
        <div className="relative w-full md:w-64">
          <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input 
            type="text" 
            placeholder="Search reviews..." 
            className="input-field pl-10 w-full"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {filteredReviews.length === 0 ? (
        <div className="card p-12 text-center border-dashed">
          <div className="text-5xl mb-4 opacity-50">⭐</div>
          <p className="text-gray-500 dark:text-gray-400 font-medium">No reviews found matching your search</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredReviews.map(review => (
            <div key={review.id} className="card p-5 flex flex-col h-full hover:shadow-xl transition-all duration-300 border-l-4 border-l-yellow-400">
              <div className="flex justify-between items-start mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary-100 dark:bg-primary-500/20 flex items-center justify-center text-primary-600 dark:text-primary-400 font-bold border border-primary-200 dark:border-primary-500/30">
                    {review.userName?.charAt(0).toUpperCase() || <FiUser />}
                  </div>
                  <div className="min-w-0">
                    <h3 className="font-bold text-gray-900 dark:text-white text-sm truncate">{review.userName}</h3>
                    <div className="flex items-center gap-1 text-[10px] text-gray-400">
                      <FiClock className="w-3 h-3" />
                      {new Date(review.createdAt).toLocaleDateString()}
                    </div>
                  </div>
                </div>
                <div className="flex gap-0.5 text-xs bg-yellow-400/10 px-2 py-1 rounded-lg">
                  {[1,2,3,4,5].map(i => (
                    i <= review.rating ? 
                    <FaStar key={i} className="text-yellow-400 w-2.5 h-2.5" /> : 
                    <FaRegStar key={i} className="text-gray-300 w-2.5 h-2.5" />
                  ))}
                </div>
              </div>

              <div className="flex items-center gap-2 mb-3 px-3 py-1.5 bg-gray-50 dark:bg-dark-border rounded-lg text-[10px] font-bold text-gray-500 dark:text-gray-300 w-fit uppercase tracking-wider">
                <FiPackage className="w-3.5 h-3.5 text-primary-500" />
                {review.productName}
              </div>

              <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed italic mb-6 flex-1 line-clamp-4">
                "{review.comment}"
              </p>

              <div className="flex gap-2 pt-4 border-t border-gray-100 dark:border-dark-border mt-auto">
                <button 
                  onClick={() => {
                    setEditModal(review);
                    setEditData({ rating: review.rating, comment: review.comment });
                  }}
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-gray-100 dark:bg-dark-bg text-gray-600 dark:text-gray-300 hover:bg-primary-500 hover:text-white dark:hover:bg-primary-600 transition-all text-xs font-bold"
                >
                  <FiEdit2 className="w-4 h-4" /> MODERATE
                </button>
                <button 
                  onClick={() => handleDelete(review.id)}
                  className="w-12 flex items-center justify-center rounded-xl bg-red-50 dark:bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white transition-all shadow-sm"
                >
                  <FiTrash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Edit Modal */}
      {editModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center z-[70] p-0 sm:p-4 animate-fade-in">
          <div className="bg-white dark:bg-dark-card w-full sm:rounded-2xl shadow-2xl p-6 sm:max-w-md scale-in max-h-[80vh] overflow-y-auto rounded-t-3xl">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="font-bold text-xl text-gray-900 dark:text-white">Moderate Review</h3>
                <p className="text-xs text-gray-500 mt-1">Refining feedback from {editModal.userName}</p>
              </div>
              <button onClick={() => setEditModal(null)} className="p-2 bg-gray-100 dark:bg-dark-border/50 rounded-full"><FiX className="w-6 h-6"/></button>
            </div>
            
            <div className="space-y-6">
              <div>
                <label className="block text-xs font-bold text-gray-450 mb-3 uppercase tracking-widest">Adjust Rating</label>
                <div className="flex gap-3 justify-center bg-gray-50 dark:bg-dark-bg p-4 rounded-2xl">
                  {[1,2,3,4,5].map(i => (
                    <button 
                      key={i} 
                      onClick={() => setEditData(d => ({ ...d, rating: i }))}
                      className={`text-4xl transition-transform hover:scale-125 ${i <= editData.rating ? 'text-yellow-400 drop-shadow-sm' : 'text-gray-300'}`}
                    >
                      ★
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-450 mb-2 uppercase tracking-widest">Edit Comment</label>
                <textarea 
                  className="input-field min-h-[120px] text-sm leading-relaxed" 
                  value={editData.comment}
                  placeholder="Moderated comment content..."
                  onChange={e => setEditData(d => ({ ...d, comment: e.target.value }))}
                />
              </div>

              <div className="flex gap-3 pt-4 border-t border-gray-100 dark:border-dark-border">
                <button onClick={() => setEditModal(null)} className="flex-1 btn-secondary justify-center py-3 font-bold">Cancel</button>
                <button onClick={handleEdit} className="flex-[2] btn-primary justify-center py-3 font-bold shadow-lg shadow-primary-500/20">Apply Changes</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
