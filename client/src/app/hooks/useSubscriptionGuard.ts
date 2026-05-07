import { useOutletContext } from 'react-router-dom';

export function useSubscriptionGuard() {
  const { currentSubscription } = useOutletContext<{
    currentSubscription: { status: string } | null;
  }>();
  const isLocked = ['expired', 'cancelled'].includes(currentSubscription?.status ?? '');
  return { isLocked, status: currentSubscription?.status ?? null };
}
