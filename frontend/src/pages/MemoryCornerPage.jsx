import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import Layout from '../components/Layout';
import api from '../api';
import { ImagePlus, Plus, X } from 'lucide-react';

export default function MemoryCornerPage() {
  const { t } = useTranslation();
  const [items, setItems] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ title: '', story: '', image: null });
  const [submitting, setSubmitting] = useState(false);

  const load = async () => {
    const r = await api.get('/memories');
    setItems(r.data);
  };

  useEffect(() => { load(); }, []);

  const onFile = (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    const r = new FileReader();
    r.onload = () => setForm(v => ({ ...v, image: r.result }));
    r.readAsDataURL(f);
  };

  const submit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await api.post('/memories', form);
      setForm({ title: '', story: '', image: null });
      setShowForm(false);
      load();
    } finally { setSubmitting(false); }
  };

  return (
    <Layout>
      <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
        <div>
          <h1 className="text-2xl md:text-4xl font-bold text-foreground">{t('memoryLane')}</h1>
          <p className="text-base text-muted-foreground mt-1">{t('nostalgiaTagline')}</p>
        </div>
        <button onClick={() => setShowForm(v => !v)} className="btn-lg bg-primary text-primary-foreground inline-flex items-center gap-2 !min-h-[48px] !py-2 !text-base" data-testid="toggle-add-memory">
          {showForm ? <><X className="w-5 h-5" /> {t('cancel')}</> : <><Plus className="w-5 h-5" /> {t('addMemory')}</>}
        </button>
      </div>

      {showForm && (
        <form onSubmit={submit} className="bg-card border-2 border-border rounded-2xl p-6 mb-8 space-y-4" data-testid="add-memory-form">
          <input required placeholder={t('title')} value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} className="input-lg" data-testid="memory-title-input" />
          <textarea required placeholder={t('writeCaption')} value={form.story} onChange={e => setForm({ ...form, story: e.target.value })} className="input-lg min-h-[120px] py-3" data-testid="memory-story-input" />
          {form.image && (
            <div className="relative inline-block">
              <img src={form.image} alt="preview" className="max-h-56 rounded-xl border-2 border-border" />
              <button type="button" onClick={() => setForm(v => ({ ...v, image: null }))} className="absolute top-2 right-2 w-10 h-10 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center" data-testid="memory-remove-image">
                <X className="w-5 h-5" />
              </button>
            </div>
          )}
          <div className="flex gap-3 flex-wrap">
            <label className="btn-lg bg-secondary text-secondary-foreground inline-flex items-center gap-2 cursor-pointer">
              <ImagePlus className="w-5 h-5" /> {t('addPhoto')}
              <input type="file" accept="image/*" onChange={onFile} className="hidden" data-testid="memory-image-input" />
            </label>
            <button type="submit" disabled={submitting} className="btn-lg bg-primary text-primary-foreground" data-testid="submit-memory-btn">
              {submitting ? '...' : t('save')}
            </button>
          </div>
        </form>
      )}

      {items.length === 0 && <p className="text-lg text-muted-foreground">{t('noMemories')}</p>}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {items.map(m => (
          <article key={m.id} className="bg-card border-2 border-border rounded-2xl overflow-hidden flex flex-col" data-testid={`memory-${m.id}`}>
            {m.image && (
              <div className="h-48 bg-muted overflow-hidden">
                <img src={m.image} alt={m.title} className="w-full h-full object-cover" />
              </div>
            )}
            <div className="p-5 flex-1 flex flex-col gap-2">
              <h3 className="text-2xl font-bold text-foreground">{m.title}</h3>
              <p className="text-base text-muted-foreground whitespace-pre-wrap flex-1">{m.story}</p>
              <div className="text-sm text-muted-foreground mt-2">{new Date(m.created_at).toLocaleDateString()}</div>
            </div>
          </article>
        ))}
      </div>
    </Layout>
  );
}
