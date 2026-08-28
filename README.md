# Yoogi Class Flow

Yoogi Class Flow là hệ thống quản lý trung tâm/lớp học toàn diện, được thiết kế đặc biệt để tối ưu hóa quy trình vận hành từ việc xếp lịch học, quản lý học viên, huấn luyện viên, đến điểm danh và tính toán lương/học phí tự động.

## Các Tính Năng Cốt Lõi

1. **Quản Lý Tổ Chức & Người Dùng**
   - Hỗ trợ đa tổ chức (multi-tenancy) với Supabase RLS.
   - Phân quyền chi tiết: Owner, Admin, Coach.

2. **Quản Lý Học Viên & Lớp Học**
   - Tạo, sửa, xóa học viên và lớp học.
   - Đăng ký học viên vào lớp.
   - Quản lý địa điểm học (Venues).

3. **Lịch Học & Buổi Học Thực Tế (Session Manager)**
   - Quản lý lịch học định kỳ (Schedule).
   - Tự động sinh danh sách buổi học trong ngày.
   - Hỗ trợ hủy buổi, đổi Huấn luyện viên (HLV) dạy thay với logic Session độc lập.

4. **Điểm Danh (Attendance)**
   - HLV check-in trước khi dạy.
   - Điểm danh học viên chi tiết (Có mặt, Vắng, Có phép) với ghi chú.
   - Hỗ trợ nút "Tất cả có mặt" tiện dụng.

5. **Lương HLV & Payroll**
   - Cấu hình lương linh hoạt: Lương cơ bản theo buổi + Thưởng theo số lượng học viên có mặt.
   - Màn hình duyệt lương tự động dựa trên dữ liệu điểm danh.
   - Thanh toán và lưu trữ lịch sử nhận lương.

6. **Tài Chính & Học Phí (Finance & Tuition)**
   - Quản lý các khoản thu học phí, cho phép thanh toán toàn phần hoặc từng phần.
   - Theo dõi tổng Thu - Chi - Lợi nhuận của trung tâm.
   - Đảm bảo tính minh bạch và Validate chặt chẽ dữ liệu tài chính.

## Công Nghệ Sử Dụng

- **Frontend:** Next.js (App Router), React, Tailwind CSS (nếu có) / Vanilla CSS (hiện tại), Supabase Auth Helpers.
- **Backend/Database:** Supabase (PostgreSQL) với Row Level Security (RLS) bảo mật tuyệt đối.
- **State Management & Data Fetching:** React Query (@tanstack/react-query).

## Kiến Trúc Database & Schema Core

- `organizations`, `organization_members`, `profiles`: Quản lý tài khoản và phân quyền.
- `students`, `venues`, `venue_classes`, `class_students`: Quản lý thực thể lớp, phòng tập, học viên.
- `schedules`, `teacher_salary_sessions`: Quản lý lịch học định kỳ và các buổi học (ngoại lệ, check-in, hủy).
- `student_attendance`: Lưu trữ kết quả điểm danh JSONB.
- `teacher_salaries`: Cấu hình lương HLV.
- `tuition`, `finance_transactions`: Quản lý học phí và sổ quỹ.

## Hướng Dẫn Phát Triển

Dự án ưu tiên tái sử dụng components (`src/app/components/ui/`) và hooks (trong `hooks/`), giao tiếp với Backend qua Server Actions (`actions.ts`) kết hợp `useQuery` trên client. Các thay đổi database cần kèm theo SQL Migration.

1. `npm install`
2. Cấu hình biến môi trường Supabase trong `.env.local`
3. Chạy môi trường dev: `npm run dev`
