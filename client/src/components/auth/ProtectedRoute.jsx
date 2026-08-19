import React, { useEffect } from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/components/ui/Toast';

export const ProtectedRoute = ({ allowedRole }) => {
  const { user, isAuthenticated } = useAuth();
  const toast = useToast();

  const isAccessDenied = isAuthenticated && allowedRole && user.role !== allowedRole && user.role === 'STUDENT';

  useEffect(() => {
    if (isAccessDenied) {
      toast.show('Access Restricted: Faculty Command Center is reserved for Teachers.', 'error');
    }
  }, [isAccessDenied]);

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (isAccessDenied) {
    return <Navigate to="/student-view" replace />;
  }

  return <Outlet />;
};
