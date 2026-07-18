import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import Layout from '../components/Layout';
import api from '../api';
import { Pill, Plus, Trash2, Check, Clock, X } from 'lucide-react';

export default function RemindersPage() {
  const { t } = useTranslation();
  const CATS = [
    { key: 'medicine', label: t('catMedicine'), color: 'bg-rose-100 text-rose-800 border-rose-300' },
    { key: 'water', label: t('catWater'), color: 'bg-sky-100 text-sky-800 border-sky-300' },
    { key: 'exercise', label: t('catExercise'), color: 'bg-emerald-100 text-emerald-800 border-emerald-300' },
    { key: 'other', label: t('catOther'), color: 'bg-amber-100 text-amber-800 border-amber-300' },
  ];
  const [items, setItems] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ title: '', time: '08:00', notes: '', category: 'medicine' });

  const load = async () => {
    const { data } = await api.get('/reminders');
    setItems(data);
  };
  useEffect(() => { load(); }, []);

  const submit = async (e) => {
    e.preventDefault();
    await api.post('/reminders', form);
    setForm({ title: '', time: '08:00', notes: '', category: 'medicine' });
    setShowForm(false);
    load();
  };

  const toggle = async (id) => { await api.post(`/reminders/${id}/toggle`); load(); };
  const del = async (id) => { await api.delete(`/reminders/${id}`); load(); };

  const dueCount = items.filter(r => !r.taken_today).length;

  return (
    <Layout>
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
          <div>
            <h1 className="text-2xl md:text-4xl font-bold text-foreground">{t('dailyReminders')}</h1>
            <p className="text-base text-muted-foreground mt-1">
              {dueCount > 0 ? t('pendingToday', { n: dueCount }) : t('allDone')}
            </p>
          </div>
          <button onClick={() => setShowForm(v => !v)} data-testid="toggle-add-reminder"
                  className="btn-lg bg-primary text-primary-foreground inline-flex items-center gap-2 !min-h-[48px] !py-2 !text-base">
            {showForm ? <><X className="w-5 h-5" /> {t('cancel')}</> : <><Plus className="w-5 h-5" /> {t('addReminder')}</>}
          </button>
        </div>

        {showForm && (
          <form onSubmit={submit} className="bg-card border-2 border-border rounded-2xl p-5 mb-6 space-y-3" data-testid="add-reminder-form">
            <input required placeholder={t('reminderTitle')} value={form.title}
                   onChange={e => setForm({ ...form, title: e.target.value })}
                   className="input-lg" data-testid="reminder-title-input" />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-semibold mb-1 text-muted-foreground">{t('reminderTime')}</label>
                <input type="time" required value={form.time}
                       onChange={e => setForm({ ...form, time: e.target.value })}
                       className="input-lg" data-testid="reminder-time-input" />
              </div>
              <div>
                <label className="block text-sm font-semibold mb-1 text-muted-foreground">{t('reminderCategory')}</label>
                <select value={form.category} onChange={e => setForm({ ...form, category: e.target.value })}
                        className="input-lg" data-testid="reminder-category-select">
                  {CATS.map(c => <option key={c.key} value={c.key}>{c.label}</option>)}
                </select>
              </div>
            </div>
            <input placeholder={t('reminderNotes')} value={form.notes}
                   onChange={e => setForm({ ...form, notes: e.target.value })}
                   className="input-lg" data-testid="reminder-notes-input" />
            <button type="submit" className="btn-lg bg-primary text-primary-foreground w-full sm:w-auto" data-testid="submit-reminder-btn">
              {t('saveReminder')}
            </button>
          </form>
        )}

        {items.length === 0 ? (
          <div className="bg-card border-2 border-border rounded-2xl p-8 text-center">
            <Pill className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
            <p className="text-lg text-muted-foreground">{t('noReminders')}</p>
          </div>
        ) : (
          <div className="space-y-3">
            {items.map(r => {
              const cat = CATS.find(c => c.key === r.category) || CATS[0];
              return (
                <div key={r.id} data-testid={`reminder-${r.id}`}
                     className={`bg-card border-2 rounded-2xl p-4 flex items-center gap-3 flex-wrap sm:flex-nowrap ${
                       r.taken_today ? 'border-emerald-500 bg-emerald-50' : 'border-border'
                     }`}>
                  <button onClick={() => toggle(r.id)} data-testid={`toggle-reminder-${r.id}`}
                          className={`w-14 h-14 rounded-full flex items-center justify-center flex-shrink-0 transition-colors duration-200 ${
                            r.taken_today ? 'bg-emerald-500 text-white' : 'bg-secondary text-secondary-foreground border-2 border-border'
                          }`}>
                    {r.taken_today ? <Check className="w-7 h-7" strokeWidth={3} /> : <Pill className="w-7 h-7" />}
                  </button>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-lg font-bold text-foreground">{r.title}</span>
                      <span className={`text-xs font-bold uppercase tracking-wider px-2 py-1 rounded-full border ${cat.color}`}>{cat.label}</span>
                    </div>
                    <div className="flex items-center gap-2 text-base text-muted-foreground mt-1">
                      <Clock className="w-4 h-4" /> {r.time}
                      {r.notes && <span className="truncate">· {r.notes}</span>}
                    </div>
                  </div>
                  <button onClick={() => del(r.id)} data-testid={`delete-reminder-${r.id}`}
                          className="w-11 h-11 rounded-full hover:bg-destructive/10 text-destructive flex items-center justify-center flex-shrink-0" aria-label={t('delete')}>
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </Layout>
  );
}
