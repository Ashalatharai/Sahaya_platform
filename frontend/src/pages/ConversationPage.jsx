import { useEffect, useRef, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import Layout from '../components/Layout';
import api from '../api';
import { ArrowLeft, Send, ImagePlus, X } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

function Avatar({ user, size = 40 }) {
  if (user?.avatar) return <img src={user.avatar} alt="" className="rounded-full object-cover" style={{ width: size, height: size }} />;
  return (
    <div style={{ width: size, height: size }}
         className="rounded-full bg-accent text-accent-foreground flex items-center justify-center font-bold">
      {(user?.name || '?')[0].toUpperCase()}
    </div>
  );
}

export default function ConversationPage() {
  const { friendId } = useParams();
  const { user } = useAuth();
  const { t } = useTranslation();
  const [friend, setFriend] = useState(null);
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState('');
  const [image, setImage] = useState(null);
  const [sending, setSending] = useState(false);
  const bottomRef = useRef(null);

  const load = async () => {
    const { data } = await api.get(`/messages/thread/${friendId}`);
    setFriend(data.friend);
    setMessages(data.messages);
  };

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { load(); }, [friendId]);
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  const onFile = (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (f.size > 3 * 1024 * 1024) { alert('Max 3MB'); return; }
    const r = new FileReader();
    r.onload = () => setImage(r.result);
    r.readAsDataURL(f);
  };

  const send = async (e) => {
    e.preventDefault();
    if (!text.trim() && !image) return;
    setSending(true);
    try {
      await api.post('/messages', { to_user_id: friendId, text, image });
      setText(''); setImage(null);
      load();
    } finally { setSending(false); }
  };

  return (
    <Layout>
      <div className="max-w-2xl mx-auto flex flex-col h-[calc(100vh-180px)] md:h-[calc(100vh-160px)]">
        {/* Header */}
        <div className="flex items-center gap-3 pb-4 border-b-2 border-border mb-2" data-testid="conv-header">
          <Link to="/messages" data-testid="back-to-messages" className="w-10 h-10 rounded-full hover:bg-secondary flex items-center justify-center flex-shrink-0">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <Link to={`/users/${friendId}`} data-testid="conv-header-profile-link" className="flex items-center gap-3 flex-1 min-w-0 group">
            <Avatar user={friend} size={44} />
            <div className="flex-1 min-w-0">
              <div className="font-bold text-lg text-foreground truncate group-hover:underline">{friend?.name}</div>
              {friend?.city && <div className="text-sm text-muted-foreground">{friend.city}</div>}
            </div>
          </Link>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto py-4 space-y-3" data-testid="messages-scroll">
          {messages.length === 0 && (
            <p className="text-center text-lg text-muted-foreground pt-10">{t('noConversations')}</p>
          )}
          {messages.map(m => {
            const mine = m.from_user_id === user?.id;
            return (
              <div key={m.id} className={`flex ${mine ? 'justify-end' : 'justify-start'}`} data-testid={`msg-${m.id}`}>
                <div className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                  mine ? 'bg-primary text-primary-foreground rounded-br-md' : 'bg-secondary text-secondary-foreground rounded-bl-md'
                }`}>
                  {m.image && <img src={m.image} alt="" className="rounded-xl max-h-64 mb-2" />}
                  {m.text && <p className="text-base whitespace-pre-wrap">{m.text}</p>}
                  <div className={`text-xs mt-1 ${mine ? 'text-primary-foreground/70' : 'text-muted-foreground'}`}>
                    {new Date(m.created_at).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
              </div>
            );
          })}
          <div ref={bottomRef} />
        </div>

        {/* Composer */}
        <form onSubmit={send} className="border-t-2 border-border pt-3 space-y-2" data-testid="message-form">
          {image && (
            <div className="relative inline-block">
              <img src={image} alt="" className="rounded-xl max-h-32" />
              <button type="button" onClick={() => setImage(null)} className="absolute top-1 right-1 w-8 h-8 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center">
                <X className="w-4 h-4" />
              </button>
            </div>
          )}
          <div className="flex items-center gap-2">
            <label className="w-12 h-12 rounded-full bg-secondary flex items-center justify-center cursor-pointer flex-shrink-0" data-testid="message-photo-label">
              <ImagePlus className="w-5 h-5" />
              <input type="file" accept="image/*" onChange={onFile} className="hidden" data-testid="message-photo-input" />
            </label>
            <input value={text} onChange={e => setText(e.target.value)}
                   placeholder={t('typeAMessage')}
                   className="flex-1 min-h-[48px] px-4 rounded-full border-2 border-border bg-card text-base focus:border-primary focus:ring-4 focus:ring-primary/20 outline-none"
                   data-testid="message-input" />
            <button type="submit" disabled={sending || (!text.trim() && !image)}
                    className="w-12 h-12 rounded-full bg-primary text-primary-foreground flex items-center justify-center disabled:opacity-40 flex-shrink-0"
                    data-testid="message-send-btn">
              <Send className="w-5 h-5" />
            </button>
          </div>
        </form>
      </div>
    </Layout>
  );
}
