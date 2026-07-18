import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
import { LogOut, User, Mail, Home } from 'lucide-react';

export default function DashboardPage() {
  const { user, logout } = useAuth();
  const nav = useNavigate();

  const handleLogout = () => {
    logout();
    nav('/login');
  };

  if (!user) return null;

  const p = user.profile || {};

  return (
    <Layout>
      <div className="max-w-2xl mx-auto p-6 md:p-12 bg-card rounded-2xl border-4 border-border shadow-xl">
        <h1 className="text-4xl font-bold text-foreground mb-8 text-center">Dashboard</h1>
        
        <div className="flex flex-col items-center mb-8">
          {p.avatar ? (
            <img src={p.avatar} alt="Profile" className="w-32 h-32 rounded-full object-cover border-4 border-primary mb-6 shadow-md" />
          ) : (
            <div className="w-32 h-32 rounded-full bg-accent text-accent-foreground flex items-center justify-center text-5xl font-bold border-4 border-primary mb-6 shadow-md">
              {user.name?.[0]?.toUpperCase()}
            </div>
          )}
          
          <div className="w-full space-y-4">
            <div className="flex items-center gap-4 p-4 bg-background rounded-xl border border-border">
              <User className="text-primary w-6 h-6" />
              <div>
                <p className="text-sm text-muted-foreground font-semibold">Name</p>
                <p className="text-xl font-bold text-foreground">{user.name}</p>
              </div>
            </div>

            <div className="flex items-center gap-4 p-4 bg-background rounded-xl border border-border">
              <Mail className="text-primary w-6 h-6" />
              <div>
                <p className="text-sm text-muted-foreground font-semibold">Email</p>
                <p className="text-xl font-bold text-foreground">{user.email}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-4 justify-center mt-8">
          <button onClick={() => nav('/')} className="btn-lg bg-secondary text-secondary-foreground hover:bg-secondary/90 flex-1 flex items-center justify-center gap-2">
            <Home className="w-5 h-5" /> Go to Feed
          </button>
          
          <button onClick={handleLogout} className="btn-lg bg-destructive text-destructive-foreground hover:bg-destructive/90 flex-1 flex items-center justify-center gap-2">
            <LogOut className="w-5 h-5" /> Logout
          </button>
        </div>
      </div>
    </Layout>
  );
}
