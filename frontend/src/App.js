import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { GoogleOAuthProvider } from '@react-oauth/google';
import '@/App.css';
import '@/i18n';
import { AuthProvider, useAuth } from '@/context/AuthContext';
import LoginPage from '@/pages/LoginPage';
import ForgotPasswordPage from '@/pages/ForgotPasswordPage';
import ResetPasswordPage from '@/pages/ResetPasswordPage';
import ProfileSetupPage from '@/pages/ProfileSetupPage';
import DashboardPage from '@/pages/DashboardPage';
import FeedPage from '@/pages/FeedPage';
import GroupsPage from '@/pages/GroupsPage';
import GroupDetailPage from '@/pages/GroupDetailPage';
import FamilyPage from '@/pages/FamilyPage';
import AICompanionPage from '@/pages/AICompanionPage';
import MemoryCornerPage from '@/pages/MemoryCornerPage';
import UserProfilePage from '@/pages/UserProfilePage';
import RemindersPage from '@/pages/RemindersPage';
import NostalgiaPage from '@/pages/NostalgiaPage';
import EventsPage from '@/pages/EventsPage';
import MessagesPage from '@/pages/MessagesPage';
import ConversationPage from '@/pages/ConversationPage';

function Protected({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="min-h-screen flex items-center justify-center text-xl text-muted-foreground">Loading...</div>;
  if (!user) return <Navigate to="/login" replace />;
  return children;
}
function PublicOnly({ children }) {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (user) return <Navigate to="/" replace />;
  return children;
}
function MyProfile() {
  const { user } = useAuth();
  return <Navigate to={`/users/${user.id}`} replace />;
}

function App() {
  return (
    <div className="App">
      <GoogleOAuthProvider clientId={process.env.REACT_APP_GOOGLE_CLIENT_ID || "mock-client-id"}>
        <BrowserRouter>
          <AuthProvider>
          <Routes>
            <Route path="/login" element={<PublicOnly><LoginPage mode="login" /></PublicOnly>} />
            <Route path="/register" element={<PublicOnly><LoginPage mode="register" /></PublicOnly>} />
            <Route path="/forgot-password" element={<PublicOnly><ForgotPasswordPage /></PublicOnly>} />
            <Route path="/reset-password" element={<PublicOnly><ResetPasswordPage /></PublicOnly>} />
            <Route path="/profile-setup" element={<Protected><ProfileSetupPage /></Protected>} />
            <Route path="/dashboard" element={<Protected><DashboardPage /></Protected>} />
            <Route path="/" element={<Protected><FeedPage /></Protected>} />
            <Route path="/groups" element={<Protected><GroupsPage /></Protected>} />
            <Route path="/groups/:id" element={<Protected><GroupDetailPage /></Protected>} />
            <Route path="/family" element={<Protected><FamilyPage /></Protected>} />
            <Route path="/messages" element={<Protected><MessagesPage /></Protected>} />
            <Route path="/messages/:friendId" element={<Protected><ConversationPage /></Protected>} />
            <Route path="/companion" element={<Protected><AICompanionPage /></Protected>} />
            <Route path="/memories" element={<Protected><MemoryCornerPage /></Protected>} />
            <Route path="/reminders" element={<Protected><RemindersPage /></Protected>} />
            <Route path="/nostalgia" element={<Protected><NostalgiaPage /></Protected>} />
            <Route path="/events" element={<Protected><EventsPage /></Protected>} />
            <Route path="/profile" element={<Protected><MyProfile /></Protected>} />
            <Route path="/users/:id" element={<Protected><UserProfilePage /></Protected>} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
          </AuthProvider>
        </BrowserRouter>
      </GoogleOAuthProvider>
    </div>
  );
}

export default App;
