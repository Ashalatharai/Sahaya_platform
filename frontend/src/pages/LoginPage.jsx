import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import LanguageToggle from '../components/LanguageToggle';
import { Heart, Eye, EyeOff } from 'lucide-react';
import { GoogleLogin } from '@react-oauth/google';

export default function LoginPage({ mode = 'login' }) {
  const { t } = useTranslation();
  const { login, register, googleLogin } = useAuth();
  const nav = useNavigate();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(true);
  const [err, setErr] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setErr(''); setLoading(true);
    
    if (mode === 'register') {
      if (password !== confirmPassword) {
        setErr('Passwords do not match.');
        setLoading(false);
        return;
      }
      const isStrong = password.length >= 8 && /[a-zA-Z]/.test(password) && /[0-9]/.test(password);
      if (!isStrong) {
        setErr('Password must be at least 8 characters long and contain both letters and numbers.');
        setLoading(false);
        return;
      }
    }
    
    try {
      const user = mode === 'login'
        ? await login(email, password, remember)
        : await register(name, email, password);
      nav('/dashboard');
    } catch (e) {
      setErr(e.response?.data?.detail || 'Something went wrong');
    } finally { setLoading(false); }
  };

  const handleGoogleSuccess = async (credentialResponse) => {
    setErr(''); setLoading(true);
    try {
      const user = await googleLogin(credentialResponse.credential, mode);
      nav('/dashboard');
    } catch (e) {
      setErr(e.response?.data?.detail || 'Google sign-in failed');
    } finally { setLoading(false); }
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
            <div className="text-lg text-accent-foreground/80">{t('tagline')}</div>
          </div>
        </div>
        <img
          src="https://images.unsplash.com/photo-1651471239853-b105a5c133e7"
          alt=""
          className="rounded-2xl object-cover w-full max-h-96 border-4 border-card shadow-md"
        />
        <p className="text-2xl leading-relaxed text-accent-foreground font-medium">
          {t('hero')}
        </p>
      </div>

      <div className="flex-1 flex flex-col p-6 md:p-12">
        <div className="flex justify-end mb-6"><LanguageToggle /></div>
        <div className="flex-1 flex items-center">
          <div className="w-full max-w-md mx-auto">
            <h1 className="text-4xl md:text-5xl font-bold mb-2 text-foreground">
              {mode === 'login' ? t('welcome') : t('getStarted')}
            </h1>
            <p className="text-lg text-muted-foreground mb-8">{t('appName')}</p>
            <form onSubmit={submit} className="space-y-5" data-testid={`${mode}-form`}>
              {mode === 'register' && (
                <div>
                  <label className="block text-lg font-semibold mb-2 text-foreground">{t('name')}</label>
                  <input required value={name} onChange={e => setName(e.target.value)} className="input-lg" data-testid="register-name-input" />
                </div>
              )}
              <div>
                <label className="block text-lg font-semibold mb-2 text-foreground">{t('email')}</label>
                <input type="email" required value={email} onChange={e => setEmail(e.target.value)} className="input-lg" data-testid={`${mode}-email-input`} />
              </div>
              <div>
                <label className="block text-lg font-semibold mb-2 text-foreground">{t('password')}</label>
                <div className="relative">
                  <input 
                    type={showPassword ? "text" : "password"} 
                    required 
                    value={password} 
                    onChange={e => setPassword(e.target.value)} 
                    className="input-lg pr-12 w-full" 
                    data-testid={`${mode}-password-input`} 
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
              
              {mode === 'register' && (
                <div>
                  <label className="block text-lg font-semibold mb-2 text-foreground">Confirm Password</label>
                  <div className="relative">
                    <input 
                      type={showPassword ? "text" : "password"} 
                      required 
                      value={confirmPassword} 
                      onChange={e => setConfirmPassword(e.target.value)} 
                      className="input-lg pr-12 w-full" 
                    />
                  </div>
                </div>
              )}
              
              {mode === 'login' && (
                <div className="flex items-center gap-2">
                  <input 
                    type="checkbox" 
                    id="remember" 
                    checked={remember} 
                    onChange={e => setRemember(e.target.checked)} 
                    className="w-5 h-5 rounded border-input text-primary focus:ring-primary"
                  />
                  <label htmlFor="remember" className="text-base text-foreground font-medium">Remember Me</label>
                </div>
              )}

              {err && <div className="text-destructive text-lg font-semibold" data-testid="auth-error">{err}</div>}
              <button type="submit" disabled={loading} className="btn-lg bg-primary text-primary-foreground hover:bg-primary/90 w-full" data-testid={`${mode}-submit-btn`}>
                {loading ? '...' : (mode === 'login' ? t('login') : t('register'))}
              </button>
              
              <div className="relative flex items-center py-5">
                <div className="flex-grow border-t border-border"></div>
                <span className="flex-shrink-0 mx-4 text-muted-foreground">or continue with</span>
                <div className="flex-grow border-t border-border"></div>
              </div>

              <div className="flex justify-center">
                <GoogleLogin
                  onSuccess={handleGoogleSuccess}
                  onError={() => setErr('Google sign-in was unsuccessful')}
                  theme="outline"
                  size="large"
                  text={mode === 'register' ? 'signup_with' : 'signin_with'}
                />
              </div>
              <div className="flex flex-col items-center gap-2 mt-4">
                <Link to={mode === 'login' ? '/register' : '/login'} className="text-lg text-primary underline" data-testid="switch-auth-link">
                  {mode === 'login' ? t('createAccount') : t('haveAccount')}
                </Link>
                {mode === 'login' && (
                  <Link to="/forgot-password" className="text-base text-muted-foreground hover:text-primary transition-colors">
                    Forgot Password?
                  </Link>
                )}
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
