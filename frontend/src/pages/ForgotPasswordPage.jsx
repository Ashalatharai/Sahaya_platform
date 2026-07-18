import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api from '../api';
import { Heart } from 'lucide-react';
import LanguageToggle from '../components/LanguageToggle';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [err, setErr] = useState('');
  const [msg, setMsg] = useState('');
  const [mockToken, setMockToken] = useState(null);
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setErr('');
    setMsg('');
    setMockToken(null);
    setLoading(true);
    try {
      const res = await api.post('/auth/forgot-password', { email });
      setMsg(res.data.msg);
      if (res.data.token) {
        setMockToken(res.data.token);
      }
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
          Forgot your password? No worries, we've got you covered.
        </p>
      </div>

      <div className="flex-1 flex flex-col p-6 md:p-12">
        <div className="flex justify-end mb-6"><LanguageToggle /></div>
        <div className="flex-1 flex items-center">
          <div className="w-full max-w-md mx-auto">
            <h1 className="text-4xl md:text-5xl font-bold mb-2 text-foreground">
              Reset Password
            </h1>
            <p className="text-lg text-muted-foreground mb-8">Enter your email to receive a reset link</p>
            
            {!msg ? (
              <form onSubmit={submit} className="space-y-5">
                <div>
                  <label className="block text-lg font-semibold mb-2 text-foreground">Email</label>
                  <input type="email" required value={email} onChange={e => setEmail(e.target.value)} className="input-lg" />
                </div>
                {err && <div className="text-destructive text-lg font-semibold">{err}</div>}
                <button type="submit" disabled={loading} className="btn-lg bg-primary text-primary-foreground hover:bg-primary/90 w-full">
                  {loading ? '...' : 'Send Reset Link'}
                </button>
                <div className="text-center mt-4">
                  <Link to="/login" className="text-base text-primary underline">
                    Back to Login
                  </Link>
                </div>
              </form>
            ) : (
              <div className="space-y-6">
                <div className="p-4 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 rounded-xl border border-green-200 dark:border-green-800 font-medium">
                  {msg}
                </div>
                {mockToken && (
                  <div className="p-6 border-2 border-dashed border-primary/50 rounded-xl bg-primary/5 space-y-4">
                    <h3 className="font-bold text-lg text-foreground flex items-center gap-2">
                      <Heart className="w-5 h-5 text-primary" /> Mock Email Received
                    </h3>
                    <p className="text-muted-foreground text-sm">
                      (This box is shown for demo purposes because there is no real email server configured)
                    </p>
                    <Link to={`/reset-password?token=${mockToken}`} className="block w-full text-center py-3 px-4 bg-foreground text-background font-semibold rounded-lg hover:bg-foreground/90 transition-colors">
                      Click here to Reset Password
                    </Link>
                  </div>
                )}
                <div className="text-center mt-4">
                  <Link to="/login" className="text-base text-primary underline">
                    Back to Login
                  </Link>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
