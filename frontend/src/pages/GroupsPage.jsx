import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import Layout from '../components/Layout';
import api from '../api';
import { Users, Plus, X } from 'lucide-react';

export default function GroupsPage() {
  const { t } = useTranslation();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: '', category: 'Reading', description: '' });

  const load = async () => {
    setLoading(true);
    const r = await api.get('/groups');
    setItems(r.data);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const create = async (e) => {
    e.preventDefault();
    await api.post('/groups', form);
    setForm({ name: '', category: 'Reading', description: '' });
    setShowForm(false);
    load();
  };

  const join = async (id, joined) => {
    if (joined) await api.post(`/groups/${id}/leave`);
    else await api.post(`/groups/${id}/join`);
    load();
  };

  return (
    <Layout>
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
          <div>
            <h1 className="text-2xl md:text-4xl font-bold text-foreground">{t('allGroups')}</h1>
            <p className="text-base text-muted-foreground mt-1">{t('findYourPeople')}</p>
          </div>
          <button onClick={() => setShowForm(v => !v)} data-testid="toggle-create-group"
                  className="btn-lg bg-primary text-primary-foreground inline-flex items-center gap-2 !min-h-[48px] !py-2 !text-base">
            {showForm ? <><X className="w-5 h-5" /> {t('cancel')}</> : <><Plus className="w-5 h-5" /> {t('newGroup')}</>}
          </button>
        </div>

        {showForm && (
          <form onSubmit={create} className="bg-card border-2 border-border rounded-2xl p-6 mb-8 space-y-4" data-testid="create-group-form">
            <input required placeholder={t('name')} value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} className="input-lg" data-testid="new-group-name" />
            <select value={form.category} onChange={e => setForm({ ...form, category: e.target.value })} className="input-lg" data-testid="new-group-category">
              {['Gardening', 'Cooking', 'Yoga', 'Bhajans', 'Reading', 'Music', 'Walking', 'Other'].map(c => <option key={c}>{c}</option>)}
            </select>
            <textarea required placeholder={t('description')} value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} className="input-lg min-h-[100px] py-3" data-testid="new-group-desc" />
            <button type="submit" className="btn-lg bg-primary text-primary-foreground" data-testid="submit-create-group">{t('save')}</button>
          </form>
        )}

        {loading ? <div className="text-lg">Loading...</div> : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {items.map(c => (
              <div key={c.id} className="bg-card border-2 border-border rounded-2xl overflow-hidden flex flex-col hover:border-primary transition-colors duration-200" data-testid={`group-card-${c.id}`}>
                {c.image && <div className="h-40 bg-muted"><img src={c.image} alt={c.name} className="w-full h-full object-cover" /></div>}
                <div className="p-5 flex-1 flex flex-col gap-3">
                  <div className="text-xs font-bold uppercase tracking-wider text-primary">{c.category}</div>
                  <h3 className="text-xl font-bold text-foreground">{c.name}</h3>
                  <p className="text-base text-muted-foreground flex-1">{c.description}</p>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Users className="w-4 h-4" /> {c.member_count} {t('members')}
                  </div>
                  <div className="flex gap-2 mt-2">
                    <Link to={`/groups/${c.id}`} className="btn-lg bg-secondary text-secondary-foreground flex-1 text-center !min-h-[44px] !py-2 !text-base" data-testid={`open-group-${c.id}`}>Open</Link>
                    <button onClick={() => join(c.id, c.is_joined)} data-testid={`toggle-join-${c.id}`}
                            className={`btn-lg flex-1 !min-h-[44px] !py-2 !text-base ${c.is_joined ? 'bg-accent text-accent-foreground' : 'bg-primary text-primary-foreground'}`}>
                      {c.is_joined ? t('joined') : t('join')}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
}
