import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import Layout from '../components/Layout';
import api from '../api';
import { useAuth } from '../context/AuthContext';
import { ImagePlus } from 'lucide-react';

const INTERESTS = ['Gardening', 'Cooking', 'Yoga', 'Bhajans', 'Reading', 'Music', 'Walking', 'Movies', 'Storytelling', 'Travel', 'Photography'];

export default function ProfileSetupPage() {
  const { t } = useTranslation();
  const { user, refresh } = useAuth();
  const nav = useNavigate();
  const p = user?.profile || {};
  const [name, setName] = useState(p.name || user?.name || '');
  const [age, setAge] = useState(p.age || '');
  const [city, setCity] = useState(p.city || '');
  const [language, setLanguage] = useState(p.language || 'English');
  const [interests, setInterests] = useState(p.interests || []);
  const [bio, setBio] = useState(p.bio || '');
  const [avatar, setAvatar] = useState(p.avatar || null);
  const [loading, setLoading] = useState(false);

  const toggle = (i) => setInterests(v => v.includes(i) ? v.filter(x => x !== i) : [...v, i]);

  const onAvatar = (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (f.size > 3 * 1024 * 1024) { alert('Max 3MB'); return; }
    const r = new FileReader();
    r.onload = () => setAvatar(r.result);
    r.readAsDataURL(f);
  };

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await api.post('/profile', {
        name, age: parseInt(age), city, language, interests, bio, avatar,
      });
      await refresh();
      nav('/');
    } finally { setLoading(false); }
  };

  return (
    <Layout>
      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl md:text-4xl font-bold mb-2 text-foreground">{t('setupProfile')}</h1>
        <p className="text-base text-muted-foreground mb-6">{t('helloName', { name: user?.name })}</p>
        <form onSubmit={submit} className="space-y-5" data-testid="profile-form">
          <div className="flex items-center gap-4">
            <div className="w-24 h-24 rounded-full bg-accent flex items-center justify-center overflow-hidden border-2 border-border">
              {avatar ? <img src={avatar} alt="" className="w-full h-full object-cover" /> :
                <span className="text-3xl font-bold text-accent-foreground">{name?.[0]?.toUpperCase()}</span>}
            </div>
            <label className="btn-lg bg-secondary text-secondary-foreground inline-flex items-center gap-2 cursor-pointer !min-h-[48px] !py-2 !text-base">
              <ImagePlus className="w-5 h-5" /> Photo
              <input type="file" accept="image/*" onChange={onAvatar} className="hidden" data-testid="profile-avatar-input" />
            </label>
          </div>
          <div>
            <label className="block text-base font-semibold mb-1">{t('name')}</label>
            <input value={name} onChange={e => setName(e.target.value)} className="input-lg" required data-testid="profile-name-input" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-base font-semibold mb-1">{t('age')}</label>
              <input type="number" min="1" value={age} onChange={e => setAge(e.target.value)} className="input-lg" required data-testid="profile-age-input" />
            </div>
            <div>
              <label className="block text-base font-semibold mb-1">{t('city')}</label>
              <input value={city} onChange={e => setCity(e.target.value)} className="input-lg" required data-testid="profile-city-input" />
            </div>
          </div>
          <div>
            <label className="block text-base font-semibold mb-1">{t('language')}</label>
            <select value={language} onChange={e => setLanguage(e.target.value)} className="input-lg" data-testid="profile-language-select">
              <option>English</option><option>Hindi</option><option>Kannada</option>
            </select>
          </div>
          <div>
            <label className="block text-base font-semibold mb-1">{t('bio')}</label>
            <textarea value={bio} onChange={e => setBio(e.target.value)} className="input-lg min-h-[90px] py-3" placeholder="A short line about yourself..." data-testid="profile-bio-input" />
          </div>
          <div>
            <label className="block text-base font-semibold mb-2">{t('selectInterests')}</label>
            <div className="flex flex-wrap gap-2">
              {INTERESTS.map(i => (
                <button key={i} type="button" onClick={() => toggle(i)} data-testid={`interest-${i.toLowerCase()}`}
                        className={`btn-lg border-2 !min-h-[44px] !py-2 !text-base ${
                          interests.includes(i)
                            ? 'bg-primary text-primary-foreground border-primary'
                            : 'bg-card text-foreground border-border hover:border-primary'
                        }`}>
                  {i}
                </button>
              ))}
            </div>
          </div>
          <button type="submit" disabled={loading} className="btn-lg bg-primary text-primary-foreground w-full sm:w-auto" data-testid="profile-submit-btn">
            {loading ? '...' : t('save')}
          </button>
        </form>
      </div>
    </Layout>
  );
}
