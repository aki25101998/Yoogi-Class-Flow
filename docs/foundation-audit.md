# BÁO CÁO PHASE 0: PHÂN TÍCH TOÀN BỘ REPOSITORY

Dưới đây là báo cáo phân tích toàn diện hiện trạng của repository Yoogi-Class-Flow trước khi tiến hành quá trình làm sạch (clean up) và thiết lập nền tảng bảo mật (foundation hardening).

## A. Authentication hiện tại
- **Công nghệ**: Sử dụng Supabase SSR (`@supabase/ssr`) với Google OAuth.
- **Thành phần**:
  - `utils/supabase/client.ts`, `utils/supabase/server.ts`, `utils/supabase/middleware.ts` đã được thiết lập đúng chuẩn.
  - `middleware.ts` thực hiện việc update session (refresh cookie) thành công.
- **Tình trạng**: Hoạt động ổn định, đóng vai trò là "Single Source of Truth". 
> [!IMPORTANT]
> Toàn bộ module Authentication này sẽ được đóng băng (freeze), tuyệt đối không sửa đổi trong các phase tiếp theo để đảm bảo tính ổn định.

## B. Authorization hiện tại
- **Cách hoạt động**:
  - Thực hiện trực tiếp tại `app/(dashboard)/layout.tsx`.
  - Lấy `email` từ `supabase.auth.getUser()`.
  - Thực hiện query vào bảng `coaches` để tìm record có `email` tương ứng.
  - Sau đó truyền `userData` (chứa role và permissions) xuống `DashboardLayoutClient` và `Sidebar`.
- **Vấn đề**: Logic đang bị lặp và nằm trực tiếp trong Layout thay vì sử dụng một Service hay Authorization Helper tập trung.

## C. Database tables
Hệ thống sử dụng các bảng chính (đã được định nghĩa trong `database/*.sql`):
1. `coaches`
2. `venues`
3. `venue_coaches`
4. `venue_classes`
5. `schedules`
6. `attendance`
7. `teacher_salaries`
8. `teacher_salary_sessions`
9. `student_attendance`

## D. RLS hiện tại
> [!CAUTION]
> Tình trạng RLS: Đang bị vô hiệu hóa (DISABLED) hoàn toàn.
- File `database/10_rls_policies.sql` đang chứa câu lệnh `ALTER TABLE [table_name] DISABLE ROW LEVEL SECURITY;` cho tất cả các bảng.
- Bất kỳ client nào có JWT ẩn danh (anon key) đều có khả năng đọc/ghi toàn bộ database nếu frontend lộ thông tin.

## E. Permission hiện tại
- **Trong DB (`database/01_coaches.sql`)**: Cột `permissions` đang có kiểu `JSONB` với default là `'{}'::jsonb` (kiểu Object).
- **Trong Frontend (`app/components/Sidebar.tsx`)**: Code kiểm tra permission thông qua `userData.permissions.includes(perm)`. Điều này ngụ ý Frontend kỳ vọng `permissions` là một Array (ví dụ: `['manage_coaches', 'manage_students']`).
- **Nợ kỹ thuật**: Có sự bất đồng bộ giữa cấu trúc data mặc định trên DB (Object) và cách Frontend sử dụng (Array).

## F. Legacy code hiện tại
- **Thư mục `public/js/`**: Chứa rất nhiều tệp JS cũ của kiến trúc SPA thuần, bao gồm: `app.js`, `auth.js`, `db.js` (rất lớn, ~39KB), `router.js`, `utils.js`, và các thư mục `pages/`, `components/`.
- **Tình trạng**: Đây là nợ kỹ thuật lớn gây rối source code. Cần phân tích kỹ file nào đã được thay thế hoàn toàn bởi Next.js App Router trước khi xóa bỏ.

## G. Sensitive data
- **Database**: Bảng `coaches` chứa các trường nhạy cảm như `cccd`, `phone`, `membership_number`. Frontend có nguy cơ query toàn bộ (`select *`) và làm lộ các dữ liệu này cho client-side.
- **Environment**: File `.env.local` hiện đang chứa token nhạy cảm (`VERCEL_OIDC_TOKEN`). Dù file này đã có trong `.gitignore`, nhưng cần phải kiểm tra xem nó có đang bị track trong git history hay không.

## H. Technical debt (Nợ kỹ thuật tổng quan)
1. **Bảo mật**: Không có RLS.
2. **Identity Model**: Thiếu sự liên kết chặt chẽ (Foreign Key) giữa `auth.users.id` và `public.coaches.id`. Hiện đang dựa trên `email` - điều này là không an toàn vì email có thể bị thay đổi hoặc không mapping 1-1 ở tầng DB rules.
3. **TypeScript**: Rất nhiều kiểu dữ liệu là `any` (ví dụ ở `DashboardLayoutClient`, `Sidebar`).
4. **Kiến trúc**: Thiếu Service Layer. Component/Layout đang gọi thẳng database.
5. **Git**: Nguy cơ lộ `.next` hoặc `.env.local` trong tracking của Git.

## I. File nào sẽ sửa trong các Phase tới
1. Bảng `database/*` (Đặc biệt là `01_coaches.sql` và `10_rls_policies.sql`) để thêm cột mapping Identity và bật/cấu hình RLS.
2. `app/(dashboard)/layout.tsx` (Refactor sang dùng Auth helper).
3. `app/components/Sidebar.tsx` và `DashboardLayoutClient` (Bỏ kiểu `any`, gán interface rõ ràng).
4. Khởi tạo các thư mục/file mới: `utils/auth/`, `services/`, `types/`.
5. `.gitignore` (Loại bỏ các build artifacts & env).

## J. File nào tuyệt đối KHÔNG được sửa
- `app/login/page.tsx`
- `app/auth/callback/route.ts` (và bất kỳ route liên quan đến login flow)
- `utils/supabase/client.ts`
- `utils/supabase/server.ts`
- `utils/supabase/middleware.ts`
- `middleware.ts`
- Các tệp liên quan trực tiếp đến authentication đang hoạt động tốt.
