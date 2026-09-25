import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import type { AuthResponse } from '../types';

interface AuthUser {
    loginName: string;
    role: string;
    volunteerId: number | null;
}

interface AuthContextValue {
    user: AuthUser | null;
    token: string | null;
    isAuthenticated: boolean;
    login: (data: AuthResponse) => void;
    logout: () => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
    const [token, setToken] = useState<string | null>(() => localStorage.getItem('token'));
    const [user, setUser] = useState<AuthUser | null>(() => {
        const raw = localStorage.getItem('user');
        return raw ? JSON.parse(raw) : null;
    });

    const login = (data: AuthResponse) => {
        localStorage.setItem('token', data.token);
        const u: AuthUser = {
            loginName: data.loginName,
            role: data.role,
            volunteerId: data.volunteerId
        };
        localStorage.setItem('user', JSON.stringify(u));
        setToken(data.token);
        setUser(u);
    };

    const logout = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        setToken(null);
        setUser(null);
    };

    return (
        <AuthContext.Provider
      value= {{ user, token, isAuthenticated: !!token, login, logout }
}
    >
{ children }
    </AuthContext.Provider>
  );
}

export function useAuth() {
    const ctx = useContext(AuthContext);
    if (!ctx) throw new Error('useAuth must be used within AuthProvider');
    return ctx;
}