# Test Strategy & Foundation

Để đảm bảo dự án hoạt động ổn định và an toàn, chúng ta cần triển khai các bộ test tự động.

## 1. Công nghệ đề xuất
- **Unit & Integration Tests**: `Jest` hoặc `Vitest`.
- **E2E Tests**: `Playwright` (Phù hợp cho Next.js).

## 2. Các test case bắt buộc (Critical Paths)

### Authentication
- Đăng nhập thành công với Google OAuth.
- Truy cập khi session hết hạn.
- Đăng xuất thành công và xóa cookie.

### Authorization & Permission
- Admin truy cập Dashboard Quản lý (Thành công).
- Coach truy cập Dashboard Quản lý (Bị từ chối / Redirect).
- Helper `requirePermission` kiểm tra đúng dựa trên mảng JSONB.

### Row Level Security (RLS)
- Admin query `select * from coaches` -> Trả về tất cả.
- Coach query `select * from coaches` -> Chỉ trả về bản ghi của chính họ.
- Bị chặn (Policy check failed) khi cố gắng sửa điểm danh không phải của mình.

### Logic Nghiệp vụ Core
- **Attendance**: Điểm danh hợp lệ, chống duplicate.
- **Payroll**: Tính lương theo session và tỷ lệ.
- **Finance**: Ghi nhận Transaction chính xác.
