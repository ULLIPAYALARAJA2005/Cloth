import { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { FiUpload, FiCheck, FiCopy, FiMinus, FiPlus } from 'react-icons/fi';
import { FaStar } from 'react-icons/fa';
import toast from 'react-hot-toast';
import api from '../lib/api';
import useCartStore from '../store/cartStore';
import useAuthStore from '../store/authStore';

export default function CheckoutPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const { items: cartItems, clearCart } = useCartStore();
  const { user } = useAuthStore();

  const isBuyNow = location.state?.type === 'single';
  const buyNowItem = location.state?.item;
  const checkoutItems = isBuyNow && buyNowItem ? [buyNowItem] : cartItems;

  const subtotal = checkoutItems.reduce((s, i) => s + i.price * i.quantity, 0);
  
  const handleQuantityChange = (idx, newQty) => {
    if (newQty < 1) return;
    if (isBuyNow) {
      const newItem = { ...checkoutItems[idx], quantity: newQty };
      navigate('.', { replace: true, state: { ...location.state, item: newItem } });
    } else {
      const item = checkoutItems[idx];
      updateQuantity(item.productId, item.size, item.color, newQty);
    }
  };

  const deliveryDate = new Date();
  deliveryDate.setDate(deliveryDate.getDate() + 7);
  const deliveryString = deliveryDate.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });

  const [upiNumber, setUpiNumber] = useState('9652300993');
  const [userAddresses, setUserAddresses] = useState([]);
  const [couponCode, setCouponCode] = useState('');
  const [discount, setDiscount] = useState(0);
  const [couponMsg, setCouponMsg] = useState('');
  const [validatingCoupon, setValidatingCoupon] = useState(false);
  const [form, setForm] = useState({ transactionId: '', transactionPhone: '', mobile1: '', mobile2: '', address: '', city: '', state: '', pincode: '' });
  const [paymentFile, setPaymentFile] = useState(null);
  const [placing, setPlacing] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [payRes, meRes] = await Promise.all([
          api.get('/settings/payment').catch(() => ({ data: { upiNumber: '9652300993' } })),
          api.get('/auth/me').catch(() => ({ data: { addresses: [] } }))
        ]);
        setUpiNumber(payRes.data.upiNumber);
        setUserAddresses(meRes.data.addresses || []);
      } catch (err) { console.error('Error fetching checkout data', err); }
    };
    fetchData();
  }, []);

  const selectAddress = (addr) => {
    setForm({
      ...form,
      address: addr.street,
      city: addr.city,
      state: addr.state,
      pincode: addr.pincode,
      mobile1: addr.mobile1 || '',
      mobile2: addr.mobile2 || '',
    });
    toast.success('Address and delivery numbers selected!');
  };

  const total = Math.max(0, subtotal - discount);

  const copyUPI = () => {
    navigator.clipboard.writeText(upiNumber);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast.success('UPI number copied!');
  };

  const validateCoupon = async () => {
    if (!couponCode.trim()) return;
    setValidatingCoupon(true);
    setCouponMsg('');
    try {
      const res = await api.post('/coupons/validate', { code: couponCode, orderTotal: subtotal });
      setDiscount(res.data.discount);
      setCouponMsg(`✓ ${res.data.coupon.discountType === 'percent' ? res.data.coupon.discountValue + '% off' : '₹' + res.data.coupon.discountValue + ' off'} applied!`);
      toast.success('Coupon applied!');
    } catch (err) {
      setDiscount(0);
      setCouponMsg(err.response?.data?.message || 'Invalid coupon');
    } finally {
      setValidatingCoupon(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.transactionId) { toast.error('Enter transaction ID'); return; }
    if (!form.transactionPhone) { toast.error('Enter transaction phone number'); return; }
    if (!form.mobile1) { toast.error('Enter at least one delivery mobile number'); return; }
    if (!form.address) { toast.error('Enter delivery address'); return; }
    if (!paymentFile) { toast.error('Upload payment screenshot'); return; }

    setPlacing(true);
    try {
      const formData = new FormData();
      formData.append('items', JSON.stringify(checkoutItems));
      formData.append('totalAmount', total);
      formData.append('transactionId', form.transactionId);
      formData.append('phone', form.transactionPhone); 
      formData.append('address', JSON.stringify({
        street: form.address,
        city: form.city,
        state: form.state,
        pincode: form.pincode,
        mobile1: form.mobile1,
        mobile2: form.mobile2
      }));
      if (couponCode && discount > 0) formData.append('couponCode', couponCode);
      formData.append('paymentProof', paymentFile);

      const res = await api.post('/orders', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
      
      if (!isBuyNow) {
        clearCart();
      }
      
      toast.success('Order placed! Welcome to the family.');
      navigate('/orders');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to place order');
    } finally {
      setPlacing(false);
    }
  };

  if (checkoutItems.length === 0) { navigate('/cart'); return null; }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 animate-fade-in">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-8">Checkout</h1>

      <div className="space-y-8">
        {/* 1. Order Summary (Now First) */}
        <div className="card p-5 bg-gray-50/50 dark:bg-dark-card/50">
          <h3 className="font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            📦 Order Summary {isBuyNow && <span className="text-xs font-normal text-primary-500 bg-primary-50 px-2 py-0.5 rounded border border-primary-200">Direct Buy</span>}
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            {checkoutItems.map((item, i) => {
              const itemPrice = item.price;
              const mrp = item.mrp || itemPrice;
              const discount = (mrp > 0 && itemPrice < mrp) ? Math.round(((mrp - itemPrice) / mrp) * 100) : 0;
              
              return (
                <div key={i} className="flex gap-4 p-3 border border-gray-100 dark:border-dark-border rounded-xl bg-white dark:bg-dark-bg/40">
                  <div className="w-20 h-24 flex-shrink-0 rounded-lg overflow-hidden border border-gray-50 dark:border-dark-border">
                    <img src={getImgUrl(item.image)} alt={item.name} className="w-full h-full object-cover" />
                  </div>
                  <div className="flex-1 min-w-0 flex flex-col justify-between">
                    <div>
                      <h4 className="font-bold text-gray-900 dark:text-white line-clamp-1 text-sm">{item.name}</h4>
                      <p className="text-[10px] text-gray-500">Color: {item.color} | Size: {item.size}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="font-bold text-gray-900 dark:text-white">₹{itemPrice.toLocaleString()}</span>
                        {discount > 0 && <span className="text-[10px] line-through text-gray-400">₹{mrp.toLocaleString()}</span>}
                      </div>
                    </div>
                    <div className="flex items-center justify-between text-[10px]">
                      <span className="font-bold text-primary-600">Qty: {item.quantity}</span>
                      <span className="text-gray-400">Delivery by {deliveryString}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 border-t border-gray-100 dark:border-dark-border pt-4">
            <div className="flex justify-between sm:block">
              <span className="text-xs text-gray-500 block">Subtotal</span>
              <span className="font-bold text-gray-900 dark:text-white">₹{subtotal.toLocaleString()}</span>
            </div>
            {discount > 0 && (
              <div className="flex justify-between sm:block text-green-600">
                <span className="text-xs block">Coupon Applied</span>
                <span className="font-bold">-₹{discount.toLocaleString()}</span>
              </div>
            )}
            <div className="flex justify-between sm:block sm:text-right">
              <span className="text-xs text-gray-500 block">Total to Pay</span>
              <span className="text-xl font-black text-primary-600 dark:text-primary-400">₹{total.toLocaleString()}</span>
            </div>
          </div>
        </div>

        {/* 2. Coupon Option (Now Second) */}
        <div className="card p-5 border-2 border-dashed border-primary-200 dark:border-primary-500/20">
          <h3 className="font-bold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
            🎟️ Have a coupon code?
          </h3>
          <div className="flex gap-2">
            <input className="input-field text-sm" placeholder="Enter code (e.g. WELCOME10)" value={couponCode}
              onChange={e => setCouponCode(e.target.value.toUpperCase())} />
            <button type="button" onClick={validateCoupon} disabled={validatingCoupon}
              className="btn-primary py-2 px-6 whitespace-nowrap">
              {validatingCoupon ? '...' : 'Apply Coupon'}
            </button>
          </div>
          {couponMsg && (
            <p className={`text-xs mt-2 font-bold ${discount > 0 ? 'text-green-600' : 'text-red-500'}`}>
              {couponMsg}
            </p>
          )}
        </div>

        {/* 3. The Form (Address, Payment, etc.) */}
        <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="space-y-6">
            {/* Payment Instructions */}
            <div className="card p-6 border border-amber-100 dark:border-amber-500/20 bg-amber-50/30 dark:bg-amber-500/5">
              <h2 className="font-bold text-lg text-gray-900 dark:text-white mb-4">💳 Step 1: Payment</h2>
              <div className="bg-white dark:bg-dark-card rounded-xl p-4 shadow-sm mb-4 border border-primary-100 dark:border-dark-border">
                <p className="text-xs text-gray-500 mb-1">Send ₹{total.toLocaleString()} via UPI to:</p>
                <div className="flex items-center justify-between">
                  <p className="text-2xl font-black text-primary-600 tracking-wider font-mono">{upiNumber}</p>
                  <button type="button" onClick={copyUPI}
                    className="flex items-center gap-1 text-xs font-bold text-primary-600 bg-primary-50 dark:bg-primary-500/10 px-3 py-2 rounded-lg border border-primary-200 dark:border-primary-500/30">
                    {copied ? <FiCheck className="w-3 h-3" /> : <FiCopy className="w-3 h-3" />}
                    {copied ? 'Copied' : 'Copy UPI'}
                  </button>
                </div>
              </div>
              <p className="text-xs text-amber-700 dark:text-amber-400 font-medium">
                ⚠️ Take a screenshot after payment to upload below.
              </p>
            </div>

            {/* Transaction Identity */}
            <div className="card p-6 space-y-4">
              <h2 className="font-bold text-lg text-gray-900 dark:text-white">Step 2: Payment Details</h2>
              <input className="input-field" placeholder="Enter Transaction ID / UTR Number *" value={form.transactionId}
                onChange={e => setForm(f => ({ ...f, transactionId: e.target.value }))} required />
              <input className="input-field" placeholder="Your Payment Mobile Number *" type="tel" value={form.transactionPhone}
                onChange={e => setForm(f => ({ ...f, transactionPhone: e.target.value }))} required />
              
              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase tracking-tighter mb-2">Upload Screenshot *</label>
                <label className={`flex flex-col items-center justify-center border-2 border-dashed rounded-xl p-8 cursor-pointer transition-all ${
                  paymentFile ? 'border-green-400 bg-green-50 dark:bg-green-500/10' : 'border-gray-200 dark:border-dark-border hover:border-primary-400'
                }`}>
                  <input type="file" accept="image/*" className="hidden" onChange={e => setPaymentFile(e.target.files[0])} />
                  {paymentFile ? (
                    <div className="text-center">
                      <FiCheck className="w-8 h-8 text-green-500 mx-auto mb-2" />
                      <p className="text-sm font-bold text-green-700 dark:text-green-400 line-clamp-1">{paymentFile.name}</p>
                    </div>
                  ) : (
                    <div className="text-center">
                      <FiUpload className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                      <p className="text-sm font-bold text-gray-500">Attach Screenshot</p>
                    </div>
                  )}
                </label>
              </div>
            </div>
          </div>

          <div className="space-y-6">
            {/* Delivery Address */}
            <div className="card p-6 space-y-4 h-full">
              <h2 className="font-bold text-lg text-gray-900 dark:text-white">Step 3: Delivery Address</h2>
              
              {userAddresses.length > 0 && (
                <div className="space-y-2 mb-4">
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Use Saved Address</p>
                  <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                    {userAddresses.map(addr => (
                      <button key={addr.id} type="button" onClick={() => selectAddress(addr)}
                        className="flex-shrink-0 text-left p-3 rounded-xl border border-gray-200 dark:border-dark-border hover:border-primary-400 bg-white dark:bg-dark-card min-w-[160px]">
                        <p className="text-[10px] font-black text-gray-900 dark:text-white truncate">{addr.label}</p>
                        <p className="text-[9px] text-gray-500 mt-0.5 truncate">{addr.street}</p>
                      </button>
                    ))}
                  </div>
                </div>
              )}
              
              <div className="grid grid-cols-2 gap-3">
                <input className="input-field" placeholder="Primary Mobile *" type="tel" value={form.mobile1}
                  onChange={e => setForm(f => ({ ...f, mobile1: e.target.value }))} required />
                <input className="input-field" placeholder="Secondary Mobile" type="tel" value={form.mobile2}
                  onChange={e => setForm(f => ({ ...f, mobile2: e.target.value }))} />
              </div>

              <textarea className="input-field resize-none" rows={3} placeholder="Full Delivery Address *" value={form.address}
                onChange={e => setForm(f => ({ ...f, address: e.target.value }))} required />
              <div className="grid grid-cols-2 gap-3">
                <input className="input-field" placeholder="City *" value={form.city}
                  onChange={e => setForm(f => ({ ...f, city: e.target.value }))} required />
                <input className="input-field" placeholder="State *" value={form.state}
                  onChange={e => setForm(f => ({ ...f, state: e.target.value }))} required />
              </div>
              <input className="input-field" placeholder="Pincode *" value={form.pincode}
                onChange={e => setForm(f => ({ ...f, pincode: e.target.value }))} required />

              <div className="pt-4 mt-auto">
                <button type="submit" disabled={placing}
                  className="btn-primary w-full justify-center py-4 text-lg font-black shadow-xl shadow-primary-500/20">
                  {placing ? (
                    <span className="flex items-center gap-2">
                      <svg className="animate-spin w-5 h-5" viewBox="0 0 24 24" fill="none">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                      Placing Order…
                    </span>
                  ) : `Confirm & Place Order`}
                </button>
                <p className="text-center text-[10px] text-gray-400 mt-4 px-4 font-medium italic">
                  ⏳ <strong>Note:</strong> Delivery within 7 days after payment verification.
                </p>
              </div>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
