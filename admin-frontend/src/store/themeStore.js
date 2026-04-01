import { create } from 'zustand';

const useThemeStore = create((set) => ({
  dark: localStorage.getItem('admin_theme') === 'dark',
  toggle: () => set((state) => {
    const next = !state.dark;
    localStorage.setItem('admin_theme', next ? 'dark' : 'light');
    if (next) document.documentElement.classList.add('dark');
    else document.documentElement.classList.remove('dark');
    return { dark: next };
  }),
  init: () => {
    const dark = localStorage.getItem('admin_theme') === 'dark';
    if (dark) document.documentElement.classList.add('dark');
  },
}));

export default useThemeStore;
