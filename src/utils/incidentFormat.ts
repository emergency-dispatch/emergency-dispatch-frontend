import i18n, { dateLocale } from '../i18n';

/** 0981234456 → 098***456 (FR-OP-03: che số điện thoại người báo). */
export function maskPhone(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  if (digits.length < 7) return phone;
  return `${digits.slice(0, 3)}***${digits.slice(-3)}`;
}

/** Số giây còn lại → "1:45". */
export function formatCountdown(remainingMs: number): string {
  const total = Math.max(0, Math.ceil(remainingMs / 1000));
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`;
}

/**
 * Thời gian chờ dễ đọc thay cho "5024 phút trước":
 * 45 giây → "Vừa xong", 12 phút → "12 phút", 3 giờ 5 phút → "3 giờ 5 phút", 3 ngày 11 giờ → "3 ngày 11 giờ".
 */
export function formatWaitDuration(elapsedMs: number): string {
  const minutes = Math.max(0, Math.floor(elapsedMs / 60000));
  if (minutes < 1) return i18n.t('common.duration.justNow');
  if (minutes < 60) return i18n.t('common.duration.minutes', { m: minutes });

  const hours = Math.floor(minutes / 60);
  if (hours < 24) {
    const restMinutes = minutes % 60;
    return restMinutes
      ? i18n.t('common.duration.hoursMinutes', { h: hours, m: restMinutes })
      : i18n.t('common.duration.hours', { h: hours });
  }

  const days = Math.floor(hours / 24);
  const restHours = hours % 24;
  return restHours
    ? i18n.t('common.duration.daysHours', { d: days, h: restHours })
    : i18n.t('common.duration.days', { d: days });
}

/** Thời điểm tuyệt đối cho tooltip: "22/10/2026 23:41". */
export function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString(dateLocale(), {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export interface IncidentVisualMeta {
  category: 'fire' | 'accident' | 'other';
  label: string;
  icon: string;
  badgeClass: string;
}

export function getIncidentVisualMeta(incident?: {
  title?: string;
  description?: string;
  status?: string;
  eventType?: string | null;
  aiClassification?: {
    eventType?: string | null;
    incidentType?: string | null;
    summary?: string | null;
    hazardTags?: string[] | null;
    isSuccess?: boolean | null;
  } | null;
} | null): IncidentVisualMeta {
  if (!incident) {
    return {
      category: 'other',
      label: i18n.t('citizen.reports.incidentTypes.sosSignal'),
      icon: '',
      badgeClass: 'bg-rose-50 text-rose-700 border-rose-200',
    };
  }

  // 1. Ưu tiên loại sự cố đã được Backend / AI xác định rõ ràng (EventType từ DB hoặc AiClassification)
  const eventType = incident.eventType || incident.aiClassification?.eventType;
  const aiType = incident.aiClassification?.incidentType;

  if (eventType === 'FireExplosion' || aiType === 'fire') {
    return {
      category: 'fire',
      label: i18n.t('citizen.reports.incidentTypes.fire'),
      icon: '',
      badgeClass: 'bg-red-50 text-red-700 border-red-200',
    };
  }

  if (eventType === 'TrafficAccident' || aiType === 'accident') {
    return {
      category: 'accident',
      label: i18n.t('citizen.reports.incidentTypes.accident'),
      icon: '',
      badgeClass: 'bg-amber-50 text-amber-800 border-amber-200',
    };
  }

  // 2. Nhận diện nếu AI phân tích thành công và có thẻ nguy cơ rõ ràng
  if (incident.aiClassification?.isSuccess) {
    const tags = (incident.aiClassification.hazardTags || []).map((t) => t.toLowerCase());
    if (tags.some((t) => /fire|smoke|cháy|nổ/.test(t))) {
      return {
        category: 'fire',
        label: i18n.t('citizen.reports.incidentTypes.fire'),
        icon: '',
        badgeClass: 'bg-red-50 text-red-700 border-red-200',
      };
    }
    if (tags.some((t) => /accident|crash|traffic|va chạm|tai nạn/.test(t))) {
      return {
        category: 'accident',
        label: i18n.t('citizen.reports.incidentTypes.accident'),
        icon: '',
        badgeClass: 'bg-amber-50 text-amber-800 border-amber-200',
      };
    }
  }

  // 3. Chưa biết rõ loại sự cố (chờ AI/Operator xác nhận) -> Chỉ hiện Tín hiệu SOS
  return {
    category: 'other',
    label: i18n.t('citizen.reports.incidentTypes.sosSignal'),
    icon: '',
    badgeClass: 'bg-rose-50 text-rose-700 border-rose-200',
  };
}

/** Định dạng trạng thái sự cố thân thiện cho Citizen, không hiển thị các enum kỹ thuật (AiProcessing/Pending). */
export function formatCitizenIncidentStatus(status?: string | null): string {
  switch (status) {
    case 'Dispatched':
      return i18n.t('citizen.reports.status.dispatched');
    case 'InProgress':
      return i18n.t('citizen.reports.status.inProgress');
    case 'Verified':
      return i18n.t('citizen.reports.status.verified');
    case 'Completed':
    case 'Resolved':
      return i18n.t('citizen.reports.status.completed');
    case 'Cancelled':
      return i18n.t('citizen.reports.status.cancelled');
    case 'Linked':
      return i18n.t('citizen.reports.status.linked');
    case 'Pending':
    case 'AiProcessing':
    case 'AiProcessed':
    default:
      return i18n.t('citizen.reports.status.pending');
  }
}

/** Định dạng trạng thái điều phối xe cho Citizen, tránh rơi nhầm về "Đang điều động" khi đã hoàn thành/hủy. */
export function formatCitizenDispatchStatus(dispatchStatus?: string | null): string {
  switch (dispatchStatus) {
    case 'OnScene':
      return i18n.t('citizen.reports.statusOnScene');
    case 'EnRoute':
      return i18n.t('citizen.reports.statusEnRoute');
    case 'Accepted':
      return i18n.t('citizen.reports.statusMissionAccepted');
    case 'Completed':
      return i18n.t('citizen.reports.status.completed').toUpperCase();
    case 'Cancelled':
      return i18n.t('citizen.reports.status.cancelled').toUpperCase();
    case 'PendingDispatch':
      return i18n.t('citizen.reports.status.pending').toUpperCase();
    default:
      return i18n.t('citizen.reports.statusDispatching');
  }
}

/** Ưu tiên trạng thái tiến độ xe thực tế (`dispatchStatus`) khi sự cố đang được điều phối/cứu hộ. */
export function resolveCitizenLiveStatusLabel(
  incidentStatus?: string | null,
  dispatchStatus?: string | null
): string {
  const isActiveDispatch = incidentStatus === 'Dispatched' || incidentStatus === 'InProgress';
  if (
    isActiveDispatch &&
    dispatchStatus &&
    dispatchStatus !== 'Completed' &&
    dispatchStatus !== 'Cancelled' &&
    dispatchStatus !== 'PendingDispatch'
  ) {
    return formatCitizenDispatchStatus(dispatchStatus);
  }
  return formatCitizenIncidentStatus(incidentStatus).toUpperCase();
}

export const isAudioMediaUrl = (url?: string | null): boolean => {
  if (!url) return false;
  const lower = url.toLowerCase().split('?')[0];
  return (
    lower.includes('/emergency_dispatch/audio/') ||
    lower.includes('/video/authenticated/') ||
    /\.(m4a|mp3|aac|wav|ogg|opus|weba)$/.test(lower)
  );
};

export const isVideoMediaUrl = (url?: string | null): boolean =>
  Boolean(url && !isAudioMediaUrl(url) && /\.(mp4|mov|webm)$/.test(url.toLowerCase().split('?')[0]));

export function getFirstIncidentPhotoUrl(
  mediaItems?: Array<{ mediaUrl?: string | null; mediaType?: string | number | null }> | null
): string | null {
  const found = (mediaItems || []).find(
    (m) =>
      Boolean(m?.mediaUrl) &&
      String(m?.mediaType) !== 'Audio' &&
      m?.mediaType !== 2 &&
      String(m?.mediaType) !== 'Video' &&
      m?.mediaType !== 1 &&
      !isAudioMediaUrl(m?.mediaUrl) &&
      !isVideoMediaUrl(m?.mediaUrl)
  );
  return found?.mediaUrl || null;
}

export const isGuid = (val?: string | null): boolean =>
  typeof val === 'string' &&
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(val.trim());

/**
 * Rút gọn ID tác chiến / sự cố / nhiệm vụ hiển thị trên giao diện:
 * Nếu là GUID dài (36 ký tự) -> chỉ lấy 8 ký tự đầu viết hoa, ví dụ: "64da9ab4-da11-..." -> "#64DA9AB4"
 * Nếu có mã sự cố ngắn như "INC-0012" -> "#INC-0012"
 */
export function formatShortId(id?: string | null, prefix = '#'): string {
  if (!id) return '';
  const clean = id.trim().replace(/^#/, '');
  if (!clean) return '';
  if (clean.toUpperCase().startsWith('INC-')) {
    return `${prefix}${clean.toUpperCase()}`;
  }
  if (isGuid(clean) || clean.length >= 32) {
    const firstBlock = clean.split('-')[0] || clean.slice(0, 8);
    return `${prefix}${firstBlock.slice(0, 8).toUpperCase()}`;
  }
  return `${prefix}${clean}`;
}

/**
 * Chuẩn hóa vai trò nhân viên / thành viên tổ cứu hộ từ mã backend enum sang tiếng Việt người dùng dễ hiểu:
 * Rescuer -> Chiến sĩ cứu hộ, Driver -> Lái xe, Medic -> Y sĩ cấp cứu,
 * Commander / Leader -> Chỉ huy kíp, Firefighter -> Chiến sĩ cứu hỏa,
 * RescueStaff -> Cán bộ cứu hộ, Operator -> Điều phối viên, Admin -> Quản trị viên.
 */
export function formatCrewRole(role?: string | null): string {
  if (!role || !role.trim()) return '';
  const key = role.trim().toLowerCase();
  switch (key) {
    case 'rescuer':
      return 'Chiến sĩ cứu hộ';
    case 'driver':
      return 'Lái xe';
    case 'medic':
      return 'Y sĩ cấp cứu';
    case 'commander':
    case 'leader':
    case 'teamleader':
      return 'Chỉ huy kíp';
    case 'firefighter':
      return 'Chiến sĩ cứu hỏa';
    case 'rescuestaff':
      return 'Cán bộ cứu hộ';
    case 'operator':
      return 'Điều phối viên';
    case 'admin':
      return 'Quản trị viên';
    case 'citizen':
      return 'Người dân';
    default:
      return role.trim();
  }
}


