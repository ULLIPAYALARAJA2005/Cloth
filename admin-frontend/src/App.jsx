import { Routes, Route } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { useEffect, useState } from 'react';
import { FiMenu } from 'react-icons/fi';
import Sidebar from './components/Sidebar';
import DashboardPage from './pages/DashboardPage';
import ProductsPage from './pages/ProductsPage';
import OrdersPage from './pages/OrdersPage';
import CouponsPage from './pages/CouponsPage';
import InventoryPage from './pages/InventoryPage';
import ReviewsPage from './pages/ReviewsPage';
import SettingsPage from './pages/SettingsPage';
import useThemeStore from './store/themeStore';

export default function App() {
  const { init } = useThemeStore();
  const [isSidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => { init(); }, [init]);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-dark-bg flex flex-col md:flex-row">
      {/* Mobile Header */}
      <header className="md:hidden h-16 bg-white dark:bg-dark-card border-b border-gray-200 dark:border-dark-border flex items-center justify-between px-4 sticky top-0 z-40">
        <div className="flex items-center gap-2">
          <img src="/logo.png" alt="Logo" className="w-8 h-8 object-contain" />
          <span className="font-bold text-gray-900 dark:text-white">Kalyani Admin</span>
        </div>
        <button 
          onClick={() => setSidebarOpen(true)}
          className="p-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-dark-border rounded-lg"
        >
          <FiMenu className="w-6 h-6" />
        </button>
      </header>

      {/* Sidebar Overlay */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 md:hidden animate-fade-in"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <Sidebar isOpen={isSidebarOpen} onClose={() => setSidebarOpen(false)} />

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto w-full p-4 md:p-8">
        <Routes>
          <Route path="/" element={<DashboardPage />} />
          <Route path="/products" element={<ProductsPage />} />
          <Route path="/orders" element={<OrdersPage />} />
          <Route path="/coupons" element={<CouponsPage />} />
          <Route path="/inventory" element={<InventoryPage />} />
          <Route path="/reviews" element={<ReviewsPage />} />
          <Route path="/settings" element={<SettingsPage />} />
        </Routes>
      </main>

      <Toaster
        position="top-right"
        toastOptions={{
          duration: 3000,
          style: {
            background: 'var(--toast-bg, #fff)',
            color: 'var(--toast-color, #1a1a1a)',
            borderRadius: '12px',
            boxShadow: '0 10px 40px rgba(0,0,0,0.12)',
            padding: '12px 16px',
            fontSize: '14px',
            fontWeight: '500',
          },
        }}
      />
    </div>
  );
}
