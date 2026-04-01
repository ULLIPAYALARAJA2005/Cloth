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

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
        <form onSubmit={handleSubmit} className="lg:col-span-3 space-y-6">
          {/* Payment Instructions */}
          <div className="card p-6 border-2 border-primary-200 dark:border-primary-500/30">
            <h2 className="font-bold text-lg text-gray-900 dark:text-white mb-4">💳 Payment Instructions</h2>
            <div className="bg-gradient-to-r from-primary-50 to-primary-100 dark:from-primary-900/30 dark:to-primary-800/20 rounded-xl p-4 mb-4">
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Send payment via UPI to:</p>
              <div className="flex items-center justify-between">
                <p className="text-2xl font-extrabold text-primary-700 dark:text-primary-300 tracking-wider">{upiNumber}</p>
                <button type="button" onClick={copyUPI}
                  className="flex items-center gap-1 text-sm text-primary-600 dark:text-primary-400 hover:text-primary-800 transition-colors bg-white dark:bg-dark-card px-3 py-1.5 rounded-lg border border-primary-200 dark:border-dark-border">
                  {copied ? <FiCheck className="w-4 h-4" /> : <FiCopy className="w-4 h-4" />}
                  {copied ? 'Copied' : 'Copy'}
                </button>
              </div>
              <p className="text-sm font-semibold text-primary-700 dark:text-primary-300 mt-2">Amount: ₹{total.toLocaleString()}</p>
            </div>
            <p className="text-sm text-amber-600 dark:text-amber-400 font-medium">
              ⚠️ After payment, fill the details below and upload the screenshot.
            </p>
          </div>

          {/* Transaction Details */}
          <div className="card p-6 space-y-4">
            <h2 className="font-bold text-lg text-gray-900 dark:text-white">Transaction Details</h2>
            <input className="input-field" placeholder="Transaction ID / UTR Number *" value={form.transactionId}
              onChange={e => setForm(f => ({ ...f, transactionId: e.target.value }))} required />
            <input className="input-field" placeholder="Transaction Phone Number *" type="tel" value={form.transactionPhone}
              onChange={e => setForm(f => ({ ...f, transactionPhone: e.target.value }))} required />

            {/* Payment Screenshot Upload */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Payment Screenshot *</label>
              <label className={`flex flex-col items-center justify-center border-2 border-dashed rounded-xl p-6 cursor-pointer transition-all ${
                paymentFile ? 'border-green-400 bg-green-50 dark:bg-green-500/10' : 'border-gray-300 dark:border-dark-border hover:border-primary-400'
              }`}>
                <input type="file" accept="image/*" className="hidden" onChange={e => setPaymentFile(e.target.files[0])} />
                {paymentFile ? (
                  <div className="text-center">
                    <FiCheck className="w-8 h-8 text-green-500 mx-auto mb-2" />
                    <p className="text-sm font-medium text-green-700 dark:text-green-400">{paymentFile.name}</p>
                  </div>
                ) : (
                  <div className="text-center">
                    <FiUpload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                    <p className="text-sm text-gray-500">Click to upload screenshot</p>
                    <p className="text-xs text-gray-400 mt-1">PNG, JPG up to 5MB</p>
                  </div>
                )}
              </label>
            </div>
          </div>

          {/* Delivery Address */}
          <div className="card p-6 space-y-4">
            <h2 className="font-bold text-lg text-gray-900 dark:text-white">Delivery Address</h2>
            
            {userAddresses.length > 0 && (
              <div className="space-y-2 mb-4">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Select Saved Address</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {userAddresses.map(addr => (
                    <button key={addr.id} type="button" onClick={() => selectAddress(addr)}
                      className="text-left p-3 rounded-xl border border-gray-200 dark:border-dark-border hover:border-primary-400 transition-all bg-gray-50/50 dark:bg-dark-bg/50">
                      <p className="text-xs font-bold text-gray-900 dark:text-white mb-0.5">{addr.label}</p>
                      <p className="text-[10px] text-gray-500 line-clamp-1">{addr.street}</p>
                      <p className="text-[9px] text-primary-600 font-bold mt-1">{addr.mobile1}{addr.mobile2 ? ' / ' + addr.mobile2 : ''}</p>
                    </button>
                  ))}
                </div>
              </div>
            )}
            
            <div className="grid grid-cols-2 gap-3">
              <input className="input-field" placeholder="Mobile 1 (Delivery) *" type="tel" value={form.mobile1}
                onChange={e => setForm(f => ({ ...f, mobile1: e.target.value }))} required />
              <input className="input-field" placeholder="Mobile 2 (Optional)" type="tel" value={form.mobile2}
                onChange={e => setForm(f => ({ ...f, mobile2: e.target.value }))} />
            </div>

            <textarea className="input-field resize-none" rows={2} placeholder="Street Address *" value={form.address}
              onChange={e => setForm(f => ({ ...f, address: e.target.value }))} required />
            <div className="grid grid-cols-3 gap-3">
              <input className="input-field" placeholder="City *" value={form.city}
                onChange={e => setForm(f => ({ ...f, city: e.target.value }))} required />
              <input className="input-field" placeholder="State *" value={form.state}
                onChange={e => setForm(f => ({ ...f, state: e.target.value }))} required />
              <input className="input-field" placeholder="Pincode *" value={form.pincode}
                onChange={e => setForm(f => ({ ...f, pincode: e.target.value }))} required />
            </div>
          </div>

          <button type="submit" disabled={placing}
            className="btn-primary w-full justify-center py-4 text-base">
            {placing ? (
              <span className="flex items-center gap-2">
                <svg className="animate-spin w-5 h-5" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Placing Order…
              </span>
            ) : 'Place Order'}
          </button>
        </form>

        {/* Right Panel */}
        <div className="lg:col-span-2 space-y-4">
          {/* Coupon */}
          <div className="card p-5">
            <h3 className="font-semibold text-gray-900 dark:text-white mb-3">Have a coupon?</h3>
            <div className="flex gap-2">
              <input className="input-field text-sm" placeholder="Enter coupon code" value={couponCode}
                onChange={e => setCouponCode(e.target.value.toUpperCase())} />
              <button type="button" onClick={validateCoupon} disabled={validatingCoupon}
                className="btn-outline text-sm py-2 px-4 whitespace-nowrap">
                {validatingCoupon ? '...' : 'Apply'}
              </button>
            </div>
            {couponMsg && (
              <p className={`text-xs mt-2 font-medium ${discount > 0 ? 'text-green-600 dark:text-green-400' : 'text-red-500'}`}>
                {couponMsg}
              </p>
            )}
          </div>

          {/* Summary */}
          <div className="card p-5">
            <h3 className="font-semibold text-gray-900 dark:text-white mb-4">Order Summary {isBuyNow && <span className="text-xs font-normal text-primary-500 bg-primary-50 px-2 py-0.5 rounded ml-2 border border-primary-200">Direct Buy</span>}</h3>
            <div className="space-y-4 mb-6">
              {checkoutItems.map((item, i) => {
                const itemPrice = item.price;
                const mrp = item.mrp || itemPrice;
                const discount = (mrp > 0 && itemPrice < mrp) ? Math.round(((mrp - itemPrice) / mrp) * 100) : 0;
                
                return (
                  <div key={i} className="flex gap-4 p-4 border border-gray-100 dark:border-dark-border rounded-xl bg-gray-50/30 dark:bg-dark-bg/50 hover:shadow-md transition-all">
                    {/* Image */}
                    <div className="w-24 h-32 flex-shrink-0 bg-white dark:bg-dark-card rounded-lg overflow-hidden border border-gray-100 dark:border-dark-border">
                      <img src={item.image || 'https://via.placeholder.com/150'} alt={item.name} className="w-full h-full object-cover" />
                    </div>
                    
                    {/* Details */}
                    <div className="flex-1 flex flex-col justify-between">
                      <div>
                        <h4 className="font-bold text-gray-900 dark:text-white line-clamp-2 text-sm leading-snug mb-1">{item.name}</h4>
                        <p className="text-xs text-gray-500 mb-1.5">Color: <span className="font-semibold text-gray-700 dark:text-gray-300">{item.color}</span> | Size: <span className="font-semibold text-gray-700 dark:text-gray-300">{item.size}</span></p>
                        
                        {item.reviews > 0 ? (
                          <div className="flex items-center gap-1.5 mb-2">
                            <span className="flex items-center gap-0.5 text-[10px] bg-green-500 text-white px-1.5 py-0.5 rounded font-black">
                              {(item.rating || 0).toFixed(1)} <FaStar className="w-2.5 h-2.5 fill-current" />
                            </span>
                            <span className="text-[10px] text-gray-400 font-medium">({item.reviews} reviews)</span>
                          </div>
                        ) : (
                          <div className="text-[10px] font-medium text-gray-400 mb-2">
                            No ratings yet
                          </div>
                        )}
                        
                        <div className="flex items-center gap-2">
                          <span className="font-extrabold text-gray-900 dark:text-white text-lg tracking-tight">₹{itemPrice.toLocaleString()}</span>
                          {discount > 0 && (
                            <>
                              <span className="text-xs text-gray-400 line-through">₹{mrp.toLocaleString()}</span>
                              <span className="text-[10px] font-bold text-green-600 bg-green-50 dark:bg-green-500/10 px-1.5 py-0.5 rounded tracking-tighter">{discount}% OFF</span>
                            </>
                          )}
                        </div>
                      </div>
                      
                      <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-100 dark:border-dark-border">
                        <div className="flex items-center border border-gray-200 dark:border-dark-border bg-white dark:bg-dark-card rounded-lg overflow-hidden shadow-sm">
                          <button type="button" onClick={() => handleQuantityChange(i, item.quantity - 1)}
                            className="w-7 h-7 flex items-center justify-center hover:bg-gray-100 dark:hover:bg-dark-border text-gray-600 dark:text-gray-300 transition-colors">
                            <FiMinus className="w-3 h-3" />
                          </button>
                          <span className="w-8 text-center text-xs font-bold text-gray-900 dark:text-white">{item.quantity}</span>
                          <button type="button" onClick={() => handleQuantityChange(i, item.quantity + 1)}
                            className="w-7 h-7 flex items-center justify-center hover:bg-gray-100 dark:hover:bg-dark-border text-gray-600 dark:text-gray-300 transition-colors">
                            <FiPlus className="w-3 h-3" />
                          </button>
                        </div>
                        <div className="text-right">
                          <span className="block text-[10px] text-gray-500">Delivery by</span>
                          <span className="text-xs text-gray-900 dark:text-white font-bold">{deliveryString}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="border-t border-gray-100 dark:border-dark-border pt-3 space-y-2">
              <div className="flex justify-between text-sm text-gray-600 dark:text-gray-400">
                <span>Subtotal</span><span>₹{subtotal.toLocaleString()}</span>
              </div>
              {discount > 0 && (
                <div className="flex justify-between text-sm text-green-600 dark:text-green-400">
                  <span>Coupon Discount</span><span>-₹{discount.toLocaleString()}</span>
                </div>
              )}
              <div className="flex justify-between font-bold text-gray-900 dark:text-white text-base pt-2 border-t border-gray-100 dark:border-dark-border">
                <span>Total to Pay</span><span>₹{total.toLocaleString()}</span>
              </div>
            </div>
          </div>

          {/* Confirmation message */}
          <div className="p-4 bg-amber-50 dark:bg-amber-500/10 rounded-xl text-sm text-amber-800 dark:text-amber-300 leading-relaxed">
            ⏳ <strong>Waiting for admin confirmation.</strong> Your order will be confirmed after we verify your payment. Delivery within 7 days of confirmation.
          </div>
        </div>
      </div>
    </div>
  );
}
