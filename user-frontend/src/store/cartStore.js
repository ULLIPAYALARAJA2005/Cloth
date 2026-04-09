import { create } from 'zustand';
import { getImgUrl } from '../utils/image';

const useCartStore = create((set, get) => ({
  items: JSON.parse(localStorage.getItem('cart') || '[]'),

  addItem: (product, size, color, quantity = 1) => {
    const items = get().items;
    const sizeInfo = product.sizes?.find(s => s.size === size);
    const price = product.hasSizes === false ? (product.price || 0) : (sizeInfo?.price || 0);
    const mrp = product.hasSizes === false ? (product.mrp || 0) : (sizeInfo?.mrp || 0);
    const existingIndex = items.findIndex(
      i => i.productId === product.id && i.size === size && i.color === color
    );
    let updated;
    const imgObj = product.images?.[0];
    const rawUrl = (typeof imgObj === 'object' && imgObj !== null) ? imgObj.url : imgObj;
    const imageUrl = getImgUrl(rawUrl);
    
    if (existingIndex >= 0) {
      updated = items.map((item, idx) =>
        idx === existingIndex ? { ...item, quantity: item.quantity + quantity } : item
      );
    } else {
      updated = [...items, {
        productId: product.id, name: product.name, image: imageUrl,
        size, color, price, mrp, quantity,
        rating: product.ratings || 0,
        reviews: product.reviewCount || 0
      }];
    }
    localStorage.setItem('cart', JSON.stringify(updated));
    set({ items: updated });
  },

  removeItem: (productId, size, color) => {
    const updated = get().items.filter(
      i => !(i.productId === productId && i.size === size && i.color === color)
    );
    localStorage.setItem('cart', JSON.stringify(updated));
    set({ items: updated });
  },

  updateQuantity: (productId, size, color, quantity) => {
    const updated = get().items.map(i =>
      i.productId === productId && i.size === size && i.color === color ? { ...i, quantity } : i
    );
    localStorage.setItem('cart', JSON.stringify(updated));
    set({ items: updated });
  },

  clearCart: () => {
    localStorage.removeItem('cart');
    set({ items: [] });
  },

  total: () => get().items.reduce((sum, i) => sum + i.price * i.quantity, 0),
  count: () => get().items.reduce((sum, i) => sum + i.quantity, 0),
}));

export default useCartStore;
