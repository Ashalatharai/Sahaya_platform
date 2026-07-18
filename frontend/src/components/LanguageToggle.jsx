import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Languages, Check } from 'lucide-react';

const LANGS = [
  { code: 'en', label: 'English', short: 'EN' },
  { code: 'hi', label: 'हिंदी', short: 'हि' },
  { code: 'kn', label: 'ಕನ್ನಡ', short: 'ಕ' },
];

export default function LanguageToggle() {
  const { i18n } = useTranslation();
  const [open, setOpen] = useState(false);
  const current = LANGS.find(l => l.code === i18n.language) || LANGS[0];

  const change = (code) => {
    i18n.changeLanguage(code);
    localStorage.setItem('sahaaya-lang', code);
    setOpen(false);
  };

  return (
    <>
      {/* Compact dropdown for small/medium screens */}
      <div className="relative lg:hidden" data-testid="language-toggle-compact">
        <button onClick={() => setOpen(v => !v)} data-testid="lang-dropdown-btn"
                className="inline-flex items-center gap-1 h-11 px-3 rounded-full bg-secondary text-secondary-foreground hover:bg-secondary/80 font-semibold text-base"
                aria-label="Language">
          <Languages className="w-5 h-5" /> {current.short}
        </button>
        {open && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
            <div className="absolute right-0 top-full mt-2 w-40 bg-card border-2 border-border rounded-2xl shadow-lg z-50 overflow-hidden" data-testid="lang-dropdown-menu">
              {LANGS.map(l => (
                <button key={l.code} onClick={() => change(l.code)} data-testid={`lang-${l.code}`}
                        className={`w-full text-left px-4 py-3 flex items-center gap-2 hover:bg-secondary/50 ${
                          i18n.language === l.code ? 'text-primary font-bold' : 'text-foreground'
                        }`}>
                  {i18n.language === l.code && <Check className="w-4 h-4" />}
                  <span className={i18n.language === l.code ? '' : 'ml-6'}>{l.label}</span>
                </button>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Full segmented control on desktop */}
      <div className="hidden lg:flex items-center gap-1 bg-secondary rounded-xl p-1 border-2 border-border" data-testid="language-toggle">
        <Languages className="w-4 h-4 ml-2 text-muted-foreground" aria-hidden="true" />
        {LANGS.map(l => (
          <button key={l.code} onClick={() => change(l.code)} data-testid={`lang-${l.code}-desktop`}
                  className={`px-3 py-1.5 rounded-lg text-sm font-semibold min-h-[36px] transition-colors duration-200 ${
                    i18n.language === l.code ? 'bg-primary text-primary-foreground' : 'text-secondary-foreground hover:bg-background'
                  }`}>
            {l.label}
          </button>
        ))}
      </div>
    </>
  );
}
