import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../../hooks/useAuth';
import { mockStaffProfile } from '../../../data/staffMock';
import type { StaffProfile } from '../../../types/staff';
import { userService } from '../../../services/userService';

export const useStaffProfile = () => {
  const { user, refreshProfile } = useAuth();

  const [profile, setProfile] = useState<StaffProfile>(() => {
    if (user) {
      return {
        ...mockStaffProfile,
        id: user.id || '',
        name: user.fullName || 'Cán bộ tác chiến',
        email: user.email || '',
        phone: user.phoneNumber || '',
        role: user.role === 'RescueStaff' ? 'Chỉ Huy Xe Phản Ứng Cứu Hộ' : (user.role || 'Cán bộ cứu hộ'),
        stationName: user.stationName || 'Chưa phân trạm',
        badgeNumber: user.id ? `ED-${user.id.slice(-4).toUpperCase()}` : 'Chưa cấp',
        vehiclePlate: '51A-114.99',
      };
    }
    return mockStaffProfile;
  });

  useEffect(() => {
    refreshProfile().then(async (userData) => {
      let teamPlates: string[] = [];
      let vehiclePlate = '51A-114.99';
      let teamName: string | undefined;
      let crewRole: string | undefined;

      try {
        const teamRes = await userService.getMyTeam();
        if (teamRes.success && teamRes.data) {
          teamPlates = teamRes.data.myTeamRescueUnitPlates || [];
          vehiclePlate = teamRes.data.myTeamRescueUnitPlate || teamPlates[0] || vehiclePlate;
          teamName = teamRes.data.myTeamName || undefined;
          crewRole = teamRes.data.myCrewRole || undefined;
        }
      } catch {
        // Fallback
      }

      setProfile((prev) => ({
        ...prev,
        ...(userData ? {
          id: userData.id || prev.id,
          name: userData.fullName || prev.name,
          email: userData.email || prev.email,
          phone: userData.phoneNumber || prev.phone,
          role: userData.role === 'RescueStaff' ? 'Chỉ Huy Xe Phản Ứng Cứu Hộ' : (userData.role || prev.role),
          stationName: userData.stationName || prev.stationName,
          badgeNumber: userData.citizenIdNumber
            ? `ED-${userData.citizenIdNumber.slice(-4)}`
            : (userData.id ? `ED-${userData.id.slice(-4).toUpperCase()}` : prev.badgeNumber),
        } : {}),
        vehiclePlate: vehiclePlate || prev.vehiclePlate,
        teamPlates: teamPlates.length > 0 ? teamPlates : prev.teamPlates,
        teamName: teamName || prev.teamName,
        crewRole: crewRole || prev.crewRole,
      }));
    });
  }, [refreshProfile]);

  const handleProfileUpdated = useCallback((updatedUser: any) => {
    if (updatedUser) {
      setProfile((prev) => ({
        ...prev,
        id: updatedUser.id || prev.id,
        name: updatedUser.fullName || prev.name,
        email: updatedUser.email || prev.email,
        phone: updatedUser.phoneNumber || prev.phone,
        role: updatedUser.role === 'RescueStaff' ? 'Chỉ Huy Xe Phản Ứng Cứu Hộ' : (updatedUser.role || prev.role),
        stationName: updatedUser.stationName || prev.stationName,
        badgeNumber: updatedUser.citizenIdNumber
          ? `ED-${updatedUser.citizenIdNumber.slice(-4)}`
          : (updatedUser.id ? `ED-${updatedUser.id.slice(-4).toUpperCase()}` : prev.badgeNumber),
      }));
    }
  }, []);

  return {
    profile,
    setProfile,
    handleProfileUpdated,
  };
};
