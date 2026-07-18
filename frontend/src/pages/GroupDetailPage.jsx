import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import Layout from '../components/Layout';
import PostCard from '../components/PostCard';
import CreatePost from '../components/CreatePost';
import api from '../api';
import { ArrowLeft, Plus, Users } from 'lucide-react';

export default function GroupDetailPage() {
  const { id } = useParams();
  const { t } = useTranslation();
  const [group, setGroup] = useState(null);
  const [posts, setPosts] = useState([]);
  const [showCreate, setShowCreate] = useState(false);

  const load = async () => {
    const [c, p] = await Promise.all([api.get(`/groups/${id}`), api.get(`/groups/${id}/posts`)]);
    setGroup(c.data);
    setPosts(p.data);
  };
  useEffect(() => { load(); }, [id]);

  const toggleJoin = async () => {
    if (group.is_joined) await api.post(`/groups/${id}/leave`);
    else await api.post(`/groups/${id}/join`);
    load();
  };

  const updatePost = (u) => setPosts(p => p.map(x => x.id === u.id ? { ...x, ...u } : x));

  if (!group) return <Layout><div className="text-xl">Loading...</div></Layout>;

  return (
    <Layout>
      <div className="max-w-2xl mx-auto">
        <Link to="/groups" className="inline-flex items-center gap-2 text-base font-semibold text-primary mb-4" data-testid="back-to-groups">
          <ArrowLeft className="w-5 h-5" /> {t('groups')}
        </Link>

        <div className="bg-card border-2 border-border rounded-2xl overflow-hidden mb-6">
          {group.image && <div className="h-48 md:h-56 bg-muted"><img src={group.image} alt={group.name} className="w-full h-full object-cover" /></div>}
          <div className="p-5 md:p-6">
            <div className="text-xs font-bold uppercase tracking-wider text-primary mb-1">{group.category}</div>
            <h1 className="text-2xl md:text-3xl font-bold text-foreground mb-2">{group.name}</h1>
            <p className="text-base text-muted-foreground mb-4">{group.description}</p>
            <div className="flex items-center gap-4 flex-wrap">
              <span className="inline-flex items-center gap-1 text-base text-muted-foreground"><Users className="w-5 h-5" /> {group.member_count} {t('members')}</span>
              <button onClick={toggleJoin} data-testid="detail-toggle-join"
                      className={`btn-lg !min-h-[44px] !py-2 !text-base ${group.is_joined ? 'bg-accent text-accent-foreground' : 'bg-primary text-primary-foreground'}`}>
                {group.is_joined ? t('leave') : t('join')}
              </button>
            </div>
          </div>
        </div>

        {group.is_joined && (
          <button onClick={() => setShowCreate(true)} data-testid="group-open-create-post"
                  className="w-full bg-card border-2 border-dashed border-primary rounded-2xl p-4 flex items-center gap-3 mb-5 hover:bg-accent/30 transition-colors duration-200">
            <div className="w-11 h-11 rounded-full bg-primary text-primary-foreground flex items-center justify-center"><Plus className="w-6 h-6" /></div>
            <span className="text-lg text-foreground">Share with the group...</span>
          </button>
        )}

        {posts.length === 0 ? (
          <div className="bg-card border-2 border-border rounded-2xl p-8 text-center">
            <p className="text-lg text-muted-foreground">Be the first to share here.</p>
          </div>
        ) : (
          <div className="space-y-5">
            {posts.map(p => <PostCard key={p.id} post={p} onUpdate={updatePost} />)}
          </div>
        )}

        <CreatePost open={showCreate} onClose={() => setShowCreate(false)} onCreated={load} defaultGroupId={id} groups={[group]} />
      </div>
    </Layout>
  );
}
