import { useEffect, type ReactNode } from 'react';
import { useAuthStore } from '../../features/auth/auth.store';

interface Props {
  children: ReactNode;
}

export default function AppProviders({ children }: Props) {
  const initialize = useAuthStore((s) => s.initialize);

  useEffect(() => {
    const unsubscribe = initialize();
    return () => unsubscribe();
  }, [initialize]);

  return <>{children}</>;
}