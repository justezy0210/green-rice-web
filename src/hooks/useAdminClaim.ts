import { useEffect, useState } from 'react';
import { useAuthContext } from '@/context/AuthContext';

interface UseAdminClaimResult {
  isAdmin: boolean;
  loading: boolean;
}

type State = { uid: string; isAdmin: boolean };
const EMPTY_STATE: State = { uid: '', isAdmin: false };

export function useAdminClaim(): UseAdminClaimResult {
  const { user, loading: authLoading } = useAuthContext();
  const uid = user?.uid ?? '';
  const [state, setState] = useState<State>(EMPTY_STATE);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    user
      .getIdTokenResult()
      .then((res) => {
        if (!cancelled) setState({ uid: user.uid, isAdmin: res.claims.admin === true });
      })
      .catch(() => {
        if (!cancelled) setState({ uid: user.uid, isAdmin: false });
      });
    return () => {
      cancelled = true;
    };
  }, [user]);

  if (authLoading) return { isAdmin: false, loading: true };
  if (!user) return { isAdmin: false, loading: false };
  const isCurrent = state.uid === uid;
  return {
    isAdmin: isCurrent ? state.isAdmin : false,
    loading: !isCurrent,
  };
}
