import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { FiHeart, FiShoppingCart, FiStar, FiChevronLeft, FiChevronRight, FiTruck, FiZap } from 'react-icons/fi';
import { FaHeart, FaStar, FaRegStar } from 'react-icons/fa';
import toast from 'react-hot-toast';
import api, { API_URL } from '../lib/api';
import useCartStore from '../store/cartStore';
import useAuthStore from '../store/authStore';
import useWishlistStore from '../store/wishlistStore';
import { getImgUrl } from '../utils/image';

export default function ProductDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const addItem = useCartStore(s => s.addItem);
  const toggleWishlist = useWishlistStore(s => s.toggleWishlist);
  const isWishlisted = useWishlistStore(s => s.itemIds.includes(id));

  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [imgIdx, setImgIdx] = useState(0);
  const [selectedSize, setSelectedSize] = useState(null);
  const [selectedColor, setSelectedColor] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [qty, setQty] = useState(1);
  const [hasOrderedBefore, setHasOrderedBefore] = useState(false);

  useEffect(() => {
    if (user && id) {
      api.get('/orders/my').then(res => {
        const bought = res.data.some(o => o.items?.some(i => i.productId === id) && o.status === 'delivered');
        setHasOrderedBefore(bought);
      }).catch(() => {});
    }
  }, [user, id]);

  useEffect(() => {
    const fetchProduct = async (silent = false) => {
      try {
        if (!silent) setLoading(true);
        const [pRes, rRes] = await Promise.all([
          api.get(`/products/${id}`),
          api.get(`/reviews/${id}`),
        ]);
        setProduct(pRes.data);
        setSelectedColor(prev => prev || pRes.data.colors?.[0] || null);
        const defSize = pRes.data.sizes?.find(s => s.qty > 0);
        setSelectedSize(prev => prev || defSize || null);
        setReviews(rRes.data || []);
      } catch { if (!silent) { toast.error('Product not found'); navigate('/'); } }
      finally { if (!silent) setLoading(false); }
    };
    fetchProduct();
    const interval = setInterval(() => fetchProduct(true), 10000);
    return () => clearInterval(interval);
  }, [id, navigate]);

  // Removed useEffect that resets imgIdx to avoid overriding thumbnail clicks

  const handleAddToCart = () => {
    if (!user) { toast.error('Please login'); navigate('/login'); return; }
    if (product.hasSizes !== false && !selectedSize) { toast.error('Please select a size'); return; }
    if (product.hasSizes !== false && selectedSize.qty === 0) { toast.error('Selected size is out of stock'); return; }
    if (product.hasSizes === false && (product.quantity || 0) === 0) { toast.error('Product is out of stock'); return; }
    
    addItem(product, product.hasSizes === false ? 'No Size' : selectedSize.size, selectedColor, qty);
    toast.success('Added to cart! 🛒');
  };

  const handleBuyNow = () => {
    if (!user) { toast.error('Please login'); navigate('/login'); return; }
    if (product.hasSizes !== false && !selectedSize) { toast.error('Please select a size'); return; }
    if (product.hasSizes !== false && selectedSize.qty === 0) { toast.error('Selected size is out of stock'); return; }
    if (product.hasSizes === false && (product.quantity || 0) === 0) { toast.error('Product is out of stock'); return; }
    
    const buyNowItem = {
      productId: product.id,
      name: product.name,
      image: currentImageUrl,
      size: product.hasSizes === false ? 'No Size' : selectedSize.size,
      color: selectedColor,
      price: price,
      mrp: mrp,
      quantity: qty,
      rating: product.ratings || 0,
      reviews: product.reviewCount || 0
    };
    
    navigate('/checkout', { state: { type: 'single', item: buyNowItem } });
  };

  const onToggleWishlist = async () => {
    if (!user) { toast.error('Please login'); return; }
    const res = await toggleWishlist(id);
    if (res.success) {
      toast.success(res.removed ? 'Removed from wishlist' : 'Added to wishlist! ❤️');
    } else {
      toast.error('Error updating wishlist');
    }
  };

  if (loading) return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
        <div className="skeleton aspect-square rounded-2xl" />
        <div className="space-y-4">
          {[1,2,3,4].map(i => <div key={i} className="skeleton h-8 rounded-xl" style={{ width: `${[80,60,40,70][i-1]}%` }} />)}
        </div>
      </div>
    </div>
  );

  if (!product) return null;

  const allImages = product.images || [];

  // 1. Unify and group images by color safely
  const colorToImages = {};
  const seenUrls = new Set();
  
  (product.images || []).forEach(img => {
    const url = typeof img === 'string' ? img : img.url;
    const color = typeof img === 'string' ? 'All' : (img.color || 'All');
    if (url && !seenUrls.has(url)) {
      seenUrls.add(url);
      if (!colorToImages[color]) colorToImages[color] = [];
      colorToImages[color].push(url);
    }
  });

  // 2. Identify all colors (from product.colors array + any colors found in images)
  const allPossibleColors = Array.from(new Set([...(product.colors || []), ...Object.keys(colorToImages).filter(c => c !== 'All')]));

  // 3. Build color options strictly, with NO fallbacks that cause duplicates
  const colorOptions = allPossibleColors.map(c => ({
    color: c,
    url: colorToImages[c]?.[0] || null 
  }));

  // 4. Filter gallery precisely to the selected color, or fallback to 'All'
  const filteredImages = (colorToImages[selectedColor]?.length > 0 
    ? colorToImages[selectedColor] 
    : (colorToImages['All'] || [])).map(url => getImgUrl(url));

  const handleImageClick = (idx) => {
    setImgIdx(idx);
    // Note: since filteredImages is now just an array of URLs, we don't automatically update selectedColor based on thumbnail click 
    // because all thumbnails in the gallery are strictly of the selectedColor anyway!
  };

  const currentImageUrl = filteredImages[imgIdx] || 'https://via.placeholder.com/600';
  const currentImageColor = selectedColor === 'All' ? null : selectedColor;

  const inStock = product.hasSizes === false ? (product.quantity > 0) : (selectedSize ? selectedSize.qty > 0 : false);
  const price = product.hasSizes === false ? (product.price || 0) : (selectedSize?.price || Math.min(...(product.sizes?.map(s => s.price) || [0])));
  const mrp = product.hasSizes === false ? (product.mrp || 0) : (selectedSize?.mrp || Math.min(...(product.sizes?.map(s => s.mrp) || [0])));
  const discount = (mrp > 0 && price < mrp) ? Math.round(((mrp - price) / mrp) * 100) : 0;
  const avgRating = reviews.length > 0 ? reviews.reduce((s, r) => s + r.rating, 0) / reviews.length : 0;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-fade-in">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 mb-12">
        {/* Image Gallery */}
        <div className="space-y-3">
          <div className="relative rounded-2xl overflow-hidden bg-gray-100 dark:bg-dark-card aspect-square group/main">
            <img src={currentImageUrl} alt={product.name}
              className="w-full h-full object-cover" />
            
            {/* Color Indication Overlay */}
            {currentImageColor && currentImageColor !== 'All' && (
              <div className="absolute top-4 left-4 bg-white/80 dark:bg-dark-card/80 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/20 shadow-lg animate-fade-in flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full shadow-inner" style={{ backgroundColor: currentImageColor.toLowerCase() }} />
                <span className="text-[10px] font-black uppercase tracking-widest text-gray-900 dark:text-white">Color: {currentImageColor}</span>
              </div>
            )}
            
            {!inStock && (
              <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                <span className="bg-red-500 text-white px-6 py-2 rounded-full font-bold text-lg">Out of Stock</span>
              </div>
            )}
            {filteredImages.length > 1 && (
              <>
                <button onClick={() => handleImageClick(Math.max(0, imgIdx - 1))}
                  className="absolute left-3 top-1/2 -translate-y-1/2 w-9 h-9 bg-white/90 dark:bg-dark-card/90 rounded-full flex items-center justify-center shadow-md hover:scale-110 transition-all opacity-0 group-hover/main:opacity-100">
                  <FiChevronLeft />
                </button>
                <button onClick={() => handleImageClick(Math.min(filteredImages.length - 1, imgIdx + 1))}
                  className="absolute right-3 top-1/2 -translate-y-1/2 w-9 h-9 bg-white/90 dark:bg-dark-card/90 rounded-full flex items-center justify-center shadow-md hover:scale-110 transition-all opacity-0 group-hover/main:opacity-100">
                  <FiChevronRight />
                </button>
              </>
            )}
          </div>
          {/* Thumbnails */}
          <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide mt-4">
            {filteredImages.map((url, i) => (
                <button key={i} onClick={() => handleImageClick(i)}
                  className={`flex-shrink-0 w-16 h-16 rounded-xl overflow-hidden border-2 transition-all ${i === imgIdx ? 'border-primary-500 scale-105 shadow-sm' : 'border-transparent hover:border-gray-300'}`}>
                  <img src={url} alt="" className="w-full h-full object-cover" />
                </button>
            ))}
          </div>
        </div>

        {/* Product Info */}
        <div className="space-y-6">
          {hasOrderedBefore && (
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-green-50 dark:bg-green-500/10 text-green-700 dark:text-green-400 rounded-full text-xs font-bold border border-green-100 dark:border-green-500/20 animate-bounce-subtle">
              ✨ You have purchased this before! Thank you for coming back.
            </div>
          )}
          <div>
            <span className="badge badge-primary mb-2">{product.category}</span>
            <h1 className="text-3xl font-extrabold text-gray-900 dark:text-white mb-2">{product.name}</h1>
            {/* Rating Summary */}
            {reviews.length > 0 ? (
              <div className="flex items-center gap-3 mb-3">
                <div className="flex items-center gap-0.5">
                  {[1,2,3,4,5].map(i => (
                    <span key={i}>{i <= Math.round(avgRating) ? <FaStar className="text-yellow-400 w-4 h-4" /> : <FaRegStar className="text-gray-300 w-4 h-4" />}</span>
                  ))}
                </div>
                <span className="text-sm text-gray-500">{avgRating.toFixed(1)} · {reviews.length} reviews</span>
              </div>
            ) : (
              <div className="text-sm font-medium text-gray-400 mb-3 block">
                No ratings yet
              </div>
            )}
          </div>

          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-3">
              <span className="text-sm font-black text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-500/10 px-2 py-0.5 rounded uppercase tracking-wider">{discount}% off</span>
              <div className="text-lg text-gray-400 line-through">₹{mrp.toLocaleString()}</div>
            </div>
            <div className="text-4xl font-extrabold text-gray-900 dark:text-white">₹{price.toLocaleString()}</div>
          </div>

          <p className="text-gray-600 dark:text-gray-400 leading-relaxed">{product.description}</p>

          {/* Color Selection - Flipkart Style */}
          {colorOptions.length > 0 && (
            <div className="pt-4 border-t border-gray-100 dark:border-dark-border">
              <p className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
                Selected Color: <span className="text-primary-600 font-bold">{selectedColor}</span>
              </p>
              <div className="flex flex-wrap gap-3">
                {colorOptions.map((opt, i) => (
                  <button key={opt.color || i} onClick={() => { setSelectedColor(opt.color); setImgIdx(0); }} title={opt.color}
                    className={`w-14 h-16 rounded-lg overflow-hidden border-2 transition-all hover:scale-105 ${selectedColor === opt.color ? 'border-primary-500 ring-2 ring-primary-500 ring-offset-2 dark:ring-offset-dark-bg shadow-md' : 'border-gray-200 dark:border-dark-border hover:border-primary-300'}`}>
                    {opt.url ? (
                      <img src={opt.url} alt={opt.color} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center bg-gray-50 dark:bg-dark-border">
                        <span className="w-5 h-5 rounded-full mb-1 shadow-inner" style={{ backgroundColor: opt.color.toLowerCase() }} />
                        <span className="text-[9px] font-bold text-gray-500 line-clamp-1 break-all px-1 leading-tight">{opt.color.substring(0,4)}</span>
                      </div>
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Size Selection */}
          {product.hasSizes !== false && (
            <div>
              <p className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Size</p>
              <div className="flex flex-wrap gap-2">
                {product.sizes?.map(s => (
                  <button key={s.size} onClick={() => s.qty > 0 && setSelectedSize(s)} disabled={s.qty === 0}
                    className={`w-14 h-14 rounded-xl border-2 font-semibold text-sm transition-all ${
                      selectedSize?.size === s.size
                        ? 'border-primary-500 bg-primary-50 dark:bg-primary-500/20 text-primary-700 dark:text-primary-300'
                        : s.qty === 0
                        ? 'border-gray-200 dark:border-dark-border text-gray-300 dark:text-gray-600 cursor-not-allowed line-through'
                        : 'border-gray-300 dark:border-dark-border text-gray-700 dark:text-gray-300 hover:border-primary-400'
                    }`}>
                    <div>{s.size}</div>
                    <div className="text-xs font-normal">₹{s.price}</div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Quantity */}
          <div className="flex items-center gap-3">
            <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">Qty:</span>
            <div className="flex items-center border border-gray-200 dark:border-dark-border rounded-xl overflow-hidden">
              <button onClick={() => setQty(q => Math.max(1, q - 1))} className="w-10 h-10 flex items-center justify-center hover:bg-gray-100 dark:hover:bg-dark-border text-lg font-bold transition-colors">-</button>
              <span className="w-10 text-center font-semibold">{qty}</span>
              <button onClick={() => setQty(q => q + 1)} className="w-10 h-10 flex items-center justify-center hover:bg-gray-100 dark:hover:bg-dark-border text-lg font-bold transition-colors">+</button>
            </div>
          </div>

          {/* Actions */}
          <div className="flex flex-col sm:flex-row gap-3">
            <button onClick={handleAddToCart} disabled={!inStock}
              className="btn-secondary flex-1 justify-center py-4 text-base font-bold">
              <FiShoppingCart className="w-5 h-5" />
              {inStock ? 'Add to Cart' : 'Out of Stock'}
            </button>
            <button onClick={handleBuyNow} disabled={!inStock}
              className="btn-primary flex-1 justify-center py-4 text-base font-bold shadow-lg shadow-primary-500/20">
              <FiZap className="w-5 h-5" />
              BUY NOW
            </button>
            <button onClick={onToggleWishlist}
              className="w-full sm:w-14 h-14 flex items-center justify-center rounded-xl border-2 border-gray-200 dark:border-dark-border hover:border-primary-500 transition-all">
              {isWishlisted ? <FaHeart className="w-5 h-5 text-primary-500" /> : <FiHeart className="w-5 h-5 text-gray-500" />}
            </button>
          </div>

          {/* Delivery info */}
          <div className="p-4 bg-green-50 dark:bg-green-500/10 rounded-xl flex items-center gap-3">
            <FiTruck className="w-5 h-5 text-green-600 dark:text-green-400 flex-shrink-0" />
            <div>
              <p className="text-sm font-semibold text-green-800 dark:text-green-300">Free delivery within 7 days</p>
              <p className="text-xs text-green-600 dark:text-green-400">After admin confirms your order</p>
            </div>
          </div>
        </div>
      </div>

      {/* Reviews Section */}
      <div className="border-t border-gray-100 dark:border-dark-border pt-10">
        <h2 className="section-title mb-6">Customer Reviews ({reviews.length})</h2>
        {reviews.length === 0 ? (
          <p className="text-gray-500 dark:text-gray-400 py-8 text-center">No reviews yet. Be the first to review!</p>
        ) : (
          <div className="space-y-4">
            {reviews.map(r => (
              <div key={r.id} className="card p-5">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <p className="font-semibold text-gray-900 dark:text-white">{r.userName}</p>
                    <p className="text-xs text-gray-400">{new Date(r.createdAt).toLocaleDateString()}</p>
                  </div>
                  <div className="flex gap-0.5">
                    {[1,2,3,4,5].map(i => (
                      <span key={i}>{i <= r.rating ? <FaStar className="text-yellow-400 w-4 h-4" /> : <FaRegStar className="text-gray-300 w-4 h-4" />}</span>
                    ))}
                  </div>
                </div>
                <p className="text-gray-600 dark:text-gray-400 text-sm">{r.comment}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
