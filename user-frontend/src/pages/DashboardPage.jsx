import { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { FiUser, FiPackage, FiHeart, FiMapPin, FiEdit3, FiSave, FiX } from 'react-icons/fi';
import toast from 'react-hot-toast';
import api from '../lib/api';
import useAuthStore from '../store/authStore';

export default function DashboardPage() {
  const { user, updateUser } = useAuthStore();
  const navigate = useNavigate();
  const [tab, setTab] = useState('profile');
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(user?.name || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [fullUser, setFullUser] = useState(null);
  const [orders, setOrders] = useState([]);
  const [saving, setSaving] = useState(false);
  const [addingAddress, setAddingAddress] = useState(false);
  const [newAddr, setNewAddr] = useState({ label: '', street: '', city: '', state: '', pincode: '' });

  const fetchData = async (silent = false) => {
    try {
      const [meRes, ordersRes] = await Promise.all([
        api.get('/auth/me'),
        api.get('/orders/my'),
      ]);
      setFullUser(meRes.data);
      setOrders(ordersRes.data);
    } catch { if (!silent) toast.error('Failed to load profile'); }
  };

  useEffect(() => {
    if (!user) { navigate('/login'); return; }
    fetchData();
    const interval = setInterval(() => fetchData(true), 10000);
    return () => clearInterval(interval);
  }, [user, navigate]);

  const addAddress = async () => {
    if (!newAddr.label || !newAddr.street || !newAddr.city || !newAddr.state || !newAddr.pincode || !newAddr.mobile1) {
      toast.error('Please fill at least Mobile 1 and all address fields'); return;
    }
    setSaving(true);
    try {
      const res = await api.post('/auth/address', newAddr);
      setFullUser({ ...fullUser, addresses: [...(fullUser.addresses || []), res.data.address] });
      setAddingAddress(false);
      setNewAddr({ label: '', street: '', city: '', state: '', pincode: '', mobile1: '', mobile2: '' });
      toast.success('Address added!');
    } catch { toast.error('Failed to add address'); }
    finally { setSaving(false); }
  };

  const updateAddress = async (id, data) => {
    setSaving(true);
    try {
      await api.put(`/auth/address/${id}`, data);
      setFullUser({
        ...fullUser,
        addresses: fullUser.addresses.map(a => a.id === id ? { ...a, ...data } : a)
      });
      setEditingAddressId(null);
      toast.success('Address updated!');
    } catch { toast.error('Failed to update address'); }
    finally { setSaving(false); }
  };

  const deleteAddress = async (id) => {
    if (!confirm('Remove this address?')) return;
    try {
      await api.delete(`/auth/address/${id}`);
      setFullUser({ ...fullUser, addresses: fullUser.addresses.filter(a => a.id !== id) });
      toast.success('Address removed');
    } catch { toast.error('Failed to remove'); }
  };

  const saveProfile = async () => {
    setSaving(true);
    try {
      await api.put('/auth/profile', { name, phone });
      updateUser({ name, phone });
      setEditing(false);
      toast.success('Profile updated!');
    } catch { toast.error('Failed to update'); }
    finally { setSaving(false); }
  };

  const [editingAddressId, setEditingAddressId] = useState(null);
  const [editAddr, setEditAddr] = useState(null);

  const startEdit = (addr) => {
    setEditingAddressId(addr.id);
    setEditAddr({ ...addr });
  };

  const TABS = [
    { id: 'profile', label: 'Profile', icon: FiUser },
    { id: 'addresses', label: 'Addresses', icon: FiMapPin },
  ];

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 animate-fade-in">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-8">My Account</h1>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {/* Sidebar */}
        <aside className="md:col-span-1">
          <div className="card p-5 mb-4 text-center">
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center mx-auto mb-3">
              <span className="text-white text-2xl font-bold">{user?.name?.[0]?.toUpperCase()}</span>
            </div>
            <p className="font-bold text-gray-900 dark:text-white">{user?.name}</p>
            <p className="text-xs text-gray-500 truncate">{user?.email}</p>
          </div>
          <nav className="card overflow-hidden">
            {TABS.map(t => (
              <button key={t.id} onClick={() => setTab(t.id)}
                className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-medium transition-all ${tab === t.id ? 'bg-primary-600 text-white' : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-dark-border'}`}>
                <t.icon className="w-4 h-4" /> {t.label}
              </button>
            ))}
          </nav>
        </aside>

        {/* Content */}
        <div className="md:col-span-3">
          {tab === 'profile' && (
            <div className="card p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-bold text-gray-900 dark:text-white">Profile Information</h2>
                {!editing
                  ? <button onClick={() => setEditing(true)} className="flex items-center gap-2 text-sm text-primary-600 dark:text-primary-400 hover:underline"><FiEdit3 /> Edit</button>
                  : <div className="flex gap-2">
                    <button onClick={saveProfile} disabled={saving} className="btn-primary text-sm py-1.5 px-4"><FiSave /> {saving ? 'Saving…' : 'Save'}</button>
                    <button onClick={() => setEditing(false)} className="btn-secondary text-sm py-1.5 px-4"><FiX /></button>
                  </div>
                }
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {[
                  { label: 'Full Name', value: name, set: setName, editable: true },
                  { label: 'Email', value: user?.email, editable: false },
                  { label: 'Phone', value: phone, set: setPhone, editable: true },
                  { label: 'Member Since', value: fullUser?.createdAt ? new Date(fullUser.createdAt).toLocaleDateString() : '—', editable: false },
                ].map(f => (
                  <div key={f.label}>
                    <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">{f.label}</label>
                    {editing && f.editable
                      ? <input className="input-field" value={f.value} onChange={e => f.set(e.target.value)} />
                      : <p className="text-gray-900 dark:text-white font-medium py-2">{f.value || '—'}</p>
                    }
                  </div>
                ))}
              </div>
            </div>
          )}

          {tab === 'addresses' && (
            <div className="card p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="font-bold text-lg text-gray-900 dark:text-white">Saved Addresses</h2>
                {!addingAddress && <button onClick={() => setAddingAddress(true)} className="btn-primary text-sm py-1.5 px-4">+ Add New</button>}
              </div>

              {addingAddress && (
                <div className="mb-6 p-4 rounded-xl border-2 border-primary-100 dark:border-primary-500/20 bg-primary-50/30 dark:bg-primary-500/5 space-y-3 animate-slide-down">
                  <div className="grid grid-cols-2 gap-3">
                    <input className="input-field" placeholder="Label (e.g. Home, Work)" value={newAddr.label} onChange={e => setNewAddr({ ...newAddr, label: e.target.value })} />
                    <input className="input-field" placeholder="Pincode" value={newAddr.pincode} onChange={e => setNewAddr({ ...newAddr, pincode: e.target.value })} />
                  </div>
                  <textarea className="input-field resize-none" rows={2} placeholder="Street Address" value={newAddr.street} onChange={e => setNewAddr({ ...newAddr, street: e.target.value })} />
                  <div className="grid grid-cols-2 gap-3">
                    <input className="input-field" placeholder="City" value={newAddr.city} onChange={e => setNewAddr({ ...newAddr, city: e.target.value })} />
                    <input className="input-field" placeholder="State" value={newAddr.state} onChange={e => setNewAddr({ ...newAddr, state: e.target.value })} />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <input className="input-field" placeholder="Mobile Number 1 *" value={newAddr.mobile1} onChange={e => setNewAddr({ ...newAddr, mobile1: e.target.value })} />
                    <input className="input-field" placeholder="Mobile Number 2 (Optional)" value={newAddr.mobile2} onChange={e => setNewAddr({ ...newAddr, mobile2: e.target.value })} />
                  </div>
                  <div className="flex gap-2 pt-2">
                    <button onClick={addAddress} disabled={saving} className="btn-primary flex-1 justify-center">{saving ? 'Adding...' : 'Save Address'}</button>
                    <button onClick={() => setAddingAddress(false)} className="btn-secondary px-4"><FiX /></button>
                  </div>
                </div>
              )}

              {fullUser?.addresses?.length === 0 || !fullUser?.addresses ? (
                <div className="text-center py-10 opacity-60">
                  <FiMapPin className="w-12 h-12 mx-auto mb-3 text-gray-400" />
                  <p className="text-sm">No addresses saved yet.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-4">
                  {fullUser.addresses.map(addr => (
                    <div key={addr.id} className="group relative p-5 rounded-xl border border-gray-200 dark:border-dark-border hover:border-primary-300 transition-all">
                      {editingAddressId === addr.id ? (
                        <div className="space-y-3">
                          <div className="grid grid-cols-2 gap-3">
                            <input className="input-field text-sm" placeholder="Label" value={editAddr.label} onChange={e => setEditAddr({ ...editAddr, label: e.target.value })} />
                            <input className="input-field text-sm" placeholder="Pincode" value={editAddr.pincode} onChange={e => setEditAddr({ ...editAddr, pincode: e.target.value })} />
                          </div>
                          <textarea className="input-field text-sm resize-none" rows={2} placeholder="Street" value={editAddr.street} onChange={e => setEditAddr({ ...editAddr, street: e.target.value })} />
                          <div className="grid grid-cols-2 gap-3">
                            <input className="input-field text-sm" placeholder="City" value={editAddr.city} onChange={e => setEditAddr({ ...editAddr, city: e.target.value })} />
                            <input className="input-field text-sm" placeholder="State" value={editAddr.state} onChange={e => setEditAddr({ ...editAddr, state: e.target.value })} />
                          </div>
                          <div className="grid grid-cols-2 gap-3">
                            <input className="input-field text-sm" placeholder="Mobile 1" value={editAddr.mobile1} onChange={e => setEditAddr({ ...editAddr, mobile1: e.target.value })} />
                            <input className="input-field text-sm" placeholder="Mobile 2" value={editAddr.mobile2} onChange={e => setEditAddr({ ...editAddr, mobile2: e.target.value })} />
                          </div>
                          <div className="flex gap-2 pt-2">
                            <button onClick={() => updateAddress(addr.id, editAddr)} disabled={saving} className="btn-primary flex-1 text-sm py-2">Update</button>
                            <button onClick={() => setEditingAddressId(null)} className="btn-secondary px-4"><FiX /></button>
                          </div>
                        </div>
                      ) : (
                        <>
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-sm font-extrabold text-gray-900 dark:text-white uppercase tracking-tight">{addr.label}</span>
                            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button onClick={() => startEdit(addr)} className="p-1.5 text-primary-500 hover:bg-primary-50 dark:hover:bg-primary-500/10 rounded-lg"><FiEdit3 /></button>
                              <button onClick={() => deleteAddress(addr.id)} className="p-1.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg"><FiX /></button>
                            </div>
                          </div>
                          <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed mb-2">{addr.street}</p>
                          <p className="text-xs text-gray-500 font-semibold mb-3">{addr.city}, {addr.state} - {addr.pincode}</p>
                          <div className="flex flex-wrap gap-4 pt-3 border-t border-gray-100 dark:border-dark-border">
                            <div className="text-[11px]">
                              <span className="text-gray-400 block uppercase font-bold text-[9px] mb-0.5">Mobile 1</span>
                              <span className="text-gray-700 dark:text-gray-300 font-bold">{addr.mobile1 || '—'}</span>
                            </div>
                            <div className="text-[11px]">
                              <span className="text-gray-400 block uppercase font-bold text-[9px] mb-0.5">Mobile 2</span>
                              <span className="text-gray-700 dark:text-gray-300 font-bold">{addr.mobile2 || '—'}</span>
                            </div>
                          </div>
                        </>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
