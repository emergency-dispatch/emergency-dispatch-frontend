import { act, fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { UserProfileModal } from '@/components/profile/UserProfileModal';
import { AuthContext, type AuthContextType } from '@/contexts/AuthContext';
import { authService } from '@/services/authService';
import { mediaService } from '@/services/mediaService';
import { BloodType, Gender, UserRole } from '@/types/auth';
import { t } from '../../setup/render';

vi.mock('@/services/authService', () => ({ authService: { changePassword: vi.fn() } }));
vi.mock('@/services/mediaService', () => ({ mediaService: { upload: vi.fn() } }));

const baseUser = {
  id: 'u1',
  fullName: 'Nguyễn An',
  email: 'an@x.vn',
  role: UserRole.Citizen,
  phoneNumber: '0912345678',
  bloodType: BloodType.O_Positive,
  gender: Gender.Female,
  allergies: ['Tôm', 'Cua'],
  dateOfBirth: '1990-05-01T00:00:00Z',
};

const setup = (user: Record<string, unknown> = baseUser) => {
  const updateProfile = vi.fn().mockResolvedValue({});
  render(
    <AuthContext.Provider value={{ user, updateProfile } as unknown as AuthContextType}>
      <UserProfileModal isOpen onClose={vi.fn()} />
    </AuthContext.Provider>,
  );
  return { updateProfile };
};

const saveGeneral = () => fireEvent.submit(screen.getByText(t('profile.general.saveBtn')).closest('form')!);

beforeEach(() => vi.clearAllMocks());

describe('UserProfileModal', () => {
  it('đóng → không render', () => {
    const { container } = render(
      <AuthContext.Provider value={{ user: baseUser } as unknown as AuthContextType}>
        <UserProfileModal isOpen={false} onClose={vi.fn()} />
      </AuthContext.Provider>,
    );
    expect(container).toBeEmptyDOMElement();
  });

  it('điền sẵn hồ sơ và lưu tab chung', async () => {
    const { updateProfile } = setup();
    expect(screen.getByDisplayValue('Nguyễn An')).toBeInTheDocument();
    expect(screen.getByDisplayValue('0912345678')).toBeInTheDocument();
    expect(screen.getByDisplayValue('1990-05-01')).toBeInTheDocument();
    saveGeneral();
    expect(await screen.findByText(t('profile.messages.updateSuccess'))).toBeInTheDocument();
    expect(updateProfile).toHaveBeenCalledWith(
      expect.objectContaining({ fullName: 'Nguyễn An', phoneNumber: '0912345678', gender: Gender.Female, bloodType: BloodType.O_Positive, allergies: ['Tôm', 'Cua'] }),
    );
  });

  it.each([
    ['tên trống', { fullName: '' }, 'profile.messages.nameRequired'],
    ['SĐT sai', { phoneNumber: '0123' }, 'profile.messages.invalidPhone'],
    ['CCCD sai', { citizenIdNumber: '12ab' }, 'profile.messages.invalidCitizenId'],
    ['SĐT người thân sai', { emergencyContactPhone: '111' }, 'profile.messages.invalidIcePhone'],
    ['số người trong hộ < 1', { householdMembersCount: 0 }, 'profile.messages.invalidHouseholdCount'],
  ])('kiểm tra: %s', async (_n, override, key) => {
    const { updateProfile } = setup({ ...baseUser, ...override });
    saveGeneral();
    expect(await screen.findByText(t(key))).toBeInTheDocument();
    expect(updateProfile).not.toHaveBeenCalled();
  });

  it('dưới 18 tuổi bị chặn', async () => {
    const year = new Date().getFullYear() - 10;
    setup({ ...baseUser, dateOfBirth: `${year}-01-01` });
    saveGeneral();
    expect(await screen.findByText(t('profile.messages.under18Error', { age: 10 }), { exact: false })).toBeInTheDocument();
  });

  it('đổi ảnh đại diện', async () => {
    vi.mocked(mediaService.upload).mockResolvedValue('https://cdn/avatar.png');
    const { updateProfile } = setup();
    const input = document.body.querySelector('input[type=file]') as HTMLInputElement;
    await act(async () => {
      fireEvent.change(input, { target: { files: [new File(['x'], 'a.png', { type: 'image/png' })] } });
    });
    expect(updateProfile).toHaveBeenCalledWith({ fullName: 'Nguyễn An', avatarUrl: 'https://cdn/avatar.png' });
    expect(await screen.findByText(t('profile.messages.avatarSuccess'))).toBeInTheDocument();
  });

  it('đổi mật khẩu: kiểm tra và gọi API', async () => {
    vi.mocked(authService.changePassword).mockResolvedValue({ success: true, message: '', data: {} });
    setup();
    await userEvent.click(screen.getByText(t('profile.tabs.security')));
    const [current, next, confirm] = screen.getAllByPlaceholderText('••••••••••••');
    const form = current.closest('form')!;
    fireEvent.submit(form);
    expect(screen.getByText(t('profile.messages.passwordRequired'))).toBeInTheDocument();
    await userEvent.type(current, 'old123');
    await userEvent.type(next, '123');
    fireEvent.submit(form);
    expect(screen.getByText(t('profile.messages.passwordMinLength'))).toBeInTheDocument();
    await userEvent.type(next, '456');
    await userEvent.type(confirm, 'khac');
    fireEvent.submit(form);
    expect(screen.getByText(t('profile.messages.passwordMismatch'))).toBeInTheDocument();
    await userEvent.clear(confirm);
    await userEvent.type(confirm, '123456');
    fireEvent.submit(form);
    expect(authService.changePassword).toHaveBeenCalledWith({ currentPassword: 'old123', newPassword: '123456' });
    expect(await screen.findByText(t('profile.messages.changePasswordSuccess'))).toBeInTheDocument();
  });

  it('chuyển tab y tế / người thân', async () => {
    setup();
    await userEvent.click(screen.getByText(t('profile.tabs.medical')));
    expect(screen.getByDisplayValue('Tôm, Cua')).toBeInTheDocument();
    await userEvent.click(screen.getByText(t('profile.tabs.ice')));
    expect(screen.getByPlaceholderText(t('profile.ice.contactNamePlaceholder'))).toBeInTheDocument();
  });
});
