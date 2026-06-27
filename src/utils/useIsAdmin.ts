import { useEffect, useState } from 'react';
import { useUser } from '../contexts/UserContext';
import UserService from '../modules/auth/services/keycloakService';

/**
 * Hook to check if current user is admin
 * Checks both the user object role and Keycloak token roles
 */
export function useIsAdmin(): { isAdmin: boolean; isLoading: boolean } {
  const { user, isLoading: isUserLoading } = useUser();
  const [isAdmin, setIsAdmin] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const checkAdminRole = () => {
      // 1. Check Keycloak Resource/Realm Access (Most reliable for Keycloak)
      const keycloak = UserService.getKeyCloack();
      if (keycloak && keycloak.tokenParsed) {
        const realmRoles = keycloak.tokenParsed.realm_access?.roles || [];
        const resourceRoles = keycloak.tokenParsed.resource_access?.account?.roles || [];
        const allRoles = [...realmRoles, ...resourceRoles];

        const hasAdminRole = allRoles.some(r =>
          r.toUpperCase() === 'ADMIN' ||
          r.toUpperCase() === 'ROLE_ADMIN' ||
          r.toUpperCase() === 'MANAGE-ACCOUNT' // often an admin-like capability in simple setups
        );

        if (hasAdminRole) {
          setIsAdmin(true);
          setIsLoading(false);
          return;
        }
      }

      // 2. Check User Object Role (Fallback to DB/AuthStore role)
      if (user?.role) {
        const role = user.role.toUpperCase();
        if (role === 'ADMIN' || role === 'ROLE_ADMIN') {
          setIsAdmin(true);
          setIsLoading(false);
          return;
        }
      }

      // 3. Not Admin
      setIsAdmin(false);
      setIsLoading(false);
    };

    if (!isUserLoading) {
      checkAdminRole();
    }
  }, [user, isUserLoading]);

  return { isAdmin, isLoading: isLoading || isUserLoading };
}

export function useIsAdminSimple(): boolean {
  const { isAdmin } = useIsAdmin();
  return isAdmin;
}

export function isAdmin(user: { role?: string } | null): boolean {
  if (!user?.role) return false;
  const role = user.role.toUpperCase();
  return role === 'ADMIN' || role === 'ROLE_ADMIN';
}

