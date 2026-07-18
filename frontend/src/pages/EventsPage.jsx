import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import Layout from '../components/Layout';
import api from '../api';
import { MapPin, Calendar, Clock, Check } from 'lucide-react';

export default function EventsPage() {
  const { t } = useTranslation();
  const [items, setItems] = useState([]);

  const load = async () => {
    const { data } = await api.get('/events');
    setItems(data);
  };
  useEffect(() => { load(); }, []);

  const rsvp = async (id) => { await api.post('/events/rsvp', { event_id: id }); load(); };

  return (
    <Layout>
      <div className="max-w-3xl mx-auto">
        <h1 className="text-2xl md:text-4xl font-bold text-foreground mb-2">{t('nearbyPrograms')}</h1>
        <p className="text-base text-muted-foreground mb-6">{t('nearbyTagline')}</p>

        <div className="space-y-4">
          {items.map(e => (
            <article key={e.id} data-testid={`event-${e.id}`}
                     className={`bg-card border-2 rounded-2xl overflow-hidden ${
                       e.nearby ? 'border-primary' : 'border-border'
                     }`}>
              <div className="flex flex-col sm:flex-row">
                {e.image && (
                  <div className="sm:w-52 h-40 sm:h-auto bg-muted flex-shrink-0">
                    <img src={e.image} alt={e.title} className="w-full h-full object-cover" />
                  </div>
                )}
                <div className="p-5 flex-1 flex flex-col gap-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-bold uppercase tracking-wider text-primary">{e.category}</span>
                    {e.nearby && (
                      <span className="text-xs font-bold uppercase tracking-wider bg-accent text-accent-foreground px-2 py-0.5 rounded-full">
                        {t('nearby')}
                      </span>
                    )}
                  </div>
                  <h3 className="text-xl font-bold text-foreground">{e.title}</h3>
                  <p className="text-base text-muted-foreground">{e.description}</p>
                  <div className="flex flex-wrap gap-4 text-base text-foreground/80 mt-1">
                    <span className="inline-flex items-center gap-1"><MapPin className="w-4 h-4" /> {e.venue}, {e.city}</span>
                    <span className="inline-flex items-center gap-1"><Calendar className="w-4 h-4" /> {e.date}</span>
                    <span className="inline-flex items-center gap-1"><Clock className="w-4 h-4" /> {e.time}</span>
                  </div>
                  <button onClick={() => rsvp(e.id)} data-testid={`rsvp-${e.id}`}
                          className={`btn-lg mt-2 self-start inline-flex items-center gap-2 !min-h-[44px] !py-2 !text-base ${
                            e.rsvp ? 'bg-accent text-accent-foreground' : 'bg-primary text-primary-foreground'
                          }`}>
                    {e.rsvp ? <><Check className="w-5 h-5" /> {t('going')}</> : t('interested')}
                  </button>
                </div>
              </div>
            </article>
          ))}
        </div>
      </div>
    </Layout>
  );
}
