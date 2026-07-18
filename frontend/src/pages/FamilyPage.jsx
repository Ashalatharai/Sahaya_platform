import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import Layout from '../components/Layout';
import api from '../api';
import { UserPlus, Check, X, Search, MessageCircle } from 'lucide-react';

function Avatar({ user, size = 56 }) {
  if (user?.avatar) return <img src={user.avatar} alt="" className="rounded-full object-cover border-2 border-border" style={{ width: size, height: size }} />;
  return (
    <div style={{ width: size, height: size }}
         className="rounded-full bg-accent text-accent-foreground flex items-center justify-center font-bold text-xl border-2 border-border">
      {(user?.name || '?')[0].toUpperCase()}
    </div>
  );
}

export default function FamilyPage() {
  const { t } = useTranslation();
  const [tab, setTab] = useState('friends');
  const [friends, setFriends] = useState([]);
  const [requests, setRequests] = useState([]);
  const [discover, setDiscover] = useState([]);
  const [q, setQ] = useState('');

  const load = async () => {
    const [f, r, d] = await Promise.all([
      api.get('/friends'),
      api.get('/friends/requests'),
      api.get('/users/discover'),
    ]);
    setFriends(f.data);
    setRequests(r.data);
    setDiscover(d.data);
  };
  useEffect(() => { load(); }, []);

  const sendReq = async (uid) => { await api.post(`/friends/request/${uid}`); load(); };
  const accept = async (uid) => { await api.post(`/friends/accept/${uid}`); load(); };
  const reject = async (uid) => { await api.post(`/friends/reject/${uid}`); load(); };

  const filteredDiscover = discover.filter(u => u.name.toLowerCase().includes(q.toLowerCase()));

  return (
    <Layout>
      <div className="max-w-3xl mx-auto">
        <h1 className="text-2xl md:text-4xl font-bold text-foreground mb-2">{t('familyAndFriends')}</h1>
        <p className="text-base text-muted-foreground mb-6">{t('growCircle')}</p>

        <div className="flex gap-2 border-b-2 border-border mb-6 overflow-x-auto" data-testid="family-tabs">
          <Tab active={tab === 'friends'} onClick={() => setTab('friends')} testid="tab-friends" count={friends.length}>{t('myFriends')}</Tab>
          <Tab active={tab === 'requests'} onClick={() => setTab('requests')} testid="tab-requests" count={requests.length}>{t('pendingRequests')}</Tab>
          <Tab active={tab === 'discover'} onClick={() => setTab('discover')} testid="tab-discover">{t('discover')}</Tab>
        </div>

        {tab === 'friends' && (
          <div className="space-y-3" data-testid="friends-list">
            {friends.length === 0 && <p className="text-lg text-muted-foreground">{t('noFriends')}</p>}
            {friends.map(u => (
              <Row key={u.id} user={u} testid={`friend-${u.id}`}>
                <Link to={`/messages/${u.id}`} data-testid={`msg-friend-${u.id}`}
                      className="btn-lg bg-primary text-primary-foreground inline-flex items-center gap-1 !min-h-[44px] !py-2 !text-base">
                  <MessageCircle className="w-5 h-5" /> {t('message')}
                </Link>
              </Row>
            ))}
          </div>
        )}

        {tab === 'requests' && (
          <div className="space-y-3" data-testid="requests-list">
            {requests.length === 0 && <p className="text-lg text-muted-foreground">{t('noRequests')}</p>}
            {requests.map(u => (
              <Row key={u.id} user={u} testid={`request-${u.id}`}>
                <button onClick={() => accept(u.id)} data-testid={`accept-${u.id}`}
                        className="btn-lg bg-primary text-primary-foreground inline-flex items-center gap-1 !min-h-[44px] !py-2 !text-base">
                  <Check className="w-5 h-5" /> {t('accept')}
                </button>
                <button onClick={() => reject(u.id)} data-testid={`reject-${u.id}`}
                        className="btn-lg bg-secondary text-secondary-foreground inline-flex items-center gap-1 !min-h-[44px] !py-2 !text-base">
                  <X className="w-5 h-5" /> {t('reject')}
                </button>
              </Row>
            ))}
          </div>
        )}

        {tab === 'discover' && (
          <>
            <div className="relative mb-4">
              <Search className="w-5 h-5 text-muted-foreground absolute left-4 top-1/2 -translate-y-1/2" />
              <input value={q} onChange={e => setQ(e.target.value)} placeholder={t('searchByName')}
                     className="input-lg pl-12" data-testid="discover-search" />
            </div>
            <div className="space-y-3" data-testid="discover-list">
              {filteredDiscover.length === 0 && <p className="text-lg text-muted-foreground">{t('noItemsHere')}</p>}
              {filteredDiscover.map(u => (
                <Row key={u.id} user={u} testid={`discover-user-${u.id}`}>
                  {u.is_friend ? (
                    <span className="inline-flex items-center gap-1 text-emerald-700 font-semibold"><Check className="w-5 h-5" /> {t('friends')}</span>
                  ) : u.request_sent ? (
                    <span className="text-muted-foreground font-semibold">{t('requested')}</span>
                  ) : (
                    <button onClick={() => sendReq(u.id)} data-testid={`add-friend-${u.id}`}
                            className="btn-lg bg-primary text-primary-foreground inline-flex items-center gap-2 !min-h-[44px] !py-2 !text-base">
                      <UserPlus className="w-5 h-5" /> {t('addFriend')}
                    </button>
                  )}
                </Row>
              ))}
            </div>
          </>
        )}
      </div>
    </Layout>
  );
}

function Tab({ children, active, onClick, testid, count }) {
  return (
    <button onClick={onClick} data-testid={testid}
            className={`px-4 py-3 text-base md:text-lg font-semibold border-b-4 transition-colors duration-200 whitespace-nowrap ${
              active ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}>
      {children}
      {count > 0 && <span className="ml-2 inline-block bg-primary text-primary-foreground rounded-full px-2 py-0.5 text-sm">{count}</span>}
    </button>
  );
}

function Row({ user, children, testid }) {
  return (
    <div className="bg-card border-2 border-border rounded-2xl p-4 flex items-center gap-4 flex-wrap sm:flex-nowrap" data-testid={testid}>
      <Link to={`/users/${user.id}`} data-testid={`row-avatar-${user.id}`} className="flex-shrink-0">
        <Avatar user={user} />
      </Link>
      <Link to={`/users/${user.id}`} className="flex-1 min-w-0 group">
        <div className="font-bold text-lg text-foreground truncate group-hover:underline">{user.name}</div>
        {user.city && <div className="text-sm text-muted-foreground">{user.city}</div>}
        {user.interests?.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-1">
            {user.interests.slice(0, 3).map(i => (
              <span key={i} className="text-xs bg-secondary text-secondary-foreground px-2 py-0.5 rounded-full">{i}</span>
            ))}
          </div>
        )}
      </Link>
      <div className="flex gap-2 flex-wrap">{children}</div>
    </div>
  );
}
