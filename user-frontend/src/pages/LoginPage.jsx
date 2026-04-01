import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FiMail, FiLock, FiEye, FiEyeOff } from 'react-icons/fi';
import toast from 'react-hot-toast';
import useAuthStore from '../store/authStore';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const { login, loading } = useAuthStore();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    const res = await login(email, password);
    if (res.success) { toast.success('Welcome back!'); navigate('/'); }
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
            <h1 className="text-2xl font-extrabold text-gray-900 dark:text-white">Welcome Back</h1>
            <p className="text-gray-500 text-sm mt-1">Sign in to your premium account</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="relative">
              <FiMail className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input className="input-field pl-11" type="email" placeholder="Email address" value={email}
                onChange={e => setEmail(e.target.value)} required />
            </div>
            <div className="relative">
              <FiLock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input className="input-field pl-11 pr-11" type={showPw ? 'text' : 'password'} placeholder="Password" value={password}
                onChange={e => setPassword(e.target.value)} required />
              <button type="button" onClick={() => setShowPw(!showPw)} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                {showPw ? <FiEyeOff className="w-4 h-4" /> : <FiEye className="w-4 h-4" />}
              </button>
            </div>
            <div className="flex justify-end">
              <Link to="/forgot-password" className="text-sm text-primary-600 dark:text-primary-400 hover:underline">Forgot password?</Link>
            </div>
            <button type="submit" disabled={loading} className="btn-primary w-full justify-center py-3.5">
              {loading ? 'Signing in…' : 'Sign In'}
            </button>
          </form>

          <p className="text-center text-sm text-gray-500 mt-6">
            Don't have an account?{' '}
            <Link to="/signup" className="text-primary-600 dark:text-primary-400 font-semibold hover:underline">Sign Up</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
