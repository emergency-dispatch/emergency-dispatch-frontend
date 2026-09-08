export type RoleId = 'admin' | 'dispatcher' | 'station_manager' | 'rescue_staff' | 'viewer';

export interface UserAccount {
  id: string;
  name: string;
  email: string;
  role: RoleId;
  stationId: string | null;
  active: boolean;
  avatarInitials: string;
}

export interface Permission {
  id: string;
  label: string;
  group: string;
}

export type PermissionMatrix = Record<RoleId, Record<string, boolean>>;
