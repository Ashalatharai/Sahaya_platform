import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Bell, X } from 'lucide-react';
import api from '../api';

export default function NotificationBell() {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [data, setData] = useState({ count: 0, items: [] });
  const wrap = useRef(null);

  const load = async () => {
    try {
      const r = await api.get('/notifications');
      setData(r.data);
    } catch {}
  };
  useEffect(() => {
    load();
    const iv = setInterval(load, 60000);
    return () => clearInterval(iv);
  }, []);

  useEffect(() => {
    const onClick = (e) => { if (open && wrap.current && !wrap.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, [open]);

  return (
    <div ref={wrap} className="relative">
      <button onClick={() => setOpen(v => !v)} data-testid="notification-bell"
              className="relative w-11 h-11 rounded-full bg-secondary text-secondary-foreground hover:bg-secondary/80 flex items-center justify-center"
              aria-label="Notifications">
        <Bell className="w-5 h-5" />
        {data.count > 0 && (
          <span data-testid="notification-count"
                className="absolute -top-1 -right-1 min-w-[22px] h-[22px] rounded-full bg-destructive text-destructive-foreground text-xs font-bold flex items-center justify-center px-1">
            {data.count}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-80 max-w-[90vw] bg-card border-2 border-border rounded-2xl shadow-lg z-50 overflow-hidden" data-testid="notification-panel">
          <div className="flex items-center justify-between p-4 border-b border-border">
            <span className="font-bold text-lg text-foreground">{t('notifications')}</span>
            <button onClick={() => setOpen(false)} className="w-9 h-9 rounded-full hover:bg-secondary flex items-center justify-center">
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="max-h-[70vh] overflow-y-auto">
            {data.items.length === 0 && (
              <div className="p-5 text-center text-muted-foreground text-base">{t('allCaughtUp')}</div>
            )}
            {data.items.map((it, i) => {
              const typeLabelKey = {
                friend_request: 'notifFriendRequest',
                event: 'notifEvent',
                reminder: 'notifReminder',
                message: 'notifMessage',
              }[it.type] || 'notifications';
              return (
                <Link key={i} to={it.link} onClick={() => setOpen(false)}
                      data-testid={`notification-item-${i}`}
                      className="block p-4 border-b border-border hover:bg-secondary/50 transition-colors duration-200">
                  <div className="text-xs font-bold uppercase tracking-wider text-primary mb-1">{t(typeLabelKey)}</div>
                  <div className="text-base font-semibold text-foreground">{it.title}</div>
                  {it.subtitle && <div className="text-sm text-muted-foreground">{it.subtitle}</div>}
                </Link>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
