import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import Layout from '../components/Layout';
import api from '../api';
import { Music, Calendar, Sparkles, ExternalLink } from 'lucide-react';

export default function NostalgiaPage() {
  const { t } = useTranslation();
  const CATS = [
    { key: '', label: t('tabAll'), icon: Sparkles },
    { key: 'song', label: t('tabSongs'), icon: Music },
    { key: 'event', label: t('tabEvents'), icon: Calendar },
    { key: 'festival', label: t('tabFestivals'), icon: Sparkles },
  ];
  const [items, setItems] = useState([]);
  const [cat, setCat] = useState('');

  useEffect(() => {
    api.get('/nostalgia' + (cat ? `?category=${cat}` : '')).then(r => setItems(r.data));
  }, [cat]);

  return (
    <Layout>
      <div className="max-w-4xl mx-auto">
        <h1 className="text-2xl md:text-4xl font-bold text-foreground mb-2">{t('nostalgiaCorner')}</h1>
        <p className="text-base text-muted-foreground mb-6">{t('nostalgiaTagline')}</p>

        <div className="flex gap-2 flex-wrap mb-6" data-testid="nostalgia-tabs">
          {CATS.map(c => {
            const active = cat === c.key;
            const Icon = c.icon;
            return (
              <button key={c.key || 'all'} onClick={() => setCat(c.key)}
                      data-testid={`nostalgia-tab-${c.key || 'all'}`}
                      className={`btn-lg inline-flex items-center gap-2 !min-h-[44px] !py-2 !text-base ${
                        active ? 'bg-primary text-primary-foreground' : 'bg-card text-foreground border-2 border-border hover:border-primary'
                      }`}>
                <Icon className="w-5 h-5" /> {c.label}
              </button>
            );
          })}
        </div>

        {items.length === 0 && <p className="text-lg text-muted-foreground">{t('noItemsHere')}</p>}

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {items.map(it => (
            <article key={it.id} data-testid={`nostalgia-${it.id}`}
                     className="bg-card border-2 border-border rounded-2xl overflow-hidden hover:border-primary transition-colors duration-200">
              {it.image && <div className="h-40 bg-muted"><img src={it.image} alt={it.title} className="w-full h-full object-cover" /></div>}
              <div className="p-5">
                <div className="flex items-center gap-2 mb-2 text-sm">
                  <span className="text-xs font-bold uppercase tracking-wider text-primary">{it.category}</span>
                  {it.year > 0 && <span className="text-muted-foreground">· {it.year}</span>}
                </div>
                <h3 className="text-xl font-bold text-foreground mb-1">{it.title}</h3>
                {it.artist && <p className="text-base text-muted-foreground mb-2">{it.artist}</p>}
                <p className="text-base text-foreground/80 leading-relaxed">{it.description}</p>
                {it.youtube && (
                  <a href={it.youtube} target="_blank" rel="noreferrer"
                     data-testid={`nostalgia-play-${it.id}`}
                     className="mt-3 inline-flex items-center gap-2 text-base font-semibold text-primary hover:underline">
                    <Music className="w-4 h-4" /> {t('listenYoutube')} <ExternalLink className="w-4 h-4" />
                  </a>
                )}
              </div>
            </article>
          ))}
        </div>
      </div>
    </Layout>
  );
}
