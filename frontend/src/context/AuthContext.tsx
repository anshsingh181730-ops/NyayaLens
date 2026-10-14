import React, { createContext, useContext, useState, useEffect } from 'react';
import { api } from '../lib/api';
import { AuthUser } from '../lib/types';
import { Scale } from 'lucide-react';

interface AuthContextType {
  user: AuthUser | null;
  isLoading: boolean;
  signup: (name: string, email: string, pass: string) => Promise<void>;
  login: (email: string, pass: string) => Promise<void>;
  guestLogin: () => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    api
      .getMe()
      .then((data) => {
        if (isMounted) setUser(data);
      })
      .catch(() => {
        if (isMounted) setUser(null);
      })
      .finally(() => {
        if (isMounted) setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const signup = async (name: string, email: string, pass: string) => {
    const data = await api.signup(name, email, pass);
    setUser(data);
  };

  const login = async (email: string, pass: string) => {
    const data = await api.login(email, pass);
    setUser(data);
  };

  const guestLogin = async () => {
    const data = await api.guestLogin();
    setUser(data);
  };

  const logout = async () => {
    try {
      await api.logout();
    } catch (err) {
      console.error('Error during logout API call:', err);
    } finally {
      setUser(null);
    }
  };

  if (isLoading) {
    return (
      <div className="fixed inset-0 bg-nyaya-ivory flex flex-col items-center justify-center z-50">
        <div className="flex flex-col items-center space-y-4 animate-in fade-in duration-300">
          <div className="w-14 h-14 rounded-2xl bg-nyaya-navy900 flex items-center justify-center text-nyaya-gold shadow-elevated border border-nyaya-gold/30">
            <Scale className="w-8 h-8 animate-pulse text-nyaya-gold" />
          </div>
          <div className="text-center space-y-1">
            <h1 className="font-serif text-2xl font-bold tracking-tight text-nyaya-navy900">
              NyayaLens
            </h1>
            <p className="text-xs text-nyaya-muted font-sans">
              Authenticating judicial session...
            </p>
          </div>
          <div className="w-6 h-6 border-2 border-nyaya-navy900/20 border-t-nyaya-gold rounded-full animate-spin mt-2" />
        </div>
      </div>
    );
  }

  return (
    <AuthContext.Provider value={{ user, isLoading, signup, login, guestLogin, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
