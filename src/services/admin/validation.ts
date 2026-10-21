// Quy tắc kiểm tra dữ liệu dùng chung cho các màn Admin.

/** Lý do khóa / gỡ chặn / gia hạn tối thiểu 5 ký tự (giống lý do ghi đè AI bên Operator). */
export const REASON_MIN_LENGTH = 5;

export const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Số di động Việt Nam 10 chữ số, bắt đầu bằng 0. */
export const PHONE_PATTERN = /^0\d{9}$/;

/** Backend (CreateUserDto) yêu cầu mật khẩu tối thiểu 6 ký tự. */
export const PASSWORD_MIN_LENGTH = 6;
