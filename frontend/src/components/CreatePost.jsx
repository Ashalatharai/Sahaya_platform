import { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { X, ImagePlus, Video, Mic, MicOff, Users } from 'lucide-react';
import api from '../api';

const LANG_MAP = { en: 'en-IN', hi: 'hi-IN', kn: 'kn-IN' };

export default function CreatePost({ open, onClose, onCreated, groups = [], defaultGroupId = null }) {
  const { t, i18n } = useTranslation();
  const [content, setContent] = useState('');
  const [image, setImage] = useState(null);
  const [video, setVideo] = useState(null);
  const [groupId, setGroupId] = useState(defaultGroupId);
  const [listening, setListening] = useState(false);
  const [posting, setPosting] = useState(false);
  const recogRef = useRef(null);

  if (!open) return null;

  const onFile = (e, kind) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (f.size > 8 * 1024 * 1024) { alert('File too large (max 8MB).'); return; }
    const r = new FileReader();
    r.onload = () => kind === 'image' ? setImage(r.result) : setVideo(r.result);
    r.readAsDataURL(f);
  };

  const startListen = () => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) { alert('Voice input is not supported in this browser.'); return; }
    const r = new SR();
    r.lang = LANG_MAP[i18n.language] || 'en-IN';
    r.interimResults = true;
    r.continuous = true;
    r.onresult = (e) => {
      let final = '';
      for (let i = e.resultIndex; i < e.results.length; i++) {
        if (e.results[i].isFinal) final += e.results[i][0].transcript + ' ';
      }
      if (final) setContent(c => (c + ' ' + final).trim());
    };
    r.onerror = () => setListening(false);
    r.onend = () => setListening(false);
    r.start();
    recogRef.current = r;
    setListening(true);
  };
  const stopListen = () => { recogRef.current?.stop(); setListening(false); };

  const submit = async () => {
    if (!content.trim() && !image && !video) return;
    setPosting(true);
    try {
      await api.post('/posts', { content, image, video, group_id: groupId || null });
      setContent(''); setImage(null); setVideo(null);
      onCreated?.();
      onClose();
    } finally { setPosting(false); }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-end sm:items-center justify-center sm:p-4" data-testid="create-post-modal">
      <div className="bg-card w-full sm:max-w-lg sm:rounded-2xl rounded-t-3xl border-2 border-border p-5 space-y-4 max-h-[95vh] overflow-y-auto">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold text-foreground">{t('newPost')}</h2>
          <button onClick={onClose} className="w-11 h-11 rounded-full bg-secondary flex items-center justify-center" data-testid="close-create-post">
            <X className="w-5 h-5" />
          </button>
        </div>

        <p className="text-base text-muted-foreground">{t('startTyping')}</p>

        <textarea value={content} onChange={e => setContent(e.target.value)}
                  placeholder={t('whatsOnMind')}
                  className="input-lg min-h-[130px] py-3"
                  data-testid="create-post-content" />

        {image && (
          <div className="relative"><img src={image} alt="" className="rounded-xl max-h-64 mx-auto" />
            <button onClick={() => setImage(null)} className="absolute top-2 right-2 w-9 h-9 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center"><X className="w-4 h-4" /></button>
          </div>
        )}
        {video && (
          <div className="relative"><video src={video} controls className="rounded-xl w-full max-h-64" />
            <button onClick={() => setVideo(null)} className="absolute top-2 right-2 w-9 h-9 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center"><X className="w-4 h-4" /></button>
          </div>
        )}

        {groups.length > 0 && (
          <div>
            <label className="flex items-center gap-2 text-base font-semibold text-foreground mb-1">
              <Users className="w-4 h-4" /> Post to
            </label>
            <select value={groupId || ''} onChange={e => setGroupId(e.target.value || null)}
                    className="input-lg" data-testid="create-post-group-select">
              <option value="">My feed (friends)</option>
              {groups.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
            </select>
          </div>
        )}

        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={listening ? stopListen : startListen} data-testid="voice-post-btn"
                  className={`btn-lg inline-flex items-center gap-2 !min-h-[48px] !py-2 !text-base ${
                    listening ? 'bg-destructive text-destructive-foreground' : 'bg-accent text-accent-foreground'
                  }`}>
            {listening ? <><MicOff className="w-5 h-5" /> {t('stopRec')}</> : <><Mic className="w-5 h-5" /> {t('speak')}</>}
          </button>
          <label className="btn-lg bg-secondary text-secondary-foreground inline-flex items-center gap-2 cursor-pointer !min-h-[48px] !py-2 !text-base" data-testid="post-add-image-label">
            <ImagePlus className="w-5 h-5" /> {t('addPhoto')}
            <input type="file" accept="image/*" onChange={e => onFile(e, 'image')} className="hidden" data-testid="post-image-input" />
          </label>
          <label className="btn-lg bg-secondary text-secondary-foreground inline-flex items-center gap-2 cursor-pointer !min-h-[48px] !py-2 !text-base" data-testid="post-add-video-label">
            <Video className="w-5 h-5" /> {t('addVideo')}
            <input type="file" accept="video/*" onChange={e => onFile(e, 'video')} className="hidden" data-testid="post-video-input" />
          </label>
        </div>

        <button onClick={submit} disabled={posting || (!content.trim() && !image && !video)}
                className="btn-lg bg-primary text-primary-foreground w-full"
                data-testid="submit-post-btn">
          {posting ? '...' : t('post')}
        </button>
      </div>
    </div>
  );
}
