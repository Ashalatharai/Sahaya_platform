import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import Layout from '../components/Layout';
import StoriesBar from '../components/StoriesBar';
import PostCard from '../components/PostCard';
import CreatePost from '../components/CreatePost';
import VoiceNav from '../components/VoiceNav';
import api from '../api';
import { useAuth } from '../context/AuthContext';
import { PlusCircle, Pill, Music, MapPin, Sparkles, BookHeart } from 'lucide-react';

const QUICK = [
  { to: '/reminders', labelKey: 'reminders', icon: Pill, color: 'bg-rose-100 text-rose-800', testid: 'quick-reminders' },
  { to: '/nostalgia', labelKey: 'nostalgia', icon: Music, color: 'bg-amber-100 text-amber-800', testid: 'quick-nostalgia' },
  { to: '/events', labelKey: 'nearby', icon: MapPin, color: 'bg-emerald-100 text-emerald-800', testid: 'quick-events' },
  { to: '/memories', labelKey: 'memoryLane', icon: BookHeart, color: 'bg-purple-100 text-purple-800', testid: 'quick-memories' },
  { to: '/companion', labelKey: 'quickAiFriend', icon: Sparkles, color: 'bg-sky-100 text-sky-800', testid: 'quick-companion' },
];

export default function FeedPage() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [posts, setPosts] = useState([]);
  const [groups, setGroups] = useState([]);
  const [reminders, setReminders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);

  const load = async () => {
    const [f, g, r] = await Promise.all([
      api.get('/feed'), api.get('/groups'), api.get('/reminders'),
    ]);
    setPosts(f.data);
    setGroups(g.data.filter(x => x.is_joined));
    setReminders(r.data.filter(x => !x.taken_today));
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const updatePost = (updated) => setPosts(p => p.map(x => x.id === updated.id ? { ...x, ...updated } : x));

  const toggleReminder = async (id) => {
    await api.post(`/reminders/${id}/toggle`);
    load();
  };

  const me = { id: user?.id, name: user?.profile?.name || user?.name };

  return (
    <Layout>
      <div className="max-w-2xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl md:text-4xl font-bold text-foreground" data-testid="feed-title">
            {t('helloName', { name: user?.profile?.name || user?.name })}
          </h1>
          <p className="text-base text-muted-foreground mt-1">{t('tagline')}</p>
        </div>

        <VoiceNav />

        {/* Quick access tiles — horizontal scroll on tiny screens */}
        <div className="grid grid-cols-5 gap-2 mb-6" data-testid="quick-access">
          {QUICK.map(q => (
            <Link key={q.to} to={q.to} data-testid={q.testid}
                  className="bg-card border-2 border-border rounded-2xl p-2 sm:p-3 flex flex-col items-center gap-1 sm:gap-2 hover:border-primary transition-colors duration-200">
              <div className={`w-9 h-9 sm:w-11 sm:h-11 rounded-xl flex items-center justify-center ${q.color}`}>
                <q.icon className="w-5 h-5 sm:w-6 sm:h-6" />
              </div>
              <span className="text-[11px] sm:text-sm font-semibold text-foreground text-center leading-tight">{t(q.labelKey)}</span>
            </Link>
          ))}
        </div>

        <StoriesBar me={me} onCreate={load} />

        {/* Due reminders */}
        {reminders.length > 0 && (
          <div className="bg-accent/40 border-2 border-primary/30 rounded-2xl p-4 mb-6" data-testid="due-reminders-card">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Pill className="w-5 h-5 text-primary" />
                <span className="text-lg font-bold text-foreground">{t('todaysReminders')}</span>
              </div>
              <Link to="/reminders" className="text-sm font-semibold text-primary hover:underline" data-testid="view-all-reminders">{t('viewAll')}</Link>
            </div>
            <div className="space-y-2">
              {reminders.slice(0, 3).map(r => (
                <button key={r.id} onClick={() => toggleReminder(r.id)} data-testid={`feed-reminder-${r.id}`}
                        className="w-full bg-card border border-border rounded-xl p-3 flex items-center gap-3 hover:border-primary transition-colors duration-200 text-left">
                  <div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center flex-shrink-0">
                    <Pill className="w-5 h-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-foreground">{r.title}</div>
                    <div className="text-sm text-muted-foreground">{r.time} · {t('cat' + r.category.charAt(0).toUpperCase() + r.category.slice(1))}</div>
                  </div>
                  <span className="text-sm font-semibold text-primary">{t('markDone')}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Create post trigger */}
        <button onClick={() => setShowCreate(true)} data-testid="open-create-post"
                className="w-full bg-card border-2 border-border rounded-2xl p-4 flex items-center gap-3 mb-6 hover:border-primary transition-colors duration-200">
          <div className="w-11 h-11 rounded-full bg-accent text-accent-foreground flex items-center justify-center font-bold">
            {me.name?.[0]?.toUpperCase()}
          </div>
          <span className="flex-1 text-left text-lg text-muted-foreground">{t('whatsOnMind')}</span>
          <PlusCircle className="w-7 h-7 text-primary" />
        </button>

        {loading ? (
          <div className="text-lg text-muted-foreground">Loading...</div>
        ) : posts.length === 0 ? (
          <div className="bg-card border-2 border-border rounded-2xl p-8 text-center">
            <p className="text-lg text-muted-foreground">{t('noPosts')}</p>
          </div>
        ) : (
          <div className="space-y-5">
            {posts.map(p => <PostCard key={p.id} post={p} onUpdate={updatePost} />)}
          </div>
        )}

        <CreatePost open={showCreate} groups={groups} onClose={() => setShowCreate(false)} onCreated={load} />
      </div>
    </Layout>
  );
}
