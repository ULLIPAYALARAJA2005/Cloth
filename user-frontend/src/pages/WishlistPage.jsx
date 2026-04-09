import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { FiStar, FiHeart, FiTrash2 } from 'react-icons/fi';
import toast from 'react-hot-toast';
import api from '../lib/api';
import useAuthStore from '../store/authStore';
import useWishlistStore from '../store/wishlistStore';
import { getImgUrl } from '../utils/image';

export default function WishlistPage() {
  const { user } = useAuthStore();
  const toggleWishlist = useWishlistStore(s => s.toggleWishlist);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchWishlist = async () => {
    try {
      const res = await api.get('/wishlist');
      setProducts(res.data);
    } catch { toast.error('Failed to load wishlist'); }
    finally { setLoading(false); }
  };

  useEffect(() => { if (user) fetchWishlist(); }, [user]);

  const removeFromWishlist = async (id) => {
    const res = await toggleWishlist(id);
    if (res.success) {
      setProducts(prev => prev.filter(p => p.id !== id));
      toast.success('Removed from wishlist');
    } else {
      toast.error('Failed to remove');
    }
  };

  if (!user) return (
    <div className="min-h-[60vh] flex items-center justify-center">
      <p className="text-gray-500">Please <Link to="/login" className="text-primary-600 font-semibold">login</Link> to view your wishlist.</p>
    </div>
  );

  if (loading) return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="product-grid">{[...Array(6)].map((_,i) => <div key={i} className="skeleton aspect-[3/4] rounded-2xl" />)}</div>
    </div>
  );

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 animate-fade-in">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-8 flex items-center gap-2 text-center sm:text-left">
        <FiHeart className="text-primary-500" /> My Wishlist ({products.length})
      </h1>
      {products.length === 0 ? (
        <div className="text-center py-24">
          <div className="text-7xl mb-4">💔</div>
          <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Your wishlist is empty</h3>
          <p className="text-gray-500 mb-6 px-4">Save items you love to find them easily later!</p>
          <Link to="/" className="btn-primary inline-flex mt-4 px-8">Discover Products</Link>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
          {products.map(p => {
            const minPrice = Math.min(...(p.sizes?.map(s => s.price) || [0]));
            const oos = p.sizes?.every(s => s.qty === 0);
            return (
              <div key={p.id} className="card group overflow-hidden animate-fade-in border-gray-100 dark:border-dark-border">
                <div className="relative aspect-[3/4] overflow-hidden">
                  <Link to={`/product/${p.id}`}>
                    <img src={getImgUrl(p.images?.[0])} alt={p.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                  </Link>
                  {oos && <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
                    <span className="badge badge-danger">Out of Stock</span>
                  </div>}
                  <button onClick={() => removeFromWishlist(p.id)}
                    className="absolute top-2 right-2 w-8 h-8 bg-white/90 dark:bg-dark-card/90 text-red-500 rounded-full flex items-center justify-center shadow-lg hover:bg-red-500 hover:text-white transition-all hover:scale-110">
                    <FiTrash2 className="w-4 h-4" />
                  </button>
                </div>
                <div className="p-3">
                  <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider mb-1 line-clamp-1">{p.category}</p>
                  <h3 className="text-sm font-bold text-gray-900 dark:text-white line-clamp-1 mb-2">{p.name}</h3>
                  <p className="font-black text-primary-600 dark:text-primary-400 text-sm">₹{minPrice.toLocaleString()}</p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
