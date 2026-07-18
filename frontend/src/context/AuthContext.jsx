import { createContext, useContext, useEffect, useState } from 'react';
import api from '../api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('sahaaya-token') || sessionStorage.getItem('sahaaya-token');
    if (!token) { setLoading(false); return; }
    api.get('/auth/me')
      .then(r => setUser(r.data))
      .catch(() => {
        localStorage.removeItem('sahaaya-token');
        sessionStorage.removeItem('sahaaya-token');
      })
      .finally(() => setLoading(false));
  }, []);

  const login = async (email, password, remember = true) => {
    const { data } = await api.post('/auth/login', { email, password });
    if (remember) {
      localStorage.setItem('sahaaya-token', data.token);
    } else {
      sessionStorage.setItem('sahaaya-token', data.token);
    }
    setUser(data.user);
    return data.user;
  };

  const googleLogin = async (credential, mode = 'login') => {
    const { data } = await api.post('/auth/google', { credential, mode });
    localStorage.setItem('sahaaya-token', data.token);
    setUser(data.user);
    return data.user;
  };

  const register = async (name, email, password) => {
    const { data } = await api.post('/auth/register', { name, email, password });
    localStorage.setItem('sahaaya-token', data.token);
    setUser(data.user);
    return data.user;
  };

  const logout = () => {
    localStorage.removeItem('sahaaya-token');
    sessionStorage.removeItem('sahaaya-token');
    setUser(null);
  };

  const refresh = async () => {
    const r = await api.get('/auth/me');
    setUser(r.data);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, googleLogin, register, logout, refresh, setUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
