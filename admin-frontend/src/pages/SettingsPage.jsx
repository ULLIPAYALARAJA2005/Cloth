import { useState, useEffect } from 'react';
import { FiSave, FiCreditCard, FiSmartphone } from 'react-icons/fi';
import toast from 'react-hot-toast';
import api from '../lib/api';

export default function SettingsPage() {
  const [upiNumber, setUpiNumber] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const res = await api.get('/settings/payment');
      setUpiNumber(res.data.upiNumber);
    } catch {
      toast.error('Failed to load settings');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!upiNumber) return toast.error('UPI Number is required');
    setSaving(true);
    try {
      await api.put('/settings/payment', { upiNumber });
      toast.success('Payment settings updated');
    } catch {
      toast.error('Failed to update settings');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="p-8 text-center text-gray-500 animate-pulse">Loading settings...</div>;

  return (
    <div className="max-w-4xl mx-auto p-4 md:p-8 animate-fade-in">
      <div className="flex items-center gap-3 mb-8">
        <div className="p-3 bg-primary-100 dark:bg-primary-500/20 text-primary-600 rounded-2xl">
          <FiSmartphone className="w-6 h-6" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Store Settings</h1>
          <p className="text-sm text-gray-500">Manage your store's global configuration</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="md:col-span-1">
          <h2 className="font-bold text-gray-900 dark:text-white mb-1">Payment Settings</h2>
          <p className="text-xs text-gray-500 leading-relaxed">
            Configure the UPI number used for customer payments during checkout. This number is displayed to users on the payment screen.
          </p>
        </div>

        <div className="md:col-span-2 space-y-6">
          <form onSubmit={handleSave} className="card p-6 space-y-6">
            <div>
              <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-2">
                <FiCreditCard className="text-primary-500" /> PhonePe / UPI Number
              </label>
              <input 
                type="text" 
                className="input-field text-lg font-mono tracking-wider" 
                value={upiNumber}
                onChange={e => setUpiNumber(e.target.value)}
                placeholder="e.g. 9652300993"
                required
              />
              <p className="mt-2 text-[10px] text-gray-400">
                Ensure this is a valid UPI-linked number. Customers will copy this to send payments.
              </p>
            </div>

            <div className="pt-4 border-t border-gray-100 dark:border-dark-border">
              <button 
                type="submit" 
                disabled={saving}
                className="btn-primary w-full justify-center py-3"
              >
                <FiSave className={saving ? 'animate-spin' : ''} />
                {saving ? 'Saving...' : 'Save Settings'}
              </button>
            </div>
          </form>

          <div className="p-4 bg-blue-50 dark:bg-blue-500/10 rounded-2xl border border-blue-100 dark:border-blue-900/30 flex items-start gap-3">
            <div className="text-blue-600 dark:text-blue-400 mt-0.5">ℹ</div>
            <p className="text-xs text-blue-700 dark:text-blue-300 leading-relaxed">
              Updates to the UPI number will take effect immediately. Existing orders waiting for payment verification will not be affected, but all <strong>new checkouts</strong> will use this number.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
