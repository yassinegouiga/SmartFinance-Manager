import { createContext, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '../firebaseConfig';
import api from '../services/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser]         = useState(null);
  const [profile, setProfile]   = useState(null);
  const [loading, setLoading]   = useState(true);
  const [theme, setTheme]       = useState('dark');
  const [currency, setCurrency] = useState('USD');

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (!firebaseUser || !firebaseUser.emailVerified) {
        setUser(null);
        setProfile(null);
        setLoading(false);
        return;
      }
      setUser(firebaseUser);
      try {
        const { data } = await api.get('/api/v1/users/me');
        let profileData = data;
        const pending = localStorage.getItem('sf_pending_names');
        if (pending) {
          localStorage.removeItem('sf_pending_names');
          const { data: updated } = await api.put('/api/v1/users/me', JSON.parse(pending));
          profileData = updated;
        }
        setProfile(profileData);
        if (profileData.theme)    setTheme(profileData.theme);
        if (profileData.currency) setCurrency(profileData.currency);
      } catch {
        setProfile(null);
      }
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  const toggleTheme = async () => {
    const next = theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
    try {
      await api.put('/api/v1/users/me/settings', { theme: next });
      setProfile(p => p ? { ...p, theme: next } : p);
    } catch {
      setTheme(theme);
    }
  };

  const updateProfile = async (firstName, lastName) => {
    const { data } = await api.put('/api/v1/users/me', {
      first_name: firstName,
      last_name: lastName,
    });
    setProfile(data);
    return data;
  };

  const updateCurrency = async (newCurrency) => {
    const prev = currency;
    setCurrency(newCurrency);
    try {
      await api.put('/api/v1/users/me/settings', { currency: newCurrency });
      setProfile(p => p ? { ...p, currency: newCurrency } : p);
    } catch {
      setCurrency(prev);
      throw new Error('Failed to update currency');
    }
  };

  const deleteAccount = async () => {
    await api.delete('/api/v1/users/me');
    await auth.currentUser.delete();
  };

  return (
    <AuthContext.Provider value={{
      user, profile, loading,
      theme, toggleTheme,
      currency, updateProfile, updateCurrency, deleteAccount,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
