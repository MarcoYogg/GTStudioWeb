import { useEffect, useState } from 'react';
import { useAuthStore } from '../features/auth/auth.store';
import { fetchMemberByEmail } from '../features/members/members.service';
import { loadPermissionOverrides } from '../features/members/permissions.service';
import { can } from '../lib/permissions/can';
import type { RoleId, PermissionKey } from '../types';

export function useCurrentUser() {
  const { user, isAuthenticated, isLoading: authLoading } = useAuthStore();
  const [roleId, setRoleId] = useState<RoleId | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!isAuthenticated || !user?.email) {
      setRoleId(null);
      setIsLoading(false);
      return;
    }

    let cancelled = false;

    async function load() {
      try {
        await loadPermissionOverrides();
        const email = user?.email ?? '';
        const member = await fetchMemberByEmail(email);
        if (!cancelled) setRoleId(member?.roleId ?? 'guest');
      } catch (err) {
        console.error('Failed to fetch member role:', err);
        if (!cancelled) setRoleId('guest');
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    load();
    return () => { cancelled = true; };
  }, [isAuthenticated, user?.email]);

  const checkPermission = (permission: PermissionKey): boolean => can(user, roleId, permission);

  return { user, roleId, isLoading: authLoading || isLoading, checkPermission };
}
