import { create } from 'zustand';
import api from '../lib/api';

const useWishlistStore = create((set, get) => ({
  itemIds: [],
  loading: false,

  fetchWishlist: async () => {
    set({ loading: true });
    try {
      const res = await api.get('/wishlist');
      // res.data is expected to be an array of product objects
      const ids = res.data.map(p => p.id || p._id);
      set({ itemIds: ids, loading: false });
    } catch (err) {
      set({ loading: false });
      console.error('Failed to fetch wishlist:', err);
    }
  },

  toggleWishlist: async (productId) => {
    console.log('Toggling wishlist for:', productId);
    const isWishlisted = get().itemIds.includes(productId);
    try {
      if (isWishlisted) {
        const res = await api.delete(`/wishlist/${productId}`);
        console.log('Wishlist DELETE res:', res.data);
        set({ itemIds: get().itemIds.filter(id => id !== productId) });
      } else {
        const res = await api.post(`/wishlist/${productId}`);
        console.log('Wishlist POST res:', res.data);
        set({ itemIds: [...get().itemIds, productId] });
      }
      return { success: true, removed: isWishlisted };
    } catch (err) {
      console.error('Wishlist toggle error:', err.response?.data || err.message);
      return { success: false };
    }
  },

  isWishlisted: (productId) => get().itemIds.includes(productId),
  
  clearWishlist: () => set({ itemIds: [] })
}));

export default useWishlistStore;
