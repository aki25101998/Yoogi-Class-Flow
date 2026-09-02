# DATABASE FINAL ARCHITECTURE

## A. Core Entity Architecture
1. **auth.users**: Xác thực đăng nhập (Supabase built-in).
2. **profiles**: Chứa thông tin cá nhân (name, email, avatar).
3. **organizations**: Workspace gốc cho multi-tenant.
4. **organization_members**: Chứa membership và role của profile trong organization (admin, owner, coach).
5. **organization_invitations**: Lời mời tham gia org.
6. **organization_version_counters**: Bộ đếm phiên bản cho Undo/Redo.
7. **version_history / version_changes**: Lưu lịch sử thay đổi để phục hồi.

## B. Coach Identity Architecture
- **coaches**: Chứa thông tin chuyên môn của coach (phone, level, cccd, membership_number).
- Liên kết: `coaches` -> `organization_members` -> `profiles`.
- Không chứa `email` hay `name` trực tiếp để tránh trùng lặp dữ liệu.
- Được bảo vệ bởi Composite Foreign Keys: `UNIQUE(organization_id, id)`.

## C. Class & Schedule Architecture
- **venues**: Địa điểm học.
- **venue_classes**: Lớp học (thuộc về 1 venue).
- **class_coaches**: Bảng trung gian phân công HLV vào lớp. 
  - Business Rule: `UNIQUE(class_id)` WHERE `role = 'HEAD_COACH'` (Chỉ 1 HLV trưởng mỗi lớp).
- **schedules**: Lịch học định kỳ.
- **class_sessions**: Buổi học cụ thể (tạo ra từ schedules hoặc tạo thủ công).
  - Business Rule: State machine `status` (scheduled -> checked_in -> approved -> paid).

## D. Student & Attendance Architecture
- **organization_belts**: Quản lý cấp đai tùy chỉnh theo tổ chức.
- **students**: Thông tin học viên (có tham chiếu đến `current_belt_id` và `venue_id` gốc).
- **class_students**: Bảng trung gian gán học viên vào lớp (`status`: active/dropped).
- **student_session_attendance**: Bảng điểm danh chi tiết từng học viên cho từng buổi học (`class_sessions`).

## E. Finance & Salary Architecture
- **tuition**: Học phí của học viên (`status`: unpaid, partial, paid).
- **finance_transactions**: Thu chi tổng hợp.
  - Business Rule: `source_type` ('MANUAL', 'TUITION_PAYMENT', 'PAYROLL_PAYMENT'). Giao dịch hệ thống không thể bị xóa thủ công.
- **salary_rules**: Quy tắc tính lương (lớp, HLV, cấp độ).
- **salary_rule_tiers**: Bậc lương theo số học sinh.
- **salary_profiles**: Gán quy tắc lương mặc định cho HLV.
- **salary_adjustments**: Phụ cấp/khấu trừ lương (`status`: pending, approved, rejected).
- **payroll_periods**: Kỳ lương tháng.
- **payroll_payments**: Thanh toán lương tổng.
- **payroll_payment_sessions**: Ánh xạ thanh toán lương với từng buổi học (`class_sessions`).
- **salary_audit_logs**: Nhật ký thay đổi cấu hình lương.

## F. Security & Integrity (Hardening 028)
- **Multi-tenant Isolation**: 100% các bảng liên kết sử dụng Composite Foreign Keys `(organization_id, id)` để đảm bảo DB không bao giờ cho phép cross-tenant reference.
- **Atomic Operations**: Thanh toán học phí (tuition + finance) được bọc trong RPC `record_tuition_payment` với `FOR UPDATE` lock.
- **Status Constraints**: Tất cả các trường `status` và `role` đều có `CHECK` constraints (Enum at DB level).
- **RLS**: Mọi bảng đều có Row Level Security dựa trên `organization_id`. `version_changes` được bảo vệ admin-only.

## G. Restore & Undo System
- Các thao tác `CREATE/UPDATE/DELETE/IMPORT` đều được ghi log vào `version_history`.
- Hàm `restore_record_to_state` sử dụng whitelist động và loại trừ các cột sinh hệ thống (id, created_at, sequence_id) để đảm bảo an toàn phục hồi.

## H. Danh sách SQL Migration (Final)
Thứ tự các file trong `database/rebuild/`:
- `001` - `010`: Bảng cơ sở
- `011_rls.sql`: Row Level Security
- `012_invitation.sql`: Lời mời
- `013_undo_redo_schema.sql`: Restore system
- `014` - `020`: Feature updates (venue, avatar, history view)
- `021` - `025`: Hardening and fixes (RLS history, sequence, unique index)
- `026_import_functions.sql`: Import logic
- `027_fix_organization_belts_rls.sql`: Fix missing RLS
- `028_production_integrity_hardening.sql`: Master Production Hardening (Composite FKs, Constraints, Atomic RPC)
