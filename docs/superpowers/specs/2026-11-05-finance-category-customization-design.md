# TÀI LIỆU THIẾT KẾ: TÙY BIẾN DANH MỤC THU CHI VÀ KHÔI PHỤC TEMPLATE MẪU

> **Ngày tạo:** 2026-11-05  
> **Trạng thái:** Chờ duyệt (Pending Review)  
> **Tác giả:** Antigravity Pairing Assistant & Tech Lead  
> **Phạm vi:** Phân hệ Sổ quỹ & Cài đặt Danh mục Tài chính (`/settings/finance-categories` & `/finance`)

---

## 1. BỐI CẢNH & MỤC TIÊU (PROBLEM STATEMENT & GOALS)

### 1.1 Vấn đề hiện tại
- Hiện tại, các danh mục thu chi được khởi tạo ban đầu mang cờ `is_system = true`, hiển thị ổ khóa cố định và bị chặn xóa/sửa ở cả giao diện lẫn Server Action (`deleteCategoryAction`).
- Giao diện chưa có chức năng **Sửa đổi** (chỉnh sửa tên nhóm, icon, thứ tự) cho cả nhóm cha lẫn mục con.
- Mỗi doanh nghiệp/trung tâm có hệ thống kế toán và phân loại thu - chi đặc thù khác nhau. Việc cố định danh mục gây khó khăn và bất tiện trong thực tế vận hành.
- Người dùng cần toàn quyền tự thiết kế, sửa đổi, tạo mới hoặc xóa cả danh mục cha lẫn danh mục con theo ý muốn.
- Đồng thời, cần có công cụ **Khôi phục / Nạp lại template mẫu mặc định** để khi cần khởi động nhanh hoặc muốn thiết lập lại từ đầu, quản trị viên có thể thao tác chỉ với 1 cú click.

### 1.2 Mục tiêu đạt được
1. **Toàn quyền CRUD cho Admin:** Admin/Owner có quyền Tạo mới, Chỉnh sửa, và Xóa bất kỳ danh mục cha hoặc mục con nào.
2. **Không còn ổ khóa (Unlock All):** Gỡ bỏ hoàn toàn trạng thái khóa cứng `is_system` trên giao diện người dùng.
3. **Bảo toàn dữ liệu lịch sử:** Đảm bảo khi sửa hoặc xóa danh mục, các giao dịch tài chính đã ghi nhận trong quá khứ (`finance_transactions`) và báo cáo lãi lỗ P&L không bao giờ bị mất hoặc hiển thị sai lệch nhờ cơ chế text snapshot.
4. **Tính năng "Khôi phục Mẫu Mặc Định":** Cung cấp nút thao tác an toàn cho phép đặt lại toàn bộ danh mục về mẫu chuẩn ban đầu của hệ thống (kèm hộp thoại xác nhận cảnh báo).

---

## 2. KIẾN TRÚC DỮ LIỆU & BẢO MẬT (DATA INTEGRITY & SECURITY)

### 2.1 Cấu trúc Bảng `finance_categories`
Bảng `finance_categories` đã được thiết kế chuẩn tại migration `044_finance_categories_and_enhancements.sql`:
```sql
CREATE TABLE IF NOT EXISTS public.finance_categories (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  parent_id UUID REFERENCES public.finance_categories(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('income', 'expense')),
  icon TEXT DEFAULT 'category',
  display_order INT DEFAULT 0,
  is_system BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT uq_finance_categories_org_name_parent UNIQUE (organization_id, parent_id, name)
);
```
- Khi xóa nhóm cha (`parent_id IS NULL`), ràng buộc `parent_id REFERENCES ... ON DELETE CASCADE` sẽ tự động xóa sạch các mục con trực thuộc trong cùng tổ chức.

### 2.2 Bảo Vệ Toàn Vẹn Sổ Quỹ & Báo Cáo P&L
- Bảng `finance_transactions` có ràng buộc:
  `FOREIGN KEY (organization_id, category_id) REFERENCES public.finance_categories(organization_id, id) ON DELETE SET NULL;`
- Đồng thời, khi ghi nhận giao dịch, hệ thống luôn lưu trữ snapshot dạng chuỗi ký tự:
  - `parent_category`: Tên nhóm cha tại thời điểm phát sinh.
  - `sub_category`: Tên mục con tại thời điểm phát sinh.
- **Nguyên tắc an toàn:** Khi một danh mục bị xóa, `category_id` trong `finance_transactions` chuyển thành `NULL`, nhưng `parent_category`, `sub_category` và `category` (tên hiển thị) vẫn giữ nguyên vẹn giá trị lịch sử. Báo cáo tài chính P&L tổng hợp theo text snapshot vẫn tính toán chính xác 100%.

### 2.3 Phân Quyền (Permissions)
- Tuân thủ Hiến Pháp §4.1 & §4.3: Chỉ người dùng có vai trò `owner`, `admin` hoặc nắm giữ quyền `manage_settings` / `manage_finance` mới được phép thực hiện các thao tác chỉnh sửa, xóa và khôi phục template.

---

## 3. SERVER ACTIONS (BACKEND API)

Cập nhật và bổ sung trong `app/(dashboard)/finance/actions.ts`:

### 3.1 `updateCategoryAction(id: string, data: { name: string; icon?: string; parent_id?: string | null })`
- **Mục đích:** Chỉnh sửa thông tin danh mục cha hoặc mục con.
- **Xử lý:**
  - Kiểm tra quyền quản trị (`hasPermission`).
  - Validate tên danh mục không được để trống.
  - Cập nhật `name`, `icon` (nếu có), `parent_id` (hỗ trợ chuyển mục con sang nhóm cha khác nếu cần).
  - Cập nhật `updated_at = NOW()`.
  - Bắt lỗi trùng lặp `uq_finance_categories_org_name_parent` và trả thông báo tiếng Việt thân thiện: *"Tên danh mục này đã tồn tại trong nhóm."*.
  - `revalidatePath('/finance')` và `revalidatePath('/settings/finance-categories')`.

### 3.2 `deleteCategoryAction(id: string)` (Cập nhật)
- **Mục đích:** Xóa danh mục cha hoặc mục con.
- **Cải tiến:**
  - **Gỡ bỏ hoàn toàn** đoạn kiểm tra chặn xóa `cat.is_system`.
  - Cho phép xóa bất kỳ danh mục nào thuộc tổ chức của người dùng.
  - Nếu là nhóm cha, CASCADE sẽ tự động xóa các mục con.
  - `revalidatePath` đồng bộ dữ liệu.

### 3.3 `resetDefaultFinanceCategoriesAction()` (Mới)
- **Mục đích:** Đặt lại toàn bộ danh mục Thu - Chi về template mẫu mặc định của hệ thống.
- **Xử lý:**
  - Kiểm tra quyền quản trị.
  - Xóa toàn bộ danh mục hiện có của tổ chức:
    `DELETE FROM finance_categories WHERE organization_id = orgId;`
  - Gọi Stored Procedure nạp lại mẫu chuẩn:
    `SELECT public.seed_default_finance_categories_for_org(orgId);`
  - Revalidate các đường dẫn liên quan.

---

## 4. THIẾT KẾ GIAO DIỆN & TRẢI NGHIỆM NGƯỜI DÙNG (UI/UX)

Tệp triển khai chính: `app/(dashboard)/settings/finance-categories/FinanceCategoriesClient.tsx`

### 4.1 Thanh Tiêu Đề (PageHeader Actions)
- Giữ nút chính: `[+ Thêm Nhóm Cha]` (màu Primary Teal, icon `create_new_folder`).
- Thêm nút phụ: `[Khôi Phục Mẫu Mặc Định]` (variant `secondary`, icon `restart_alt` hoặc `auto_fix_high`).
  - Khi click: Mở Modal xác nhận an toàn với cảnh báo rõ ràng.

### 4.2 Thẻ Nhóm Cha (Parent Card)
- **Header Thẻ:**
  - Biểu tượng icon nhóm (nền màu theo loại Thu/Chi).
  - Tên nhóm cha + nhãn số lượng mục con (ví dụ: `4 danh mục con`).
  - Cụm nút thao tác góc phải:
    - **Nút Sửa (`edit`):** Mở `EditCategoryModal` (cho phép đổi Tên nhóm và chọn Icon từ bảng chọn).
    - **Nút Xóa (`delete_outline`):** Mở hộp thoại xác nhận xóa nhóm cha. Nếu nhóm có mục con, thông báo rõ: *"Nhóm này đang chứa X mục con. Khi xóa, toàn bộ các mục con bên trong cũng sẽ bị xóa. Bạn có chắc chắn muốn xóa không?"*.

### 4.3 Danh Mục Con (Subcategory Chips)
- Gỡ bỏ hoàn toàn biểu tượng ổ khóa (`lock`).
- Mỗi chip hiển thị:
  - Tên mục con.
  - Nút **Sửa** (icon `edit`, kích thước nhỏ): Mở modal nhanh sửa tên mục con (và có thể đổi nhóm cha nếu muốn).
  - Nút **Xóa** (icon `close`): Xóa mục con ngay sau khi người dùng xác nhận.
- Giữ thanh nhập nhanh ở chân thẻ: `+ Thêm mục con cho "[Tên nhóm]"` kèm nút `Thêm` và hỗ trợ phím `Enter`.

### 4.4 Modal Chỉnh Sửa Danh Mục (`EditCategoryModal`)
- Áp dụng chung cho cả nhóm cha và mục con:
  - Nếu là nhóm cha: Cho phép sửa **Tên nhóm cha** và chọn **Biểu tượng (Icon)**.
  - Nếu là mục con: Cho phép sửa **Tên mục con** và chọn lại **Nhóm cha trực thuộc** (dropdown danh sách các nhóm cha cùng loại Thu/Chi).

### 4.5 Modal Xác Nhận Khôi Phục Mẫu (`ResetTemplateModal`)
- Tiêu đề: "Khôi Phục Danh Mục Mẫu Mặc Định"
- Nội dung:
  > ⚠️ **Lưu ý:** Thao tác này sẽ xóa toàn bộ cây danh mục Thu - Chi hiện tại của trung tâm và thiết lập lại bộ danh mục mẫu tiêu chuẩn (Võ thuật & Thể thao).  
  > Các giao dịch tài chính đã phát sinh trước đây vẫn được giữ nguyên vẹn tên lịch sử.
- Nút hành động: "Hủy bỏ" & "Xác Nhận Khôi Phục" (màu Đỏ Danger để cảnh báo rõ tính chất reset).

---

## 5. KẾ HOẠCH KIỂM THỬ & XÁC MINH (VERIFICATION PLAN)

1. **Kiểm tra Tạo mới:**
   - Tạo nhóm cha mới (Thu / Chi).
   - Thêm nhanh mục con qua ô input chân thẻ.
2. **Kiểm tra Chỉnh sửa:**
   - Sửa tên nhóm cha, đổi icon → Kiểm tra giao diện cập nhật ngay.
   - Sửa tên mục con, chuyển mục con sang nhóm cha khác → Kiểm tra vị trí mới chính xác.
3. **Kiểm tra Xóa:**
   - Xóa mục con bất kỳ (kể cả mục trước đây là system).
   - Xóa nhóm cha có chứa mục con → Kiểm tra cả nhóm cha và mục con biến mất, không có lỗi khóa ngoại.
4. **Kiểm tra Khôi phục Mẫu Mặc Định:**
   - Bấm nút Khôi phục mẫu → Xác nhận → Cây danh mục được nạp lại đầy đủ 7 nhóm chuẩn và 23 mục con.
5. **Kiểm tra Toàn vẹn Dữ liệu Sổ Quỹ:**
   - Tạo giao dịch trong `/finance` sử dụng danh mục vừa tạo.
   - Xóa danh mục đó trong Cài đặt.
   - Quay lại `/finance` và kiểm tra giao dịch vẫn hiển thị đúng tên lịch sử, không phát sinh lỗi crash.
6. **Kiểm tra Build & Linter:**
   - Chạy `npm run build` đảm bảo không có lỗi type hoặc compile.
