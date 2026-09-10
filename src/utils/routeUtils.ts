import { UserRole } from '../types/auth';

/**
 * Returns the default home landing path based on the user's role.
 */
export const getDefaultRouteForRole = (role?: UserRole): string => {
  switch (role) {
    case UserRole.RescueStaff:
      return '/staff';
    case UserRole.Operator:
    case UserRole.Admin:
      return '/dashboard';
    case UserRole.Citizen:
    default:
      return '/';
  }
};

/**
 * Validates whether the given route is accessible for the provided user role.
 * Also filters out authentication / error routes from being redirect targets.
 */
export const isRouteAllowedForRole = (pathname?: string, role?: UserRole): boolean => {
  if (!pathname || pathname === '/' || pathname === '') {
    return true;
  }

  // Blacklist auth pages and error pages from redirect destinations
  const forbiddenRedirects = [
    '/login',
    '/register',
    '/signup',
    '/forgot-password',
    '/unauthorized',
  ];
  if (forbiddenRedirects.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`))) {
    return false;
  }

  // Command center / backoffice dashboard: Operator and Admin only
  if (pathname.startsWith('/dashboard')) {
    return role === UserRole.Admin || role === UserRole.Operator;
  }

  // Rescue staff field operations portal: RescueStaff and Admin only
  if (pathname.startsWith('/staff')) {
    return role === UserRole.Admin || role === UserRole.RescueStaff;
  }

  return true;
};
