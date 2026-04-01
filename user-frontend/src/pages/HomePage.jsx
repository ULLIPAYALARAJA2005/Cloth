import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { FiFilter, FiChevronDown, FiChevronUp, FiX, FiArrowUp, FiArrowRight } from 'react-icons/fi';
import ProductCard from '../components/ProductCard';
import api from '../lib/api';

const SORT_OPTIONS = [
  { value: 'newest', label: 'New Arrivals' },
  { value: 'popular', label: 'Most Popular' },
  { value: 'price_asc', label: 'Price: Low to High' },
  { value: 'price_desc', label: 'Price: High to Low' },
];

export default function HomePage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const categoryParam = searchParams.get('category') || 'All';
  const searchQuery = searchParams.get('search') || '';

  const [allProducts, setAllProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [mobileFilterOpen, setMobileFilterOpen] = useState(false);
  const [showBackToTop, setShowBackToTop] = useState(false);

  // Filter state
  const [minPrice, setMinPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');
  const [selectedSize, setSelectedSize] = useState('');
  const [selectedColor, setSelectedColor] = useState('');
  const [sort, setSort] = useState('newest');

  // Derived: dynamic sizes and colors from products
  const allSizes = [...new Set(allProducts.flatMap(p => p.sizes?.map(s => s.size) || []))].sort();
  const allColors = [...new Set(allProducts.flatMap(p => p.colors || []))].filter(Boolean);
  const allCategories = ['All', ...new Set(allProducts.map(p => p.category).filter(Boolean))];

  // Show category view only when no search/filter active
  const isFiltered = searchQuery || categoryParam !== 'All' || minPrice || maxPrice || selectedSize || selectedColor;

  useEffect(() => {
    const onScroll = () => setShowBackToTop(window.scrollY > 400);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const fetchProducts = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const res = await api.get('/products?limit=200');
      setAllProducts(res.data.products || []);
    } catch {
      setAllProducts([]);
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProducts();
    const interval = setInterval(() => fetchProducts(true), 15000);
    return () => clearInterval(interval);
  }, [fetchProducts]);

  // Apply all client-side filters
  const applyFilters = (products) => {
    let list = [...products];
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      list = list.filter(p =>
        p.name?.toLowerCase().includes(q) ||
        p.description?.toLowerCase().includes(q) ||
        p.category?.toLowerCase().includes(q) ||
        p.tags?.some(t => t.toLowerCase().includes(q))
      );
    }

    const getMinPrice = p => p.hasSizes === false ? (p.price || 0) : (p.sizes?.length > 0 ? Math.min(...p.sizes.map(s => s.price)) : 0);

    if (categoryParam && categoryParam !== 'All') list = list.filter(p => p.category === categoryParam);
    if (selectedSize) list = list.filter(p => p.sizes?.some(s => s.size === selectedSize && s.qty > 0));
    if (selectedColor) list = list.filter(p => p.colors?.includes(selectedColor));
    if (minPrice) list = list.filter(p => getMinPrice(p) >= Number(minPrice));
    if (maxPrice) list = list.filter(p => getMinPrice(p) <= Number(maxPrice));
    
    if (sort === 'popular') list.sort((a, b) => (b.ratings || 0) - (a.ratings || 0));
    else if (sort === 'newest') list.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    else if (sort === 'price_asc') list.sort((a, b) => getMinPrice(a) - getMinPrice(b));
    else if (sort === 'price_desc') list.sort((a, b) => getMinPrice(b) - getMinPrice(a));
    return list;
  };

  const filteredProducts = applyFilters(allProducts);

  // Group by category for the home view (sorted newest first, show 6 per cat)
  const categoryGroups = allCategories
    .filter(c => c !== 'All')
    .map(cat => ({
      category: cat,
      products: allProducts
        .filter(p => p.category === cat)
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
        .slice(0, 6),
    }))
    .filter(g => g.products.length > 0);

  const clearFilters = () => { setMinPrice(''); setMaxPrice(''); setSelectedSize(''); setSelectedColor(''); };
  const hasActiveFilters = minPrice || maxPrice || selectedSize || selectedColor;

  if (loading) return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="skeleton h-40 rounded-2xl mb-8" />
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[...Array(8)].map((_, i) => <div key={i} className="skeleton aspect-[3/4] rounded-2xl" />)}
      </div>
    </div>
  );

  return (
    <div className="min-h-screen">
      {/* Hero Banner */}
      <div className="relative bg-gradient-to-r from-primary-700 via-primary-600 to-primary-500 text-white py-14 px-6 overflow-hidden">
        <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(circle at 20% 50%, white 1px, transparent 1px)', backgroundSize: '30px 30px' }} />
        <div className="max-w-3xl mx-auto text-center relative z-10">
          <span className="inline-block bg-white/20 text-white text-xs font-semibold px-3 py-1 rounded-full mb-4">New Season Arrivals ✨</span>
          <h1 className="text-4xl sm:text-5xl font-extrabold mb-4 leading-tight tracking-tight">
            Fashion That Speaks <span className="text-yellow-300">Your Style</span>
          </h1>
          <p className="text-white/80 text-lg mb-8">Discover the latest trends in clothing — curated for you.</p>
          <div className="flex flex-wrap gap-3 justify-center">
            {allCategories.filter(c => c !== 'All').slice(0, 4).map(c => (
              <Link key={c} to={`/?category=${c}`}
                className="px-5 py-2 bg-white/20 hover:bg-white/30 rounded-full text-sm font-semibold transition-all hover:scale-105">
                Shop {c}
              </Link>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Category Pills */}
        <div className="flex gap-2 overflow-x-auto pb-4 scrollbar-hide">
          {allCategories.map(cat => (
            <Link key={cat} to={cat === 'All' ? '/' : `/?category=${cat}`}
              className={`flex-shrink-0 px-5 py-2 rounded-full text-sm font-semibold transition-all ${
                categoryParam === cat
                  ? 'bg-primary-600 text-white shadow-lg shadow-primary-500/30'
                  : 'bg-white dark:bg-dark-card text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-dark-border border border-gray-200 dark:border-dark-border'
              }`}>
              {cat}
            </Link>
          ))}
        </div>

        <div className="flex gap-6">
          {/* Filters Sidebar */}
          <aside className="w-56 flex-shrink-0 hidden lg:block">
            <div className="card p-4 sticky top-20">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-gray-900 dark:text-white flex items-center gap-2">
                  <FiFilter /> Filters
                </h3>
                {hasActiveFilters && (
                  <button onClick={clearFilters} className="text-xs text-primary-600 dark:text-primary-400 hover:underline flex items-center gap-1">
                    <FiX className="w-3 h-3" /> Clear
                  </button>
                )}
              </div>

              {/* Price Range */}
              <FilterSection title="Price Range">
                <div className="flex gap-2">
                  <input type="number" placeholder="Min ₹" value={minPrice} onChange={e => setMinPrice(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-dark-border bg-gray-50 dark:bg-dark-bg text-sm focus:outline-none focus:ring-1 focus:ring-primary-500" />
                  <input type="number" placeholder="Max ₹" value={maxPrice} onChange={e => setMaxPrice(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-dark-border bg-gray-50 dark:bg-dark-bg text-sm focus:outline-none focus:ring-1 focus:ring-primary-500" />
                </div>
              </FilterSection>

              {/* Size */}
              {allSizes.length > 0 && (
                <FilterSection title="Size">
                  <div className="flex flex-wrap gap-2">
                    {allSizes.map(s => (
                      <button key={s} onClick={() => setSelectedSize(selectedSize === s ? '' : s)}
                        className={`px-3 py-1.5 rounded-lg text-sm border font-medium transition-all ${selectedSize === s ? 'bg-primary-600 text-white border-primary-600 shadow-md' : 'border-gray-200 dark:border-dark-border text-gray-600 dark:text-gray-400 hover:border-primary-400'}`}>
                        {s}
                      </button>
                    ))}
                  </div>
                </FilterSection>
              )}

              {/* Color */}
              {allColors.length > 0 && (
                <FilterSection title="Color">
                  <div className="flex flex-wrap gap-3">
                    {allColors.map(c => (
                      <div key={c} className="flex flex-col items-center gap-1">
                        <button
                          onClick={() => setSelectedColor(selectedColor === c ? '' : c)}
                          title={c}
                          className={`w-8 h-8 rounded-full border-2 transition-all hover:scale-110 shadow-sm ${selectedColor === c ? 'border-primary-500 ring-2 ring-primary-500/30 scale-110' : 'border-gray-300 dark:border-dark-border'}`}
                          style={{ backgroundColor: c.toLowerCase() }}
                        />
                        <span className="text-[9px] text-gray-500 dark:text-gray-400 font-medium capitalize leading-none">{c}</span>
                      </div>
                    ))}
                  </div>
                </FilterSection>
              )}
            </div>
          </aside>

          {/* Main Content */}
          <div className="flex-1 min-w-0">
            {/* Toolbar */}
            <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
              <div className="flex items-center gap-3">
                <button onClick={() => setMobileFilterOpen(true)}
                  className="lg:hidden flex items-center gap-2 px-4 py-2 rounded-xl border border-gray-200 dark:border-dark-border bg-white dark:bg-dark-card text-sm font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-50 transition-colors shadow-sm">
                  <FiFilter className="w-4 h-4" /> Filters
                </button>
                {isFiltered && (
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {filteredProducts.length} {filteredProducts.length === 1 ? 'result' : 'results'} {searchQuery && `for "${searchQuery}"`}
                  </p>
                )}
              </div>
              <select value={sort} onChange={e => setSort(e.target.value)}
                className="px-4 py-2 rounded-xl border border-gray-200 dark:border-dark-border bg-white dark:bg-dark-card text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 shadow-sm">
                {SORT_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>

            {/* Mobile Filter Drawer */}
            {mobileFilterOpen && (
              <div className="fixed inset-0 z-[60] lg:hidden">
                <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setMobileFilterOpen(false)} />
                <div className="absolute inset-y-0 left-0 w-[280px] bg-white dark:bg-dark-bg shadow-2xl flex flex-col">
                  <div className="p-4 border-b border-gray-100 dark:border-dark-border flex items-center justify-between">
                    <h3 className="font-bold text-lg text-gray-900 dark:text-white">Filters</h3>
                    <button onClick={() => setMobileFilterOpen(false)} className="p-2 hover:bg-gray-100 dark:hover:bg-dark-border rounded-lg"><FiX /></button>
                  </div>
                  <div className="flex-1 overflow-y-auto p-4">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="font-bold text-gray-900 dark:text-white flex items-center gap-2">
                        <FiFilter /> Filters
                      </h3>
                      {hasActiveFilters && (
                        <button onClick={clearFilters} className="text-xs text-primary-600 dark:text-primary-400 hover:underline flex items-center gap-1">
                          <FiX className="w-3 h-3" /> Clear
                        </button>
                      )}
                    </div>

                    {/* Price Range */}
                    <FilterSection title="Price Range">
                      <div className="flex gap-2">
                        <input type="number" placeholder="Min ₹" value={minPrice} onChange={e => setMinPrice(e.target.value)}
                          className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-dark-border bg-gray-50 dark:bg-dark-bg text-sm focus:outline-none focus:ring-1 focus:ring-primary-500" />
                        <input type="number" placeholder="Max ₹" value={maxPrice} onChange={e => setMaxPrice(e.target.value)}
                          className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-dark-border bg-gray-50 dark:bg-dark-bg text-sm focus:outline-none focus:ring-1 focus:ring-primary-500" />
                      </div>
                    </FilterSection>

                    {/* Size */}
                    {allSizes.length > 0 && (
                      <FilterSection title="Size">
                        <div className="flex flex-wrap gap-2">
                          {allSizes.map(s => (
                            <button key={s} onClick={() => setSelectedSize(selectedSize === s ? '' : s)}
                              className={`px-3 py-1.5 rounded-lg text-sm border font-medium transition-all ${selectedSize === s ? 'bg-primary-600 text-white border-primary-600 shadow-md' : 'border-gray-200 dark:border-dark-border text-gray-600 dark:text-gray-400 hover:border-primary-400'}`}>
                              {s}
                            </button>
                          ))}
                        </div>
                      </FilterSection>
                    )}

                    {/* Color */}
                    {allColors.length > 0 && (
                      <FilterSection title="Color">
                        <div className="flex flex-wrap gap-3">
                          {allColors.map(c => (
                            <div key={c} className="flex flex-col items-center gap-1">
                              <button
                                onClick={() => setSelectedColor(selectedColor === c ? '' : c)}
                                title={c}
                                className={`w-8 h-8 rounded-full border-2 transition-all hover:scale-110 shadow-sm ${selectedColor === c ? 'border-primary-500 ring-2 ring-primary-500/30 scale-110' : 'border-gray-300 dark:border-dark-border'}`}
                                style={{ backgroundColor: c.toLowerCase() }}
                              />
                              <span className="text-[9px] text-gray-500 dark:text-gray-400 font-medium capitalize leading-none">{c}</span>
                            </div>
                          ))}
                        </div>
                      </FilterSection>
                    )}
                  </div>
                  <div className="p-4 border-t border-gray-100 dark:border-dark-border">
                    <button onClick={() => setMobileFilterOpen(false)} className="btn-primary w-full justify-center py-3">View Results</button>
                  </div>
                </div>
              </div>
            )}

            {/* ---- FILTERED / SEARCH VIEW ---- */}
            {isFiltered ? (
              filteredProducts.length === 0 ? (
                <div className="text-center py-24">
                  <div className="text-6xl mb-4">👗</div>
                  <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">No products found</h3>
                  <p className="text-gray-500 mb-6">Try adjusting your filters</p>
                  <Link to="/" onClick={clearFilters} className="btn-primary">Clear All Filters</Link>
                </div>
              ) : (
                <div className="product-grid">
                  {filteredProducts.map(p => <ProductCard key={p.id} product={p} />)}
                </div>
              )
            ) : (
              /* ---- CATEGORY-BASED HOME VIEW ---- */
              <div className="space-y-10">
                {categoryGroups.length === 0 ? (
                  <div className="text-center py-24">
                    <div className="text-6xl mb-4">👗</div>
                    <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">No products yet</h3>
                    <p className="text-gray-500">Products added by admin will appear here.</p>
                  </div>
                ) : (
                  categoryGroups.map(({ category, products }) => (
                    <section key={category}>
                      <div className="flex items-center justify-between mb-4">
                        <h2 className="text-xl font-bold text-gray-900 dark:text-white">{category}</h2>
                        <Link to={`/?category=${category}`}
                          className="flex items-center gap-1 text-sm font-semibold text-primary-600 dark:text-primary-400 hover:underline">
                          View All <FiArrowRight className="w-4 h-4" />
                        </Link>
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-3">
                        {products.map(p => <ProductCard key={p.id} product={p} compact />)}
                      </div>
                    </section>
                  ))
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Back to top */}
      {showBackToTop && (
        <button onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          className="fixed bottom-6 right-6 w-12 h-12 bg-primary-600 text-white rounded-full shadow-lg flex items-center justify-center hover:bg-primary-700 transition-all hover:scale-110 animate-fade-in z-40">
          <FiArrowUp className="w-5 h-5" />
        </button>
      )}
    </div>
  );
}

function FilterSection({ title, children }) {
  const [open, setOpen] = useState(true);
  return (
    <div className="border-t border-gray-100 dark:border-dark-border pt-4 pb-2">
      <button onClick={() => setOpen(!open)} className="flex items-center justify-between w-full mb-3 text-left">
        <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">{title}</span>
        {open ? <FiChevronUp className="w-4 h-4 text-gray-400" /> : <FiChevronDown className="w-4 h-4 text-gray-400" />}
      </button>
      {open && children}
    </div>
  );
}
