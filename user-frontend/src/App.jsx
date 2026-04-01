import { Link, useRoutes } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { useEffect } from 'react';
import Navbar from './components/Navbar';
import HomePage from './pages/HomePage';
import ProductDetailPage from './pages/ProductDetailPage';
import CartPage from './pages/CartPage';
import CheckoutPage from './pages/CheckoutPage';
import OrdersPage from './pages/OrdersPage';
import WishlistPage from './pages/WishlistPage';
import LoginPage from './pages/LoginPage';
import SignupPage from './pages/SignupPage';
import DashboardPage from './pages/DashboardPage';
import ForgotPasswordPage from './pages/ForgotPasswordPage';
import useThemeStore from './store/themeStore';
import useWishlistStore from './store/wishlistStore';
import useAuthStore from './store/authStore';

function NotFoundPage() {
  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center text-center px-4">
      <div className="text-8xl mb-4">🔍</div>
      <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Page Not Found</h1>
      <p className="text-gray-500 mb-6">The page you're looking for doesn't exist.</p>
      <Link to="/" className="btn-primary">Go Home</Link>
    </div>
  );
}

const routes = [
  { path: '/', element: <HomePage /> },
  { path: '/product/:id', element: <ProductDetailPage /> },
  { path: '/cart', element: <CartPage /> },
  { path: '/checkout', element: <CheckoutPage /> },
  { path: '/orders', element: <OrdersPage /> },
  { path: '/orders/:id', element: <OrdersPage /> },
  { path: '/wishlist', element: <WishlistPage /> },
  { path: '/login', element: <LoginPage /> },
  { path: '/signup', element: <SignupPage /> },
  { path: '/dashboard', element: <DashboardPage /> },
  { path: '/forgot-password', element: <ForgotPasswordPage /> },
  { path: '*', element: <NotFoundPage /> },
];

export default function App() {
  const { init } = useThemeStore();
  const { user } = useAuthStore();
  const { fetchWishlist } = useWishlistStore();
  const element = useRoutes(routes);

  useEffect(() => { init(); }, [init]);
  useEffect(() => { if (user) fetchWishlist(); }, [user, fetchWishlist]);

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-1">
        {element}
      </main>
      <footer className="bg-gray-900 dark:bg-black text-gray-400 text-center py-8 mt-12">
        <p className="text-sm">© 2026 ClothHub. All rights reserved.</p>
        <p className="text-xs mt-1">Made with ❤️ in India</p>
      </footer>
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
