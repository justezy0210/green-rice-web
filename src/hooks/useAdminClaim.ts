import { useEffect, useState } from 'react';
import { useAuthContext } from '@/context/AuthContext';

interface UseAdminClaimResult {
  isAdmin: boolean;
  loading: boolean;
}

export function useAdminClaim(): UseAdminClaimResult {
  const { user, loading: authLoading } = useAuthContext();
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      setIsAdmin(false);
      setLoading(false);
      return;
    }
    let cancelled = false;
    user
      .getIdTokenResult()
      .then((res) => {
        if (!cancelled) setIsAdmin(res.claims.admin === true);
      })
      .catch(() => {
        if (!cancelled) setIsAdmin(false);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [user, authLoading]);

  return { isAdmin, loading };
}
