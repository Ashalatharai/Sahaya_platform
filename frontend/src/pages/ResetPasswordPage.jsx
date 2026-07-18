import { useState } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import api from '../api';
import { Heart, Eye, EyeOff } from 'lucide-react';
import LanguageToggle from '../components/LanguageToggle';

export default function ResetPasswordPage() {
  const nav = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [err, setErr] = useState('');
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setErr('');
    setLoading(true);
    try {
      await api.post('/auth/reset-password', { token, new_password: password });
      setSuccess(true);
    } catch (e) {
      setErr(e.response?.data?.detail || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col md:flex-row">
      <div className="hidden md:flex md:w-1/2 bg-accent p-12 flex-col justify-between relative overflow-hidden">
        <div className="flex items-center gap-3">
          <div className="w-14 h-14 rounded-2xl bg-primary flex items-center justify-center">
            <Heart className="w-8 h-8 text-primary-foreground" strokeWidth={2.5} />
          </div>
          <div>
            <div className="text-4xl font-bold text-accent-foreground">Sahaaya</div>
            <div className="text-lg text-accent-foreground/80">Connecting Generations</div>
          </div>
        </div>
        <img
          src="https://images.unsplash.com/photo-1651471239853-b105a5c133e7"
          alt=""
          className="rounded-2xl object-cover w-full max-h-96 border-4 border-card shadow-md"
        />
        <p className="text-2xl leading-relaxed text-accent-foreground font-medium">
          Create a new, strong password for your account.
        </p>
      </div>

      <div className="flex-1 flex flex-col p-6 md:p-12">
        <div className="flex justify-end mb-6"><LanguageToggle /></div>
        <div className="flex-1 flex items-center">
          <div className="w-full max-w-md mx-auto">
            <h1 className="text-4xl md:text-5xl font-bold mb-2 text-foreground">
              New Password
            </h1>
            <p className="text-lg text-muted-foreground mb-8">Enter your new password below</p>
            
            {!success ? (
              <form onSubmit={submit} className="space-y-5">
                <div>
                  <label className="block text-lg font-semibold mb-2 text-foreground">New Password</label>
                  <div className="relative">
                    <input 
                      type={showPassword ? "text" : "password"} 
                      required 
                      value={password} 
                      onChange={e => setPassword(e.target.value)} 
                      className="input-lg pr-12 w-full" 
                      minLength={6} 
                    />
                    <button 
                      type="button" 
                      onClick={() => setShowPassword(!showPassword)} 
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground focus:outline-none"
                    >
                      {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                    </button>
                  </div>
                </div>
                {err && <div className="text-destructive text-lg font-semibold">{err}</div>}
                <button type="submit" disabled={loading || !token} className="btn-lg bg-primary text-primary-foreground hover:bg-primary/90 w-full">
                  {loading ? '...' : 'Reset Password'}
                </button>
                {!token && (
                  <div className="text-destructive mt-2">
                    Missing reset token in URL.
                  </div>
                )}
              </form>
            ) : (
              <div className="space-y-6">
                <div className="p-4 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 rounded-xl border border-green-200 dark:border-green-800 font-medium text-center">
                  Your password has been reset successfully.
                </div>
                <Link to="/login" className="block w-full text-center py-3 px-4 bg-primary text-primary-foreground font-semibold rounded-lg hover:bg-primary/90 transition-colors">
                  Go to Login
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
