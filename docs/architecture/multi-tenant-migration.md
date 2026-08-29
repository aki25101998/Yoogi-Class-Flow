# Kiến trúc Migration: Multi-tenant SaaS (Phase 0)

Tài liệu này mô tả chi tiết kiến trúc hiện tại, kiến trúc mới, và chiến lược migration để chuyển đổi Yoogi Class Flow từ mô hình Single-tenant (1 hệ thống = 1 nhóm HLV) sang Multi-tenant (1 nền tảng = nhiều Organization).

## 1. Kiến trúc hiện tại (Single-tenant)

### 1.1 Authentication & Identity
- Sử dụng Supabase Auth (`auth.users`) với Google OAuth.
- Bảng `coaches` đóng cả 2 vai trò:
  - User account (lưu `email`, `role`, `permissions`, `auth_user_id`).
  - Coach profile (lưu `name`, `phone`, `cccd`, `level`, `membership_number`, `photo_url`).
- Việc phân quyền (Authorization) và xác định User Identity dựa trên `auth_user_id` và fallback về `email` (`utils/auth/getCurrentCoach.ts`).

### 1.2 Phân quyền (Roles & Permissions)
- Role được gán cứng vào bảng `coaches` (`role`, `permissions`).
- Có 1 người đầu tiên tạo tài khoản sẽ được hard-code gán role `admin` trong `app/auth/callback/route.ts`.
- RLS Policy (`database/10_rls_policies.sql`) dùng hàm `is_admin()` check role `admin` trong bảng `coaches` với `auth_user_id = auth.uid()`.

### 1.3 Dependency của `coach_id`
Bảng `coaches` hiện đang là trung tâm của database, được tham chiếu bằng Foreign Key bởi rất nhiều bảng khác:
- `schedules.coach_id`
- `venue_coaches.coach_id`
- `attendance.coach_id`, `check_in_by`, `approved_by`, `original_coach_id`
- `teacher_salaries.coach_id`
- `teacher_salary_sessions.coach_id`, `check_in_by`, `approved_by`, `rejected_by`

---

## 2. Kiến trúc mới (Multi-tenant)

### 2.1 Các bảng sẽ được thêm mới

1. **`organizations`**
   - Định nghĩa một khách hàng (trung tâm, câu lạc bộ).
   - Chứa `id`, `name`, `owner_id`, thông tin subscription.
   - Tuyệt đối cô lập dữ liệu giữa các organizations.

2. **`profiles`** (hoặc tái sử dụng `users` nếu đã có)
   - Lưu thông tin định danh toàn hệ thống của người dùng (ứng với 1 Google Account).
   - Chứa `id`, `auth_user_id` (Unique, FK to `auth.users`), `email`, `name`, `avatar_url`.

3. **`organization_members`**
   - Map n-n giữa `profiles` và `organizations`.
   - Lưu role và permissions của user ĐỐI VỚI organization cụ thể.
   - Chứa `id`, `organization_id`, `user_id` (FK tới `profiles`), `role`, `status`, `permissions`.
   - Một người có thể là Admin ở Org A, nhưng là Coach ở Org B.

4. **`organization_invitations`**
   - Quản lý lời mời tham gia Organization.
   - Chứa `id`, `organization_id`, `email`, `role`, `status`, `invited_by`.

### 2.2 Sự thay đổi của bảng `coaches` (Coach Profile)
- Bảng `coaches` không còn dùng để định danh đăng nhập.
- Sẽ trở thành **Coach Profile** đại diện cho hồ sơ chuyên môn của HLV trong một Organization cụ thể.
- Thêm các cột:
  - `organization_id UUID REFERENCES organizations(id)`
  - `organization_member_id UUID REFERENCES organization_members(id)`
- Cột `email`, `role`, `permissions` trong `coaches` sẽ trở thành dạng legacy hoặc sync từ `organization_members`.

---

## 3. Chiến lược Migration (Migration Strategy)

### 3.1 Migration Database (An toàn, không mất dữ liệu)
1. **Bật UUID extension** và các extension cần thiết (đã có `gen_random_uuid()`).
2. **Tạo 4 bảng mới**: `organizations`, `profiles`, `organization_members`, `organization_invitations`.
3. **Thêm column `organization_id` và `organization_member_id`** vào bảng `coaches` (Nullable lúc đầu).
4. **Data Migration Script**:
   - Tạo một Organization mặc định: "Legacy Organization" (hoặc lấy tên admin đầu tiên).
   - Clone tất cả `coaches` sang bảng `profiles` (dựa trên `auth_user_id` hoặc `email`).
   - Gán chủ sở hữu (Owner) của Legacy Org cho người có role `admin` cũ.
   - Tạo record trong `organization_members` cho TẤT CẢ `coaches` hiện tại, map vào Legacy Org, copy `role` và `permissions` cũ sang.
   - Cập nhật lại bảng `coaches` gán `organization_id` và `organization_member_id`.
5. **Cập nhật Constraints**:
   - Đặt `organization_id` trên bảng `coaches` thành `NOT NULL`.
   - (Tuỳ chọn) Đưa `organization_id` vào các bảng nghiệp vụ khác (venues, classes, schedules) để phân tách tenant ở cấp RLS.

### 3.2 Migration Application & Auth Flow
1. **Viết lại flow Auth (`app/auth/callback/route.ts`)**:
   - Khi login thành công -> Upsert vào bảng `profiles`.
   - Kiểm tra xem email có trong `organization_invitations` không -> Nếu có, chuyển hướng trang Accept Invite.
   - Nếu không có invite, kiểm tra xem có thuộc `organization_members` nào không.
     - Nếu không thuộc Org nào -> Chuyển hướng trang "Tạo Organization mới" (User trở thành Owner).
     - Nếu có -> Đăng nhập vào Org đó (hoặc chọn Org nếu thuộc nhiều Org).
2. **Cập nhật `getCurrentCoach.ts` và `requirePermission.ts`**:
   - Thay vì query thẳng `coaches` bằng email, query `profiles` -> `organization_members` -> `coaches`.
   - Sửa logic kiểm tra permission để dựa vào `organization_members.permissions` thay vì `coaches.permissions`.
3. **Cập nhật RLS Policies (`10_rls_policies.sql`)**:
   - Đổi `is_admin()` thành check role trong `organization_members` với `organization_id` hiện tại.
   - RLS của TẤT CẢ các bảng phải có điều kiện kiểm tra `organization_id` (nếu thêm `organization_id` vào các bảng) hoặc thông qua liên kết (ví dụ: `coach_id IN (SELECT id FROM coaches WHERE organization_id = current_org_id)`).

---

## 4. Rủi ro và Cách giải quyết (Risks & Mitigations)

- **Rủi ro 1: Mất dữ liệu chấm công và lương của HLV.**
  - *Giải quyết*: Tuyệt đối KHÔNG xóa bảng `coaches`. Chỉ thêm cột và thay đổi vai trò của nó. Mọi Foreign Key (`coach_id`) trong `attendance` và `teacher_salaries` vẫn giữ nguyên.
- **Rủi ro 2: Lỗi Frontend khi cấu trúc auth thay đổi.**
  - *Giải quyết*: Sẽ tạo một layer tương thích (Compatibility Layer) trong `getCurrentCoach.ts` sao cho nó vẫn trả về object có cấu trúc `{ user, coach }` như cũ, chứa đủ `role` và `permissions` từ `organization_members`, giúp UI không bị break.
- **Rủi ro 3: Bị rò rỉ dữ liệu giữa các Organization (Cross-tenant data leak).**
  - *Giải quyết*: RLS phải được kích hoạt mạnh mẽ. Phải đảm bảo có một function hoặc JWT custom claim lưu `current_organization_id` để RLS có thể so sánh.

## 5. Kế hoạch triển khai (Phases)
- **Phase 0:** Audit (Đã hoàn thành, đây là báo cáo).
- **Phase 1:** Triển khai Database Multi-tenant (Tạo bảng mới, Data Migration Script).
- **Phase 2:** Cập nhật Auth Flow, Profile & Invites.
- **Phase 3:** Refactor RLS & API Layer.
- **Phase 4:** Cập nhật UI (Org Switcher, Invite Team Members).
