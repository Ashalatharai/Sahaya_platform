import { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import Layout from '../components/Layout';
import api from '../api';
import { useAuth } from '../context/AuthContext';
import { ArrowLeft, MessageCircle, UserPlus, Check, Heart, MessageCircle as MC, Edit } from 'lucide-react';

export default function UserProfilePage() {
  const { id } = useParams();
  const { user: me } = useAuth();
  const { t } = useTranslation();
  const nav = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    const targetId = id || me?.id;
    const { data } = await api.get(`/users/${targetId}`);
    setData(data);
    setLoading(false);
  };

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { load(); }, [id]);

  const addFriend = async () => {
    await api.post(`/friends/request/${data.id}`);
    load();
  };

  if (loading || !data) return <Layout><div className="text-lg">{t('loading')}</div></Layout>;

  const p = data;
  const isMe = p.is_me;

  return (
    <Layout>
      <div className="max-w-3xl mx-auto">
        {!isMe && (
          <Link to="/family" className="inline-flex items-center gap-2 text-base font-semibold text-primary mb-4" data-testid="back-btn">
            <ArrowLeft className="w-5 h-5" /> {t('backToProfile')}
          </Link>
        )}

        {/* Header */}
        <div className="flex items-start gap-4 md:gap-8 mb-8 flex-wrap">
          {p.avatar ? (
            <img src={p.avatar} alt="" className="w-24 h-24 md:w-32 md:h-32 rounded-full object-cover border-4 border-border" data-testid="profile-avatar" />
          ) : (
            <div className="w-24 h-24 md:w-32 md:h-32 rounded-full bg-accent text-accent-foreground flex items-center justify-center text-4xl md:text-5xl font-bold border-4 border-border" data-testid="profile-avatar-fallback">
              {p.name?.[0]?.toUpperCase()}
            </div>
          )}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 flex-wrap mb-3">
              <h1 className="text-2xl md:text-3xl font-bold text-foreground" data-testid="profile-name">{p.name}</h1>
              {isMe ? (
                <button onClick={() => nav('/profile-setup')} data-testid="edit-profile-btn"
                        className="btn-lg bg-secondary text-secondary-foreground inline-flex items-center gap-2 !min-h-[40px] !py-2 !text-base">
                  <Edit className="w-4 h-4" /> {t('edit')}
                </button>
              ) : p.is_friend ? (
                <>
                  <Link to={`/messages/${p.id}`} data-testid="message-friend-btn"
                        className="btn-lg bg-primary text-primary-foreground inline-flex items-center gap-2 !min-h-[40px] !py-2 !text-base">
                    <MessageCircle className="w-4 h-4" /> {t('message')}
                  </Link>
                  <span className="inline-flex items-center gap-1 text-emerald-700 font-semibold text-base">
                    <Check className="w-5 h-5" /> {t('isFriend')}
                  </span>
                </>
              ) : p.request_sent ? (
                <span className="text-muted-foreground font-semibold">{t('requested')}</span>
              ) : (
                <button onClick={addFriend} data-testid="add-friend-btn"
                        className="btn-lg bg-primary text-primary-foreground inline-flex items-center gap-2 !min-h-[40px] !py-2 !text-base">
                  <UserPlus className="w-4 h-4" /> {t('addFriend')}
                </button>
              )}
            </div>
            <div className="flex gap-6 text-base text-foreground mb-3">
              <span data-testid="stat-posts"><strong>{p.post_count}</strong> {t('posts')}</span>
              <span data-testid="stat-friends"><strong>{p.friend_count}</strong> {t('friends')}</span>
            </div>
            {p.city && <p className="text-base text-muted-foreground mb-1">📍 {p.city}</p>}
            {p.bio && <p className="text-base text-foreground max-w-xl">{p.bio}</p>}
            {p.interests?.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-3">
                {p.interests.map(i => (
                  <span key={i} className="text-sm bg-accent text-accent-foreground px-3 py-1 rounded-full font-semibold">{i}</span>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Posts grid */}
        <h2 className="text-xl font-bold text-foreground mb-4 border-t-2 border-border pt-6">
          {isMe ? t('yourPosts') : t('theirPosts')}
        </h2>
        {p.posts.length === 0 ? (
          <div className="bg-card border-2 border-border rounded-2xl p-8 text-center">
            <p className="text-lg text-muted-foreground">{t('emptyProfilePosts')}</p>
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-1 sm:gap-2" data-testid="profile-posts-grid">
            {p.posts.map(post => (
              <div key={post.id} data-testid={`profile-post-${post.id}`}
                   className="relative aspect-square bg-secondary overflow-hidden rounded-lg group cursor-default">
                {post.image ? (
                  <img src={post.image} alt="" className="w-full h-full object-cover" />
                ) : post.video ? (
                  <video src={post.video} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center p-3 text-center bg-card">
                    <p className="text-xs sm:text-sm text-foreground line-clamp-6">{post.content}</p>
                  </div>
                )}
                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center gap-4 text-white">
                  <span className="flex items-center gap-1 font-bold"><Heart className="w-4 h-4 fill-current" /> {post.like_count}</span>
                  <span className="flex items-center gap-1 font-bold"><MC className="w-4 h-4" /> {post.comment_count}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
}
