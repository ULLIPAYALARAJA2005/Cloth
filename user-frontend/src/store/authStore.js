import { create } from 'zustand';
import api from '../lib/api';

import useWishlistStore from './wishlistStore';

const useAuthStore = create((set) => ({
  user: JSON.parse(localStorage.getItem('user') || 'null'),
  token: localStorage.getItem('token') || null,
  loading: false,

  login: async (email, password) => {
    set({ loading: true });
    try {
      const res = await api.post('/auth/login', { email, password });
      const { token, user } = res.data;
      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(user));
      set({ token, user, loading: false });
      return { success: true };
    } catch (err) {
      set({ loading: false });
      return { success: false, message: err.response?.data?.message || 'Login failed' };
    }
  },

  signup: async (name, email, password) => {
    set({ loading: true });
    try {
      const res = await api.post('/auth/signup', { name, email, password });
      const { token, user } = res.data;
      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(user));
      set({ token, user, loading: false });
      return { success: true };
    } catch (err) {
      set({ loading: false });
      return { success: false, message: err.response?.data?.message || 'Signup failed' };
    }
  },

  logout: () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    useWishlistStore.getState().clearWishlist();
    set({ user: null, token: null });
  },

  updateUser: (updates) => {
    set((state) => {
      const updated = { ...state.user, ...updates };
      localStorage.setItem('user', JSON.stringify(updated));
      return { user: updated };
    });
  },
}));

export default useAuthStore;
