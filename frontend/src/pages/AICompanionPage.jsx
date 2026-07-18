import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import Layout from '../components/Layout';
import api from '../api';
import { Send, Mic, MicOff, Volume2, VolumeX, MessageCircle, Info } from 'lucide-react';

const LANG_MAP = { en: 'en-IN', hi: 'hi-IN', kn: 'kn-IN' };

export default function AICompanionPage() {
  const { t, i18n } = useTranslation();
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [listening, setListening] = useState(false);
  const [speakingId, setSpeakingId] = useState(null);
  const recogRef = useRef(null);
  const scrollRef = useRef(null);

  useEffect(() => {
    api.get('/chat/history').then(r => setMessages(r.data));
  }, []);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages]);

  const send = async (text) => {
    const t2 = (text ?? input).trim();
    if (!t2) return;
    setInput('');
    setMessages(m => [...m, { role: 'user', text: t2, created_at: new Date().toISOString() }]);
    setLoading(true);
    try {
      const LANG_NAME = { en: 'English', hi: 'Hindi', kn: 'Kannada' };
      const { data } = await api.post('/chat', {
        message: t2,
        language: LANG_NAME[i18n.language] || 'English',
      });
      setMessages(m => {
        const idx = m.length;
        speak(idx, data.reply);
        return [...m, { role: 'assistant', text: data.reply, created_at: new Date().toISOString() }];
      });
    } catch {
      setMessages(m => {
        const text = "Sorry, I couldn't reach my thoughts. Try again.";
        const idx = m.length;
        speak(idx, text);
        return [...m, { role: 'assistant', text, created_at: new Date().toISOString() }];
      });
    } finally { setLoading(false); }
  };

  const startListen = () => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) { alert('Voice input is not supported in this browser.'); return; }
    const r = new SR();
    r.lang = LANG_MAP[i18n.language] || 'en-IN';
    r.interimResults = false;
    r.maxAlternatives = 1;
    r.onresult = (e) => {
      const text = e.results[0][0].transcript;
      setInput(text);
      setListening(false);
      send(text);
    };
    r.onerror = () => setListening(false);
    r.onend = () => setListening(false);
    r.start();
    recogRef.current = r;
    setListening(true);
  };

  const stopListen = () => {
    recogRef.current?.stop();
    setListening(false);
  };

  const speak = (id, text) => {
    if (!('speechSynthesis' in window)) return;
    if (speakingId === id) {
      window.speechSynthesis.cancel();
      setSpeakingId(null);
      return;
    }
    window.speechSynthesis.cancel();
    const utter = new SpeechSynthesisUtterance(text);
    utter.lang = LANG_MAP[i18n.language] || 'en-IN';
    utter.rate = 0.95;
    utter.onend = () => setSpeakingId(null);
    utter.onerror = () => setSpeakingId(null);
    setSpeakingId(id);
    window.speechSynthesis.speak(utter);
  };

  const submit = (e) => { e.preventDefault(); send(); };

  const suggestions = ['Tell me a happy thought', 'I feel lonely', 'Explain WhatsApp video call', 'What should I eat today?'];

  return (
    <Layout>
      <div className="mb-6 flex items-start gap-4">
        <div className="w-14 h-14 rounded-xl bg-primary/10 text-primary flex items-center justify-center flex-shrink-0">
          <MessageCircle className="w-8 h-8" />
        </div>
        <div>
          <h1 className="text-3xl md:text-4xl font-bold text-foreground">{t('aiCompanion')}</h1>
          <div className="mt-2 bg-accent text-accent-foreground rounded-xl p-3 flex items-start gap-2 text-base">
            <Info className="w-5 h-5 flex-shrink-0 mt-0.5" />
            <span>{t('medicalDisclaimer')}</span>
          </div>
        </div>
      </div>

      <div ref={scrollRef} className="bg-card border-2 border-border rounded-2xl p-4 md:p-6 h-[50vh] overflow-y-auto mb-4 space-y-4" data-testid="chat-scroll">
        {messages.length === 0 && (
          <div className="space-y-3">
            <p className="text-lg text-muted-foreground">{t('quickAsk')}:</p>
            <div className="flex flex-wrap gap-2">
              {suggestions.map((s, i) => (
                <button key={i} onClick={() => send(s)} data-testid={`suggestion-${i}`} className="btn-lg bg-secondary text-secondary-foreground hover:bg-secondary/80 text-base py-2 min-h-[48px]">
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}
        {messages.map((m, idx) => (
          <div key={idx} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`} data-testid={`msg-${idx}`}>
            <div className={`max-w-[85%] rounded-2xl px-5 py-4 ${m.role === 'user' ? 'bg-primary text-primary-foreground' : 'bg-secondary text-secondary-foreground'}`}>
              <p className="text-lg whitespace-pre-wrap">{m.text}</p>
              {m.role === 'assistant' && (
                <button
                  onClick={() => speak(idx, m.text)}
                  data-testid={`speak-msg-${idx}`}
                  className="mt-2 inline-flex items-center gap-2 text-sm font-semibold bg-card text-foreground border-2 border-border rounded-lg px-3 py-2 hover:bg-background"
                >
                  {speakingId === idx ? <><VolumeX className="w-4 h-4" /> {t('stop')}</> : <><Volume2 className="w-4 h-4" /> {t('readAloud')}</>}
                </button>
              )}
            </div>
          </div>
        ))}
        {loading && <div className="text-lg text-muted-foreground">...</div>}
      </div>

      <form onSubmit={submit} className="flex gap-3 flex-wrap" data-testid="chat-form">
        <input value={input} onChange={e => setInput(e.target.value)} placeholder={t('typeMessage')} className="input-lg flex-1 min-w-[200px]" data-testid="chat-input" />
        <button
          type="button"
          onClick={listening ? stopListen : startListen}
          data-testid="chat-mic-btn"
          className={`btn-lg inline-flex items-center gap-2 ${listening ? 'bg-destructive text-destructive-foreground' : 'bg-accent text-accent-foreground'}`}
          aria-label={t('speak')}
        >
          {listening ? <MicOff className="w-6 h-6" /> : <Mic className="w-6 h-6" />}
        </button>
        <button type="submit" disabled={loading || !input.trim()} className="btn-lg bg-primary text-primary-foreground inline-flex items-center gap-2" data-testid="chat-send-btn">
          <Send className="w-5 h-5" /> {t('send')}
        </button>
      </form>
    </Layout>
  );
}
