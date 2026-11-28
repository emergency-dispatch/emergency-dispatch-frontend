import { UserRole } from '../types/auth';

export const normalizeRole = (role?: string | UserRole | null): UserRole | undefined => {
  if (!role) return undefined;
  switch (String(role).trim().toLowerCase()) {
    case 'admin':
      return UserRole.Admin;
    case 'operator':
      return UserRole.Operator;
    case 'rescuestaff':
    case 'rescue_staff':
    case 'staff':
      return UserRole.RescueStaff;
    case 'citizen':
      return UserRole.Citizen;
    default:
      return role as UserRole;
  }
};

/**
 * Returns the default home landing path based on the user's role.
 */
export const getDefaultRouteForRole = (role?: string | UserRole): string => {
  switch (normalizeRole(role)) {
    case UserRole.RescueStaff:
      return '/staff';
    case UserRole.Operator:
      return '/dashboard/command-center/live-map';
    case UserRole.Admin:
      return '/admin/overview';
    case UserRole.Citizen:
    default:
      return '/';
  }
};

/**
 * Validates whether the given route is accessible for the provided user role.
 * Also filters out authentication / error routes from being redirect targets.
 */
export const isRouteAllowedForRole = (pathname?: string, role?: string | UserRole): boolean => {
  const normalizedRole = normalizeRole(role);
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

  // Command Center: Operator only (Admin có layout riêng /admin)
  if (pathname.startsWith('/dashboard')) {
    return normalizedRole === UserRole.Operator;
  }

  // Admin portal: Admin only
  if (pathname.startsWith('/admin')) {
    return normalizedRole === UserRole.Admin;
  }

  // Rescue staff field operations portal: RescueStaff only (Admin có layout riêng /admin)
  if (pathname.startsWith('/staff')) {
    return normalizedRole === UserRole.RescueStaff;
  }

  return true;
};
