# Kế Hoạch Triển Khai: Mục Quản Lý Học Viên Tập Trung (Student Management)

> **For agentic workers:** REQUIRED: Use superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Triển khai mục Quản lý Học viên tập trung trên Sidebar với bảng điều khiển 4 KPI, thanh tìm kiếm & bộ lọc đa chiều, danh sách Card-Row chuẩn Vibrant Athletic và modal thêm/chỉnh sửa nhanh toàn diện.

**Architecture:** Bổ sung tuyến điều hướng `/students` trong `Sidebar.tsx`, tối ưu hook `useStudents.ts` để nạp dữ liệu quan hệ (màu đai `organization_belts.color`, lớp học, chi nhánh, KPI học phí nợ & chuyên cần), hoàn thiện Server Actions `addStudentAction` hỗ trợ gán lớp trực tiếp, và tái thiết kế toàn bộ `StudentsClient.tsx` đồng bộ chuẩn Hiến Pháp.

**Tech Stack:** Next.js App Router, React 18, TypeScript, Supabase (PostgreSQL + RLS), TanStack React Query 5, Vanilla CSS + CSS Variables (`globals.css`, `page-standard.module.css`).

---

### Task 1: Cập Nhật Điều Hướng Sidebar (`app/components/Sidebar.tsx`)

**Files:**
- Modify: `app/components/Sidebar.tsx:16-23`
- Modify: `CONSTITUTION.md:65` (Cập nhật sơ đồ thư mục và tài liệu)

- [ ] **Step 1: Bổ sung menu Học viên vào `ADMIN_NAV` trong `Sidebar.tsx`**
Thêm mục `{ icon: 'groups', label: 'Học viên', route: '/students', permission: 'manage_students' }` vào nhóm `VẬN HÀNH` giữa Huấn luyện viên và Quản lý Đào tạo.

- [ ] **Step 2: Kiểm tra build TypeScript**
Run: `npm run build` hoặc check linter.
Expected: Build không có lỗi cú pháp.

- [ ] **Step 3: Commit**
```powershell
git add app/components/Sidebar.tsx
git commit -m "feat(sidebar): add student management navigation item"
```

---

### Task 2: Nâng Cấp Hook `useStudents.ts` & Server Actions `actions.ts`

**Files:**
- Modify: `hooks/useStudents.ts:1-102`
- Modify: `app/(dashboard)/students/actions.ts:7-68`

- [ ] **Step 1: Nâng cấp `hooks/useStudents.ts`**
  - Truy vấn `organization_belts(id, name, color, display_order)`.
  - Bổ sung query tính 4 chỉ số KPI:
    1. Tổng số võ sinh (`totalStudents`).
    2. Võ sinh đang tập (`activeStudents`).
    3. Học phí chưa hoàn thành (`unpaidTuitionCount`: truy vấn bảng `tuition` với `organization_id` và status `unpaid` / `partial`).
    4. Tỷ lệ đi học (`attendanceRate`: truy vấn bảng `student_session_attendance` để tính % `present`).
  - Lọc lớp học và sắp xếp đai theo `display_order`.

- [ ] **Step 2: Nâng cấp `addStudentAction` trong `app/(dashboard)/students/actions.ts`**
  - Bổ sung tham số `classId?: string` vào `addStudentAction`.
  - Sau khi insert `students`, nếu có `classId`, tự động insert vào `class_students` với `status: 'active'`.

- [ ] **Step 3: Kiểm tra build TypeScript**
Run: `npm run build`
Expected: Không có lỗi TypeScript nào ở hook và action.

- [ ] **Step 4: Commit**
```powershell
git add hooks/useStudents.ts app/(dashboard)/students/actions.ts
git commit -m "feat(students): enhance useStudents with KPI stats and addStudentAction with class enrollment"
```

---

### Task 3: Tái Thiết Kế Toàn Diện `StudentsClient.tsx` Chuẩn Vibrant Athletic

**Files:**
- Modify: `app/(dashboard)/students/StudentsClient.tsx`
- Reference: `app/(dashboard)/coaches/CoachesClient.tsx`
- Reference: `app/styles/page-standard.module.css`

- [ ] **Step 1: Thiết kế giao diện PageHeader & Overview KPI Grid (4 ô)**
  - Tích hợp 4 ô thống kê: Tổng võ sinh, Đang tập luyện (Teal glow), Học phí chưa hoàn thành (Coral glow), Tỷ lệ đi học.
  - Sử dụng watermark chìm võ thuật và caption mô tả chi tiết.

- [ ] **Step 2: Xây dựng thanh công cụ Toolbar Instant Search & Bộ lọc đa chiều**
  - Search input với icon tìm kiếm tức thì theo tên võ sinh, SĐT, tên/SĐT phụ huynh.
  - Dropdown lọc nhanh theo Chi nhánh, Lớp học, Cấp đai, Trạng thái hoạt động.
  - Tích hợp `ExportButton` và `ImportButton` (Excel).

- [ ] **Step 3: Xây dựng danh sách Card-Row Entity List**
  - Thẻ hàng bo góc 20px (`var(--radius-xl)`).
  - Cột Avatar + Họ tên + Tuổi (tính từ ngày sinh `dob`).
  - Cột Cấp đai võ thuật (Badge có màu đai tương ứng `organization_belts.color`).
  - Cột Lớp & Cơ sở đào tạo (Capsule tag hoặc badge "Chưa xếp lớp").
  - Cột Liên hệ (SĐT học viên, SĐT phụ huynh).
  - Cột Trạng thái (Đang học, Bảo lưu, Đã nghỉ).
  - Cột Thao tác căn thẳng hàng (Chỉnh sửa, Xóa).

- [ ] **Step 4: Hoàn thiện Modal Thêm & Chỉnh Sửa Võ Sinh Toàn Diện**
  - Phân nhóm rõ ràng: Thông tin cá nhân, Người giám hộ/Phụ huynh, Đào tạo (chọn Chi nhánh, Lớp học lọc theo chi nhánh, Cấp đai), Trạng thái.
  - Xử lý validation, alert lỗi và loading state.

- [ ] **Step 5: Kiểm tra giao diện và luồng hoạt động**
  - Kiểm tra giao diện trên màn hình Desktop và Responsive.
  - Kiểm tra tính năng tìm kiếm và bộ lọc.
  - Thử thêm võ sinh mới, sửa thông tin võ sinh, đổi lớp học, đổi cấp đai và xóa.

- [ ] **Step 6: Commit**
```powershell
git add app/(dashboard)/students/StudentsClient.tsx
git commit -m "feat(students): revamp StudentsClient with Vibrant Athletic Card-Row, KPI grid and instant filter toolbar"
```

---

### Task 4: Cập Nhật Hiến Pháp Dự Án (`CONSTITUTION.md`) & Đồng Bộ Git/Vercel

**Files:**
- Modify: `CONSTITUTION.md`

- [ ] **Step 1: Cập nhật `CONSTITUTION.md` phiên bản 1.4.1**
  - Ghi nhận việc bổ sung mục Quản lý Học viên tập trung (`/students`) trên Sidebar.
  - Ghi nhận tiêu chuẩn Card-Row, 4 thẻ KPI và bộ lọc đa chiều cho võ sinh.

- [ ] **Step 2: Chạy kiểm tra build toàn diện**
Run: `npm run build`
Expected: Production build thành công 100%.

- [ ] **Step 3: Commit và Push GitHub**
```powershell
git add CONSTITUTION.md
git commit -m "docs: update constitution to v1.4.1 for centralized student management"
git push origin main
```
