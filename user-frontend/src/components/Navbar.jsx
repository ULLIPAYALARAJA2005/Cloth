import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useState, useRef, useEffect } from 'react';
import { FiSearch, FiHeart, FiShoppingCart, FiUser, FiSun, FiMoon, FiMenu, FiX, FiLogOut } from 'react-icons/fi';
import useAuthStore from '../store/authStore';
import useCartStore from '../store/cartStore';
import useThemeStore from '../store/themeStore';
import api from '../lib/api';

const categories = ['All', 'Men', 'Women', 'Kids', 'Sports', 'Ethnic', 'Accessories'];

export default function Navbar() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [searchParams, setSearchParams] = useSearchParams();
  const { user, logout } = useAuthStore();
  const cartCount = useCartStore(s => s.count());
  const { dark, toggle } = useThemeStore();
  const navigate = useNavigate();
  const searchRef = useRef(null);
  const debounceRef = useRef(null);

  // Sync search input with URL
  useEffect(() => {
    const q = searchParams.get('search') || '';
    setSearchQuery(q);
  }, [searchParams]);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (searchRef.current && !searchRef.current.contains(e.target)) setSuggestions([]);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSearch = (q) => {
    setSearchQuery(q);
    clearTimeout(debounceRef.current);

    if (!q.trim()) {
      setSuggestions([]);
      // Clear search from URL — show all products
      const params = new URLSearchParams(searchParams);
      params.delete('search');
      setSearchParams(params);
      return;
    }

    // Update URL in real-time for live filtering
    const params = new URLSearchParams(searchParams);
    params.set('search', q);
    params.delete('page');
    setSearchParams(params);

    // Fetch suggestions with debounce
    debounceRef.current = setTimeout(async () => {
      try {
        const res = await api.get(`/products?search=${encodeURIComponent(q)}&limit=6`);
        setSuggestions(res.data.products || []);
      } catch { setSuggestions([]); }
    }, 250);
  };

  const doSearch = (e) => {
    e.preventDefault();
    setSuggestions([]);
  };

  const clearSearch = () => {
    setSearchQuery('');
    setSuggestions([]);
    const params = new URLSearchParams(searchParams);
    params.delete('search');
    setSearchParams(params);
  };

  return (
    <nav className="sticky top-0 z-50 bg-white/95 dark:bg-dark-bg/95 backdrop-blur-md border-b border-gray-100 dark:border-dark-border shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Luxury Logo */}
          <Link to="/" className="flex items-center gap-3 group">
            <div className="relative w-11 h-11 flex items-center justify-center">
              <div className="absolute inset-0 bg-gray-900 dark:bg-primary-900 rounded-xl rotate-6 group-hover:rotate-12 transition-transform duration-300 opacity-20"></div>
              <div className="absolute inset-0 bg-gradient-to-br from-gray-800 to-black dark:from-primary-600 dark:to-primary-800 rounded-xl shadow-lg border border-white/10 flex items-center justify-center overflow-hidden">
                <span className="text-white font-serif text-2xl" style={{ fontFamily: 'Cinzel, serif' }}>K</span>
                <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-primary-500 rounded-full border-2 border-white dark:border-dark-bg"></div>
              </div>
            </div>
            <div className="flex flex-col -space-y-1">
              <span className="text-xl font-bold text-gray-900 dark:text-white tracking-tighter" style={{ fontFamily: 'Playfair Display, serif' }}>
                Kalyani
              </span>
              <span className="text-[15px] text-primary-600 dark:text-primary-400 font-normal tracking-wide" style={{ fontFamily: 'Great Vibes, cursive' }}>
                Fashion Hub
              </span>
            </div>
          </Link>

          {/* Desktop Search Bar */}
          <div ref={searchRef} className="hidden md:block flex-1 max-w-xl mx-4 relative">
            <form onSubmit={doSearch}>
              <div className="relative">
                <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={e => handleSearch(e.target.value)}
                  placeholder="Search clothes, brands, categories…"
                  className="w-full pl-10 pr-9 py-2.5 rounded-xl bg-gray-100 dark:bg-dark-card border border-transparent focus:border-primary-500 focus:bg-white dark:focus:bg-dark-card focus:outline-none text-sm transition-all"
                />
                {searchQuery && (
                  <button type="button" onClick={clearSearch}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors">
                    <FiX className="w-4 h-4" />
                  </button>
                )}
              </div>
            </form>
            {/* Live suggestions */}
            {suggestions.length > 0 && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-dark-card rounded-xl shadow-xl border border-gray-100 dark:border-dark-border overflow-hidden z-50 animate-slide-down">
                {suggestions.map(p => (
                  <button key={p.id}
                    onClick={() => { navigate(`/product/${p.id}`); setSuggestions([]); }}
                    className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 dark:hover:bg-dark-border transition-colors text-left">
                    <img src={p.images?.[0]} alt={p.name} className="w-10 h-10 rounded-lg object-cover flex-shrink-0" />
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{p.name}</p>
                      <p className="text-xs text-gray-500">₹{Math.min(...(p.sizes?.map(s => s.price) || [0]))} · {p.category}</p>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Right Icons */}
          <div className="flex items-center gap-1.5 ml-auto md:ml-0">
            <button onClick={toggle} className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-dark-card transition-colors" aria-label="Toggle dark mode">
              {dark ? <FiSun className="w-5 h-5 text-yellow-400" /> : <FiMoon className="w-5 h-5 text-gray-600" />}
            </button>

            {user && (
              <Link to="/wishlist" className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-dark-card transition-colors">
                <FiHeart className="w-5 h-5 text-gray-600 dark:text-gray-300" />
              </Link>
            )}

            <Link to="/cart" className="relative p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-dark-card transition-colors">
              <FiShoppingCart className="w-5 h-5 text-gray-600 dark:text-gray-300" />
              {cartCount > 0 && (
                <span className="absolute -top-1 -right-1 w-5 h-5 bg-primary-500 text-white text-xs font-bold rounded-full flex items-center justify-center">
                  {cartCount > 9 ? '9+' : cartCount}
                </span>
              )}
            </Link>

            {user ? (
              <div className="relative hidden md:block">
                <button onClick={() => setUserMenuOpen(!userMenuOpen)}
                  className="flex items-center gap-2 p-1.5 rounded-xl hover:bg-gray-100 dark:hover:bg-dark-card transition-colors">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center shadow">
                    <span className="text-white text-sm font-bold">{user.name?.[0]?.toUpperCase()}</span>
                  </div>
                  <span className="hidden md:block text-sm font-medium text-gray-700 dark:text-gray-300 max-w-[80px] truncate">{user.name}</span>
                </button>
                {userMenuOpen && (
                  <div className="absolute right-0 top-full mt-2 w-52 bg-white dark:bg-dark-card rounded-2xl shadow-xl border border-gray-100 dark:border-dark-border overflow-hidden z-50 animate-slide-down">
                    <div className="px-4 py-3 border-b border-gray-100 dark:border-dark-border">
                      <p className="font-semibold text-gray-900 dark:text-white text-sm">{user.name}</p>
                      <p className="text-xs text-gray-500 truncate">{user.email}</p>
                    </div>
                    {[
                      { to: '/dashboard', label: '👤 Dashboard' },
                      { to: '/orders', label: '📦 My Orders' },
                      { to: '/wishlist', label: '❤️ Wishlist' },
                    ].map(item => (
                      <Link key={item.to} to={item.to} onClick={() => setUserMenuOpen(false)}
                        className="flex items-center px-4 py-3 text-sm hover:bg-gray-50 dark:hover:bg-dark-border text-gray-700 dark:text-gray-300 transition-colors">
                        {item.label}
                      </Link>
                    ))}
                    <button onClick={() => { logout(); setUserMenuOpen(false); navigate('/'); }}
                      className="w-full flex items-center gap-2 px-4 py-3 text-sm text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors border-t border-gray-100 dark:border-dark-border">
                      <FiLogOut className="w-4 h-4" /> Sign Out
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <Link to="/login" className="btn-primary text-sm py-2 px-4 hidden md:block">Login</Link>
            )}

            <button onClick={() => setMenuOpen(!menuOpen)} className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-dark-card lg:hidden">
              {menuOpen ? <FiX className="w-5 h-5" /> : <FiMenu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Mobile Search Bar */}
        <div className="md:hidden pb-3">
          <form onSubmit={doSearch}>
            <div className="relative">
              <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                value={searchQuery}
                onChange={e => handleSearch(e.target.value)}
                placeholder="Search products..."
                className="w-full pl-10 pr-9 py-2.5 rounded-xl bg-gray-100 dark:bg-dark-card border border-transparent focus:border-primary-500 focus:bg-white dark:focus:bg-dark-card focus:outline-none text-sm transition-all"
              />
              {searchQuery && (
                <button type="button" onClick={clearSearch}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors">
                  <FiX className="w-4 h-4" />
                </button>
              )}
            </div>
          </form>
          {suggestions.length > 0 && (
            <div className="absolute left-4 right-4 mt-1 bg-white dark:bg-dark-card rounded-xl shadow-xl border border-gray-100 dark:border-dark-border overflow-hidden z-50 animate-slide-down">
              {suggestions.map(p => (
                <button key={p.id}
                  onClick={() => { navigate(`/product/${p.id}`); setSuggestions([]); }}
                  className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 dark:hover:bg-dark-border transition-colors text-left">
                  <img src={p.images?.[0]} alt={p.name} className="w-10 h-10 rounded-lg object-cover flex-shrink-0" />
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{p.name}</p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Category bar */}
        <div className="hidden lg:flex items-center gap-1 pb-2 overflow-x-auto scrollbar-hide">
          {categories.map(cat => (
            <Link key={cat} to={cat === 'All' ? '/' : `/?category=${cat}`}
              className="px-4 py-1.5 text-sm font-medium rounded-lg whitespace-nowrap text-gray-600 dark:text-gray-400 hover:text-primary-600 dark:hover:text-primary-400 hover:bg-primary-50 dark:hover:bg-primary-500/10 transition-all">
              {cat}
            </Link>
          ))}
        </div>

        {/* Mobile menu */}
        {menuOpen && (
          <div className="lg:hidden pb-4 pt-2 space-y-1 animate-slide-down">
            {categories.map(cat => (
              <Link key={cat} to={cat === 'All' ? '/' : `/?category=${cat}`}
                onClick={() => setMenuOpen(false)}
                className="block px-4 py-3 text-sm text-gray-700 dark:text-gray-300 border-b border-gray-100 dark:border-dark-border hover:bg-gray-50 dark:hover:bg-dark-card font-medium">
                {cat}
              </Link>
            ))}
            
            {/* User Options in Mobile Menu */}
            <div className="pt-2">
              {user ? (
                <>
                  <div className="px-4 py-3 bg-gray-50 dark:bg-dark-border/50">
                    <p className="font-semibold text-gray-900 dark:text-white text-sm">{user.name}</p>
                    <p className="text-xs text-gray-500 truncate">{user.email}</p>
                  </div>
                  {[
                    { to: '/dashboard', label: '👤 Dashboard' },
                    { to: '/orders', label: '📦 My Orders' },
                    { to: '/wishlist', label: '❤️ Wishlist' },
                  ].map(item => (
                    <Link key={item.to} to={item.to} onClick={() => setMenuOpen(false)}
                      className="block px-4 py-3 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-dark-card transition-colors">
                      {item.label}
                    </Link>
                  ))}
                  <button onClick={() => { logout(); setMenuOpen(false); navigate('/'); }}
                    className="w-full flex items-center gap-2 px-4 py-3 text-sm text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors">
                    <FiLogOut className="w-4 h-4" /> Sign Out
                  </button>
                </>
              ) : (
                <div className="px-4 py-3">
                  <Link to="/login" onClick={() => setMenuOpen(false)} className="btn-primary block text-center py-2 text-sm">
                    Login
                  </Link>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}
