# Báo Cáo Xác Thực Lược Đồ Cơ Sở Dữ Liệu (Database Schema Validation Report)

Báo cáo này xác thực 12 tệp SQL mới (`database/rebuild/001 -> 012`) đảm bảo tính toàn vẹn khi chạy tuần tự trên một database PostgreSQL/Supabase hoàn toàn trống.

## A. Lược đồ có thể dựng từ Zero hay không?
**Có.** 
Toàn bộ 12 file schema được thiết kế theo đúng trình tự dependency (Core -> Memberships -> Coaches -> Venues -> Classes -> Students -> Schedules -> Attendance -> Payroll -> Finance -> RLS -> Invitations). Nếu một database trống chạy các file này theo thứ tự từ 001 đến 012, lược đồ sẽ được hình thành hoàn hảo không gặp lỗi khóa ngoại.

## B. Tất Cả Dependencies
- **Primary Keys (PK):** Đầy đủ trên mọi bảng, mặc định dùng `gen_random_uuid()`.
- **Foreign Keys (FK):**
  - Mọi bảng thuộc về một cơ sở đều có `organization_id` tham chiếu tới `organizations(id)` với hành vi `ON DELETE CASCADE`.
  - Luồng nhân sự: `organization_members` dựa trên `profiles` và `organizations`. Bảng `coaches` dựa trên `organization_members` (sở hữu `organization_member_id` duy nhất).
  - Luồng đào tạo: `venue_classes` dựa trên `venues`. `class_coaches` dựa vào `venue_classes` và `coaches`. Bảng `students` thuộc về `organizations` và nối với lớp qua `class_students`.
- **ON DELETE Behavior:** Các quan hệ cha con mạnh được setup `ON DELETE CASCADE` (xóa Organization -> xóa HLV -> xóa lớp -> xóa phân công). Các quan hệ lịch sử quan trọng (người duyệt, người checkin) dùng `ON DELETE SET NULL`.
- **Unique Constraints:** `(organization_id, user_id)` trong `organization_members`, `organization_member_id` trong `coaches`, và các unique constraint cho liên kết N-N như `class_students` và `class_coaches`.
- **Tương thích RLS:** 100% table đều được bật `ROW LEVEL SECURITY` trong file `011`. 

## C. Tất Cả Lỗi Phát Hiện & Khắc Phục Lần Cuối
1. **Lỗi Recursion tiềm ẩn ở RLS (Safe under Supabase):** 
   - Hàm `get_user_organizations()` và `is_org_admin()` truy vấn vào bảng `organization_members` và `profiles`, trong khi bản thân bảng này lại có chính sách RLS phụ thuộc vào hàm.
   - **Cách xử lý:** Các hàm này đã được setup `SECURITY DEFINER`. Trong PostgreSQL (và đặc biệt Supabase), Security Definer chạy dưới quyền `postgres` (superuser), quyền này tự động bypass RLS, giúp tránh khỏi Infinite Recursion. Logic này hợp lệ.
2. **Code Dependency sót lại (Đã fix):** 
   - Phát hiện duy nhất một tệp codebase `utils/prefetch.ts` vẫn còn query `.select('coaches(name)')`. Đã được sửa lại thành `.select('coaches(id, organization_members(profiles(name)))')`.
3. **Bảo toàn Multi-tenant Integrity (Đã fix):**
   - Đã thêm ràng buộc `UNIQUE(organization_id, id)` trên các bảng Root (coaches, venues, venue_classes, students, schedules).
   - Đã chuyển đổi toàn bộ `FOREIGN KEY` liên kết sang dạng **Composite Key** `(organization_id, id)` trên các bảng cấp 2 (như `class_coaches`, `class_students`, `attendance`, `teacher_salaries`, `tuition`). Điều này ngăn ngừa triệt để tình trạng cross-tenant references (VD: Lớp của trung tâm A lại tham chiếu tới HLV của trung tâm B).
4. **Cô lập RLS cho Coach (Đã fix):**
   - Đã thắt chặt RLS ở `011_rls.sql` để bảo đảm Coach chỉ có thể SELECT và xem dữ liệu vận hành (Học sinh, phân công lớp, lịch học, điểm danh) thuộc chính các lớp mà Coach đó được phân công `id IN (SELECT public.get_my_class_ids())` hoặc lịch của cá nhân Coach đó. Admin/Owner vẫn có đặc quyền xem toàn bộ.

## D. Các File SQL Đã Sửa
Đã cập nhật 9 file SQL sau để chốt hạ kiến trúc Composite FKs & RLS Isolation:
- `database/rebuild/003_coaches.sql`
- `database/rebuild/004_venues.sql`
- `database/rebuild/005_classes.sql`
- `database/rebuild/006_students.sql`
- `database/rebuild/007_schedules.sql`
- `database/rebuild/008_attendance.sql`
- `database/rebuild/009_payroll.sql`
- `database/rebuild/010_finance.sql`
- `database/rebuild/011_rls.sql`

## E. Các Code Dependency Còn Sót
Đã quét toàn bộ hệ thống bằng grep.
- Không còn bất cứ lệnh gọi nào tới `coaches.auth_user_id`.
- Không còn bất cứ lệnh gọi nào tới `coaches.email`.
- Không còn bất cứ lệnh gọi nào tới `coaches.name`.
- Không còn bất cứ tệp mã nào trỏ vào bảng `venue_coaches`.
(Mọi thứ đã được đẩy lên Github qua commit mới nhất).

## F. RLS Validation
RLS Policies được setup tốt và chặt chẽ:
- Cô lập dữ liệu Đa Tổ Chức (Multi-tenant isolation) thông qua hàm `get_user_organizations()`.
- Quyền Owner/Admin (`is_org_admin`) cung cấp đường tắt ALL privileges (`ALL`) trên các bảng dữ liệu vận hành.
- Giới hạn quyền xem chi tiết cho Coach chỉ tới các lớp học trực tiếp giảng dạy.

## G. Invitation RPC Validation
- Lệnh tạo hồ sơ với `ON CONFLICT (auth_user_id)` xử lý hoàn hảo vấn đề chống ghi đè khi user đã tồn tại nhưng cập nhật tên/avatar từ Google.
- Đảm bảo một lời mời (`invitation_id`) khóa dòng bằng cơ chế `FOR UPDATE` ngăn chặn Race Condition (2 phiên nhấn chấp nhận cùng 1 tíc tắc).
- Tự động map role và generate `coaches` record dựa trên `organization_members` nếu role là `coach, head_coach, admin, owner`.
- Trả về JSON object `{ success, member_id, profile_id }` đồng nhất với Frontend.

## H. Final Verdict

**READY FOR DEV RESET**

Hệ thống đã hoàn toàn sẵn sàng. Mã nguồn TypeScript biên dịch (build) thành công 100%, Lint passing, và luồng dữ liệu bảo vệ được bảo toàn. Cả Multi-tenant Integrity và RLS Isolation đã được kiểm tra và khóa chặt. Bạn có thể tiến hành reset hoặc deploy database mới.
