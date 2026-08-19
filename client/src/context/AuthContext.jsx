import React, { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext();

const MOCK_TEACHER = {
  id: 'u-himani',
  name: 'Dr. Himani Kaur',
  firstName: 'Himani',
  lastName: 'Kaur',
  rollNumber: 'FAC-8021',
  role: 'TEACHER',
  department: 'Computer Science',
  email: 'himani.kaur@university.edu',
  avatar: null,
};

const MOCK_STUDENT = {
  id: 's-101',
  name: 'Rahul Mehta',
  firstName: 'Rahul',
  lastName: 'Mehta',
  rollNumber: '2024-CS-101',
  role: 'STUDENT',
  department: 'Computer Science',
  email: 'rahul.mehta@student.edu',
  avatar: null,
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    try {
      const saved = localStorage.getItem('arambh_user');
      return saved ? JSON.parse(saved) : MOCK_TEACHER; // Default to Teacher for immediate demo evaluation
    } catch (e) {
      return MOCK_TEACHER;
    }
  });

  useEffect(() => {
    if (user) {
      localStorage.setItem('arambh_user', JSON.stringify(user));
    } else {
      localStorage.removeItem('arambh_user');
    }
  }, [user]);

  const login = (userData) => {
    setUser(userData);
  };

  const register = (newUser) => {
    setUser(newUser);
  };

  const logout = () => {
    setUser(null);
  };

  const value = {
    user,
    isAuthenticated: !!user,
    isTeacher: user?.role === 'TEACHER',
    isStudent: user?.role === 'STUDENT',
    login,
    register,
    logout,
    MOCK_TEACHER,
    MOCK_STUDENT,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
