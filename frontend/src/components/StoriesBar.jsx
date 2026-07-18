import { useEffect, useState } from 'react';
import { Plus, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import api from '../api';

export default function StoriesBar({ me, onCreate }) {
  const { t } = useTranslation();
  const [groups, setGroups] = useState([]);
  const [viewing, setViewing] = useState(null); // { author, stories, idx }
  const [showCreate, setShowCreate] = useState(false);

  const load = async () => {
    const { data } = await api.get('/stories');
    setGroups(data);
  };
  useEffect(() => { load(); }, []);

  const myGroup = groups.find(g => g.author?.id === me?.id);

  return (
    <div className="mb-6">
      <div className="flex gap-4 overflow-x-auto pb-3 -mx-4 px-4" data-testid="stories-bar">
        <button onClick={() => (myGroup ? setViewing({ ...myGroup, idx: 0 }) : setShowCreate(true))}
                className="flex flex-col items-center gap-2 flex-shrink-0" data-testid="my-story-btn">
          <div className="w-20 h-20 rounded-full bg-secondary flex items-center justify-center relative border-2 border-dashed border-primary">
            {myGroup?.stories?.[0]?.image ? (
              <img src={myGroup.stories[0].image} className="w-full h-full rounded-full object-cover" alt="" />
            ) : (
              <span className="text-2xl font-bold text-primary">{me?.name?.[0]?.toUpperCase()}</span>
            )}
            <div className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-primary text-primary-foreground flex items-center justify-center border-2 border-card">
              <Plus className="w-4 h-4" strokeWidth={3} />
            </div>
          </div>
          <span className="text-sm font-semibold text-foreground">{t('yourStory')}</span>
        </button>

        {groups.filter(g => g.author?.id !== me?.id).map(g => (
          <button key={g.author?.id || g.author?.name}
                  onClick={() => setViewing({ ...g, idx: 0 })}
                  className="flex flex-col items-center gap-2 flex-shrink-0"
                  data-testid={`story-${g.author?.id}`}>
            <div className="w-20 h-20 rounded-full p-1 bg-gradient-to-tr from-primary via-accent to-destructive">
              <div className="w-full h-full rounded-full bg-card p-0.5">
                {g.stories[0]?.image ? (
                  <img src={g.stories[0].image} className="w-full h-full rounded-full object-cover" alt="" />
                ) : (
                  <div className="w-full h-full rounded-full bg-accent flex items-center justify-center text-2xl font-bold text-accent-foreground">
                    {g.author?.name?.[0]?.toUpperCase()}
                  </div>
                )}
              </div>
            </div>
            <span className="text-sm font-semibold text-foreground truncate max-w-[90px]">{g.author?.name}</span>
          </button>
        ))}
      </div>

      {viewing && (
        <StoryViewer group={viewing}
                     onClose={() => setViewing(null)}
                     onNext={() => setViewing(v => v.idx < v.stories.length - 1 ? { ...v, idx: v.idx + 1 } : null)}
                     onPrev={() => setViewing(v => ({ ...v, idx: Math.max(0, v.idx - 1) }))} />
      )}

      {showCreate && (
        <StoryCreator onClose={() => setShowCreate(false)}
                      onCreated={() => { setShowCreate(false); load(); onCreate?.(); }} />
      )}
    </div>
  );
}

function StoryViewer({ group, onClose, onNext, onPrev }) {
  const s = group.stories[group.idx];
  return (
    <div className="fixed inset-0 z-50 bg-black flex flex-col" data-testid="story-viewer">
      <div className="flex items-center gap-3 p-4 text-white">
        <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center font-bold">
          {group.author?.name?.[0]?.toUpperCase()}
        </div>
        <div className="flex-1 font-semibold">{group.author?.name}</div>
        <button onClick={onClose} className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center" data-testid="story-close">
          <X className="w-6 h-6" />
        </button>
      </div>
      <div className="flex-1 flex items-center justify-center relative" onClick={onNext}>
        {s.image && <img src={s.image} alt="" className="max-h-full max-w-full object-contain" />}
        {s.video && <video src={s.video} autoPlay controls className="max-h-full max-w-full" />}
        {!s.image && !s.video && s.caption && (
          <div className="text-white text-3xl p-8 text-center">{s.caption}</div>
        )}
        <button onClick={(e) => { e.stopPropagation(); onPrev(); }} className="absolute left-0 top-0 h-full w-1/4" aria-label="prev" />
      </div>
      {s.caption && (s.image || s.video) && (
        <div className="p-6 text-white text-xl text-center bg-black/60">{s.caption}</div>
      )}
    </div>
  );
}

function StoryCreator({ onClose, onCreated }) {
  const { t } = useTranslation();
  const [image, setImage] = useState(null);
  const [video, setVideo] = useState(null);
  const [caption, setCaption] = useState('');
  const [posting, setPosting] = useState(false);

  const onFile = (e, kind) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (f.size > 8 * 1024 * 1024) { alert('File too large (max 8MB).'); return; }
    const r = new FileReader();
    r.onload = () => kind === 'image' ? setImage(r.result) : setVideo(r.result);
    r.readAsDataURL(f);
  };

  const submit = async () => {
    if (!image && !video && !caption.trim()) return;
    setPosting(true);
    try {
      await api.post('/stories', { image, video, caption });
      onCreated();
    } finally { setPosting(false); }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4" data-testid="story-create-modal">
      <div className="bg-card rounded-2xl border-2 border-border max-w-md w-full p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold text-foreground">{t('addStory')}</h2>
          <button onClick={onClose} className="w-10 h-10 rounded-full bg-secondary" data-testid="story-close-create"><X className="w-5 h-5 mx-auto" /></button>
        </div>
        {image && <img src={image} alt="" className="rounded-xl max-h-64 mx-auto" />}
        {video && <video src={video} controls className="rounded-xl max-h-64 w-full" />}
        <input value={caption} onChange={e => setCaption(e.target.value)} placeholder={t('writeStoryCaption')} className="input-lg" data-testid="story-caption-input" />
        <div className="grid grid-cols-2 gap-3">
          <label className="btn-lg bg-secondary text-secondary-foreground text-center cursor-pointer">
            {t('addPhoto')}
            <input type="file" accept="image/*" onChange={e => onFile(e, 'image')} className="hidden" data-testid="story-image-input" />
          </label>
          <label className="btn-lg bg-secondary text-secondary-foreground text-center cursor-pointer">
            {t('addVideo')}
            <input type="file" accept="video/*" onChange={e => onFile(e, 'video')} className="hidden" data-testid="story-video-input" />
          </label>
        </div>
        <button onClick={submit} disabled={posting} className="btn-lg bg-primary text-primary-foreground w-full" data-testid="story-submit-btn">
          {posting ? '...' : t('post')}
        </button>
      </div>
    </div>
  );
}
