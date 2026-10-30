# 📜 HIẾN PHÁP DỰ ÁN — YOOGI CLASS FLOW

> **Phiên bản:** 1.8.0  
> **Cập nhật lần cuối:** 2026-10-30  
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

**QUY TẮC TUYỆT ĐỐI (Identity Chain & Column Distribution):**
1. **`profiles`**: CHỈ chứa `name`, `email`, `avatar_url`. TUYỆT ĐỐI KHÔNG chứa số điện thoại (`phone`).
2. **`organization_members`**: Chứa `role` và `permissions` — NGUỒN CHÂN LÝ DUY NHẤT cho phân quyền.
3. **`coaches`**: Chứa thông tin cá nhân/chuyên môn của HLV (`phone`, `cccd`, `level`, `membership_number`, `photo_url`, `nickname`). 
   - Số điện thoại (`phone`) ĐƯỢC LƯU Ở ĐÂY, **TUYỆT ĐỐI KHÔNG** được query `profiles(phone)`.
   - Hình ảnh HLV lưu ở `photo_url` (bảng coaches), có thể fallback về `avatar_url` (bảng profiles).
   - KHÔNG chứa `name`, `email`, `role`, `permissions`.
4. Khi truy vấn thông tin HLV: Phải JOIN qua `coaches → organization_members → profiles`. 
   - Ví dụ: `coaches(id, organization_members(profiles(name, email, avatar_url)))`. 
   - TUYỆT ĐỐI KHÔNG đưa các cột không tồn tại vào query (vd: `profiles(phone)` hoặc `coaches(name)`) vì Supabase PostgREST sẽ báo lỗi và gây crash UI (lỗi "Không thể tải dữ liệu").

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

### 3.6 Quy Tắc Refactor Database KHÔNG ĐƯỢC PHẠM

Khi thực hiện việc thay đổi schema cơ sở dữ liệu (ví dụ: xóa cột, đổi tên cột, hoặc di chuyển cột sang bảng khác — như việc chuyển `name` từ `coaches` sang `profiles`):
1. **BẮT BUỘC** phải tìm kiếm toàn bộ codebase (các file `.ts`, `.tsx` trong `hooks/`, `services/`, `app/`) để tìm và cập nhật TẤT CẢ các câu truy vấn Supabase (`.select()`) đang sử dụng cột cũ.
2. Việc quên cập nhật frontend query sẽ lập tức gây ra lỗi crash ("Không thể tải dữ liệu") trên giao diện người dùng. Đừng chỉ sửa ở DB mà quên update code frontend!

---

## 4. HỆ THỐNG PHÂN QUYỀN & VAI TRÒ

### 4.1 Phân Cấp Vai Trò Hệ Thống

| Vai trò | Code | Quyền hạn |
|---|---|---|
| **Platform Founder** | Super Admin (`aki251098@gmail.com`) | Toàn quyền cấp phép, tạo mới trung tâm, quản lý bản quyền SaaS (/platform-admin) |
| **Owner** | `owner` | Toàn quyền trong phạm vi tổ chức/trung tâm, không thể bị xóa |
| **Admin** | `admin` | Toàn quyền quản lý trong trung tâm (trừ xóa owner) |
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

### 5.4 Cơ Chế Cấp Phép Bản Quyền (Manual Provisioning & Platform Administration)

1. **Mô hình kinh doanh:** Gated B2B SaaS (Không cho phép người dùng tự do đăng ký tạo trung tâm rác).
2. **Quyền khởi tạo:** Duy nhất Nhà sáng lập (`aki251098@gmail.com`) có quyền tạo mới trung tâm thông qua Cổng Founder Admin (`/platform-admin`) sau khi khách hàng đã thanh toán.
3. **Khóa tạo tự do:** Người dùng thường khi chưa có trung tâm tại `/create-organization` sẽ thấy trang hướng dẫn liên hệ Founder để đăng ký và kích hoạt.
4. **Đa vai trò xuyên tổ chức:** Cùng một tài khoản người dùng (User Email) có thể vừa là HLV ở trung tâm này (XLT) vừa là Chủ (Owner) ở trung tâm khác (ABC) mà không hề bị xung đột hay rò rỉ dữ liệu, chuyển đổi linh hoạt qua bộ chọn Workspace trên Sidebar.

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

**Theme:** Vibrant Athletic & Martial Arts (High-Energy Contrast)  
**Primary color:** `#14B8A6` (Electric Teal 500)  
**Accent Energy color:** `#FF6B35` (Vibrant Coral / Sunset Fire)  
**Font:** Inter & Plus Jakarta Sans  
**Border Radius Philosophy:** Generous radii (Cards: `20px - 28px` / `var(--radius-xl)` & `var(--radius-2xl)`, Buttons/Inputs/Pills: `9999px` / `var(--radius-full)`)  
**Hỗ trợ:** Light Mode (Warm Athletic Cream `#FAF9F6`) + Dark Mode (Deep Obsidian `#090A0F`) toggle trong sidebar

### 12.2 CSS Variables

MỌI styling PHẢI dùng CSS Variables từ `globals.css`:
```css
var(--primary)          /* #14B8A6 - Electric Teal */
var(--primary-hover)    /* #0D9488 - Teal 600 */
var(--primary-light)    /* rgba(20, 184, 166, 0.12) */
var(--accent-energy)    /* #FF6B35 - Vibrant Coral Orange */
var(--surface)          /* Card & Panel background */
var(--text-main)        /* Text chính */
var(--border-light)     /* Border nhẹ */
var(--radius-full)      /* Pill 9999px (Buttons, Search, Badges) */
var(--radius-xl)        /* 20px (Entity cards) */
var(--radius-2xl)       /* 28px (Overview containers) */
var(--shadow-teal-glow) /* Glow hiệu ứng Teal năng động */
var(--shadow-coral-glow)/* Glow hiệu ứng Coral rực cháy */
```

**KHÔNG hardcode giá trị màu/kích thước** — Luôn dùng CSS variable.

### 12.3 Dark Mode

Dark mode kích hoạt qua `data-theme="dark"` trên `<html>`. CSS Variables tự động override:
```css
[data-theme="dark"] {
  --background: #090A0F;
  --surface: #11141C;
  --surface-hover: #171B26;
  --text-main: #F8FAFC;
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
| 2026-09-07 | 1.0.1 | Thêm quy tắc Refactor Database (3.6) và làm rõ query Identity Chain (3.1) |
| 2026-10-19 | 1.1.0 | Chuẩn hóa toàn diện CSS Design System (app/globals.css), loại bỏ triệt để lỗi Phantom Tailwind, thiết kế mới giao diện Lịch Dạy tuần (ScheduleClient / MyScheduleClient), tối ưu Dark/Light mode và trang Hồ sơ cá nhân |
| 2026-10-24 | 1.2.0 | Triển khai giao diện Card-Row Entity List, Overview Card và Toolbar Instant Search cho trang Huấn luyện viên (CoachesClient), chuẩn hóa page-standard.module.css, dọn dẹp bảo mật tệp tạm |
| 2026-10-24 | 1.3.0 | Nâng cấp toàn diện Vibrant Athletic & Martial Arts Design System (Teal #14B8A6 + Coral Orange #FF6B35, Warm cream light mode #FAF9F6, Deep obsidian dark mode #090A0F, pill buttons, diffused glows, 20-28px card elevation) |
| 2026-10-24 | 1.3.1 | Chuẩn hóa bố cục Overview KPI Grid 4 ô cân đối, bổ sung watermark võ đạo chìm (.kpiWatermark) và chú thích (.kpiCaption), chuyển overviewGrid sang auto-fit loại bỏ ô trống thừa thãi |
| 2026-10-24 | 1.3.2 | Đồng bộ bố cục Overview KPI Grid 4 ô cân đối (Lớp hoạt động, Tổng lớp, Tổng học viên, Đội ngũ HLV) kèm watermark thể thao chìm cho trang Chi tiết địa điểm (/training/[venueId]) |
| 2026-10-24 | 1.3.3 | Đồng bộ bố cục Overview KPI Grid 4 ô cân đối (Tổng lương tháng, Chờ duyệt, Cần thanh toán, Đã thanh toán) loại bỏ overviewHero rườm rà, bổ sung watermark tài chính cho trang Bảng lương (/payroll) |
| 2026-10-24 | 1.3.4 | Căn chỉnh thẳng hàng cột thao tác (.entityActions justify-content: flex-start) trên danh sách Card-Row (trang Huấn luyện viên), đảm bảo nút "Xem thông tin" của Quản trị viên và các vai trò khác luôn thẳng tắp một hàng |
| 2026-10-24 | 1.3.5 | Cập nhật quy tắc hiển thị tên HLV: khi đã cài đặt tên gợi nhớ (nickname), chỉ hiển thị duy nhất tên gợi nhớ (thay vì nối 'Tên gốc (Nickname)'), hỗ trợ tìm kiếm linh hoạt theo cả tên gốc và nickname |
| 2026-10-25 | 1.3.6 | Chuyển đổi danh sách Địa điểm đào tạo (/training) từ dạng bảng ngang sang dạng Thẻ thể thao (Venues Grid Card), tích hợp banner ảnh nơi tập luyện, tính năng tải ảnh nhanh (quick upload) và dropzone ảnh trong modal thêm/sửa (034_venue_image_url.sql) |
| 2026-10-25 | 1.3.7 | Nâng cấp thanh chuyển đổi 3 phong cách thẻ (Hero Cinematic, Full-Cover Kính Mờ, Athletic Studio) và bộ điều chỉnh góc ảnh/căn lề trực quan (image position 0-100%, preset Đỉnh/Giữa/Đáy) kèm hỗ trợ server localhost:3000 |
| 2026-10-25 | 1.3.8 | Bổ sung cơ chế tự phục hồi (resilient schema fallback) cho API địa điểm và hook truy vấn: tự động thử lại khi thiếu cột image_position/image_url trong cache PostgREST, cập nhật file migration 034 với NOTIFY pgrst |
| 2026-10-25 | 1.3.9 | Nâng cấp toàn diện thiết kế Mẫu 1 (Hero Cinematic Refined): áp dụng visual hierarchy cao cấp từ Quiz App (border-radius 28px, category pill tag, heading 1.35rem sắc nét, hai bento chips thể thao hai màu Teal/Orange nổi bật với số liệu 20px, nút CTA pill gradient với icon mũi tên chuyển động) |
| 2026-10-25 | 1.3.10 | Tái thiết kế hàng hiển thị địa chỉ thành Location Capsule Bar cao cấp: badge định vị màu Cam San Hô nổi bật, micro-label ĐỊA ĐIỂM TẬP LUYỆN, text địa chỉ semibold sắc nét và tích hợp liên kết Google Maps tương tác |
| 2026-10-25 | 1.3.11 | Loại bỏ dòng địa chỉ bên dưới tên địa điểm (CC Riverside) trên trang Chi tiết địa điểm (/training/[venueId]) và thẻ địa điểm (/training); tái thiết kế danh sách lớp học thành lưới Thẻ tối giản (Minimal Class Cards Grid: icon võ đạo, badge trạng thái bo tròn, lịch học tuần, số liệu HLV/học viên compact và nút Xem lớp pill) |
| 2026-10-25 | 1.3.12 | Tái thiết kế bộ chọn Ngày học trong tuần (ClassScheduleManager) chuẩn hiện đại: thay thế các nút bấm lỗi thời bằng dải 7 ngày cân xứng (7-Day Strip T2-CN), bộ chọn nhanh 1-chạm (Presets: 2-4-6, 3-5-7, Cuối tuần, Tất cả), chỉ số ngày cuối tuần cam năng động, hiệu ứng glow gradient Teal khi chọn và tự động ước tính thời lượng mỗi buổi |
| 2026-10-26 | 1.4.0 | Bổ sung hệ thống dữ liệu mẫu toàn diện (Seed Sample Data): migration SQL 035_seed_sample_data.sql với stored procedure public.seed_sample_data(), server action seedSampleDataAction và UI trực quan 1-chạm trong Cài đặt (SettingsClient) để nạp tức thì 8 cấp đai, 3 chi nhánh, 4 HLV, 6 lớp học, 16 học viên, lịch học tuần, điểm danh, học phí và sổ quỹ thu chi |
| 2026-10-26 | 1.4.1 | Bổ sung mục Quản lý Học viên tập trung (/students) vào Sidebar (nhóm VẬN HÀNH); nâng cấp giao diện chuẩn Vibrant Athletic & Martial Arts: lưới 4 thẻ KPI cân đối (Tổng võ sinh, Đang tập luyện, Học phí chưa thu, Tỷ lệ đi học), thanh công cụ tìm kiếm tức thì & bộ lọc đa chiều (cơ sở, lớp, đai, trạng thái), danh sách Card-Row Entity List và Modal xem & chỉnh sửa toàn diện |
| 2026-10-26 | 1.4.2 | Loại bỏ quy tắc redirect cũ (/students → /training) trong next.config.mjs để mở khóa toàn diện đường dẫn Quản lý Học viên; hoàn tất kết nối và deploy trực tiếp bản build Production lên Vercel (https://yoogi-class-flow.vercel.app/students) |
| 2026-10-27 | 1.4.3 | Sửa lỗi phân quyền check-in của HLV và đồng bộ lịch dạy: bổ sung migration 036_coach_checkin_and_sessions_rls.sql (RLS INSERT/UPDATE cho class_sessions, session_coaches, schedule_coaches & RPC public.checkin_session atomic), khắc phục lỗi filter coachId trên DashboardClient / MyCheckinClient / MyScheduleClient / MyAttendanceClient, tự động fallback kế thừa HLV từ class_coaches khi lịch định kỳ chưa gán HLV riêng lẻ |
| 2026-10-27 | 1.4.4 | Khắc phục triệt để lỗi đồng bộ trạng thái Check-in trên Dashboard (/dashboard) và Check-in (/my-checkin): tường minh hóa quan hệ khóa ngoại (explicit foreign key embedding `coaches!teacher_salary_sessions_coach_id_fkey`) trong session.service.ts giải quyết lỗi PostgREST PGRST201 làm null dữ liệu buổi học đã lưu; đồng bộ trạng thái check-in theo từng HLV trong ca nhiều HLV và kích hoạt refetch + router.refresh() tức thì khi thao tác thành công |
| 2026-10-27 | 1.4.5 | Hoàn thiện luồng Điểm danh học viên cho Huấn luyện viên: tích hợp mục "Điểm danh học viên" (/attendance) vào menu Cá nhân (Sidebar) và đổi tên /my-attendance thành "Lịch sử buổi dạy"; bổ sung nút tắt 1-chạm [Điểm danh học viên] trên thẻ ca học (Dashboard & Check-in) ngay khi ca chuyển sang Đã Check-in; cập nhật useAttendance & AttendanceClient tự động lọc lớp phân công theo coachId và tự động chọn ca học qua URL query params (date/sessionId/classId) |
| 2026-10-27 | 1.4.6 | Sửa lỗi phân quyền RLS khi lưu điểm danh học viên: bổ sung migration 037_student_attendance_rls.sql (chính sách RLS INSERT/UPDATE cho student_session_attendance & RPC public.save_student_attendance atomic); cập nhật saveAttendanceAction gọi RPC với fallback trực tiếp giải quyết triệt để lỗi "new row violates row-level security policy for table student_session_attendance" |
| 2026-10-27 | 1.4.7 | Tái cấu trúc toàn diện giao diện Lịch dạy cá nhân (/my-schedule) chuẩn Hybrid 3 góc nhìn: Dải 7 ngày tương tác (Weekly Strip & Focus Agenda) làm mặc định tối ưu triệt để khoảng trắng thừa và thanh cuộn ngang, bổ sung thanh Quick KPI Bar (ca/giờ/lớp), highlight ngày Hôm nay và bộ chuyển đổi góc nhìn tức thì [Hàng ngày] | [Lưới tuần thích ứng] | [Theo lớp học Bento] kèm nút tắt 1-chạm Xem lớp & Điểm danh học viên |
| 2026-10-28 | 1.4.8 | Tinh chỉnh hoàn thiện giao diện Lịch dạy cá nhân (/my-schedule): Khắc phục triệt để lỗi thẻ badge Hôm nay (HÔM NAY) bị cắt cụt do overflow-x trên dải 7 ngày bằng cách bổ sung clearance padding-top và căn giữa tuyệt đối; nâng cấp thẻ ca học (Focus Session Card) theo kiến trúc 3 khối Athletic: khối thời gian nổi bật bên trái (khung giờ + thời lượng), khối thông tin lớp học định danh rõ ràng kèm icon võ đạo, và khối nút tác vụ chuẩn pill (Xem lớp + Điểm danh); bổ sung nút tắt 1-chạm [Quay lại Hôm nay] khi xem các ngày khác trong tuần |
| 2026-10-28 | 1.4.9 | Đảo ngược phân cấp thị giác trên thẻ ca học (/my-schedule): Đưa Tên địa điểm giảng dạy (CC Riverside) lên làm tiêu đề chính nổi bật (1.35rem bold) kèm badge NƠI DẠY và pin định vị, chuyển tên lớp (🥋 Lớp 3 5 7) thành chip phụ bên dưới, tối ưu hóa theo đúng phản xạ và nhu cầu thực tế của HLV ("hôm nay tôi phải dạy ở đâu") |
| 2026-10-28 | 1.5.0 | Đồng bộ phân cấp thị giác trên chế độ Xem theo lớp (Class Bento Cards - /my-schedule): Đưa Tên nơi dạy (CC Riverside) lên làm tiêu đề chính nổi bật (1.3rem bold) kèm badge NƠI DẠY và tần suất tuần, chuyển tên lớp (🥋 Lớp 2 4 6 / 🥋 Lớp 3 5 7) thành chip phụ bên dưới, nâng cấp các nút hành động (Chi tiết lớp & Điểm danh) thành pill button chuẩn thể thao |
| 2026-10-28 | 1.6.0 | Triển khai Cổng Quản Trị Founder (/platform-admin) và cơ chế Manual Provisioning: Xác lập vai trò Platform Founder tối cao cho aki251098@gmail.com; migration 038_platform_founder_admin.sql (RLS Founder bypass & stored procedures platform_provision_organization, platform_get_all_organizations, platform_update_organization); giao diện Dashboard thống kê toàn hệ thống, form cấp phép 1-chạm tạo trung tâm và gán quyền Owner cho khách hàng thanh toán (hỗ trợ mô hình 1 tài khoản vừa làm HLV trung tâm này vừa làm Chủ trung tâm khác); khóa chặt tính năng tự tạo bừa bãi tại /create-organization với giao diện liên hệ Founder thanh toán |
| 2026-10-28 | 1.6.1 | Sửa triệt để lỗi font và icon trên Cổng Founder Admin (/platform-admin): Nhúng trực tiếp Google Fonts Inter và Material Icons Round (@import) vào globals.css, chuẩn hóa class .material-icons-round (font-family !important, font-feature-settings: 'liga', inline-flex); tái cấu trúc toàn diện giao diện theo chuẩn Vibrant Athletic Design System: lưới 4 thẻ Bento KPI nổi bật với gradient icon circles, thanh tìm kiếm & segmented filter tabs bo tròn cao cấp, bảng danh sách trung tâm cân đối với avatar chữ viết tắt, badge gói dịch vụ và các nút tác vụ pill (+1 Năm, Khóa/Mở, Vào xem) sắc nét |
| 2026-10-28 | 1.6.2 | Tích hợp Cổng Founder Admin (/platform-admin) trực tiếp vào Layout Dashboard chuẩn (app/(dashboard)/platform-admin): Giữ trọn vẹn Sidebar Yoogi bên trái, mở rộng toàn màn hình (.main-content) giải quyết triệt để lỗi trang bị co cụm vào một góc; đồng bộ 100% theme, font chữ Inter, bảng màu hệ thống và thiết kế Card-Row Entity List chuẩn Yoogi với page-standard.module.css |
| 2026-10-28 | 1.6.3 | Hoàn thiện toàn diện nghiệp vụ bản quyền và khắc phục triệt để lỗi logic trên Cổng Founder Admin (/platform-admin): Sửa lỗi đảo ngược điều kiện khóa/mở (isCurrentlySuspended thay vì isCurrentlyActive), đồng bộ trạng thái React state tức thì kèm thông báo và cập nhật số liệu Bento KPI; bổ sung Modal Chỉnh Sửa Trung Tâm (đổi tên, nâng gói cước, chỉnh hạn dùng); hoàn thiện cơ chế khóa thực tế: tự động chặn người dùng thường khi trung tâm bị khóa (màn hình Trung Tâm Đang Tạm Khóa với nút Đăng xuất & thông tin liên hệ Founder), cảnh báo Founder khi truy cập trung tâm đang khóa; hoàn thiện nút Vào xem (Founder Impersonation) tự động gán quyền Owner cho Founder trên mọi trung tâm; bổ sung migration 039_platform_admin_enhancements.sql |
| 2026-10-28 | 1.6.4 | Tinh chỉnh bố cục thẻ trung tâm trên Cổng Founder Admin (/platform-admin): Chuyển đổi từ CSS Grid 5 cột (bị tràn nút sang hàng 2 khiến khối thông tin bên phải lệch lên trên) sang kiến trúc Flexbox đối xứng 2 khối (.platformCard, .platformCardLeft, .platformCardRight); căn giữa tuyệt đối theo phương đứng (align-items: center) cho toàn bộ khối Badges, Hạn dùng và Quy mô, đảm bảo khoảng cách trên dưới luôn cân bằng hoàn hảo 100% |
| 2026-10-28 | 1.6.5 | Bổ sung tính năng Chuyển Quyền Chủ Sở Hữu (Transfer Organization Ownership) trên Cổng Founder Admin (/platform-admin): Migration 040_platform_transfer_ownership.sql với stored procedure public.platform_transfer_organization_owner atomic kèm fallback trực tiếp; cho phép Founder chuyển giao quyền Owner sang email mới, tự động hạ cấp chủ cũ sang Quản trị viên (Admin) hoặc HLV để không làm gián đoạn lịch dạy/lịch sử, tự động cấp quyền Owner và hồ sơ HLV cho chủ mới; tích hợp nút tắt 1-chạm [Đổi chủ] trên dòng thẻ trung tâm và trong modal Chỉnh sửa trung tâm |
| 2026-10-29 | 1.6.6 | Khắc phục triệt để lỗi treo UI khi chuyển đổi cơ sở/workspace (Sidebar): Tinh chỉnh luồng switchWorkspace trong app/actions/workspace.actions.ts và Sidebar.tsx, tự động điều hướng sang /dashboard hoặc reload toàn diện context layout sau khi đổi cookie yoogi_workspace_id, xóa sạch cache React Query cũ, bổ sung hiệu ứng xoay .animate-spin cho icon sync và xử lý lỗi/fallback mở lại trạng thái nếu có lỗi |
| 2026-10-29 | 1.6.7 | Đồng bộ hóa font chữ & typography giữa Lịch dạy cá nhân (/my-schedule) và Check-in (/my-checkin): Loại bỏ triệt để font-weight 800 (Extra Bold) và cỡ chữ quá khổ (1.35rem) gây mất cân đối thị giác; chuẩn hóa tiêu đề ca dạy về font-size 1.125rem font-weight 600, dải 7 ngày về 1.125rem font-weight 600, khung giờ học về 0.875rem font-weight 600, các huy hiệu và tag về 0.75rem font-weight 600, tạo diện mạo đồng bộ, thanh thoát và liền mạch trên toàn hệ thống |
| 2026-10-29 | 1.6.8 | Đồng bộ hóa toàn diện phong cách thiết kế Thẻ Ca Học Thể Thao (Athletic Session Card) cho cả Tổng quan (/dashboard) và Check-in (/my-checkin) theo chuẩn Lịch dạy (/my-schedule): Thẻ ngang bo góc 20px với dải accent gradient teal bên trái, khối thời gian chuyên dụng (khung giờ + thời lượng ước tính), hàng badge nổi bật (Nơi dạy cam san hô, HLV phụ trách/Dạy thay, trạng thái ca), tiêu đề nơi dạy 1.125rem semibold, chip lớp học võ đạo và hệ thống nút bấm hành động pill bo tròn hoàn hảo (Xem lớp, Check-in ngay gradient, Điểm danh học viên, Đổi HLV/Hủy buổi) |
| 2026-10-29 | 1.6.9 | Bổ sung thông tin Địa điểm dạy (venues) trên Lịch sử điểm danh/Lịch sử buổi dạy (/my-attendance) và Hoạt động & Thu nhập (/my-earnings): Cập nhật hook useMyAttendance truy vấn quan hệ lồng venue_classes(name, venue_id, venues(id, name)); hiển thị cột Địa điểm dạy dạng văn bản chuẩn, sạch sẽ, đồng bộ phong cách với khung giờ và loại bỏ biểu tượng/icon/emote rườm rà trên bảng dữ liệu |
| 2026-10-29 | 1.7.0 | Mở rộng toàn diện giao diện Lịch sử phiên bản (/settings/version-history): Loại bỏ giới hạn co cụm maxWidth: 800px; margin: 0 auto; mở rộng toàn màn hình chuẩn Vibrant Athletic Design System; tích hợp PageHeader với nút Làm mới dữ liệu thời gian thực; lưới 4 thẻ Bento KPI cân đối (Tổng phiên bản, Phiên bản hiện tại, Thay đổi gần nhất, Điểm khôi phục) kèm watermark chìm; thanh công cụ tìm kiếm tức thì & 6 tabs lọc phân loại tác vụ (Tất cả, Tạo mới, Cập nhật, Đã xóa, Khôi phục, Hệ thống); danh sách Thẻ ngang thể thao (PlatformCard) hiển thị capsule phiên bản, avatar tác giả, huy hiệu phân loại, ngày giờ GMT+7 và nút tác vụ pill [Chi tiết] / [Khôi phục]; nâng cấp giao diện Modal Chi tiết phiên bản (maxWidth: 720px) và Modal Xác nhận khôi phục an toàn (maxWidth: 520px) |
| 2026-10-29 | 1.7.1 | Mở rộng toàn diện giao diện Cài đặt Chung / Thông tin trung tâm (/settings): Loại bỏ triệt để giới hạn co cụm max-w-2xl (672px), mở rộng toàn màn hình 100% cân đối hoàn hảo; tích hợp lưới 4 thẻ Bento KPI tổng quan (Tên trung tâm, Gói bản quyền, Hạn dùng, Quyền hạn người dùng) kèm watermark chìm; tái cấu trúc 2 cột thẻ ngang thể thao thích ứng (Thẻ Thông tin tổ chức & Bản quyền SaaS tích hợp khối sao chép Organization ID, Thẻ Dữ liệu Mẫu Kiểm thử 1-chạm tích hợp lưới 6 module dữ liệu) |
| 2026-10-29 | 1.7.2 | Bổ sung tính năng Xóa Toàn Bộ Dữ Liệu (Reset Organization Data) trong Cài đặt (/settings): Migration 041_reset_organization_data.sql với stored procedure public.reset_organization_data atomic kèm fallback; Server Action resetOrganizationDataAction; tích hợp khối Vùng Nguy Hiểm (Danger Zone) và Modal xác nhận 2 tầng bảo vệ với cơ chế gõ chữ xác nhận an toàn (Type-to-confirm: "XÓA DỮ LIỆU"); xóa sạch toàn bộ học viên, chi nhánh, lớp học, lịch học, điểm danh, học phí, sổ quỹ và HLV nhưng bảo toàn tuyệt đối tài khoản Chủ sở hữu (Owner), tên trung tâm và gói bản quyền SaaS |
| 2026-10-29 | 1.7.3 | Khắc phục triệt để lỗi "column organization_id does not exist" khi Xóa Toàn Bộ Dữ Liệu (/settings): Cập nhật 041_reset_organization_data.sql xóa salary_rule_tiers qua rule_id (bảng này không có cột organization_id); loại bỏ tham chiếu dư thừa teacher_salary_sessions; thêm cờ set_config('app.disable_audit', 'true', true) tránh bão trigger khi xóa hàng loạt; tăng cường độ bền vững cho Server Action resetOrganizationDataAction tự động kích hoạt fallback service-role sạch sẽ khi RPC cơ sở dữ liệu gặp lỗi schema cũ |
| 2026-10-30 | 1.8.0 | Tái cấu trúc toàn diện phân hệ Cài đặt (/settings) chuẩn SaaS hiện đại: Bổ sung thanh điều hướng Sub-Nav Tabs (SettingsNavTabs) dùng chung kết nối 5 phân vùng; tách riêng Quản trị dữ liệu (Seed Data & Danger Zone Reset Data) sang /settings/data; tinh chỉnh trang Thông tin trung tâm (/settings) tập trung vào định danh cơ sở & bản quyền SaaS; nâng cấp toàn diện giao diện Thành viên (/settings/members) lên chuẩn Card-Row Entity List kèm KPI 4 ô và Instant Search; nâng cấp giao diện Cấp đai (/settings/belts) với visual dải màu võ đạo (Martial Arts Belt Strips) và KPI phân cấp; loại bỏ triệt để các class Tailwind thừa trên toàn bộ phân hệ Cài đặt |

---

> **⚠️ LƯU Ý QUAN TRỌNG CHO AI/AGENT:**  
> - Trước khi code BẤT KỲ thay đổi nào, PHẢI đọc và tuân thủ Hiến Pháp này.  
> - Sau khi thêm tính năng mới hoặc thay đổi kiến trúc, PHẢI cập nhật Hiến Pháp.  
> - Nếu thay đổi vi phạm Hiến Pháp, PHẢI thông báo cho người dùng và xin phê duyệt trước khi thực hiện.  
> - File này là **tài liệu sống** — luôn phản ánh trạng thái thực tế của dự án.
