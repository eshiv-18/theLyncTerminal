import React, { createContext, useContext, useState, useEffect } from 'react';
import { mockUsers, ROLES } from '@/data/mockData';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check localStorage for saved user
    const savedUser = localStorage.getItem('currentUser');
    if (savedUser) {
      try {
        const user = JSON.parse(savedUser);
        setCurrentUser(user);
      } catch (e) {
        console.error('Failed to parse saved user', e);
        localStorage.removeItem('currentUser');
      }
    } else {
      // Default to investor role
      setCurrentUser(mockUsers[0]);
      localStorage.setItem('currentUser', JSON.stringify(mockUsers[0]));
    }
    setIsLoading(false);
  }, []);

  const switchUser = (userId) => {
    const user = mockUsers.find(u => u.id === userId);
    if (user) {
      setCurrentUser(user);
      localStorage.setItem('currentUser', JSON.stringify(user));
    }
  };

  const logout = () => {
    setCurrentUser(null);
    localStorage.removeItem('currentUser');
  };

  const value = {
    currentUser,
    isLoading,
    switchUser,
    logout,
    isInvestor: currentUser?.role === ROLES.INVESTOR || currentUser?.role === ROLES.ADMIN,
    isFounder: currentUser?.role === ROLES.FOUNDER,
    isAdmin: currentUser?.role === ROLES.ADMIN
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};