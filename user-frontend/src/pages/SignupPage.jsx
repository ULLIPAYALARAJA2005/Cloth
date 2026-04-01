import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FiMail, FiLock, FiUser, FiEye, FiEyeOff } from 'react-icons/fi';
import toast from 'react-hot-toast';
import useAuthStore from '../store/authStore';

export default function SignupPage() {
  const [form, setForm] = useState({ name: '', email: '', password: '', confirm: '' });
  const [showPw, setShowPw] = useState(false);
  const { signup, loading } = useAuthStore();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (form.password.length < 6) { toast.error('Password must be at least 6 characters'); return; }
    if (form.password !== form.confirm) { toast.error('Passwords do not match'); return; }
    const res = await signup(form.name, form.email, form.password);
    if (res.success) { toast.success('Account created! Welcome 🎉'); navigate('/'); }
    else toast.error(res.message);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-50 via-white to-gray-100 dark:from-dark-bg dark:via-dark-bg dark:to-dark-card px-4">
      <div className="w-full max-w-md animate-slide-up">
        <div className="card p-8">
          <div className="text-center mb-8">
            <Link to="/" className="inline-flex items-center gap-3 group mb-6">
              <div className="relative w-14 h-14 flex items-center justify-center">
                <div className="absolute inset-0 bg-gray-900 dark:bg-primary-900 rounded-2xl rotate-6 group-hover:rotate-12 transition-transform duration-300 opacity-20"></div>
                <div className="absolute inset-0 bg-gradient-to-br from-gray-800 to-black dark:from-primary-600 dark:to-primary-800 rounded-2xl shadow-lg border border-white/10 flex items-center justify-center overflow-hidden">
                  <span className="text-white font-serif text-3xl" style={{ fontFamily: 'Cinzel, serif' }}>K</span>
                  <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-primary-500 rounded-full border-2 border-white dark:border-dark-bg"></div>
                </div>
              </div>
              <div className="flex flex-col -space-y-1.5 text-left">
                <span className="text-2xl font-bold text-gray-900 dark:text-white tracking-tighter" style={{ fontFamily: 'Playfair Display, serif' }}>
                  Kalyani
                </span>
                <span className="text-[18px] text-primary-600 dark:text-primary-400 font-normal tracking-wide" style={{ fontFamily: 'Great Vibes, cursive' }}>
                  Fashion Hub
                </span>
              </div>
            </Link>
            <h1 className="text-2xl font-extrabold text-gray-900 dark:text-white">Create Account</h1>
            <p className="text-gray-500 text-sm mt-1">Join our exclusive community</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="relative">
              <FiUser className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input className="input-field pl-11" type="text" placeholder="Full Name" value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required />
            </div>
            <div className="relative">
              <FiMail className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input className="input-field pl-11" type="email" placeholder="Email address" value={form.email}
                onChange={e => setForm(f => ({ ...f, email: e.target.value }))} required />
            </div>
            <div className="relative">
              <FiLock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input className="input-field pl-11 pr-11" type={showPw ? 'text' : 'password'} placeholder="Password (min 6 chars)" value={form.password}
                onChange={e => setForm(f => ({ ...f, password: e.target.value }))} required />
              <button type="button" onClick={() => setShowPw(!showPw)} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                {showPw ? <FiEyeOff className="w-4 h-4" /> : <FiEye className="w-4 h-4" />}
              </button>
            </div>
            <div className="relative">
              <FiLock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input className="input-field pl-11" type="password" placeholder="Confirm password" value={form.confirm}
                onChange={e => setForm(f => ({ ...f, confirm: e.target.value }))} required />
            </div>
            <button type="submit" disabled={loading} className="btn-primary w-full justify-center py-3.5">
              {loading ? 'Creating Account…' : 'Create Account'}
            </button>
          </form>

          <p className="text-center text-sm text-gray-500 mt-6">
            Already have an account?{' '}
            <Link to="/login" className="text-primary-600 dark:text-primary-400 font-semibold hover:underline">Sign In</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
