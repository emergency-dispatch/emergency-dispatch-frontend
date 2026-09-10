export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
  errors?: string[];
}

export enum UserRole {
  Citizen = 'Citizen',
  Operator = 'Operator',
  RescueStaff = 'RescueStaff',
  Admin = 'Admin',
}

export enum UserStatus {
  Active = 'Active',
  Inactive = 'Inactive',
  Suspended = 'Suspended',
}

export enum Gender {
  Male = 'Male',
  Female = 'Female',
  Other = 'Other',
}

export enum BloodType {
  Unknown = 'Unknown',
  A_Positive = 'A_Positive',
  A_Negative = 'A_Negative',
  B_Positive = 'B_Positive',
  B_Negative = 'B_Negative',
  AB_Positive = 'AB_Positive',
  AB_Negative = 'AB_Negative',
  O_Positive = 'O_Positive',
  O_Negative = 'O_Negative',
}

export interface UserDto {
  id: string;
  fullName: string;
  email: string;
  phoneNumber?: string;
  avatarUrl?: string;
  role: UserRole;
  status: UserStatus;
  stationId?: string;
  stationName?: string;
  isEmailVerified: boolean;
  bloodType?: BloodType;
}

export interface UserResponseDto {
  id: string;
  fullName: string;
  email: string;
  phoneNumber?: string;
  avatarUrl?: string;
  role: UserRole;
  status: UserStatus;
  dateOfBirth?: string;
  gender?: Gender;
  citizenIdNumber?: string;
  address?: string;
  bloodType?: BloodType;
  medicalNotes?: string;
  emergencyContactName?: string;
  emergencyContactPhone?: string;
  emergencyContactRelationship?: string;
  isEmailVerified: boolean;
  fcmToken?: string;
  stationId?: string;
  stationName?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface AuthResponseDto {
  accessToken: string;
  refreshToken: string;
  expiresAt: string;
  user: UserDto;
}

export interface LoginRequestDto {
  email: string;
  password: string;
}

export interface RegisterRequestDto {
  fullName: string;
  email: string;
  password: string;
  phoneNumber?: string;
}

export interface VerifyEmailDto {
  email: string;
  token: string;
}

export interface ResendVerificationDto {
  email: string;
}

export interface ForgotPasswordDto {
  email: string;
}

export interface ResetPasswordDto {
  email: string;
  token: string;
  newPassword: string;
  confirmPassword?: string;
}

export interface ChangePasswordDto {
  currentPassword: string;
  newPassword: string;
}

export interface RefreshTokenRequestDto {
  refreshToken: string;
}

export interface UpdateProfileDto {
  fullName: string;
  phoneNumber?: string;
  avatarUrl?: string;
  dateOfBirth?: string;
  gender?: Gender;
  citizenIdNumber?: string;
  address?: string;
  bloodType?: BloodType;
  medicalNotes?: string;
  emergencyContactName?: string;
  emergencyContactPhone?: string;
  emergencyContactRelationship?: string;
}

export interface UpdateFcmTokenDto {
  fcmToken: string;
}
