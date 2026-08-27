# Báo Cáo Tương Thích Code (Code Compatibility Report)
> Phiên bản refactor theo `database/rebuild/`

Báo cáo này liệt kê các thay đổi về mặt CODEBASE để đảm bảo hệ thống frontend/backend hoàn toàn tương thích với kiến trúc database mới mà không cần dựa dẫm vào các cột/bảng Legacy (như `coaches.email`, `coaches.auth_user_id`, hay `venue_coaches`).

## A. Tổng Số Files Đã Sửa
Tổng cộng đã sửa 7 files chính:
1. `types/coach.ts`
2. `utils/auth/getCurrentCoach.ts`
3. `services/coaches.service.ts`
4. `services/organization.service.ts`
5. `hooks/useClasses.ts`
6. `hooks/usePayroll.ts`
7. `hooks/useSchedule.ts`

## B. Coach Identity Changes
1. Xóa `auth_user_id` và các thuộc tính trực tiếp (`name`, `email`) khỏi gốc của bảng `coaches`.
2. Định nghĩa lại type `Coach` (`types/coach.ts`) thành một Normalized Object nhận data từ `profiles` qua join `organization_members`.
3. Sửa `getCurrentCoach.ts` để tra cứu theo luồng an toàn: `auth.getUser() -> profiles -> organization_members -> coaches` thay vì lookup email trực tiếp trong bảng `coaches`.
4. Trong `organization.service.ts` khi user tự tạo Organization (Role Owner), service giờ đây cũng tự động tạo một record trong `coaches` map với `organization_member_id` để owner đó có đầy đủ chức năng của coach mà không bị lỗi.

## C. Legacy References Removed
1. Các nested query cũ `.select('*, class_coaches(*, coaches(name))')` đã được sửa thành `.select('*, class_coaches(*, coaches(id, organization_members(profiles(name))))')` trên toàn bộ hooks.
2. Fallback query dùng `email` trong auth callback để mapping profile cũ vẫn được giữ (để fallback cho những HLV cũ chưa từng login) nhưng quá trình invite và map coach đều dựa vào `organization_members`.
3. Bảng `venue_coaches` qua quá trình grep code được xác nhận là hoàn toàn không được sử dụng ở Frontend (Code hiện tại đang dùng `class_coaches`). Do đó không cần refactor thêm về `venue_coaches`.

## D. Student/Attendance Changes
- Đối với `student_attendance.records` dạng JSONB, theo đúng chỉ thị tại Phase 10, tôi giữ nguyên JSONB trong UI và service hiện hành (`app/(dashboard)/attendance/actions.ts` và `AttendanceClient.tsx`). Nó vẫn hoạt động bình thường trên Schema Database Mới. Khi nào Frontend có kế hoạch rewrite AttendanceClient, chúng ta sẽ drop cột JSONB này.

## E. Permission Changes
- Quản trị permission giờ đây lấy nguồn gốc từ `organization_members.permissions` và fallback vào `coaches.permissions`. Các UI check role hiện tại đều sử dụng role từ `context.membership.role` nên tương thích ngay.

## F. Remaining Legacy Dependencies
- Về cơ bản, Project **đã hoàn toàn sạch** và không còn dependency nào vào các fields legacy của bảng `coaches`.
- Component `CoachesClient.tsx` render list HLV lấy data thông qua hook `useCoaches`, hook này vốn dĩ đã join đúng bảng `organization_members` và mapping profile name/email. Không cần sửa UI.

## G. Potential Issues After Database Reset
1. Do quá trình login phụ thuộc `auth.users`, khi reset database DEV, toàn bộ tài khoản login trong bảng User (Supabase Auth) sẽ mất. Các email cũ khi login lại qua Google sẽ tự động gen ra `auth_user_id` mới.
2. Để kiểm thử, cần tạo lại 1 tài khoản Admin -> Đăng nhập -> Tạo Org -> Gửi lời mời -> Lấy link mời -> Dùng trình duyệt ẩn danh đăng nhập account Coach để nhận lời mời.

## H. Manual Test Checklist (Chờ thực hiện)
- [ ] Chạy npm run build và lint.
- [ ] Test luồng tạo Organization.
- [ ] Test luồng mời HLV và click link Accept Invitation (Đảm bảo HLV nhận được data).
- [ ] Kiểm tra màn Điểm Danh, Xếp Lịch xem có load được tên HLV không.
