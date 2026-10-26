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
    case 'Pending':
    case 'AiProcessing':
    case 'AiProcessed':
    default:
      return i18n.t('citizen.reports.status.pending');
  }
}

