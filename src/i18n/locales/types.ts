/** Cùng cấu trúc với từ điển tiếng Việt, mọi lá là string — bản dịch thiếu / thừa key sẽ báo lỗi TypeScript. */
export type Messages<T> = { [K in keyof T]: T[K] extends string ? string : Messages<T[K]> };
