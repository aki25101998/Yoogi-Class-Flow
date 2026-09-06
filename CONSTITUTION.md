# 📜 HIẾN PHÁP DỰ ÁN — YOOGI CLASS FLOW

> **Phiên bản:** 1.0.0  
> **Cập nhật lần cuối:** 2026-09-07  
> **Mục đích:** Đây là tài liệu gốc, bất khả xâm phạm. Mọi thay đổi code PHẢI tuân thủ các quy tắc trong file này. Khi có tính năng mới, file này PHẢI được cập nhật đồng thời.

---

## MỤC LỤC

1. [Tổng Quan Dự Án](#1-tổng-quan-dự-án)
2. [Kiến Trúc Hệ Thống](#2-kiến-trúc-hệ-thống)
3. [Cơ Sở Dữ Liệu — Nguyên Lý Cốt Lõi](#3-cơ-sở-dữ-liệu--nguyên-lý-cốt-lõi)
4. [Hệ Thống Phân Quyền & Vai Trò](#4-hệ-thống-phân-quyền--vai-trò)
5. [Multi-Tenant & Multi-Workspace](#5-multi-tenant--multi-workspace)
6. [Kiến Trúc Frontend](#6-kiến-trúc-frontend)
7. [Quy Tắc Data Flow](#7-quy-tắc-data-flow)
8. [Hệ Thống Lương (Salary Engine)](#8-hệ-thống-lương-salary-engine)
9. [Hệ Thống Buổi Học & Điểm Danh](#9-hệ-thống-buổi-học--điểm-danh)
10. [Hệ Thống Tài Chính](#10-hệ-thống-tài-chính)
11. [Bảo Mật & Toàn Vẹn Dữ Liệu](#11-bảo-mật--toàn-vẹn-dữ-liệu)
12. [Quy Tắc UI/UX](#12-quy-tắc-uiux)
13. [Quy Tắc Code Style](#13-quy-tắc-code-style)
14. [Danh Sách Bảng Database](#14-danh-sách-bảng-database)
15. [Nhật Ký Cập Nhật Hiến Pháp](#15-nhật-ký-cập-nhật-hiến-pháp)

---

## 1. TỔNG QUAN DỰ ÁN

**Yoogi Class Flow** là hệ thống quản lý trung tâm đào tạo (võ thuật / thể thao) toàn diện, bao gồm:

- Quản lý tổ chức, huấn luyện viên (HLV), học viên
- Xếp lịch dạy, quản lý buổi học thực tế
- Check-in & điểm danh HLV + học viên
- Tính lương HLV tự động (Salary Engine v2.0)
- Quản lý học phí, sổ quỹ tài chính
- Hệ thống phân quyền chi tiết, hỗ trợ đa workspace

**Ngôn ngữ giao diện:** Tiếng Việt  
**Múi giờ kinh doanh:** `Asia/Ho_Chi_Minh` (GMT+7)

---

## 2. KIẾN TRÚC HỆ THỐNG

### 2.1 Công Nghệ

| Thành phần | Công nghệ | Phiên bản |
|---|---|---|
| Framework | Next.js (App Router) | 14.x |
| UI Library | React | 18.x |
| Language | TypeScript | 5.x |
| Database | Supabase (PostgreSQL) | - |
| Auth | Supabase Auth | - |
| State/Cache | TanStack React Query | 5.x |
| Styling | Vanilla CSS (CSS Variables) | - |
| Icons | Material Icons Round | - |
| Font | Inter (Google Fonts) | - |
| Deploy | Vercel | - |
| Email | Resend | - |
| Export | xlsx | - |

### 2.2 Cấu Trúc Thư Mục

```
├── app/
│   ├── (dashboard)/          # Route group chính (yêu cầu auth)
│   │   ├── DashboardProvider.tsx   # Context provider (user, userData, context)
│   │   ├── DashboardLayoutClient.tsx  # Client layout (sidebar + main)
│   │   ├── layout.tsx         # Server layout (requireAuth + provider)
│   │   ├── dashboard/         # Trang tổng quan
│   │   ├── coaches/           # Quản lý HLV
│   │   ├── training/          # Quản lý đào tạo (venues → classes)
│   │   ├── schedule/          # Lịch dạy (admin)
│   │   ├── attendance/        # Điểm danh (admin)
│   │   ├── payroll/           # Bảng lương
│   │   ├── tuition/           # Học phí
│   │   ├── finance/           # Sổ quỹ
│   │   ├── settings/          # Cài đặt tổ chức
│   │   ├── my-schedule/       # Lịch cá nhân (coach)
│   │   ├── my-checkin/        # Check-in cá nhân (coach)
│   │   ├── my-attendance/     # Điểm danh cá nhân (coach)
│   │   ├── my-earnings/       # Hoạt động/thu nhập (coach)
│   │   └── profile/           # Hồ sơ cá nhân
│   ├── actions/               # Server Actions
│   ├── auth/                  # Auth callback
│   ├── components/            # Shared components
│   │   ├── Sidebar.tsx        # Navigation sidebar
│   │   ├── ui/                # Reusable UI primitives
│   │   └── excel/             # Excel import/export
│   ├── login/                 # Login page
│   ├── globals.css            # CSS variables & base styles
│   └── styles/                # CSS Modules
├── hooks/                     # React Query hooks (data fetching)
├── services/                  # Server-side business logic
│   ├── organization.service.ts
│   ├── salary-engine.service.ts  # ⚠️ SINGLE SOURCE OF TRUTH cho lương
│   ├── session.service.ts
│   ├── members.service.ts
│   ├── coaches.service.ts
│   ├── class-coaches.service.ts
│   └── email.service.ts
├── utils/
│   ├── auth/                  # Auth helpers (requireAuth, requirePermission)
│   ├── supabase/              # Supabase client (server + client + middleware)
│   ├── date.ts                # Business date utilities (timezone-aware)
│   └── prefetch.ts            # Route prefetch strategies
├── types/                     # TypeScript type definitions
├── database/rebuild/          # SQL migrations (sequential, immutable)
└── middleware.ts              # Supabase session management
```

### 2.3 Quy Tắc Cấu Trúc KHÔNG ĐƯỢC PHẠM

| Quy tắc | Chi tiết |
|---|---|
| **KHÔNG có thư mục `src/`** | Tất cả code nằm trực tiếp ở root |
| **App Router ONLY** | Sử dụng Next.js App Router, KHÔNG dùng Pages Router |
| **KHÔNG dùng Tailwind** | Styling bằng Vanilla CSS + CSS Variables + CSS Modules |
| **KHÔNG dùng ORM** | Truy vấn trực tiếp qua Supabase client |

---

## 3. CƠ SỞ DỮ LIỆU — NGUYÊN LÝ CỐT LÕI

### 3.1 Chuỗi Định Danh (Identity Chain)

```
auth.users → profiles → organization_members → coaches
     ↓           ↓              ↓                   ↓
  Supabase    Thông tin      Membership           Thông tin
   Auth       cá nhân       + Role + Perms        chuyên môn
```

**QUY TẮC TUYỆT ĐỐI:**
- `profiles` chứa `name`, `email`, `avatar_url` — KHÔNG trùng lặp ở bảng khác
- `organization_members` chứa `role` và `permissions` — đây là **NGUỒN CHÂN LÝ DUY NHẤT** cho phân quyền
- `coaches` chỉ chứa thông tin chuyên môn (`phone`, `cccd`, `level`, `membership_number`) — KHÔNG chứa `name`, `email`, `role`, `permissions`
- Khi cần lấy tên HLV: JOIN qua `coaches → organization_members → profiles`

### 3.2 Composite Foreign Keys

**MỌI bảng con PHẢI sử dụng Composite Foreign Key `(organization_id, entity_id)` thay vì chỉ `entity_id`.**

```sql
-- ✅ ĐÚNG
FOREIGN KEY (organization_id, coach_id) 
  REFERENCES public.coaches(organization_id, id) ON DELETE CASCADE

-- ❌ SAI — NGHIÊM CẤM
FOREIGN KEY (coach_id) REFERENCES public.coaches(id)
```

**Lý do:** Ngăn chặn cross-tenant reference — Dữ liệu tổ chức A KHÔNG BAO GIỜ được tham chiếu tới tổ chức B ở cấp database.

### 3.3 UNIQUE Constraints Bắt Buộc

| Bảng | Constraint |
|---|---|
| `organization_members` | `UNIQUE(organization_id, user_id)` |
| `coaches` | `UNIQUE(organization_member_id)` |
| Tất cả entity tables | `UNIQUE(organization_id, id)` |
| `class_coaches` | `UNIQUE(class_id, coach_id)` |
| `class_students` | `UNIQUE(class_id, student_id)` |

### 3.4 Status & Role — CHECK Constraints

**KHÔNG BAO GIỜ** lưu trạng thái/vai trò dưới dạng text tự do. Tất cả PHẢI có CHECK constraint:

```sql
-- Roles
role IN ('owner', 'admin', 'head_coach', 'assistant_coach')

-- Class coach roles (database level dùng UPPERCASE)
role IN ('HEAD_COACH', 'ASSISTANT_COACH')

-- Session status (state machine)
status IN ('scheduled', 'checked_in', 'approved', 'rejected', 'paid', 'cancelled')

-- Student attendance
status IN ('present', 'absent', 'late', 'excused')
```

### 3.5 SQL Migration

- Tất cả migration nằm trong `database/rebuild/` với prefix số thứ tự tăng dần
- Migration là **IMMUTABLE** — KHÔNG SỬA migration cũ, chỉ thêm migration mới
- Format: `XXX_tên_mô_tả.sql`
- Mỗi migration PHẢI sử dụng `CREATE TABLE IF NOT EXISTS` hoặc `DO $$ ... END $$` để idempotent

---

## 4. HỆ THỐNG PHÂN QUYỀN & VAI TRÒ

### 4.1 Bốn Vai Trò Hệ Thống

| Vai trò | Code | Quyền hạn |
|---|---|---|
| **Owner** | `owner` | Toàn quyền, không thể bị xóa |
| **Admin** | `admin` | Toàn quyền quản lý (trừ xóa owner) |
| **Head Coach** | `head_coach` | Xem lớp, học viên, điểm danh. Không quản lý |
| **Assistant Coach** | `assistant_coach` | Chỉ xem lớp được phân công |

### 4.2 Kiểm Tra Quyền

**Server-side (Page level):**
```typescript
// utils/auth/requireAuth.ts — Bắt buộc đăng nhập
const { user, coach, context } = await requireAuth();

// utils/auth/requirePermission.ts — Bắt buộc quyền cụ thể
const { user, coach } = await requirePermission('manage_coaches');
```

**Client-side (Sidebar & UI):**
```typescript
const isAdminOrOwner = role === 'admin' || role === 'owner';
const hasPermission = (perm) => {
  if (isAdminOrOwner) return true;
  return permissions.includes(perm);
};
```

### 4.3 Danh Sách Permission

```
manage_coaches      — Quản lý HLV
manage_students     — Quản lý học viên
manage_venues       — Quản lý chi nhánh
manage_classes      — Quản lý lớp học
manage_schedule     — Quản lý lịch dạy
manage_settings     — Cài đặt tổ chức
manage_attendance   — Quản lý điểm danh
view_payroll        — Xem bảng lương
manage_members      — Quản lý thành viên
manage_organization — Quản lý tổ chức (owner only)
manage_tuition      — Quản lý học phí
manage_finance      — Quản lý tài chính
```

### 4.4 Quy Tắc Phân Quyền KHÔNG ĐƯỢC PHẠM

1. **Admin/Owner LUÔN bypass permission check** — `isAdminOrOwner` return true cho mọi permission
2. **Coach chỉ thấy dữ liệu được phân công** — enforced bởi cả RLS (database) và UI (frontend)
3. **KHÔNG BAO GIỜ tin tưởng client** — Permission check PHẢI xảy ra cả ở server (requirePermission) và database (RLS)

---

## 5. MULTI-TENANT & MULTI-WORKSPACE

### 5.1 Nguyên Lý

- Mỗi user có thể thuộc **nhiều tổ chức** (organization)
- Tổ chức đang active được xác định bởi:
  1. Cookie `yoogi_workspace_id` (ưu tiên cao nhất)
  2. `profiles.last_active_workspace` (fallback)
  3. Tổ chức được tham gia sớm nhất (fallback cuối)

### 5.2 Context Resolution

```
getCurrentOrganizationContext(userId)
  → Lấy profile từ auth_user_id
  → Lấy tất cả active memberships
  → Chọn workspace dựa trên cookie/last_active/earliest
  → Trả về: { organization, membership, profile, coach, permissions, allMemberships }
```

### 5.3 Quy Tắc KHÔNG ĐƯỢC PHẠM

1. **MỌI query PHẢI filter theo `organization_id`** — KHÔNG BAO GIỜ query mà thiếu điều kiện `organization_id`
2. **Switching workspace = clear React Query cache** — Tránh hiển thị data cũ
3. **RLS enforced ở mọi bảng** — Là tuyến phòng thủ cuối cùng

---

## 6. KIẾN TRÚC FRONTEND

### 6.1 Mô Hình Server → Client

```
Server Component (page.tsx)
  → requireAuth() / requirePermission()
  → Render Client Component (XxxClient.tsx)

Client Component
  → useDashboardContext() cho user/org data
  → useQuery/useMutation cho data fetching
  → Server Actions cho mutations
```

### 6.2 DashboardProvider

```typescript
// Cung cấp context cho toàn bộ dashboard:
interface DashboardContextType {
  user: User | null;         // Supabase auth user
  userData: Coach | null;    // Coach compatibility object
  context: OrganizationContext; // Tổ chức + membership + profile + permissions
}
```

**TUYỆT ĐỐI KHÔNG tạo context provider mới** cho cùng loại data đã có trong DashboardProvider.

### 6.3 Sidebar Navigation

**Cấu trúc nav được chia thành 2 config:**

```typescript
// ADMIN_NAV — Hiển thị cho tất cả roles
const ADMIN_NAV = [
  { section: 'TỔNG QUAN', items: [Dashboard] },        // [0] — LUÔN Ở TRÊN CÙNG
  { section: 'VẬN HÀNH', items: [...] },                // [1]
  { section: 'TÀI CHÍNH', items: [...] },               // [2]
  { section: 'HỆ THỐNG', items: [...] },                // [3]
];

// COACH_NAV — Chỉ hiển thị cho coach (head/assistant)
const COACH_NAV = [
  { section: 'Cá nhân', items: [Lịch của tôi, Check-in, Điểm danh, Hoạt động] }
];
```

**Thứ tự hiển thị:**
```typescript
const navSections = [
  ADMIN_NAV[0],                           // TỔNG QUAN luôn ở trên cùng
  ...(isAdminOrOwner ? [] : COACH_NAV),   // Mục cá nhân (chỉ coach)
  ...ADMIN_NAV.slice(1)                   // Phần còn lại
];
```

**QUY TẮC:** Mục "TỔNG QUAN" (Dashboard) PHẢI LUÔN ở vị trí đầu tiên cho MỌI vai trò.

### 6.4 React Query Configuration

```typescript
defaultOptions: {
  queries: {
    staleTime: 5 * 60 * 1000,        // 5 phút
    refetchOnWindowFocus: false,       // Không fetch lại khi focus tab
    retry: 1,                          // Chỉ retry 1 lần
  }
}
```

**QUY TẮC:** Tất cả query keys PHẢI bao gồm `organizationId` để tránh cache collision giữa các workspace.

### 6.5 Prefetch Strategy

Route prefetch được thực hiện qua `utils/prefetch.ts` khi hover sidebar items. Hiện hỗ trợ: `/dashboard`, `/schedule`, `/students`, `/classes`.

---

## 7. QUY TẮC DATA FLOW

### 7.1 Đọc Dữ Liệu (Read)

```
Client Component
  → useXxx() hook (hooks/*.ts)
    → Supabase Client (utils/supabase/client.ts)
      → PostgreSQL + RLS
```

### 7.2 Ghi Dữ Liệu (Write)

```
Client Component
  → Server Action (app/actions/*.ts) hoặc Service
    → Supabase Server Client (utils/supabase/server.ts)
      → PostgreSQL + RLS + Triggers
```

### 7.3 Quy Tắc KHÔNG ĐƯỢC PHẠM

1. **KHÔNG compute salary ở client** — Luôn dùng `salary-engine.service.ts`
2. **KHÔNG gửi sensitive data từ client** — Server tự resolve context (sessionId, coachId → lookup tất cả)
3. **KHÔNG gọi Supabase Server Client từ Client Component** — Chỉ dùng trong Server Components, Server Actions, và Services
4. **KHÔNG bỏ qua error handling** — Mọi Supabase query phải check `error` response
5. **Supabase Client dùng `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`** — KHÔNG BAO GIỜ dùng Service Role Key ở client

---

## 8. HỆ THỐNG LƯƠNG (SALARY ENGINE v2.0)

### 8.1 Nguyên Lý Cốt Lõi

**`services/salary-engine.service.ts` là NGUỒN CHÂN LÝ DUY NHẤT cho mọi tính toán lương.**

KHÔNG BAO GIỜ:
- Tính lương trong React component
- Tính lương trong hook
- Tính lương trong server action
- Hardcode số tiền lương

### 8.2 Kiểu Tính Lương

| Type | Mô tả |
|---|---|
| `FIXED_MONTHLY` | Lương cứng theo tháng |
| `FIXED_PER_SESSION` | Lương cố định theo buổi |
| `PER_STUDENT` | Lương theo số học viên có mặt |
| `PERCENT_REVENUE` | Lương theo % doanh thu |
| `TIERED_STUDENT_COUNT` | Lương theo bậc thang học viên |
| `BONUS` | Thưởng (có điều kiện) |
| `ALLOWANCE` | Phụ cấp |
| `DEDUCTION` | Khấu trừ |

### 8.3 Rule Scoping & Priority

```
ORGANIZATION (priority=10, rộng nhất)
  → VENUE (priority=20)
    → CLASS (priority=30)
      → COACH (priority=40, cụ thể nhất)
```

- **ADD mode:** Cộng thêm vào kết quả hiện có
- **REPLACE mode:** Thay thế rules cùng loại có priority thấp hơn

### 8.4 Salary Snapshot

Mỗi lần tính lương sẽ tạo một **SalarySnapshot immutable** lưu kèm buổi học:

```typescript
interface SalarySnapshot {
  engine_version: string;    // "2.0.0"
  calculated_at: string;     // ISO timestamp
  context: { ... };          // Input data tại thời điểm tính
  rules: [{ ... }];          // Rules đã áp dụng
  final_amount: number;      // Kết quả cuối cùng
}
```

**KHÔNG BAO GIỜ thay đổi snapshot sau khi đã tạo** — Để audit trail.

---

## 9. HỆ THỐNG BUỔI HỌC & ĐIỂM DANH

### 9.1 Session Lifecycle (State Machine)

```
scheduled → checked_in → approved → paid
    ↓                        ↓
 cancelled              rejected
```

**QUY TẮC:** Chuyển trạng thái PHẢI tuân thủ thứ tự. KHÔNG ĐƯỢC nhảy cóc (VD: scheduled → approved).

### 9.2 Virtual vs Real Sessions

- **Virtual Session:** Sinh từ `schedules` table, chưa lưu DB → `isVirtual: true`
- **Real Session:** Đã lưu trong `class_sessions` → `isVirtual: false`, có `sessionId`

`session.service.ts` merge virtual + real để hiển thị "ngày hôm nay".

### 9.3 Điểm Danh Học Viên

- Bảng `student_session_attendance` với FK tới `class_sessions`
- Status: `present`, `absent`, `late`, `excused`
- Có trường `notes` cho ghi chú

### 9.4 HLV trong Lớp

- Bảng `class_coaches` với `role`: `HEAD_COACH` hoặc `ASSISTANT_COACH`
- **Business Rule:** Mỗi lớp chỉ có TỐI ĐA 1 HEAD_COACH (enforced bởi partial unique index)
- Có thể có nhiều ASSISTANT_COACH

---

## 10. HỆ THỐNG TÀI CHÍNH

### 10.1 Học Phí (Tuition)

- Status: `unpaid` → `partial` → `paid`
- Hỗ trợ thanh toán từng phần (`paid_amount`)
- Thanh toán qua RPC `record_tuition_payment` — **atomic operation** với `FOR UPDATE` lock

### 10.2 Sổ Quỹ (Finance Transactions)

- Type: `income` hoặc `expense`
- `source_type`: `MANUAL`, `TUITION_PAYMENT`, `PAYROLL_PAYMENT`
- **QUY TẮC:** Giao dịch hệ thống (auto-generated) KHÔNG thể bị xóa thủ công

### 10.3 Payroll

- Kỳ lương theo tháng (`payroll_periods`)
- Status: `open` → `calculated` → `review` → `approved` → `paid`
- Thanh toán lương tạo `finance_transactions` type `expense` tự động

---

## 11. BẢO MẬT & TOÀN VẸN DỮ LIỆU

### 11.1 Row Level Security (RLS)

**MỌI bảng PHẢI có RLS enabled.** Không có ngoại lệ.

Helper functions:
```sql
get_user_organizations()  — Trả về danh sách org_id user thuộc về
is_org_admin(org_id)      — Kiểm tra user là admin/owner của org
get_my_coach_id()         — Trả về coach_id(s) của user hiện tại
get_my_class_ids()        — Trả về class_id(s) user được phân công
```

### 11.2 3 Tầng Bảo Vệ

```
[1] Frontend UI   — hasPermission() → Ẩn nút/menu
[2] Server Logic  — requireAuth() / requirePermission() → Chặn truy cập
[3] Database RLS  — PostgreSQL policies → Chặn ở cấp dữ liệu
```

**KHÔNG ĐƯỢC dựa duy nhất vào UI** để bảo vệ. RLS là tuyến phòng thủ cuối cùng.

### 11.3 Composite FK — Multi-Tenant Isolation

Tất cả FK cross-table PHẢI bao gồm `organization_id` để ngăn cross-tenant reference ở cấp database:

```sql
FOREIGN KEY (organization_id, venue_id) 
  REFERENCES public.venues(organization_id, id) ON DELETE CASCADE
```

### 11.4 Undo/Redo System

- Các thao tác CRUD được ghi log vào `version_history` + `version_changes`
- Hàm `restore_record_to_state` sử dụng whitelist columns, loại trừ `id`, `created_at`, `sequence_id`

---

## 12. QUY TẮC UI/UX

### 12.1 Design System

**Theme:** Indigo/Violet (Stripe-inspired)  
**Primary color:** `#6366f1` (Indigo 500)  
**Font:** Inter  
**Hỗ trợ:** Light Mode + Dark Mode (toggle trong sidebar)

### 12.2 CSS Variables

MỌI styling PHẢI dùng CSS Variables từ `globals.css`:
```css
var(--primary)          /* #6366f1 */
var(--surface)          /* Background chính */
var(--text-main)        /* Text chính */
var(--border-light)     /* Border nhẹ */
var(--radius-md)        /* Border radius 0.5rem */
var(--shadow-md)        /* Shadow trung bình */
```

**KHÔNG hardcode giá trị màu/kích thước** — Luôn dùng CSS variable.

### 12.3 Dark Mode

Dark mode kích hoạt qua `data-theme="dark"` trên `<html>`. CSS Variables tự động override:
```css
[data-theme="dark"] {
  --background: #0B0B0D;
  --surface: #121214;
  --text-main: #F4F4F5;
  /* ... */
}
```

**QUY TẮC:** Mọi component PHẢI hoạt động đúng trên cả Light và Dark mode. KHÔNG BAO GIỜ hardcode `color: white` hay `background: #fff`.

### 12.4 Responsive

- Sidebar ẩn trên mobile, hiện qua hamburger menu
- Main content responsive qua `main-content` class
- **KHÔNG dùng Tailwind classes** — Dùng CSS Modules hoặc inline styles

### 12.5 Reusable UI Components

Thư mục `app/components/ui/`:
- `Badge` — Badge component
- `Button` — Button component (with CSS Module)
- `Card` — Card container
- `Input` — Form input
- `Modal` — Modal dialog
- `Table` — Data table
- `EmptyState` — Empty state placeholder
- `LoadingSkeleton` — Loading skeleton
- `PageHeader` — Page header
- `RoleBadge` — Role display badge

**QUY TẮC:** Ưu tiên tái sử dụng component có sẵn. KHÔNG tạo component mới nếu đã có component tương đương.

---

## 13. QUY TẮC CODE STYLE

### 13.1 File Naming

| Loại | Convention | Ví dụ |
|---|---|---|
| Page (server) | `page.tsx` | `app/(dashboard)/coaches/page.tsx` |
| Client component | `XxxClient.tsx` | `CoachesClient.tsx` |
| Hook | `useXxx.ts` | `useCoaches.ts` |
| Service | `xxx.service.ts` | `coaches.service.ts` |
| Type | `xxx.ts` | `coach.ts` |
| CSS Module | `Xxx.module.css` | `Button.module.css` |
| Server Action | `xxx.actions.ts` | `profile.actions.ts` |
| SQL Migration | `NNN_description.sql` | `031_class_coaches_constraints.sql` |

### 13.2 Quy Tắc TypeScript

- **PHẢI** đặt `"use client"` ở đầu mọi Client Component
- **PHẢI** sử dụng type imports: `import type { Coach } from '@/types/coach'`
- **PHẢI** sử dụng path alias `@/` cho imports
- **KHÔNG** sử dụng `any` trừ khi thực sự cần thiết (legacy compatibility)

### 13.3 Quy Tắc Hook

Mỗi domain có 1 hook riêng trong `hooks/`:
```
useCoaches.ts       — CRUD coaches
useStudents.ts      — CRUD students
useSchedule.ts      — Schedule management
useAttendance.ts    — Attendance management
usePayroll.ts       — Payroll data
useSalaryRules.ts   — Salary rules
useTuition.ts       — Tuition management
useFinance.ts       — Finance transactions
useDashboardStats.ts — Dashboard statistics
```

**QUY TẮC:** 
- Query key format: `['entity-name', organizationId, ...filters]`
- KHÔNG fetch data trực tiếp trong component — Luôn qua hook

### 13.4 Date/Time

- **LUÔN** dùng `utils/date.ts` cho business dates
- Database lưu date dạng `TEXT` format `YYYY-MM-DD` (không dùng DATE type)
- Timestamps dùng `TIMESTAMPTZ`
- Timezone: `Asia/Ho_Chi_Minh`

---

## 14. DANH SÁCH BẢNG DATABASE

### Core Identity
| Bảng | Mô tả |
|---|---|
| `profiles` | Thông tin cá nhân (name, email, avatar) |
| `organizations` | Tổ chức/workspace |
| `organization_members` | Membership + role + permissions |
| `organization_invitations` | Lời mời tham gia |

### Coach & Training
| Bảng | Mô tả |
|---|---|
| `coaches` | Thông tin chuyên môn HLV |
| `venues` | Địa điểm/chi nhánh |
| `venue_classes` | Lớp học (thuộc venue) |
| `class_coaches` | Phân công HLV → lớp |
| `organization_belts` | Hệ thống cấp đai |

### Students
| Bảng | Mô tả |
|---|---|
| `students` | Thông tin học viên |
| `class_students` | Đăng ký học viên → lớp |

### Schedule & Attendance
| Bảng | Mô tả |
|---|---|
| `schedules` | Lịch học định kỳ |
| `class_sessions` | Buổi học thực tế (state machine) |
| `attendance` | Check-in HLV (legacy) |
| `student_attendance` | Điểm danh học viên (JSONB, legacy) |
| `student_session_attendance` | Điểm danh chi tiết (mới) |

### Finance & Payroll
| Bảng | Mô tả |
|---|---|
| `teacher_salaries` | Config lương đơn giản (legacy) |
| `teacher_salary_sessions` | Session lương (legacy) |
| `salary_rules` | Quy tắc tính lương (Salary Engine v2) |
| `salary_rule_tiers` | Bậc lương theo học viên |
| `salary_profiles` | Gán rule → coach |
| `salary_adjustments` | Phụ cấp/khấu trừ |
| `payroll_periods` | Kỳ lương tháng |
| `payroll_payments` | Thanh toán lương |
| `payroll_payment_sessions` | Session → payment mapping |
| `salary_audit_logs` | Audit log lương |
| `tuition` | Học phí học viên |
| `finance_transactions` | Thu chi tổng hợp |

### System
| Bảng | Mô tả |
|---|---|
| `version_history` | Lịch sử thay đổi |
| `version_changes` | Chi tiết từng thay đổi |
| `organization_version_counters` | Counter cho undo/redo |

---

## 15. NHẬT KÝ CẬP NHẬT HIẾN PHÁP

| Ngày | Phiên bản | Thay đổi |
|---|---|---|
| 2026-09-07 | 1.0.0 | Khởi tạo Hiến Pháp — Ghi nhận toàn bộ kiến trúc hiện tại |

---

> **⚠️ LƯU Ý QUAN TRỌNG CHO AI/AGENT:**  
> - Trước khi code BẤT KỲ thay đổi nào, PHẢI đọc và tuân thủ Hiến Pháp này.  
> - Sau khi thêm tính năng mới hoặc thay đổi kiến trúc, PHẢI cập nhật Hiến Pháp.  
> - Nếu thay đổi vi phạm Hiến Pháp, PHẢI thông báo cho người dùng và xin phê duyệt trước khi thực hiện.  
> - File này là **tài liệu sống** — luôn phản ánh trạng thái thực tế của dự án.
