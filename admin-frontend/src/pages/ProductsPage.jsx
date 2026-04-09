import { useState, useEffect } from 'react';
import { FiPlus, FiEdit2, FiTrash2, FiImage, FiX, FiSearch } from 'react-icons/fi';
import toast from 'react-hot-toast';
import api from '../lib/api';
import { getImgUrl } from '../utils/image';

const CATEGORIES = ['Men', 'Women', 'Kids', 'Sports', 'Ethnic', 'Accessories'];
const SIZES = ['XS', 'S', 'M', 'L', 'XL', 'XXL'];

export default function ProductsPage() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');

  // Form State
  const [isEdit, setIsEdit] = useState(false);
  const [editId, setEditId] = useState(null);
  const [form, setForm] = useState({
    name: '', description: '', category: CATEGORIES[0],
    hasSizes: true, price: '', mrp: '', quantity: '',
    sizes: [{ size: 'M', price: '', mrp: '', qty: '' }], colors: [], tags: '', existingImages: []
  });
  const [images, setImages] = useState([]);
  const [newImageColors, setNewImageColors] = useState([]);
  const [colorInput, setColorInput] = useState('');

  useEffect(() => { fetchProducts(); }, []);

  const fetchProducts = async () => {
    try {
      const res = await api.get('/products?limit=100');
      setProducts(res.data.products);
    } catch { toast.error('Failed to load products'); }
    finally { setLoading(false); }
  };

  const openAdd = () => {
    setIsEdit(false); setEditId(null);
    setForm({ 
      name: '', description: '', category: CATEGORIES[0], 
      hasSizes: true, price: '', mrp: '', quantity: '',
      sizes: [{ size: 'M', price: '', mrp: '', qty: '' }], colors: [], tags: '', existingImages: [] 
    });
    setImages([]);
    setNewImageColors([]);
    setColorInput('');
    setModalOpen(true);
  };

  const openEdit = (p) => {
    setIsEdit(true); setEditId(p.id);
    setForm({
      name: p.name, description: p.description, category: p.category,
      hasSizes: p.hasSizes !== false,
      price: p.price || '',
      mrp: p.mrp || '',
      quantity: p.quantity || '',
      sizes: p.sizes?.length ? p.sizes.map(s => ({ ...s, mrp: s.mrp || '' })) : [{ size: 'M', price: '', mrp: '', qty: '' }],
      colors: p.colors || [], tags: p.tags?.join(', ') || '',
      existingImages: (p.images || []).map(img => typeof img === 'string' ? { url: img, color: 'All' } : img)
    });
    setImages([]);
    setNewImageColors([]);
    setColorInput('');
    setModalOpen(true);
  };

  const deleteProduct = async (id) => {
    if (!confirm('Are you sure you want to delete this product?')) return;
    try {
      await api.delete(`/products/${id}`);
      setProducts(prev => prev.filter(p => p.id !== id));
      toast.success('Product deleted');
    } catch { toast.error('Failed to delete'); }
  };

  const handleSizeChange = (idx, field, value) => {
    const newSizes = [...form.sizes];
    newSizes[idx][field] = field === 'size' ? value : Number(value);
    setForm({ ...form, sizes: newSizes });
  };
  const addSize = () => setForm({ ...form, sizes: [...form.sizes, { size: 'M', price: '', mrp: '', qty: '' }] });
  const rmSize = (idx) => setForm({ ...form, sizes: form.sizes.filter((_, i) => i !== idx) });

  const removeExistingImage = (idx) => {
    setForm({ ...form, existingImages: form.existingImages.filter((_, i) => i !== idx) });
  };

  const setExistingImageColor = (idx, color) => {
    const newEx = [...form.existingImages];
    newEx[idx] = { ...newEx[idx], color };
    setForm({ ...form, existingImages: newEx });
  };

  const addColor = (e) => {
    e.preventDefault();
    const c = colorInput.trim();
    if (!c || form.colors.includes(c)) return;
    setForm({ ...form, colors: [...form.colors, c] });
    setColorInput('');
  };

  const removeColor = (c) => setForm({ ...form, colors: form.colors.filter(x => x !== c) });

  const handleFileUpload = (files) => {
    const newFiles = Array.from(files);
    setImages(prev => [...prev, ...newFiles]);
    setNewImageColors(prev => [...prev, ...newFiles.map(() => 'All')]);
  };

  const removeNewImage = (idx) => {
    setImages(prev => prev.filter((_, i) => i !== idx));
    setNewImageColors(prev => prev.filter((_, i) => i !== idx));
  };

  const setNewColor = (idx, color) => {
    const newColors = [...newImageColors];
    newColors[idx] = color;
    setNewImageColors(newColors);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (form.hasSizes && form.sizes.length === 0) { toast.error('Add at least one size/price'); return; }
    if (!isEdit && images.length === 0) { toast.error('Upload at least one image'); return; }

    setSaving(true);
    try {
      const formData = new FormData();
      formData.append('name', form.name);
      formData.append('description', form.description);
      formData.append('category', form.category);
      formData.append('sizes', JSON.stringify(form.sizes));
      formData.append('colors', JSON.stringify(form.colors));
      formData.append('tags', JSON.stringify(form.tags.split(',').map(t => t.trim()).filter(Boolean)));
      formData.append('imageColors', JSON.stringify(newImageColors));
      formData.append('hasSizes', form.hasSizes !== false);
      formData.append('price', form.price || 0);
      formData.append('mrp', form.mrp || 0);
      formData.append('quantity', form.quantity || 0);

      // Validation check
      if (form.hasSizes === false) {
        if (Number(form.price) >= Number(form.mrp)) {
          toast.error('Selling price must be less than MRP');
          setSaving(false);
          return;
        }
      } else {
        const invalidSize = form.sizes.find(s => Number(s.price) >= Number(s.mrp));
        if (invalidSize) {
          toast.error(`For size ${invalidSize.size}, selling price must be less than MRP`);
          setSaving(false);
          return;
        }
      }

      if (isEdit) formData.append('existingImages', JSON.stringify(form.existingImages));

      images.forEach(file => formData.append('images', file));

      if (isEdit) {
        await api.put(`/products/${editId}`, formData, { headers: { 'Content-Type': 'multipart/form-data' } });
        toast.success('Product updated');
      } else {
        await api.post('/products', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
        toast.success('Product added');
      }
      setModalOpen(false);
      fetchProducts();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error saving product');
    } finally {
      setSaving(false);
    }
  };

  const filteredProducts = products.filter(p => p.name.toLowerCase().includes(search.toLowerCase()) || p.category.toLowerCase().includes(search.toLowerCase()));

  if (loading) return <div className="p-8 text-center text-gray-500 animate-pulse">Loading products...</div>;

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Products</h1>
          <p className="text-sm text-gray-500">Manage your product catalog</p>
        </div>
        <button onClick={openAdd} className="btn-primary w-full sm:w-auto justify-center shadow-primary-500/20"><FiPlus /> Add Product</button>
      </div>

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-4 items-center bg-white dark:bg-dark-card p-4 rounded-xl border border-gray-200 dark:border-dark-border">
        <div className="relative flex-1 w-full">
          <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input 
            type="text" 
            placeholder="Search products by name or category..." 
            className="input-field pl-10 py-2 text-sm"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <div className="text-xs text-gray-500 whitespace-nowrap">
          Showing {filteredProducts.length} products
        </div>
      </div>

      {/* Desktop View */}
      <div className="hidden md:block card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 dark:bg-dark-border border-b border-gray-200 dark:border-dark-border text-[11px] uppercase tracking-wider text-gray-500 font-bold">
                <th className="p-4 w-16 text-center">Img</th>
                <th className="p-4">Product Info</th>
                <th className="p-4">Pricing</th>
                <th className="p-4">Stock Status</th>
                <th className="p-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-dark-border">
              {filteredProducts.map(p => {
                const minPrice = p.hasSizes === false ? (p.price || 0) : (p.sizes?.length ? Math.min(...p.sizes.map(s => s.price)) : 0);
                const totalQty = p.hasSizes === false ? (p.quantity || 0) : (p.sizes?.reduce((s, x) => s + x.qty, 0) || 0);
                return (
                  <tr key={p.id} className="hover:bg-gray-50 dark:hover:bg-dark-border/50 transition-colors">
                    <td className="p-4 h-full">
                      <img src={getImgUrl(p.images?.[0])} className="w-10 h-10 rounded-lg object-cover mx-auto" />
                    </td>
                    <td className="p-4">
                      <p className="font-bold text-gray-900 dark:text-white line-clamp-1 text-sm">{p.name}</p>
                      <span className="text-[10px] font-bold text-primary-600 dark:text-primary-400 uppercase tracking-tighter">{p.category}</span>
                    </td>
                    <td className="p-4 font-bold text-gray-900 dark:text-white text-sm">₹{minPrice.toLocaleString()}</td>
                    <td className="p-4">
                      {totalQty === 0 ? <span className="badge badge-danger">Out of Stock</span> : <span className="badge badge-success">{totalQty} Units</span>}
                    </td>
                    <td className="p-4">
                      <div className="flex items-center justify-end gap-2">
                        <button onClick={() => openEdit(p)} title="Edit" className="p-2 text-gray-500 hover:text-primary-600 bg-gray-100 dark:bg-dark-bg rounded-lg transition-colors"><FiEdit2 className="w-4 h-4" /></button>
                        <button onClick={() => deleteProduct(p.id)} title="Delete" className="p-2 text-gray-500 hover:text-red-600 bg-gray-100 dark:bg-dark-bg rounded-lg transition-colors"><FiTrash2 className="w-4 h-4" /></button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Mobile View */}
      <div className="grid grid-cols-1 gap-4 md:hidden">
        {filteredProducts.map(p => {
          const minPrice = p.hasSizes === false ? (p.price || 0) : (p.sizes?.length ? Math.min(...p.sizes.map(s => s.price)) : 0);
          const totalQty = p.hasSizes === false ? (p.quantity || 0) : (p.sizes?.reduce((s, x) => s + x.qty, 0) || 0);
          return (
            <div key={p.id} className="card p-4 flex gap-4 items-center">
              <img src={getImgUrl(p.images?.[0])} className="w-16 h-16 rounded-xl object-cover border border-gray-100 dark:border-dark-border" />
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between">
                  <span className="text-[9px] font-bold text-primary-500 uppercase">{p.category}</span>
                  <div className="flex gap-1">
                    <button onClick={() => openEdit(p)} className="p-1.5 text-gray-500 bg-gray-100 dark:bg-dark-bg rounded-md"><FiEdit2 className="w-3.5 h-3.5"/></button>
                    <button onClick={() => deleteProduct(p.id)} className="p-1.5 text-red-500 bg-red-50 dark:bg-red-500/10 rounded-md"><FiTrash2 className="w-3.5 h-3.5"/></button>
                  </div>
                </div>
                <h3 className="font-bold text-gray-900 dark:text-white truncate text-sm mb-1">{p.name}</h3>
                <div className="flex items-center justify-between">
                  <p className="font-bold text-primary-600 dark:text-primary-400 text-sm">₹{minPrice.toLocaleString()}</p>
                  <span className={`text-[10px] font-bold ${totalQty > 0 ? 'text-green-500' : 'text-red-500'}`}>
                    {totalQty > 0 ? `${totalQty} In Stock` : 'Out of Stock'}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {filteredProducts.length === 0 && <div className="p-12 text-center text-gray-500 card bg-white dark:bg-dark-card border-dashed">No products found. Try a different search.</div>}

      {/* Modal */}
      {modalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[70] p-0 sm:p-4 md:p-6 animate-fade-in">
          <div className="bg-white dark:bg-dark-card w-full h-full sm:h-[90vh] sm:max-h-[850px] lg:max-w-6xl sm:rounded-2xl shadow-2xl flex flex-col overflow-hidden scale-in border border-white/20">
            <div className="sticky top-0 bg-white/80 dark:bg-dark-card/80 backdrop-blur-md border-b border-gray-100 dark:border-dark-border px-6 py-5 flex items-center justify-between z-20">
              <div>
                <h2 className="text-xl font-bold text-gray-900 dark:text-white leading-none mb-1">{isEdit ? '✏️ Edit Product' : '✨ Add New Product'}</h2>
                <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">{isEdit ? 'Update details and inventory' : 'Fill in the information to list a new item'}</p>
              </div>
              <button onClick={() => setModalOpen(false)} className="p-2 text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-dark-border rounded-full transition-all"><FiX className="w-6 h-6"/></button>
            </div>
            
            <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto custom-scrollbar">
              <div className="p-6 sm:p-8 lg:p-10 lg:grid lg:grid-cols-12 lg:gap-12">
                
                {/* Left Column: Basic Info */}
                <div className="lg:col-span-7 space-y-8">
                  <section className="space-y-6">
                    <div className="flex items-center gap-2 mb-2 text-primary-600 dark:text-primary-400 font-bold text-xs uppercase tracking-widest">
                      <span className="w-8 h-px bg-current opacity-30"></span> Basic Information
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                      <div className="sm:col-span-2">
                        <label className="block text-[10px] font-bold text-gray-400 mb-2 uppercase tracking-widest">Product Name *</label>
                        <input className="input-field py-3" value={form.name} onChange={e => setForm({...form, name: e.target.value})} required placeholder="e.g. Classic White Cotton T-Shirt" />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-gray-400 mb-2 uppercase tracking-widest">Category</label>
                        <select className="input-field py-3" value={form.category} onChange={e => setForm({...form, category: e.target.value})}>
                          {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                      </div>
                      <div className="sm:col-span-2">
                        <label className="block text-[10px] font-bold text-gray-400 mb-2 uppercase tracking-widest">Product Colors (Add/Remove)</label>
                        <div className="flex flex-wrap gap-2 mb-3">
                          {form.colors.map(c => (
                            <span key={c} className="flex items-center gap-1.5 px-3 py-1 bg-primary-100 dark:bg-primary-500/10 text-primary-700 dark:text-primary-400 rounded-full text-[10px] font-black uppercase tracking-widest border border-primary-200 dark:border-primary-500/20">
                              {c}
                              <button type="button" onClick={() => removeColor(c)} className="hover:text-red-500 transition-colors"><FiX className="w-3 h-3"/></button>
                            </span>
                          ))}
                        </div>
                        <div className="flex gap-2">
                          <input className="input-field py-2 text-xs" placeholder="e.g. Red" value={colorInput} onChange={e => setColorInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && addColor(e)} />
                          <button type="button" onClick={addColor} className="btn-secondary px-4 text-xs font-bold whitespace-nowrap">ADD COLOR</button>
                        </div>
                      </div>
                      <div className="sm:col-span-2">
                        <label className="block text-[10px] font-bold text-gray-400 mb-2 uppercase tracking-widest">Description</label>
                        <textarea className="input-field resize-none py-3" rows="5" value={form.description} onChange={e => setForm({...form, description: e.target.value})} placeholder="Describe your product materials, features, and style..." />
                      </div>
                      <div className="sm:col-span-2">
                        <label className="block text-[10px] font-bold text-gray-400 mb-2 uppercase tracking-widest">Search Tags</label>
                        <input className="input-field py-3" placeholder="summer, trending, cotton" value={form.tags} onChange={e => setForm({...form, tags: e.target.value})} />
                      </div>
                    </div>
                  </section>
                </div>

                {/* Right Column: Inventory & Images */}
                <div className="lg:col-span-5 mt-10 lg:mt-0 space-y-10">
                  {/* Sizes and Prices */}
                  <section>
                    <div className="flex items-center justify-between mb-6">
                      <div className="flex items-center gap-2 text-primary-600 dark:text-primary-400 font-bold text-xs uppercase tracking-widest">
                        <span className="w-8 h-px bg-current opacity-30"></span> Inventory
                      </div>
                      {form.hasSizes !== false && (
                        <button type="button" onClick={addSize} className="px-3 py-1 bg-primary-50 dark:bg-primary-500/10 text-primary-600 dark:text-primary-400 text-[10px] font-black uppercase rounded-lg hover:bg-primary-100 transition-colors flex items-center gap-1">
                          <FiPlus/> Add Variant
                        </button>
                      )}
                    </div>

                    <div className="mb-4 flex items-center gap-3 bg-gray-50 dark:bg-dark-bg p-3 rounded-xl border border-gray-100 dark:border-dark-border">
                      <input type="checkbox" id="hasSizes" className="w-4 h-4 text-primary-600 rounded cursor-pointer" checked={form.hasSizes !== false} onChange={e => setForm({...form, hasSizes: e.target.checked})} />
                      <label htmlFor="hasSizes" className="text-xs font-bold text-gray-700 dark:text-gray-300 cursor-pointer select-none tracking-wide">Product has Size Variations (S, M, L)</label>
                    </div>

                    {form.hasSizes !== false ? (
                      <div className="bg-gray-100/10 dark:bg-dark-bg/20 border border-gray-100/50 dark:border-dark-border rounded-2xl p-4 space-y-3 animate-fade-in">
                        {form.sizes.map((s, idx) => {
                          const discount = s.mrp && s.price ? Math.round(((s.mrp - s.price) / s.mrp) * 100) : 0;
                          return (
                            <div key={idx} className="bg-gray-50/5 dark:bg-dark-card/20 p-3 rounded-xl border border-gray-100/20 dark:border-dark-border shadow-sm space-y-2">
                              <div className="flex gap-2 items-center">
                                <select className="bg-transparent text-[11px] font-bold w-14 outline-none border-r border-gray-100/20 dark:border-dark-border cursor-pointer text-gray-900 dark:text-white appearance-none" value={s.size} onChange={e => handleSizeChange(idx, 'size', e.target.value)}>
                                  {SIZES.map(x => <option key={x} value={x} className="bg-white dark:bg-dark-card">{x}</option>)}
                                </select>
                                <div className="flex-1 grid grid-cols-3 gap-2">
                                  <div className="relative">
                                    <span className="absolute left-1.5 top-1/2 -translate-y-1/2 text-[9px] text-gray-400 font-bold uppercase">MRP</span>
                                    <input type="number" className="w-full pl-8 pr-1 py-1 text-[11px] font-bold outline-none bg-transparent text-gray-900 dark:text-white border-0 focus:ring-0" placeholder="MRP" value={s.mrp} onChange={e => handleSizeChange(idx, 'mrp', e.target.value)} required min="0" />
                                  </div>
                                  <div className="relative border-x border-gray-100/20 dark:border-dark-border">
                                    <span className="absolute left-1.5 top-1/2 -translate-y-1/2 text-[9px] text-primary-500 font-bold uppercase">Sale</span>
                                    <input type="number" className="w-full pl-8 pr-1 py-1 text-[11px] font-bold outline-none bg-transparent text-gray-900 dark:text-white border-0 focus:ring-0" placeholder="Price" value={s.price} onChange={e => handleSizeChange(idx, 'price', e.target.value)} required min="0" />
                                  </div>
                                  <input type="number" className="w-full px-2 py-1 text-[11px] outline-none text-right bg-transparent text-gray-900 dark:text-white focus:ring-0" placeholder="Qty" value={s.qty} onChange={e => handleSizeChange(idx, 'qty', e.target.value)} required min="0" />
                                </div>
                                <button type="button" onClick={() => rmSize(idx)} className="p-1.5 text-gray-300 hover:text-red-500 transition-colors"><FiTrash2 className="w-4 h-4"/></button>
                              </div>
                              {discount > 0 && (
                                <div className="flex justify-start">
                                  <span className="text-[9px] font-black bg-green-500/10 text-green-600 px-2 py-0.5 rounded-full uppercase tracking-tighter animate-pulse-subtle">{discount}% Discount Applied</span>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 bg-gray-100/10 dark:bg-dark-bg/20 border border-gray-100/50 dark:border-dark-border rounded-2xl p-4 animate-fade-in">
                        <div className="flex-1">
                          <label className="block text-[10px] font-bold text-gray-400 mb-2 uppercase tracking-widest">MRP Price *</label>
                          <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-gray-400 font-bold">₹</span>
                            <input type="number" className="input-field py-3 pl-8 text-gray-500" value={form.mrp} onChange={e => setForm({...form, mrp: e.target.value})} required={!form.hasSizes} min="0" placeholder="0" />
                          </div>
                        </div>
                        <div className="flex-1">
                          <label className="block text-[10px] font-bold text-gray-400 mb-2 uppercase tracking-widest">Selling Price *</label>
                          <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-primary-500 font-bold">₹</span>
                            <input type="number" className="input-field py-3 pl-8 font-bold" value={form.price} onChange={e => setForm({...form, price: e.target.value})} required={!form.hasSizes} min="0" placeholder="0" />
                          </div>
                        </div>
                        <div className="flex-1">
                          <label className="block text-[10px] font-bold text-gray-400 mb-2 uppercase tracking-widest">Quantity *</label>
                          <input type="number" className="input-field py-3 font-bold" value={form.quantity} onChange={e => setForm({...form, quantity: e.target.value})} required={!form.hasSizes} min="0" placeholder="0" />
                        </div>
                        {form.mrp && form.price && Number(form.mrp) > Number(form.price) && (
                          <div className="sm:col-span-3">
                            <span className="text-[10px] font-black bg-green-500/10 text-green-600 px-3 py-1 rounded-full uppercase tracking-widest border border-green-500/10">
                              🚀 Discount: {Math.round(((form.mrp - form.price) / form.mrp) * 100)}% OFF
                            </span>
                          </div>
                        )}
                      </div>
                    )}
                  </section>

                  {/* Images */}
                  <section>
                    <div className="flex items-center gap-2 mb-6 text-primary-600 dark:text-primary-400 font-bold text-xs uppercase tracking-widest">
                      <span className="w-8 h-px bg-current opacity-30"></span> Visuals
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                      {isEdit && form.existingImages.map((img, i) => {
                        const url = typeof img === 'object' ? img.url : img;
                        const initialColor = typeof img === 'object' ? (img.color || 'All') : 'All';
                        return (
                          <div key={i} className="group relative aspect-square rounded-xl overflow-hidden bg-gray-50 dark:bg-dark-bg border border-gray-100 dark:border-dark-border">
                            <img src={getImgUrl(img)} className="w-full h-full object-cover" />
                            <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center p-2 z-10">
                              <button type="button" onClick={() => removeExistingImage(i)} className="w-full py-1.5 bg-red-500 text-white text-[10px] font-black rounded-lg hover:bg-red-600 transition-all uppercase tracking-widest shadow-lg">DELETE IMAGE</button>
                            </div>
                          </div>
                        );
                      })}
                      {images.map((file, i) => (
                        <div key={`new-${i}`} className="group relative aspect-square rounded-xl overflow-hidden bg-gray-300 border-2 border-primary-500">
                          <img src={URL.createObjectURL(file)} className="w-full h-full object-cover" />
                           <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center p-2">
                             <button type="button" onClick={() => removeNewImage(i)} className="w-full py-1.5 bg-red-500 text-white text-[10px] font-black rounded-lg hover:bg-red-600 transition-all uppercase tracking-widest shadow-lg">REMOVE IMAGE</button>
                           </div>
                        </div>
                      ))}
                      <label className="flex flex-col items-center justify-center gap-2 border-2 border-dashed border-gray-200 dark:border-dark-border rounded-xl aspect-square cursor-pointer hover:border-primary-500 hover:bg-primary-50/30 dark:hover:bg-primary-500/5 transition-all group">
                        <FiImage className="w-6 h-6 text-gray-300 group-hover:text-primary-500 transition-colors" />
                        <span className="text-[9px] font-black text-gray-400 uppercase">Upload</span>
                        <input type="file" multiple accept="image/*" className="hidden" onChange={e => handleFileUpload(e.target.files)} />
                      </label>
                    </div>
                  </section>
                </div>
              </div>
            </form>

            <div className="p-5 sm:p-7 bg-white dark:bg-dark-card border-t border-gray-100 dark:border-dark-border flex items-center justify-end gap-4 z-20">
              <button type="button" onClick={() => setModalOpen(false)} className="px-6 py-2.5 text-sm font-bold text-gray-500 hover:text-gray-900 transition-colors">Cancel</button>
              <button onClick={(e) => handleSubmit(e)} disabled={saving} className="btn-primary min-w-[160px] justify-center py-3 shadow-xl shadow-primary-500/20">
                {saving ? (
                  <span className="flex items-center gap-2">
                    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/></svg>
                    Saving...
                  </span>
                ) : (
                  <span className="flex items-center gap-2">📦 {isEdit ? 'Update Product' : 'List Product'}</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
