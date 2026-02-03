import { createContext, useContext, useEffect, useState } from 'react';
import api from '@/lib/api';

const AuthContext = createContext(undefined);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  const checkAuth = async () => {
    const token = localStorage.getItem('auth_token');
    if (!token) {
      setLoading(false);
      return;
    }

    try {
      const { data } = await api.get('/auth/me');
      setUser(data.user);
      setProfile(data.user);
    } catch (error) {
      console.error('Auth check failed:', error);
      localStorage.removeItem('auth_token');
      setUser(null);
      setProfile(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    checkAuth();
  }, []);

  // Heartbeat effect
  useEffect(() => {
    if (!user) return;

    const sendHeartbeat = async () => {
      try {
        await api.post('/auth/heartbeat');
      } catch (error) {
        console.error('Heartbeat failed:', error);
      }
    };

    // Send immediately
    sendHeartbeat();

    // Send every 30 seconds
    const interval = setInterval(sendHeartbeat, 30000);

    return () => clearInterval(interval);
  }, [user]);

  const signUp = async (email, password, username) => {
    try {
      const { data } = await api.post('/auth/register', { email, password, username });
      localStorage.setItem('auth_token', data.token);
      setUser(data.user);
      setProfile(data.user);
      return { error: null };
    } catch (error) {
      return { error: error.response?.data?.error || error.message };
    }
  };

  const signIn = async (email, password) => {
    try {
      const { data } = await api.post('/auth/login', { email, password });
      localStorage.setItem('auth_token', data.token);
      setUser(data.user);
      setProfile(data.user);
      return { error: null };
    } catch (error) {
      return { error: error.response?.data?.error || error.message };
    }
  };

  const signOut = async () => {
    localStorage.removeItem('auth_token');
    setUser(null);
    setProfile(null);
  };

  const updateProfile = async (updates) => {
    try {
      const { data } = await api.put('/auth/profile', updates);
      setUser(data.user);
      setProfile(data.user);
      return { error: null };
    } catch (error) {
      return { error: error.response?.data?.error || error.message };
    }
  };

  const refreshProfile = async () => {
    await checkAuth();
  };

  return (
    <AuthContext.Provider value={{
      user,
      profile,
      loading,
      signUp,
      signIn,
      signOut,
      updateProfile,
      refreshProfile,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
