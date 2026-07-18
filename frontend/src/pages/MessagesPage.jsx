import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import Layout from '../components/Layout';
import api from '../api';
import { MessageCircle } from 'lucide-react';

function Avatar({ user, size = 56 }) {
  if (user?.avatar) return <img src={user.avatar} alt="" className="rounded-full object-cover border-2 border-border" style={{ width: size, height: size }} />;
  return (
    <div style={{ width: size, height: size }}
         className="rounded-full bg-accent text-accent-foreground flex items-center justify-center font-bold text-xl border-2 border-border">
      {(user?.name || '?')[0].toUpperCase()}
    </div>
  );
}

export default function MessagesPage() {
  const { t } = useTranslation();
  const [convs, setConvs] = useState([]);
  const [friends, setFriends] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([api.get('/messages/conversations'), api.get('/friends')])
      .then(([c, f]) => { setConvs(c.data); setFriends(f.data); setLoading(false); });
  }, []);

  // Friends without a conversation
  const convFriendIds = new Set(convs.map(c => c.friend_id));
  const availableFriends = friends.filter(f => !convFriendIds.has(f.id));

  return (
    <Layout>
      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-6">{t('messages')}</h1>

        {loading ? <div className="text-lg">{t('loading')}</div> : (
          <>
            {convs.length === 0 && availableFriends.length === 0 && (
              <div className="bg-card border-2 border-border rounded-2xl p-8 text-center">
                <MessageCircle className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                <p className="text-lg text-muted-foreground">{t('noConversations')}</p>
              </div>
            )}

            {convs.length > 0 && (
              <div className="bg-card border-2 border-border rounded-2xl overflow-hidden mb-4" data-testid="conversations-list">
                {convs.map(c => (
                  <Link key={c.friend_id} to={`/messages/${c.friend_id}`}
                        data-testid={`conv-${c.friend_id}`}
                        className="flex items-center gap-3 p-4 border-b border-border last:border-b-0 hover:bg-secondary/50 transition-colors duration-200">
                    <Avatar user={c.friend} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-lg text-foreground truncate">{c.friend?.name}</span>
                        {c.unread > 0 && (
                          <span className="bg-primary text-primary-foreground text-xs font-bold px-2 py-0.5 rounded-full">{c.unread}</span>
                        )}
                      </div>
                      <div className="text-base text-muted-foreground truncate">{c.last_message}</div>
                    </div>
                    <div className="text-sm text-muted-foreground flex-shrink-0">
                      {new Date(c.last_at).toLocaleDateString()}
                    </div>
                  </Link>
                ))}
              </div>
            )}

            {availableFriends.length > 0 && (
              <>
                <h3 className="text-lg font-bold text-foreground mt-6 mb-3">{t('friends')}</h3>
                <div className="bg-card border-2 border-border rounded-2xl overflow-hidden" data-testid="startchat-list">
                  {availableFriends.map(f => (
                    <Link key={f.id} to={`/messages/${f.id}`}
                          data-testid={`start-chat-${f.id}`}
                          className="flex items-center gap-3 p-4 border-b border-border last:border-b-0 hover:bg-secondary/50 transition-colors duration-200">
                      <Avatar user={f} size={48} />
                      <div className="flex-1 min-w-0">
                        <div className="font-bold text-foreground truncate">{f.name}</div>
                        {f.city && <div className="text-sm text-muted-foreground">{f.city}</div>}
                      </div>
                      <span className="text-sm font-semibold text-primary">{t('sendMessage')}</span>
                    </Link>
                  ))}
                </div>
              </>
            )}
          </>
        )}
      </div>
    </Layout>
  );
}
