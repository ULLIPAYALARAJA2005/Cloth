import { useState, useEffect, useRef } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { FiHome, FiBox, FiShoppingBag, FiTag, FiDatabase, FiSun, FiMoon, FiStar, FiSettings, FiX } from 'react-icons/fi';
import toast from 'react-hot-toast';
import useThemeStore from '../store/themeStore';
import api from '../lib/api';

const MENU = [
  { path: '/', label: 'Dashboard', icon: FiHome },
  { path: '/products', label: 'Products', icon: FiBox },
  { path: '/orders', label: 'Orders', icon: FiShoppingBag },
  { path: '/coupons', label: 'Coupons', icon: FiTag },
  { path: '/reviews', label: 'Reviews', icon: FiStar },
  { path: '/inventory', label: 'Inventory', icon: FiDatabase },
  { path: '/settings', label: 'Settings', icon: FiSettings },
];

export default function Sidebar({ isOpen, onClose }) {
  const { pathname } = useLocation();
  const { dark, toggle } = useThemeStore();
  const [newCount, setNewCount] = useState(0);
  const prevCountRef = useRef(0);

  useEffect(() => {
    const fetchCount = async () => {
      try {
        const res = await api.get('/orders/stats/new-count');
        const count = res.data.count;
        if (count > prevCountRef.current && pathname !== '/orders') {
          toast.success(`📢 ${count - prevCountRef.current} new order(s) arrived!`, { icon: '🛍️', duration: 4000 });
        }
        setNewCount(count);
        prevCountRef.current = count;
      } catch (err) { console.error('Error fetching new orders count', err); }
    };

    fetchCount();
    // Poll every 5 seconds for a "direct" feeling
    const interval = setInterval(fetchCount, 5000);
    
    const handleMarkSeen = () => {
      setNewCount(0);
      prevCountRef.current = 0;
    };
    window.addEventListener('ordersMarkedSeen', handleMarkSeen);
    
    return () => {
      clearInterval(interval);
      window.removeEventListener('ordersMarkedSeen', handleMarkSeen);
    };
  }, [pathname]); 

  return (
    <aside className={`fixed inset-y-0 left-0 w-64 bg-white dark:bg-dark-card border-r border-gray-400 dark:border-dark-border z-[60] transform transition-transform duration-300 ease-in-out flex flex-col md:relative md:translate-x-0 ${isOpen ? 'translate-x-0' : '-translate-x-full'}`}>
      <div className="h-16 flex items-center justify-between px-6 border-b border-gray-400 dark:border-dark-border">
        <div className="flex items-center">
          <img src="/logo.png" alt="Logo" className="w-8 h-8 object-contain mr-3" />
          <span className="text-xl font-extrabold text-gray-900 dark:text-white">
            Kalyani<span className="text-primary-500"> Admin</span>
          </span>
        </div>
        <button onClick={onClose} className="md:hidden p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg">
          <FiX className="w-6 h-6" />
        </button>
      </div>

      <nav className="flex-1 px-4 py-6 space-y-2 overflow-y-auto">
        {MENU.map(m => {
          const active = pathname === m.path;
          return (
            <Link key={m.path} to={m.path} onClick={() => window.innerWidth < 768 && onClose()}
              className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
                active
                  ? 'bg-primary-50 dark:bg-primary-500/10 text-primary-600 dark:text-primary-400'
                  : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-dark-border hover:text-gray-900 dark:hover:text-white'
              }`}>
              <m.icon className={`w-5 h-5 ${active ? 'text-primary-600 dark:text-primary-400' : 'text-gray-400'}`} />
              <span className="flex-1">{m.label}</span>
              {m.path === '/orders' && newCount > 0 && (
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      <div className="p-4 border-t border-gray-400 dark:border-dark-border">
        <button onClick={toggle} className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-dark-border transition-colors border border-gray-300 dark:border-transparent">
          {dark ? <FiSun className="w-5 h-5" /> : <FiMoon className="w-5 h-5" />}
          {dark ? 'Light Mode' : 'Dark Mode'}
        </button>
      </div>
    </aside>
  );
}
