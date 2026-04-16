import { Navigate } from 'react-router-dom';
import { useAuthContext } from '@/context/AuthContext';
import { useAdminClaim } from '@/hooks/useAdminClaim';
import type { ReactNode } from 'react';

interface Props {
  children: ReactNode;
  /** If true, only users with the `admin` custom claim can view this route. */
  requireAdmin?: boolean;
}

export function ProtectedRoute({ children, requireAdmin = false }: Props) {
  const { user, loading } = useAuthContext();
  const { isAdmin, loading: claimLoading } = useAdminClaim();

  if (loading || (requireAdmin && claimLoading)) {
    return (
      <div className="flex items-center justify-center py-20 text-gray-500">
        Loading…
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (requireAdmin && !isAdmin) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}
