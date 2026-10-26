# Đặc Tả Thiết Kế: Mục Quản Lý Học Viên Tập Trung (Student Management)

- **Ngày tạo:** 2026-10-26
- **Trạng thái:** Đã thống nhất thiết kế (Approved)
- **Tác giả:** Antigravity & Quản trị viên Yoogi Class Flow
- **Phiên bản:** 1.0.0

---

## 1. Bối Cảnh & Vấn Đề (Problem Statement)

Hiện tại, hệ thống **Yoogi Class Flow** đã có cấu trúc cơ sở dữ liệu hoàn chỉnh cho học viên (`students`, `class_students`, `organization_belts`), cùng tính năng xem học viên theo từng lớp học tại đường dẫn sâu: `Quản lý Đào tạo → Chi nhánh → Lớp học → Chi tiết lớp`.

Tuy nhiên, hệ thống đang gặp các hạn chế lớn về mặt vận hành:
1. **Thiếu mục điều hướng trung tâm:** Trên Sidebar (thanh menu chính), nhóm `VẬN HÀNH` chưa có mục **Học viên**. Quản lý trung tâm không thể xem nhanh toàn bộ học viên của toàn câu lạc bộ trong một màn hình.
2. **Giao diện trang `/students` cũ:** File mã nguồn cũ đang dùng dạng bảng HTML đơn giản, chưa theo chuẩn thiết kế mới nhất **Vibrant Athletic & Martial Arts** (Hiến pháp 1.2.0 – 1.3.12).
3. **Thiếu các chỉ số thống kê & bộ lọc:** Quản lý cần nắm bắt nhanh tình trạng võ sinh đang tập, học phí chưa hoàn thành và tỷ lệ chuyên cần, cũng như khả năng lọc linh hoạt theo cơ sở, lớp học và cấp đai.

---

## 2. Mục Tiêu Thiết Kế (Design Goals)

1. **Điều hướng tiện lợi:** Bổ sung mục **"Học viên"** vào Sidebar trong nhóm `VẬN HÀNH`, ngang hàng với *Huấn luyện viên* và *Quản lý Đào tạo*.
2. **Bảng điều khiển KPI 4 ô cân đối:** Thống kê trực quan:
   - Tổng võ sinh.
   - Đang tập luyện (`active`).
   - Học phí chưa hoàn thành (chưa đóng hoặc nợ một phần từ bảng `tuition`).
   - Tỷ lệ đi học (tỷ lệ chuyên cần từ bảng `student_session_attendance`).
3. **Giao diện Card-Row Entity List hiện đại:** Hiển thị danh sách võ sinh theo các thẻ hàng rộng rãi bo tròn 20px (`var(--radius-xl)`), avatar màu đai/chữ cái đầu, badge cấp đai sắc nét, chip lớp & cơ sở đào tạo, thông tin phụ huynh và cột thao tác căn thẳng tắp.
4. **Bộ lọc & Tìm kiếm tức thì (Instant Toolbar):** Tìm kiếm theo tên học viên, SĐT, tên/SĐT phụ huynh; lọc đa chiều theo Chi nhánh, Lớp học, Cấp đai và Trạng thái.
5. **Modal xem & chỉnh sửa toàn diện:** Hỗ trợ xem thông tin, chỉnh sửa hồ sơ, chuyển lớp, đổi đai, đổi trạng thái và thêm mới võ sinh nhanh chóng mà không cần rời trang.
6. **Nhập / Xuất Excel:** Tích hợp bộ công cụ Excel Import/Export có sẵn.

---

## 3. Kiến Trúc & Điều Hướng (Architecture & Navigation)

### 3.1 Sidebar Navigation (`app/components/Sidebar.tsx`)
Cập nhật mảng cấu hình `ADMIN_NAV`:
```typescript
{
  section: 'VẬN HÀNH',
  items: [
    { icon: 'people', label: 'Huấn luyện viên', route: '/coaches', permission: 'manage_coaches' },
    { icon: 'groups', label: 'Học viên', route: '/students', permission: 'manage_students' },
    { icon: 'school', label: 'Quản lý Đào tạo', route: '/training', permission: 'manage_venues' },
    { icon: 'calendar_month', label: 'Lịch dạy', submenus: [...] }
  ]
}
```
- Phân quyền: Yêu cầu quyền `manage_students` (tài khoản `admin` và `owner` tự động có quyền).
- Tích hợp route prefetch khi người dùng hover qua menu "Học viên" (`utils/prefetch.ts`).

### 3.2 Cấu Trúc Tuyến Route & Tệp Mã Nguồn
- `app/(dashboard)/students/page.tsx`: Server Component kiểm tra phiên đăng nhập và phân quyền (`requireAuth()`), render client view.
- `app/(dashboard)/students/StudentsClient.tsx`: Client Component chính quản lý giao diện, trạng thái bộ lọc, KPI và danh sách.
- `app/(dashboard)/students/actions.ts`: Server Actions cho các nghiệp vụ thêm, sửa, xóa, chuyển lớp và nạp hàng loạt từ Excel.
- `hooks/useStudents.ts`: React Query hook tải danh sách học viên, số liệu KPI và các danh mục tra cứu (venues, classes, belts).

---

## 4. Đặc Tả Giao Diện & Trải Nghiệm (UI/UX Specification)

### 4.1 Page Header
- **Title:** "Quản lý Học viên"
- **Description:** "Quản lý danh sách võ sinh, theo dõi chuyên cần, phân lớp và hồ sơ đào tạo"
- **Action Buttons:**
  - `ExportButton`: Xuất danh sách học viên hiện tại ra file Excel.
  - `ImportButton`: Mở modal tải lên file Excel để nạp dữ liệu hàng loạt.
  - `Thêm Học Viên`: Nút pill gradient Teal (`var(--primary)`), icon `person_add`.

### 4.2 Overview KPI Grid (4 Thẻ Cân Xứng)
Áp dụng bố cục lưới `auto-fit` 4 ô (minmax 240px, 1fr) với watermark võ thuật chìm, icon thể thao và viền phát sáng nhẹ:
1. **Tổng võ sinh:**
   - Giá trị: Tổng số học viên thuộc tổ chức.
   - Icon: `groups` (màu trung tính/Teal).
   - Caption: "Học viên đã đăng ký trong hệ thống".
2. **Đang tập luyện:**
   - Giá trị: Số học viên có `status = 'active'`.
   - Icon: `sports_kabaddi` (Teal glow).
   - Caption: "Võ sinh đang sinh hoạt đều đặn".
3. **Học phí chưa hoàn thành:**
   - Giá trị: Số học viên có bản ghi học phí `unpaid` hoặc `partial` trong kỳ hiện tại.
   - Icon: `pending_actions` (Cam San Hô `var(--accent-energy)` glow).
   - Caption: "Cần nhắc nhở đóng học phí".
4. **Tỷ lệ đi học:**
   - Giá trị: Tỷ lệ % (`present_count / total_attendance_records * 100`).
   - Icon: `fact_check`.
   - Caption: "Chuyên cần toàn trung tâm".

### 4.3 Toolbar Instant Search & Bộ Lọc Nhanh
- **Ô tìm kiếm:** Input pill với icon `search`, tìm kiếm không phân biệt hoa thường theo Họ tên, SĐT võ sinh, Tên phụ huynh, SĐT phụ huynh.
- **Dropdown Chi nhánh:** Lọc theo toàn bộ chi nhánh hoặc một chi nhánh cụ thể.
- **Dropdown Lớp học:** Tự động lọc các lớp học tương ứng với chi nhánh đang chọn.
- **Dropdown Cấp đai:** Lọc theo các cấp đai được định nghĩa trong `organization_belts`.
- **Dropdown Trạng thái:** Tất cả / Đang học / Bảo lưu / Đã nghỉ.

### 4.4 Danh Sách Card-Row Entity List
Mỗi bản ghi học viên hiển thị dưới dạng một thẻ hàng (`Card`) chuẩn kích thước bo góc 20px:
- **Cột Avatar & Họ tên:**
  - Avatar tròn mang chữ cái đầu hoặc màu sắc cấp đai.
  - Họ và tên võ sinh (font Inter/Plus Jakarta Sans in đậm).
  - Phụ đề: Ngày sinh và số tuổi (VD: `15/08/2014 (12 tuổi)`).
- **Cột Cấp đai:**
  - Badge cấp đai với chấm tròn màu sắc hoặc nền tương ứng với màu đai (`organization_belts.color`).
- **Cột Lớp & Chi nhánh:**
  - Capsule pill hiển thị tên Lớp học đang học.
  - Phụ đề: Tên Cơ sở đào tạo (Chi nhánh). Nếu chưa có lớp, hiển thị badge cảnh báo màu cam `"Chưa xếp lớp"`.
- **Cột Liên hệ:**
  - SĐT học viên (nếu có).
  - Tên và SĐT phụ huynh (`PH: Nguyễn Văn B - 0987...`).
- **Cột Trạng thái:**
  - `Đang học`: Badge Teal/Xanh lá.
  - `Bảo lưu`: Badge Cam/Vàng.
  - `Đã nghỉ`: Badge Xám.
- **Cột Thao tác:**
  - Nút `"Chỉnh sửa"` (ghost pill).
  - Nút `"Xóa"` (danger ghost pill, có xác nhận modal hoặc alert an toàn).
  - Căn thẳng hàng dọc toàn bộ trang.

### 4.5 Modal Thêm / Chỉnh Sửa Võ Sinh Toàn Diện
- **Nhóm 1: Thông tin cá nhân:**
  - Họ tên võ sinh (`name`, bắt buộc).
  - Ngày sinh (`dob`, kiểu `date`, bắt buộc — tự động tính tuổi).
  - Số điện thoại học viên (`phone`, tùy chọn).
- **Nhóm 2: Người giám hộ / Phụ huynh:**
  - Họ tên phụ huynh (`parent_name`).
  - Số điện thoại phụ huynh (`parent_phone`).
- **Nhóm 3: Đào tạo & Phân lớp:**
  - Cơ sở đào tạo (`venue_id`, dropdown bắt buộc).
  - Lớp học (`class_id`, dropdown các lớp thuộc cơ sở đã chọn).
  - Cấp đai hiện tại (`current_belt_id`, dropdown theo thứ tự bậc đai).
- **Nhóm 4: Trạng thái:**
  - `status`: `active` (Đang học), `suspended` (Bảo lưu), `inactive` (Đã nghỉ).

---

## 5. Dữ Liệu & Server Actions

### 5.1 Các Bảng Dữ Liệu Liên Quan
- `students`: Bảng chính lưu trữ thông tin võ sinh (`id`, `organization_id`, `name`, `dob`, `phone`, `parent_name`, `parent_phone`, `venue_id`, `current_belt_id`, `status`).
- `class_students`: Bảng quan hệ học viên ↔ lớp học (`class_id`, `student_id`, `status`).
- `organization_belts`: Hệ thống cấp đai (`id`, `name`, `color`, `order_index`).
- `venues` & `venue_classes`: Chi nhánh và các lớp học.
- `tuition`: Học phí học viên (`student_id`, `status`, `amount`, `paid_amount`).
- `student_session_attendance`: Điểm danh chi tiết buổi học (`student_id`, `status`).

### 5.2 Server Actions (`app/(dashboard)/students/actions.ts`)
- `addStudentAction(studentData, classId)`: Thêm học viên vào `students`, nếu có chọn lớp thì tự động tạo bản ghi trong `class_students`.
- `updateStudentAction(studentId, studentData, classId)`: Cập nhật thông tin học viên, đồng thời cập nhật hoặc chuyển lớp trong `class_students`.
- `deleteStudentAction(studentId)`: Xóa học viên an toàn (ràng buộc composite key và RLS).
- `importStudentsBatchAction(records)`: Hỗ trợ nạp danh sách học viên từ file Excel.

---

## 6. Kế Hoạch Kiểm Thử & Xác Nhận (Verification Plan)

1. **Kiểm tra Sidebar:** Đảm bảo mục "Học viên" xuất hiện đúng vị trí trong nhóm `VẬN HÀNH`, hiển thị active highlight khi truy cập `/students`.
2. **Kiểm tra KPI:** Xác minh số liệu 4 thẻ KPI tính toán chính xác dựa trên cơ sở dữ liệu mẫu vừa seed.
3. **Kiểm tra Bộ Lọc & Tìm Kiếm:** Thử tìm kiếm theo tên, số điện thoại; thử lọc theo từng cơ sở, lớp học, cấp đai.
4. **Kiểm tra Thao Tác Thêm/Sửa/Xóa:**
   - Thêm võ sinh mới có kèm lớp và cấp đai.
   - Sửa thông tin võ sinh và chuyển lớp.
   - Xóa võ sinh và xác nhận danh sách cập nhật ngay lập tức.
5. **Kiểm tra Theme:** Đảm bảo toàn bộ giao diện sắc nét, chuẩn tương phản trên cả Light Mode và Dark Mode.
6. **Kiểm tra Hiến Pháp:** Đảm bảo mọi truy vấn có `organization_id`, không dùng Tailwind, tuân thủ kiến trúc phân tầng.
