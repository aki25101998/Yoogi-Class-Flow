# Tái Cấu Trúc Toàn Diện Phân Hệ Cài Đặt (Settings Subsystem Restructure)

> **For agentic workers:** REQUIRED: Use superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Chuẩn hóa và tối ưu toàn diện phân hệ Cài đặt (/settings) theo chuẩn Vibrant Athletic & Martial Arts: bổ sung thanh điều hướng Sub-Nav Tabs liên thông giữa các mục, tách riêng Quản trị dữ liệu (Seed Data & Reset Data) sang /settings/data, nâng cấp giao diện Thành viên và Cấp đai lên chuẩn Card-Row + KPI 4 ô, loại bỏ triệt để Tailwind cũ.

**Architecture:** Tạo shared `SettingsNavTabs` component với active route detection; tạo route `/settings/data` tách biệt tính năng kiểm thử và Danger Zone; tinh chỉnh `/settings` tập trung vào định danh trung tâm & bản quyền; nâng cấp `/settings/members` và `/settings/belts` sang `page-standard.module.css` với KPI grid và entity list.

**Tech Stack:** Next.js 14 App Router, React 18, TanStack Query 5, Vanilla CSS + CSS Modules + CSS Variables (`page-standard.module.css`), Material Icons Round.

---

### Task 1: Tạo Shared Component `SettingsNavTabs`

**Files:**
- Create: `app/(dashboard)/settings/components/SettingsNavTabs.tsx`

- [ ] **Step 1: Tạo component `SettingsNavTabs.tsx`**
  - Hỗ trợ 5 tabs:
    1. 🏢 Thông tin trung tâm (`/settings`)
    2. 👥 Đội ngũ & Phân quyền (`/settings/members`)
    3. 🥋 Hệ thống cấp đai (`/settings/belts`)
    4. 🕒 Lịch sử phiên bản (`/settings/version-history`)
    5. ⚙️ Quản trị dữ liệu (`/settings/data`)
  - Tự động nhận diện tab active qua `usePathname()`
  - Thiết kế Capsule Pill Bar hiện đại, hỗ trợ Dark/Light mode, cuộn ngang mượt mà trên mobile.

---

### Task 2: Tạo Trang Quản Trị Dữ Liệu `/settings/data` & Cập Nhật `/settings`

**Files:**
- Create: `app/(dashboard)/settings/data/page.tsx`
- Create: `app/(dashboard)/settings/data/DataManagementClient.tsx`
- Modify: `app/(dashboard)/settings/SettingsClient.tsx`
- Modify: `app/components/Sidebar.tsx`

- [ ] **Step 1: Tạo `app/(dashboard)/settings/data/page.tsx` và `DataManagementClient.tsx`**
  - Chuyển logic `seedSampleDataAction` và `resetOrganizationDataAction` sang `DataManagementClient.tsx`.
  - Tích hợp `SettingsNavTabs`.
  - Bổ sung Overview KPI 4 ô cho môi trường kiểm thử.
  - Khối nạp dữ liệu mẫu 1-chạm & Vùng nguy hiểm Xóa toàn bộ dữ liệu kèm modal xác nhận.
- [ ] **Step 2: Cập nhật `app/(dashboard)/settings/SettingsClient.tsx`**
  - Tích hợp `SettingsNavTabs`.
  - Loại bỏ khối Seed Data & Danger Zone để trang chuyên biệt cho "Thông tin tổ chức & Bản quyền SaaS".
  - Giữ nguyên Overview KPI 4 ô và bổ sung card thông tin liên hệ / hỗ trợ kỹ thuật Founder.
- [ ] **Step 3: Cập nhật Sidebar Navigation trong `app/components/Sidebar.tsx`**
  - Thêm submenu `Quản trị dữ liệu` (`/settings/data`).

---

### Task 3: Nâng Cấp Giao Diện Thành Viên `/settings/members` Chuẩn Vibrant Athletic

**Files:**
- Modify: `app/(dashboard)/settings/members/MembersClient.tsx`

- [ ] **Step 1: Nâng cấp `MembersClient.tsx`**
  - Tích hợp `SettingsNavTabs`.
  - Loại bỏ toàn bộ Tailwind class cũ (`flex flex-col gap-6`, `p-3 rounded-md`, `text-danger`...).
  - Bổ sung Overview KPI Grid 4 ô: Tổng nhân sự | Quản trị viên (Admin/Owner) | HLV Trưởng & Phụ | Lời mời đang chờ.
  - Bổ sung Toolbar: Instant Search theo tên/email + Filter Pills theo vai trò.
  - Chuyển đổi danh sách sang Card-Row Entity List với avatar chữ viết tắt, tên, email, badge vai trò, nút Đổi vai trò và Xóa/Thu hồi.

---

### Task 4: Nâng Cấp Giao Diện Cấp Đai `/settings/belts` Chuẩn Võ Thuật Trực Quan

**Files:**
- Modify: `app/(dashboard)/settings/belts/BeltsClient.tsx`

- [ ] **Step 1: Nâng cấp `BeltsClient.tsx`**
  - Tích hợp `SettingsNavTabs`.
  - Loại bỏ toàn bộ Tailwind class cũ.
  - Bổ sung Overview KPI Grid tóm tắt cấp đai.
  - Hiển thị danh sách cấp đai dạng Martial Arts Belt Strip / Cards với dải màu đai tự động nhận diện theo tên đai.
  - Modal thêm (bulk/single) và sửa cấp đai theo chuẩn CSS Module và CSS variables.

---

### Task 5: Tích Hợp `SettingsNavTabs` Vào `/settings/version-history`

**Files:**
- Modify: `app/(dashboard)/settings/version-history/components/VersionHistoryClient.tsx`

- [ ] **Step 1: Nhúng `SettingsNavTabs` vào đầu `VersionHistoryClient.tsx`**

---

### Task 6: Kiểm Thử Build, Cập Nhật Hiến Pháp, Push & Deploy

**Files:**
- Modify: `CONSTITUTION.md`

- [ ] **Step 1: Chạy build `npm run build`** để kiểm tra không có lỗi cú pháp hoặc TypeScript.
- [ ] **Step 2: Cập nhật `CONSTITUTION.md`** ghi lại phiên bản 1.8.0.
- [ ] **Step 3: Git commit & push, trigger deploy.**

