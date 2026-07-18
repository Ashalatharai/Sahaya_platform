import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import { Home, Users, HeartHandshake, LogOut, Sparkles, BookHeart, Pill, Music, MapPin, MessageCircle } from 'lucide-react';
import LanguageToggle from './LanguageToggle';
import NotificationBell from './NotificationBell';

export default function Layout({ children }) {
  const { t } = useTranslation();
  const { user, logout } = useAuth();
  const nav = useNavigate();
  const loc = useLocation();
  const isActive = (p) => loc.pathname === p || (p !== '/' && loc.pathname.startsWith(p));

  return (
    <div className="min-h-screen bg-background pb-24 lg:pb-0">
      <header className="sticky top-0 z-40 bg-card border-b-2 border-border">
        <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-6 py-2.5 lg:py-3 flex items-center gap-2 lg:gap-3">
          <Link to="/" data-testid="header-logo" className="flex items-center gap-2 flex-shrink-0">
            <div className="w-10 h-10 lg:w-11 lg:h-11 rounded-xl bg-primary flex items-center justify-center">
              <BookHeart className="w-5 h-5 lg:w-6 lg:h-6 text-primary-foreground" strokeWidth={2.5} />
            </div>
            <div className="hidden sm:block leading-tight">
              <div className="text-lg lg:text-xl font-bold text-foreground">{t('appName')}</div>
              <div className="text-xs text-muted-foreground hidden xl:block">{t('tagline')}</div>
            </div>
          </Link>

          {/* Desktop nav (lg and up) */}
          <nav className="hidden lg:flex items-center gap-0.5 flex-1 justify-center xl:justify-start xl:ml-4">
            <NavLink to="/" icon={Home} label={t('home')} testid="nav-home" active={isActive('/')} />
            <NavLink to="/groups" icon={Users} label={t('groups')} testid="nav-groups" active={isActive('/groups')} />
            <NavLink to="/family" icon={HeartHandshake} label={t('family')} testid="nav-family" active={isActive('/family')} />
            <NavLink to="/reminders" icon={Pill} label={t('reminders')} testid="nav-reminders" active={isActive('/reminders')} />
            <NavLink to="/nostalgia" icon={Music} label={t('nostalgia')} testid="nav-nostalgia" active={isActive('/nostalgia')} />
            <NavLink to="/events" icon={MapPin} label={t('events')} testid="nav-events" active={isActive('/events')} />
            <NavLink to="/companion" icon={Sparkles} label={t('companion')} testid="nav-companion" active={isActive('/companion')} hideLabelBelow="2xl" />
          </nav>

          {/* Spacer to push right group to the right on <lg */}
          <div className="flex-1 lg:hidden" />

          <div className="flex items-center gap-1 lg:gap-2 flex-shrink-0">
            {user && (
              <>
                <Link to="/messages" data-testid="header-messages-link"
                      className="w-11 h-11 rounded-full bg-secondary text-secondary-foreground hover:bg-secondary/80 flex items-center justify-center"
                      aria-label={t('messages')}>
                  <MessageCircle className="w-5 h-5" />
                </Link>
                <NotificationBell />
              </>
            )}
            <LanguageToggle />
            {user && (
              <>
                <Link to={`/users/${user.id}`} data-testid="header-profile-link"
                      className="w-11 h-11 rounded-full border-2 border-border overflow-hidden bg-accent text-accent-foreground flex items-center justify-center font-bold"
                      aria-label={t('profile')}>
                  {user?.profile?.avatar ? (
                    <img src={user.profile.avatar} alt="" className="w-full h-full object-cover" />
                  ) : (
                    (user?.profile?.name || user?.name || '?')[0].toUpperCase()
                  )}
                </Link>
                <button onClick={() => { logout(); nav('/login'); }} data-testid="header-logout-btn"
                        className="w-11 h-11 rounded-full bg-secondary text-secondary-foreground hover:bg-secondary/80 flex items-center justify-center"
                        aria-label={t('logout')}>
                  <LogOut className="w-5 h-5" />
                </button>
              </>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-3 sm:px-4 lg:px-6 py-4 md:py-8">{children}</main>

      {/* Bottom nav (mobile only — below lg) */}
      {user && (
        <nav className="lg:hidden fixed bottom-0 inset-x-0 z-40 bg-card border-t-2 border-border" data-testid="bottom-nav">
          <div className="grid grid-cols-4 gap-1 px-2 pt-2 pb-2 max-w-md mx-auto">
            <BottomLink to="/" icon={Home} label={t('home')} testid="bnav-home" active={isActive('/')} />
            <BottomLink to="/groups" icon={Users} label={t('groups')} testid="bnav-groups" active={isActive('/groups')} />
            <BottomLink to="/family" icon={HeartHandshake} label={t('family')} testid="bnav-family" active={isActive('/family')} />
            <BottomLink to="/messages" icon={MessageCircle} label={t('messages')} testid="bnav-messages" active={isActive('/messages')} />
          </div>
        </nav>
      )}
    </div>
  );
}

function NavLink({ to, icon: Icon, label, testid, active, hideLabelBelow }) {
  const labelClass = hideLabelBelow === '2xl' ? 'hidden 2xl:inline' : '';
  return (
    <Link to={to} data-testid={testid}
          className={`inline-flex items-center gap-1.5 px-2.5 py-2 rounded-xl text-sm font-semibold transition-colors duration-200 whitespace-nowrap ${
            active ? 'bg-primary text-primary-foreground' : 'text-foreground hover:bg-secondary'
          }`}
          title={label}>
      <Icon className="w-4 h-4 flex-shrink-0" />
      <span className={labelClass}>{label}</span>
    </Link>
  );
}

function BottomLink({ to, icon: Icon, label, testid, active }) {
  return (
    <Link to={to} data-testid={testid}
          className={`flex flex-col items-center gap-1 py-1 rounded-xl transition-colors duration-200 ${
            active ? 'text-primary' : 'text-muted-foreground'
          }`}>
      <Icon className="w-6 h-6" strokeWidth={active ? 2.5 : 2} />
      <span className="text-xs font-semibold truncate max-w-full px-1">{label}</span>
    </Link>
  );
}
