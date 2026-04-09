import { Link, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { FiHeart, FiStar } from 'react-icons/fi';
import { FaHeart } from 'react-icons/fa';
import useCartStore from '../store/cartStore';
import useAuthStore from '../store/authStore';
import useWishlistStore from '../store/wishlistStore';
import toast from 'react-hot-toast';
import { API_URL } from '../lib/api';
import { getImgUrl } from '../utils/image';

export default function ProductCard({ product, compact = false }) {
  const { user } = useAuthStore();
  const addItem = useCartStore(s => s.addItem);
  const cartItems = useCartStore(s => s.items);
  const toggleWishlist = useWishlistStore(s => s.toggleWishlist);
  const isWishlisted = useWishlistStore(s => s.itemIds.includes(product.id));
  
  const navigate = useNavigate();
  const [imageIdx, setImageIdx] = useState(0);

  const minPrice = product.hasSizes === false ? (product.price || 0) : (product.sizes?.length > 0 ? Math.min(...product.sizes.map(s => s.price)) : 0);
  const minMrp = product.hasSizes === false ? (product.mrp || 0) : (product.sizes?.length > 0 ? Math.min(...product.sizes.map(s => s.mrp)) : 0);
  const discount = (minMrp > 0 && minPrice < minMrp) ? Math.round(((minMrp - minPrice) / minMrp) * 100) : 0;
  const isOutOfStock = product.hasSizes === false ? ((product.quantity || 0) === 0) : (product.sizes?.length > 0 ? product.sizes.every(s => s.qty === 0) : true);
  const defaultSize = product.sizes?.find(s => s.qty > 0);
  const isInCart = cartItems.some(i => i.productId === product.id);

  const handleAddToCart = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!user) { toast.error('Please login to add to cart'); return; }
    if (isOutOfStock) { toast.error('Out of stock'); return; }
    addItem(product, product.hasSizes === false ? 'No Size' : defaultSize?.size, product.colors?.[0], 1);
    toast.success('Added to cart!');
  };

  const handleWishlist = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!user) { toast.error('Please login'); return; }
    const res = await toggleWishlist(product.id);
    if (res.success) {
      toast.success(res.removed ? 'Removed from wishlist' : 'Added to wishlist!');
    } else {
      toast.error('Failed to update wishlist');
    }
  };

  const getImgUrlHelper = (idx) => {
    const img = product.images?.[idx] || product.images?.[0];
    return getImgUrl(img);
  };

  return (
    <Link to={`/product/${product.id}`}
      className="card group relative overflow-hidden cursor-pointer animate-fade-in block"
      onMouseEnter={() => product.images?.length > 1 && setImageIdx(1)}
      onMouseLeave={() => setImageIdx(0)}
    >
      {/* Image */}
      <div className={`relative overflow-hidden rounded-t-2xl bg-gray-100 dark:bg-dark-border ${compact ? 'aspect-[3/4]' : 'aspect-[3/4]'}`}>
        <img
          src={getImgUrlHelper(imageIdx)}
          alt={product.name}
          className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
        />

        {/* Badges */}
        <div className="absolute top-2 left-2 flex flex-col gap-1">
          {isOutOfStock && <span className="badge badge-danger">Out of Stock</span>}
          {!isOutOfStock && product.createdAt && new Date() - new Date(product.createdAt) < 7 * 24 * 60 * 60 * 1000 && (
            <span className="badge badge-success">New</span>
          )}
        </div>

        {/* Wishlist button */}
        <button onClick={handleWishlist}
          className="absolute top-2 right-2 w-9 h-9 bg-white dark:bg-dark-card rounded-full flex items-center justify-center shadow-md opacity-0 group-hover:opacity-100 transition-all duration-200 hover:scale-110 z-10">
          {isWishlisted ? <FaHeart className="w-4 h-4 text-primary-500" /> : <FiHeart className="w-4 h-4 text-gray-500" />}
        </button>

        {/* No hover add-to-cart — user adds from product detail page */}
      </div>

      {/* Info */}
      <div className="p-3">
        <p className="text-[10px] text-gray-400 dark:text-gray-500 uppercase font-bold tracking-widest mb-1">{product.category}</p>
        <h3 className={`font-bold text-gray-900 dark:text-white line-clamp-1 group-hover:text-primary-600 transition-colors ${compact ? 'text-xs' : 'text-sm'}`}>
          {product.name}
        </h3>

        {/* Rating */}
        {product.reviewCount > 0 ? (
          <div className="flex items-center gap-1 mt-1.5">
            <span className="flex items-center gap-0.5 text-[10px] bg-green-500 text-white px-1.5 py-0.5 rounded font-black">
              {product.ratings?.toFixed(1) || '0.0'} <FiStar className="w-2.5 h-2.5 fill-current" />
            </span>
            <span className="text-[10px] text-gray-400 font-medium">({product.reviewCount} reviews)</span>
          </div>
        ) : (
          <div className="text-[10px] font-medium text-gray-400 mt-1.5">
            No ratings yet
          </div>
        )}

        {/* Price */}
        <div className="flex flex-col mt-2">
          <div className="flex items-center gap-2">
            <span className={`font-black text-gray-900 dark:text-white ${compact ? 'text-sm' : 'text-base'}`}>₹{minPrice.toLocaleString()}</span>
            {discount > 0 && (
              <span className="text-[10px] line-through text-gray-400 font-medium">₹{minMrp.toLocaleString()}</span>
            )}
          </div>
          <div className="flex items-center justify-between mt-1">
            {discount > 0 ? (
              <span className="text-[10px] font-black text-green-600 dark:text-green-400 uppercase tracking-tighter">{discount}% OFF</span>
            ) : <div/>}
            {isInCart && <span className="text-[10px] font-bold text-green-500 bg-green-50 dark:bg-green-500/10 px-2 py-0.5 rounded-full">In Cart</span>}
          </div>
        </div>
      </div>
    </Link>
  );
}
