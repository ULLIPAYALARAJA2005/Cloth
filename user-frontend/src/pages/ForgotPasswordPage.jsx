import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FiMail, FiArrowLeft, FiCheck, FiLock, FiShield, FiRefreshCw } from 'react-icons/fi';
import toast from 'react-hot-toast';
import api from '../lib/api';

export default function ForgotPasswordPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1); // 1: Email, 2: OTP, 3: New Password
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [token, setToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [timer, setTimer] = useState(0);

  useEffect(() => {
    let interval;
    if (timer > 0) {
      interval = setInterval(() => {
        setTimer((prev) => prev - 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [timer]);

  const handleSendOtp = async (e) => {
    if (e) e.preventDefault();
    setLoading(true);
    try {
      await api.post('/auth/forgot-password', { email });
      setStep(2);
      setTimer(30);
      toast.success('OTP sent to your email!');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error sending OTP');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await api.post('/auth/verify-otp', { email, otp });
      setToken(res.data.token);
      setStep(3);
      toast.success('OTP Verified!');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Invalid OTP');
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await api.post('/auth/reset-password', { token, newPassword });
      toast.success('Password updated successfully!');
      setStep(4);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error resetting password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-50 via-white to-gray-100 dark:from-dark-bg dark:via-dark-bg dark:to-dark-card px-4 py-12">
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
          </div>

          <Link to="/login" className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-primary-600 mb-6 transition-colors font-medium">
            <FiArrowLeft /> Back to login
          </Link>

          {step === 1 && (
            <>
              <h1 className="text-2xl font-extrabold text-gray-900 dark:text-white mb-2">Forgot Password?</h1>
              <p className="text-gray-500 text-sm mb-6">Enter your email and we'll send you an OTP.</p>
              <form onSubmit={handleSendOtp} className="space-y-4">
                <div className="relative">
                  <FiMail className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <input className="input-field pl-11" type="email" placeholder="Email address" value={email}
                    onChange={e => setEmail(e.target.value)} required />
                </div>
                <button type="submit" disabled={loading} className="btn-primary w-full justify-center py-3.5 shadow-lg shadow-primary-500/20">
                  {loading ? 'Sending…' : 'Send OTP'}
                </button>
              </form>
            </>
          )}

          {step === 2 && (
            <>
              <h1 className="text-2xl font-extrabold text-gray-900 dark:text-white mb-2">Verify OTP</h1>
              <p className="text-gray-500 text-sm mb-6">Enter the 6-digit code sent to <strong>{email}</strong>.</p>
              <form onSubmit={handleVerifyOtp} className="space-y-6">
                <div className="relative">
                  <FiShield className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <input className="input-field pl-11 tracking-[0.5em] font-mono text-center text-lg focus:ring-primary-500" 
                    type="text" maxLength="6" placeholder="000000" value={otp}
                    onChange={e => setOtp(e.target.value)} required />
                </div>
                
                <div className="space-y-4">
                  <button type="submit" disabled={loading} className="btn-primary w-full justify-center py-3.5 shadow-lg shadow-primary-500/20">
                    {loading ? 'Verifying…' : 'Verify OTP'}
                  </button>

                  <div className="flex flex-col items-center gap-3">
                    {timer > 0 ? (
                      <p className="text-sm text-gray-500 flex items-center gap-2">
                        <FiRefreshCw className="animate-spin text-xs" />
                        Resend code in <span className="font-bold text-primary-600">{timer}s</span>
                      </p>
                    ) : (
                      <button type="button" onClick={() => handleSendOtp()} 
                        className="text-sm font-bold text-primary-600 hover:text-primary-700 underline underline-offset-4 decoration-2 decoration-primary-200 hover:decoration-primary-600 transition-all">
                        Resend OTP Code
                      </button>
                    )}
                    
                    <button type="button" onClick={() => setStep(1)} className="text-xs text-gray-400 hover:text-gray-600">
                      Changed email? Go back
                    </button>
                  </div>
                </div>
              </form>
            </>
          )}

          {step === 3 && (
            <>
              <h1 className="text-2xl font-extrabold text-gray-900 dark:text-white mb-2">New Password</h1>
              <p className="text-gray-500 text-sm mb-6">Almost there! Choose a strong password.</p>
              <form onSubmit={handleResetPassword} className="space-y-4">
                <div className="relative">
                  <FiLock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <input className="input-field pl-11" type="password" placeholder="New Password" value={newPassword}
                    onChange={e => setNewPassword(e.target.value)} required minLength="6" />
                </div>
                <button type="submit" disabled={loading} className="btn-primary w-full justify-center py-3.5 shadow-lg shadow-primary-500/20">
                  {loading ? 'Updating…' : 'Reset Password'}
                </button>
              </form>
            </>
          )}

          {step === 4 && (
            <div className="text-center py-4">
              <div className="w-20 h-20 bg-green-100 dark:bg-green-500/10 rounded-full flex items-center justify-center mx-auto mb-6 border-4 border-green-50">
                <FiCheck className="w-10 h-10 text-green-500" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Success!</h2>
              <p className="text-gray-500 text-sm mb-8">Your password has been securely updated.</p>
              <Link to="/login" className="btn-primary w-full justify-center py-3.5">Back to Login</Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
