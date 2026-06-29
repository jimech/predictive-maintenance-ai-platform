import React, { createContext, useContext, useState } from 'react';

export interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  avatar: string;
}

interface AuthContextType {
  user: User | null;
  login: (email: string) => void;
  logout: () => void;
  isAuthenticated: boolean;
}

const defaultUser: User = {
  id: 'USR-001',
  name: 'Erik Nordmann',
  email: 'e.nordmann@aeropredict.ai',
  role: 'Fleet Ops Mgr',
  avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
};

const AuthContext = createContext<AuthContextType>({
  user: defaultUser,
  login: () => {},
  logout: () => {},
  isAuthenticated: true,
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // In-memory state (avoids localStorage sensitive token storage)
  const [user, setUser] = useState<User | null>(defaultUser);

  const login = (email: string) => {
    setUser({
      id: 'USR-999',
      name: email.split('@')[0].replace('.', ' ').replace(/\b\w/g, (l) => l.toUpperCase()),
      email,
      role: 'Flight Engineer',
      avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
    });
  };

  const logout = () => {
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, isAuthenticated: Boolean(user) }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
