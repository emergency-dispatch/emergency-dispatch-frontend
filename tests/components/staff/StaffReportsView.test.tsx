import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { StaffReportsView } from '@/components/staff/reports/StaffReportsView';
import type { StaffMission } from '@/types/staff';
import { initialStaffMission } from '@/data/staffMock';

const now = new Date();

const sampleMissions: StaffMission[] = [
  {
    ...initialStaffMission,
    id: 'report-001',
    incidentId: 'inc-001',
    title: 'Hỏa hoạn nhà xưởng dệt may',
    address: 'Khu công nghệ cao TP.HCM',
    severity: 3,
    vehiclePlate: '51A-11111',
    assignedAt: new Date(Date.now() - 3600000).toISOString(),
    closureReport: {
      missionId: 'report-001',
      incidentId: 'inc-001',
      vehiclePlate: '51A-11111',
      teamLeader: 'Đội trưởng Nguyễn Văn A',
      completedAt: new Date(Date.now() - 1800000).toISOString(),
      actionSummary: 'Đã dập tắt đám cháy và sơ tán 2 công nhân.',
      casualtiesTreated: 2,
      casualtiesHospitalized: 0,
      fireExtinguished: true,
      hazardsNeutralized: true,
      resourcesUsed: [{ name: 'Bình bọt Foam', quantity: 4, unit: 'Bình' }],
      photos: [
        { id: 'p1', url: 'https://example.com/p1.jpg', category: 'after_action', label: 'Hiện trường dập tắt', timestamp: '' }
      ],
      handoverEntity: 'Ban quản lý KCN',
      handoverContactName: 'Trần Văn B',
      handoverContactPhone: '0901234567',
      handoverQrData: '',
      signatureDataUrl: 'data:image/png;base64,mock',
      dispatchApprovalStatus: 'verified',
    },
  },
  {
    ...initialStaffMission,
    id: 'report-002',
    incidentId: 'inc-002',
    title: 'Tai nạn giao thông ngã tư',
    address: 'Đỗ Xuân Hợp, Phước Long B',
    severity: 2,
    vehiclePlate: '51A-22222',
    assignedAt: new Date(Date.now() - 86400000 * 2).toISOString(),
    closureReport: {
      missionId: 'report-002',
      incidentId: 'inc-002',
      vehiclePlate: '51A-22222',
      teamLeader: 'Đội phó Lê Văn C',
      completedAt: new Date(Date.now() - 86400000 * 2).toISOString(),
      actionSummary: 'Sơ cứu và chuyển viện 1 nạn nhân xe máy.',
      casualtiesTreated: 0,
      casualtiesHospitalized: 1,
      fireExtinguished: false,
      hazardsNeutralized: true,
      resourcesUsed: [],
      photos: [],
      handoverEntity: 'Bệnh viện Quân y 175',
      handoverContactName: 'Bác sĩ trực',
      handoverContactPhone: '0909999888',
      handoverQrData: '',
      signatureDataUrl: '',
      dispatchApprovalStatus: 'verified',
    },
  },
  {
    ...initialStaffMission,
    id: 'report-003',
    incidentId: 'inc-003',
    title: 'Cứu hộ mắc kẹt thang máy',
    address: 'Chung cư Safira Khang Điền',
    severity: 1,
    vehiclePlate: '51A-33333',
    assignedAt: new Date(Date.now() - 86400000 * 40).toISOString(),
    closureReport: {
      missionId: 'report-003',
      incidentId: 'inc-003',
      vehiclePlate: '51A-33333',
      teamLeader: 'Đội trưởng Nguyễn Văn A',
      completedAt: new Date(Date.now() - 86400000 * 40).toISOString(),
      actionSummary: 'Giải cứu 3 cư dân an toàn, không ai bị thương.',
      casualtiesTreated: 0,
      casualtiesHospitalized: 0,
      fireExtinguished: false,
      hazardsNeutralized: true,
      resourcesUsed: [],
      photos: [],
      handoverEntity: 'BQL Safira',
      handoverContactName: 'Bảo vệ ca đêm',
      handoverContactPhone: '0903333444',
      handoverQrData: '',
      signatureDataUrl: 'data:image/png;base64,mock',
      dispatchApprovalStatus: 'verified',
    },
  },
];

describe('StaffReportsView - Tính năng Filter Đơn Giản & Sắp xếp Mới Nhất Trước', () => {
  it('luôn hiển thị danh sách sắp xếp theo ngày MỚI NHẤT lên đầu (dù input truyền vào theo thứ tự cũ trước)', () => {
    // Truyền danh sách đảo ngược: cũ nhất (report-003) trước, mới nhất (report-001) cuối cùng
    const reversed = [sampleMissions[2], sampleMissions[1], sampleMissions[0]];
    render(<StaffReportsView completedMissions={reversed} onOpenNewReport={vi.fn()} />);

    // Lấy các thẻ báo cáo bên cột trái
    const cards = screen.getAllByText(/report-00[1-3]/);
    // Thẻ đầu tiên phải là report-001 (mới nhất hôm nay)
    expect(cards[0]).toHaveTextContent('report-001');
    expect(cards[1]).toHaveTextContent('report-002');
    expect(cards[2]).toHaveTextContent('report-003');

    // Báo cáo được chọn mặc định bên phải cũng phải là báo cáo mới nhất (report-001)
    expect(screen.getAllByText('Hỏa hoạn nhà xưởng dệt may').length).toBeGreaterThanOrEqual(2);
  });

  it('lọc theo từ khóa tìm kiếm (địa chỉ, tên, biển số, mã sự cố)', async () => {
    const user = userEvent.setup();
    render(<StaffReportsView completedMissions={sampleMissions} onOpenNewReport={vi.fn()} />);

    const searchInput = screen.getByPlaceholderText(/Tìm kiếm mã sự cố, địa chỉ/);
    await user.type(searchInput, 'Safira');

    expect(screen.getAllByText('Cứu hộ mắc kẹt thang máy').length).toBeGreaterThanOrEqual(1);
    expect(screen.queryByText('Hỏa hoạn nhà xưởng dệt may')).not.toBeInTheDocument();
    expect(screen.queryByText('Tai nạn giao thông ngã tư')).not.toBeInTheDocument();
  });

  it('lọc theo mức độ nghiêm trọng qua dropdown (Cấp 3, Cấp 2, Cấp 1)', async () => {
    const user = userEvent.setup();
    render(<StaffReportsView completedMissions={sampleMissions} onOpenNewReport={vi.fn()} />);

    const severitySelect = screen.getByLabelText('Lọc theo mức độ');

    // Chọn Cấp 3
    await user.selectOptions(severitySelect, '3');
    expect(screen.getAllByText('Hỏa hoạn nhà xưởng dệt may').length).toBeGreaterThanOrEqual(1);
    expect(screen.queryByText('Tai nạn giao thông ngã tư')).not.toBeInTheDocument();
    expect(screen.queryByText('Cứu hộ mắc kẹt thang máy')).not.toBeInTheDocument();

    // Chọn Cấp 2
    await user.selectOptions(severitySelect, '2');
    expect(screen.getAllByText('Tai nạn giao thông ngã tư').length).toBeGreaterThanOrEqual(1);
    expect(screen.queryByText('Hỏa hoạn nhà xưởng dệt may')).not.toBeInTheDocument();
  });

  it('lọc theo minh chứng hiện trường (Có ảnh, Có chữ ký, Có nạn nhân)', async () => {
    const user = userEvent.setup();
    render(<StaffReportsView completedMissions={sampleMissions} onOpenNewReport={vi.fn()} />);

    const evidenceSelect = screen.getByLabelText('Lọc theo minh chứng');

    // Chọn Có ảnh hiện trường (chỉ report-001 có ảnh)
    await user.selectOptions(evidenceSelect, 'HAS_PHOTOS');
    expect(screen.getAllByText('Hỏa hoạn nhà xưởng dệt may').length).toBeGreaterThanOrEqual(1);
    expect(screen.queryByText('Tai nạn giao thông ngã tư')).not.toBeInTheDocument();
    expect(screen.queryByText('Cứu hộ mắc kẹt thang máy')).not.toBeInTheDocument();

    // Chọn Có chữ ký (report-001 và report-003)
    await user.selectOptions(evidenceSelect, 'HAS_SIGNATURE');
    expect(screen.getAllByText('Hỏa hoạn nhà xưởng dệt may').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('Cứu hộ mắc kẹt thang máy')).toBeInTheDocument();
    expect(screen.queryByText('Tai nạn giao thông ngã tư')).not.toBeInTheDocument();
  });

  it('lọc theo thời gian: Hôm nay và 7 ngày qua', async () => {
    const user = userEvent.setup();
    render(<StaffReportsView completedMissions={sampleMissions} onOpenNewReport={vi.fn()} />);

    const dateSelect = screen.getByLabelText('Lọc theo thời gian');

    // Chọn Hôm nay -> chỉ report-001
    await user.selectOptions(dateSelect, 'TODAY');
    expect(screen.getAllByText('Hỏa hoạn nhà xưởng dệt may').length).toBeGreaterThanOrEqual(1);
    expect(screen.queryByText('Tai nạn giao thông ngã tư')).not.toBeInTheDocument();
    expect(screen.queryByText('Cứu hộ mắc kẹt thang máy')).not.toBeInTheDocument();

    // Chọn 7 ngày qua -> report-001 và report-002
    await user.selectOptions(dateSelect, 'LAST_7_DAYS');
    expect(screen.getAllByText('Hỏa hoạn nhà xưởng dệt may').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('Tai nạn giao thông ngã tư')).toBeInTheDocument();
    expect(screen.queryByText('Cứu hộ mắc kẹt thang máy')).not.toBeInTheDocument();
  });

  it('lọc theo ngày cụ thể (CUSTOM)', async () => {
    const user = userEvent.setup();
    render(<StaffReportsView completedMissions={sampleMissions} onOpenNewReport={vi.fn()} />);

    const dateSelect = screen.getByLabelText('Lọc theo thời gian');
    await user.selectOptions(dateSelect, 'CUSTOM');

    const dateInput = screen.getByLabelText('Chọn ngày cụ thể');
    expect(dateInput).toBeInTheDocument();

    // Lấy ngày local của report-002 (2 ngày trước)
    const report2Date = new Date(Date.now() - 86400000 * 2);
    const yyyy = report2Date.getFullYear();
    const mm = String(report2Date.getMonth() + 1).padStart(2, '0');
    const dd = String(report2Date.getDate()).padStart(2, '0');
    const dateStr = `${yyyy}-${mm}-${dd}`;

    await user.type(dateInput, dateStr);

    expect(screen.getAllByText('Tai nạn giao thông ngã tư').length).toBeGreaterThanOrEqual(1);
    expect(screen.queryByText('Cứu hộ mắc kẹt thang máy')).not.toBeInTheDocument();
  });

  it('nút Xóa hết bộ lọc khôi phục lại toàn bộ danh sách tức thì bao gồm cả bộ lọc thời gian', async () => {
    const user = userEvent.setup();
    render(<StaffReportsView completedMissions={sampleMissions} onOpenNewReport={vi.fn()} />);

    // Lọc Hôm nay
    const dateSelect = screen.getByLabelText('Lọc theo thời gian');
    await user.selectOptions(dateSelect, 'TODAY');
    expect(screen.queryByText('Tai nạn giao thông ngã tư')).not.toBeInTheDocument();

    // Nút Xóa hết bộ lọc xuất hiện nổi bật
    const clearBtn = screen.getByRole('button', { name: /Xóa hết bộ lọc/ });
    expect(clearBtn).toBeInTheDocument();
    await user.click(clearBtn);

    // Toàn bộ danh sách được khôi phục
    expect(screen.getAllByText('Hỏa hoạn nhà xưởng dệt may').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('Tai nạn giao thông ngã tư')).toBeInTheDocument();
    expect(screen.getByText('Cứu hộ mắc kẹt thang máy')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Xóa hết bộ lọc/ })).not.toBeInTheDocument();
  });

  it('hiển thị thông báo và nút Xóa hết bộ lọc khi không tìm thấy kết quả', async () => {
    const user = userEvent.setup();
    render(<StaffReportsView completedMissions={sampleMissions} onOpenNewReport={vi.fn()} />);

    const searchInput = screen.getByPlaceholderText(/Tìm kiếm mã sự cố, địa chỉ/);
    await user.type(searchInput, 'Không tồn tại từ khóa xyz 9999');

    expect(screen.getByText(/Không tìm thấy hồ sơ báo cáo phù hợp/)).toBeInTheDocument();

    // Bấm nút xóa hết bộ lọc trong empty state
    const clearBtn = screen.getAllByRole('button', { name: /Xóa hết bộ lọc/ })[0];
    await user.click(clearBtn);

    expect(screen.getAllByText('Hỏa hoạn nhà xưởng dệt may').length).toBeGreaterThanOrEqual(1);
  });
});
