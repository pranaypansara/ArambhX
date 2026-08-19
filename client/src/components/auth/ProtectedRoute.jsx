import React, { useEffect } from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/components/ui/Toast';

function FullPageLoader() {
  return (
    <div className="min-h-screen bg-[#F8FAF9] flex items-center justify-center">
      <div className="flex items-center gap-2 text-xs font-bold text-[#607580]">
        <span className="w-3 h-3 rounded-full border-2 border-[#2A8588] border-t-transparent animate-spin" />
        Loading your session…
      </div>
    </div>
  );
}

/**
 * Route guard. Pass `roles` to restrict to specific roles (ADMIN / FACULTY /
 * COUNSELOR / STUDENT). With no roles, any authenticated user is allowed.
 */
export const ProtectedRoute = ({ roles }) => {
  const { role, isAuthenticated, initializing } = useAuth();
  const toast = useToast();
  const location = useLocation();

  const denied = isAuthenticated && roles && !roles.includes(role);

  useEffect(() => {
    if (denied) {
      toast.show('Access Restricted: this area is not available for your role.', 'error');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [denied]);

  if (initializing) {
    return <FullPageLoader />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  if (denied) {
    return <Navigate to={role === 'STUDENT' ? '/student-view' : '/'} replace />;
  }

  return <Outlet />;
};