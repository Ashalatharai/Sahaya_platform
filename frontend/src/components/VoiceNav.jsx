import { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Mic, MicOff } from 'lucide-react';

const LANG_MAP = { en: 'en-IN', hi: 'hi-IN', kn: 'kn-IN' };

// Voice → route mapping. Keywords in EN/HI/KN.
const COMMANDS = [
  { route: '/', keywords: ['home', 'feed', 'होम', 'फ़ीड', 'ಮುಖಪುಟ'] },
  { route: '/groups', keywords: ['group', 'groups', 'community', 'समूह', 'ಗುಂಪುಗಳು', 'गुरुप'] },
  { route: '/family', keywords: ['family', 'friend', 'friends', 'परिवार', 'मित्र', 'ಸ್ನೇಹಿತರು', 'ಕುಟುಂಬ'] },
  { route: '/reminders', keywords: ['reminder', 'reminders', 'medicine', 'medicines', 'याददिहानी', 'दवा', 'ಔಷಧಿ', 'ನೆನಪು'] },
  { route: '/nostalgia', keywords: ['nostalgia', 'song', 'songs', 'music', 'गाना', 'गाने', 'संगीत', 'हाँ', 'ಹಳೆಯ', 'ಸಂಗೀತ'] },
  { route: '/events', keywords: ['event', 'events', 'program', 'programs', 'nearby', 'आस पास', 'कार्यक्रम', 'ಕಾರ್ಯಕ್ರಮ'] },
  { route: '/memories', keywords: ['memory', 'memories', 'memory lane', 'यादें', 'ನೆನಪುಗಳು'] },
  { route: '/companion', keywords: ['companion', 'assistant', 'chat', 'साथी', 'ಜೊತೆಗಾರ'] },
  { route: '/profile', keywords: ['profile', 'me', 'my profile', 'प्रोफ़ाइल', 'ಪ್ರೊಫೈಲ್'] },
];

export default function VoiceNav() {
  const nav = useNavigate();
  const { i18n, t } = useTranslation();
  const [listening, setListening] = useState(false);
  const [heard, setHeard] = useState('');
  const [feedback, setFeedback] = useState('');
  const recogRef = useRef(null);

  const start = () => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) { setFeedback(t('voiceNotSupported')); return; }
    const r = new SR();
    r.lang = LANG_MAP[i18n.language] || 'en-IN';
    r.interimResults = false;
    r.maxAlternatives = 3;
    r.onresult = (e) => {
      const alts = [];
      for (let i = 0; i < e.results[0].length; i++) alts.push(e.results[0][i].transcript.toLowerCase());
      setHeard(alts[0]);
      // Match against all alternatives
      let match = null;
      for (const alt of alts) {
        for (const c of COMMANDS) {
          if (c.keywords.some(k => alt.includes(k.toLowerCase()))) { match = c; break; }
        }
        if (match) break;
      }
      if (match) {
        setFeedback(t('voiceGoing', { route: match.route }));
        setTimeout(() => nav(match.route), 400);
      } else {
        setFeedback(`${t('voiceNotUnderstood')}: "${alts[0]}"`);
      }
    };
    r.onerror = (e) => { setListening(false); setFeedback('Voice error: ' + e.error); };
    r.onend = () => setListening(false);
    r.start();
    recogRef.current = r;
    setListening(true);
    setFeedback(t('voiceNavExamples'));
    setHeard('');
  };
  const stop = () => { recogRef.current?.stop(); setListening(false); };

  return (
    <div className="bg-card border-2 border-primary/40 rounded-2xl p-4 mb-6" data-testid="voice-nav">
      <div className="flex items-center gap-3 flex-wrap">
        <button onClick={listening ? stop : start} data-testid="voice-nav-btn"
                className={`w-14 h-14 rounded-full flex items-center justify-center flex-shrink-0 transition-colors duration-200 ${
                  listening ? 'bg-destructive text-destructive-foreground animate-pulse' : 'bg-primary text-primary-foreground'
                }`} aria-label={t('voiceNav')}>
          {listening ? <MicOff className="w-6 h-6" /> : <Mic className="w-6 h-6" />}
        </button>
        <div className="flex-1 min-w-0">
          <div className="text-base font-bold text-foreground">{t('voiceNav')}</div>
          <div className="text-sm text-muted-foreground" data-testid="voice-feedback">
            {feedback || t('voiceNavHelp')}
          </div>
          {heard && <div className="text-sm text-primary mt-1">{t('voiceHeard')}: <em>"{heard}"</em></div>}
        </div>
      </div>
    </div>
  );
}
