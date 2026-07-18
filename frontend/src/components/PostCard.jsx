import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Heart, MessageCircle, Send, MoreHorizontal, Users } from 'lucide-react';
import api from '../api';

function Avatar({ user, size = 44 }) {
  if (user?.avatar) {
    return <img src={user.avatar} alt="" className="rounded-full object-cover border-2 border-border" style={{ width: size, height: size }} />;
  }
  const letter = (user?.name || '?')[0].toUpperCase();
  const isSystem = user?.id === 'system';
  return (
    <div style={{ width: size, height: size }}
         className={`rounded-full flex items-center justify-center font-bold border-2 border-border ${
           isSystem ? 'bg-primary text-primary-foreground' : 'bg-accent text-accent-foreground'
         }`}>
      {letter}
    </div>
  );
}

export default function PostCard({ post, onUpdate }) {
  const { t } = useTranslation();
  const [showComments, setShowComments] = useState(false);
  const [comments, setComments] = useState(post.comments || []);
  const [commentText, setCommentText] = useState('');
  const [posting, setPosting] = useState(false);

  const toggleLike = async () => {
    const { data } = await api.post(`/posts/${post.id}/like`);
    onUpdate?.({ ...post, liked_by_me: data.liked, like_count: data.like_count });
  };

  const openComments = async () => {
    if (!showComments) {
      const { data } = await api.get(`/posts/${post.id}/comments`);
      setComments(data);
    }
    setShowComments(v => !v);
  };

  const submitComment = async (e) => {
    e.preventDefault();
    if (!commentText.trim()) return;
    setPosting(true);
    try {
      const { data } = await api.post(`/posts/${post.id}/comment`, { text: commentText });
      setComments(c => [...c, data]);
      setCommentText('');
      onUpdate?.({ ...post, comment_count: (post.comment_count || 0) + 1 });
    } finally { setPosting(false); }
  };

  return (
    <article className="bg-card border-2 border-border rounded-2xl overflow-hidden" data-testid={`post-${post.id}`}>
      {/* Header */}
      <div className="flex items-center gap-3 p-4">
        {post.author?.id && post.author.id !== 'system' ? (
          <Link to={`/users/${post.author.id}`} data-testid={`post-author-link-${post.id}`}>
            <Avatar user={post.author} />
          </Link>
        ) : (
          <Avatar user={post.author} />
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            {post.author?.id && post.author.id !== 'system' ? (
              <Link to={`/users/${post.author.id}`} className="font-bold text-foreground text-lg hover:underline">{post.author?.name}</Link>
            ) : (
              <span className="font-bold text-foreground text-lg">{post.author?.name}</span>
            )}
            {post.group_name && (
              <span className="inline-flex items-center gap-1 text-sm text-primary font-semibold">
                <Users className="w-4 h-4" /> {post.group_name}
              </span>
            )}
          </div>
          <div className="text-sm text-muted-foreground">
            {post.author?.city && <>{post.author.city} · </>}
            {new Date(post.created_at).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })}
          </div>
        </div>
        <button className="w-10 h-10 rounded-full hover:bg-secondary flex items-center justify-center" aria-label="more" data-testid={`post-more-${post.id}`}>
          <MoreHorizontal className="w-5 h-5" />
        </button>
      </div>

      {/* Media */}
      {post.image && <img src={post.image} alt="" className="w-full max-h-[600px] object-cover bg-muted" />}
      {post.video && (
        <video src={post.video} controls className="w-full max-h-[600px] bg-black" data-testid={`post-video-${post.id}`} />
      )}

      {/* Actions */}
      <div className="flex items-center gap-2 px-3 py-2 border-t border-border">
        <button onClick={toggleLike} data-testid={`like-${post.id}`}
                className={`flex items-center gap-2 px-3 py-2 rounded-xl transition-colors duration-200 ${
                  post.liked_by_me ? 'text-destructive' : 'text-foreground hover:bg-secondary'
                }`}>
          <Heart className={`w-6 h-6 ${post.liked_by_me ? 'fill-current' : ''}`} strokeWidth={2.2} />
          <span className="text-base font-semibold">{post.like_count}</span>
        </button>
        <button onClick={openComments} data-testid={`open-comments-${post.id}`}
                className="flex items-center gap-2 px-3 py-2 rounded-xl text-foreground hover:bg-secondary transition-colors duration-200">
          <MessageCircle className="w-6 h-6" strokeWidth={2.2} />
          <span className="text-base font-semibold">{post.comment_count}</span>
        </button>
      </div>

      {/* Content */}
      {post.content && (
        <div className="px-5 pb-3 text-lg text-foreground whitespace-pre-wrap leading-relaxed">
          {post.content}
        </div>
      )}

      {/* Comments */}
      {showComments && (
        <div className="border-t border-border bg-muted/30 p-4 space-y-3" data-testid={`comments-${post.id}`}>
          {comments.length === 0 && <p className="text-muted-foreground text-base">Be the first to comment.</p>}
          {comments.map(c => (
            <div key={c.id} className="flex items-start gap-3">
              <Avatar user={{ name: c.author_name }} size={36} />
              <div className="flex-1 bg-card border border-border rounded-2xl px-4 py-2">
                <div className="text-sm font-bold text-foreground">{c.author_name}</div>
                <div className="text-base text-foreground">{c.text}</div>
              </div>
            </div>
          ))}
          <form onSubmit={submitComment} className="flex items-center gap-2 pt-2" data-testid={`comment-form-${post.id}`}>
            <input value={commentText} onChange={e => setCommentText(e.target.value)}
                   placeholder={t('writeComment')}
                   className="flex-1 min-h-[48px] px-4 rounded-full border-2 border-border bg-card text-base focus:border-primary focus:ring-4 focus:ring-primary/20 outline-none"
                   data-testid={`comment-input-${post.id}`} />
            <button type="submit" disabled={posting || !commentText.trim()}
                    className="w-12 h-12 rounded-full bg-primary text-primary-foreground flex items-center justify-center disabled:opacity-40"
                    data-testid={`comment-submit-${post.id}`}>
              <Send className="w-5 h-5" />
            </button>
          </form>
        </div>
      )}
    </article>
  );
}
