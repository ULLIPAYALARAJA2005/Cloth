import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FiTrash2, FiMinus, FiPlus, FiArrowRight } from 'react-icons/fi';
import useCartStore from '../store/cartStore';

export default function CartPage() {
  const { items, removeItem, updateQuantity, clearCart } = useCartStore();
  const navigate = useNavigate();
  const total = items.reduce((s, i) => s + i.price * i.quantity, 0);

  if (items.length === 0) return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center px-4">
      <div className="text-8xl mb-6">🛒</div>
      <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Your cart is empty</h2>
      <p className="text-gray-500 mb-8">Add items to get started</p>
      <Link to="/" className="btn-primary">Start Shopping</Link>
    </div>
  );

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-fade-in">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Shopping Cart ({items.length})</h1>
        <button onClick={clearCart} className="text-sm text-red-500 hover:underline flex items-center gap-1">
          <FiTrash2 className="w-4 h-4" /> Clear All
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Cart Items */}
        <div className="lg:col-span-2 space-y-4">
          {items.map((item, idx) => (
            <div key={idx} className="card p-4 flex gap-4 items-start">
              <img src={item.image || 'https://via.placeholder.com/100'} alt={item.name}
                className="w-24 h-24 rounded-xl object-cover flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-gray-900 dark:text-white mb-1 truncate">{item.name}</h3>
                <p className="text-sm text-gray-500 mb-2">Size: {item.size} | Color: {item.color}</p>
                <div className="flex items-center gap-2">
                  <p className="text-sm font-bold text-primary-600 dark:text-primary-400">₹{item.price.toLocaleString()}</p>
                  {item.mrp > item.price && (
                    <span className="text-[10px] text-gray-400 line-through">₹{item.mrp.toLocaleString()}</span>
                  )}
                </div>
              </div>
              <div className="flex flex-col items-end gap-3">
                <button onClick={() => removeItem(item.productId, item.size, item.color)}
                  className="p-1.5 text-gray-400 hover:text-red-500 transition-colors">
                  <FiTrash2 className="w-4 h-4" />
                </button>
                <div className="flex items-center border border-gray-200 dark:border-dark-border rounded-xl overflow-hidden">
                  <button onClick={() => updateQuantity(item.productId, item.size, item.color, Math.max(1, item.quantity - 1))}
                    className="w-8 h-8 flex items-center justify-center hover:bg-gray-100 dark:hover:bg-dark-border transition-colors">
                    <FiMinus className="w-3 h-3" />
                  </button>
                  <span className="w-8 text-center text-sm font-semibold">{item.quantity}</span>
                  <button onClick={() => updateQuantity(item.productId, item.size, item.color, item.quantity + 1)}
                    className="w-8 h-8 flex items-center justify-center hover:bg-gray-100 dark:hover:bg-dark-border transition-colors">
                    <FiPlus className="w-3 h-3" />
                  </button>
                </div>
                <div className="flex items-center gap-2">
                   <p className="text-sm font-bold text-gray-900 dark:text-white">
                     ₹{(item.price * item.quantity).toLocaleString()}
                   </p>
                   {item.mrp > item.price && (
                     <span className="text-[10px] font-black text-green-600 bg-green-50 dark:bg-green-500/10 px-1.5 py-0.5 rounded tracking-tighter uppercase whitespace-nowrap">
                       {Math.round(((item.mrp - item.price) / item.mrp) * 100)}% OFF
                     </span>
                   )}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Order Summary */}
        <div className="card p-6 h-fit sticky top-20">
          <h3 className="font-bold text-lg text-gray-900 dark:text-white mb-5">Order Summary</h3>
          <div className="space-y-3 mb-5">
            <div className="flex justify-between text-sm text-gray-600 dark:text-gray-400">
              <span>Subtotal ({items.reduce((s,i)=>s+i.quantity,0)} items)</span>
              <span>₹{total.toLocaleString()}</span>
            </div>
            <div className="flex justify-between text-sm text-gray-600 dark:text-gray-400">
              <span>Delivery</span>
              <span className="text-green-500 font-semibold">FREE</span>
            </div>
            <div className="border-t border-gray-100 dark:border-dark-border pt-3 flex justify-between font-bold text-gray-900 dark:text-white text-lg">
              <span>Total</span>
              <span>₹{total.toLocaleString()}</span>
            </div>
          </div>
          <button onClick={() => navigate('/checkout', { state: { type: 'cart' } })} className="btn-primary w-full justify-center py-4 text-base tracking-wide font-bold shadow-lg shadow-primary-500/20">
            BUY ALL <FiArrowRight className="w-5 h-5 ml-2" />
          </button>
          <Link to="/" className="block text-center text-sm text-primary-600 dark:text-primary-400 mt-3 hover:underline">
            Continue Shopping
          </Link>
        </div>
      </div>
    </div>
  );
}
