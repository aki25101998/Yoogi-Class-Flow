# DATABASE FINAL ARCHITECTURE

## A. Kiến trúc cũ có gì trùng?
Trong kiến trúc cũ (23 file SQL ban đầu):
1. Bảng `coaches` chứa các trường `auth_user_id`, `email`, `name`, `photo_url` bị trùng lặp chức năng với bảng `profiles`.
2. Có hai luồng phân công lớp học là `venue_coaches` (dự kiến ban đầu) và `class_coaches` (mới thêm vào) làm phân mảnh nguồn sự thật.
3. RLS Policies được tạo, xóa và tạo lại qua nhiều file khác nhau (`14_rls_policies`, `16_class_coaches_rls`, `20_fix_profiles_rls`).
4. `accept_invitation` RPC trải qua 4 version (`19`, `21`, `22`, `23`), rác và khó theo dõi.

## B. Những table nào giữ?
1. `profiles`
2. `organizations`
3. `organization_members`
4. `organization_invitations`
5. `coaches`
6. `venues`
7. `venue_classes`
8. `class_coaches`
9. `students`
10. `class_students`
11. `schedules`
12. `attendance`
13. `student_attendance`
14. `teacher_salaries`
15. `teacher_salary_sessions`
16. `tuition`
17. `finance_transactions`

## C. Những column nào bỏ?
1. `coaches.auth_user_id` -> Loại bỏ (sử dụng qua `organization_member_id -> profiles`).
2. `coaches.email` -> Loại bỏ (sử dụng qua `organization_member_id -> profiles`).
3. `coaches.name` -> Loại bỏ (sử dụng qua `organization_member_id -> profiles`).
4. `venue_coaches` -> Đánh dấu LEGACY, không đưa vào architecture mới. (Audit mã cho thấy table không còn được app sử dụng).
5. `student_attendance.records JSONB` -> Vẫn giữ TẠM THỜI trong Phase 1 vì mã frontend (`AttendanceClient.tsx` và `actions.ts`) vẫn phụ thuộc 100% vào JSONB. Nó được Audit nhưng không được xóa ngay để tránh vỡ code.

## D. Những relationship nào thay đổi?
1. Thay vì truy vấn trực tiếp `coaches.auth_user_id = auth.uid()`, toàn bộ sẽ thông qua: 
   `auth.uid() -> profiles.auth_user_id -> organization_members.user_id -> coaches.organization_member_id`
2. `coaches` trở thành một Entity thuần túy về "Coach" (lưu phone, level, cccd) và không còn đóng vai trò "Identity" nữa.
3. Liên kết `coaches` tới các module khác như `class_coaches`, `schedules`, `attendance`, `teacher_salaries` vẫn giữ nguyên qua `coach_id`.

## E. Những RLS nào hợp nhất?
Toàn bộ RLS trong 3 file `14`, `16`, `20` đã được hợp nhất tại `database/rebuild/011_rls.sql`:
1. **Organization Isolation:** Luôn dựa vào `organization_id IN (get_user_organizations())`.
2. **Coach Assignment:** Đối với lớp học và điểm danh học sinh, coach chỉ xem/quản lý được lớp mình phân công thông qua `get_my_class_ids()`.
3. **Profiles:** Có thể được đọc bởi những người cùng organization.

## F. Invitation RPC final architecture
Chỉ còn đúng một function `accept_invitation` tại `database/rebuild/012_invitation.sql`.
Quy trình:
1. `auth.uid()` -> SOURCE OF TRUTH (Lấy meta từ auth.users).
2. Lock row của `organization_invitations` bằng `FOR UPDATE`.
3. Check idempotent.
4. Lấy/tạo `profiles`.
5. Lấy/tạo `organization_members`.
6. Cập nhật `coaches` (loại bỏ việc insert dựa vào email, thay vào đó liên kết qua `organization_member_id`).

## G. Coach identity final architecture
- **auth.users**: Xác thực đăng nhập.
- **profiles**: Chứa thông tin cá nhân (name, email, avatar).
- **organization_members**: Chứa membership của profile vào organization.
- **coaches**: Chứa thông tin chuyên môn của coach, có `UNIQUE(organization_member_id)`.

## H. Student architecture final architecture
- `students`: Quản lý thông tin học sinh độc lập trong organization.
- `class_students`: Bảng trung gian gán học sinh vào `venue_classes`.
- `student_attendance`: Bảng điểm danh (Hiện vẫn giữ records JSONB, cần migration riêng ở Phase sau để chuẩn hóa thành `student_id, class_id, date, status`).

## I. Danh sách SQL mới
Trong `database/rebuild/`:
- `001_core_identity.sql`
- `002_memberships.sql`
- `003_coaches.sql`
- `004_venues.sql`
- `005_classes.sql`
- `006_students.sql`
- `007_schedules.sql`
- `008_attendance.sql`
- `009_payroll.sql`
- `010_finance.sql`
- `011_rls.sql`
- `012_invitation.sql`

## J. Danh sách SQL cũ có thể archive/delete SAU KHI RESET DEV
- Có thể xóa toàn bộ 23 file SQL cũ trong `database/` vì các file trong `rebuild/` hoàn toàn tự chạy được từ số 0.

## K. Rủi ro migration
1. **student_attendance.records**: Frontend vẫn đang map trực tiếp, khi thực sự tách cột phải cập nhật lại UI/API.
2. **Loại bỏ email/name khỏi coaches**: Các file TypeScript (`types/coach.ts`, `services/coaches.service.ts`, `getCurrentCoach.ts`) đang lấy `name` và `email` từ `coaches`. Cần phải Join bảng khi gọi API.

## L. Các bước cần thực hiện để reset database DEV
(CHƯA THỰC HIỆN - THEO YÊU CẦU)
1. Xóa `database/01 -> 23`.
2. Di chuyển `database/rebuild/*.sql` ra `database/`.
3. Cập nhật mã nguồn gọi `coaches` (join với `organization_members` và `profiles`) trước khi thay đổi db.
4. Chạy `supabase db reset` (hoặc push).
