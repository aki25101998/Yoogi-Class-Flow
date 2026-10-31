# Thiết Kế Chi Tiết: Nâng Cấp Sổ Quỹ Thu - Chi & Quản Lý Dòng Tiền (Finance & Cashflow Management)

- **Ngày tạo:** 2026-10-31
- **Trạng thái:** Đã được phê duyệt (Approved)
- **Tác giả:** Antigravity & User Pair-Programming
- **Phạm vi:** Trọng tâm 1 — Sổ quỹ thu chi, Danh mục 2 cấp, Gắn cơ sở, Phương thức thanh toán, Bộ lọc thời gian & Biểu đồ trực quan.

---

## 1. TỔNG QUAN & MỤC TIÊU (Overview & Problem Statement)

### 1.1 Vấn đề hiện tại
- Mục Tài chính (`/finance`) của **Yoogi Class Flow** hiện tại rất sơ sài:
  - Chỉ có 3 thẻ KPI tổng hợp (Tổng thu, Tổng chi, Số dư) tính từ trước đến nay, không có bộ lọc thời gian (tháng, quý, năm).
  - Cột `category` trong bảng `finance_transactions` là text tự do do người dùng tự gõ, dẫn đến dữ liệu phân mảnh (ví dụ: *"Tiền điện"*, *"tiền điện"*, *"Điện sinh hoạt"*), không thể nhóm hay phân tích cơ cấu chi phí.
  - Không có thông tin cơ sở/chi nhánh (`venue_id`): Không biết khoản thu/chi này phát sinh tại cơ sở nào (CC Riverside, Diamond Plaza...) hay là chi phí chung của trung tâm.
  - Không phân loại phương thức thanh toán: Không phân biệt dòng tiền mặt tại cơ sở hay chuyển khoản ngân hàng.
  - Chưa có biểu đồ dòng tiền trực quan (xu hướng theo thời gian, tỷ trọng các nhóm chi phí).

### 1.2 Mục tiêu sau khi nâng cấp
1. **Chuẩn hóa Danh mục 2 cấp (2-Level Category Engine):** Cung cấp cây danh mục chuẩn (Nhóm cha → Hạng mục con) chuyên dụng cho trung tâm thể thao/võ thuật, đồng thời cho phép Admin tự thêm/bớt danh mục con tùy biến.
2. **Gắn liền với Cơ sở (Venue Attribution):** Cho phép gán từng giao dịch vào 1 chi nhánh cụ thể hoặc chọn "Chung toàn trung tâm".
3. **Phân loại Phương thức thanh toán:** Ghi nhận tiền mặt (`cash`) hoặc chuyển khoản ngân hàng (`bank_transfer`).
4. **Bộ lọc Thời gian & Đa chiều chuẩn kế toán:** Lọc nhanh theo *Hôm nay, Tuần này, Tháng này (mặc định), Tháng trước, Quý này, Năm nay, Tùy chọn*, kết hợp lọc theo Cơ sở, Loại Thu/Chi, Phương thức thanh toán.
5. **Thống kê & Trực quan hóa Dòng tiền:** 4 thẻ KPI cân đối (Tổng thu, Tổng chi, Lợi nhuận ròng, Cơ cấu tiền mặt vs ngân hàng) cùng 2 biểu đồ trực quan (Xu hướng theo ngày và Cơ cấu chi phí theo nhóm cha).
6. **Tuân thủ Hiến Pháp Dự Án:** RLS bảo mật, Composite Foreign Keys đa tổ chức, Vanilla CSS Variables theo **Vibrant Athletic Design System**, Dark/Light mode đầy đủ.

---

## 2. KIẾN TRÚC CƠ SỞ DỮ LIỆU & MIGRATIONS

Tạo migration mới: `database/rebuild/044_finance_categories_and_enhancements.sql`.

### 2.1 Bảng mới: `finance_categories`
Quản lý cây danh mục 2 cấp linh hoạt theo từng tổ chức (`organization_id`):

```sql
CREATE TABLE IF NOT EXISTS public.finance_categories (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  parent_id UUID REFERENCES public.finance_categories(id) ON DELETE CASCADE, -- NULL nếu là Danh mục Cha (Cấp 1)
  name TEXT NOT NULL,                                                        -- Tên danh mục (vd: Học phí, Bán võ phục, Tiền điện)
  type TEXT NOT NULL CHECK (type IN ('income', 'expense')),                  -- 'income' (Thu) hoặc 'expense' (Chi)
  icon TEXT DEFAULT 'category',                                              -- Icon Material Icons Round
  display_order INT DEFAULT 0,                                               -- Thứ tự sắp xếp hiển thị
  is_system BOOLEAN DEFAULT false,                                           -- true = Danh mục hệ thống mặc định (không cho xóa)
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT uq_finance_categories_org_name_parent UNIQUE (organization_id, parent_id, name)
);

-- Ràng buộc toàn vẹn Multi-tenant
ALTER TABLE public.finance_categories 
  ADD CONSTRAINT uq_finance_categories_org_id UNIQUE (organization_id, id);
```

### 2.2 Cập nhật bảng `finance_transactions`
Bổ sung các trường danh mục 2 cấp, cơ sở và phương thức thanh toán:

```sql
ALTER TABLE public.finance_transactions 
  ADD COLUMN IF NOT EXISTS category_id UUID REFERENCES public.finance_categories(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS parent_category TEXT,       -- Snapshot tên nhóm cha (vd: "Hóa đơn & Mặt bằng")
  ADD COLUMN IF NOT EXISTS sub_category TEXT,          -- Snapshot tên mục con (vd: "Tiền điện")
  ADD COLUMN IF NOT EXISTS venue_id UUID,              -- NULL = "Chung toàn trung tâm"
  ADD COLUMN IF NOT EXISTS payment_method TEXT DEFAULT 'cash' 
    CHECK (payment_method IN ('cash', 'bank_transfer', 'other'));

-- Ràng buộc khóa ngoại composite tới bảng venues
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'fk_finance_transactions_venue' 
      AND table_name = 'finance_transactions'
  ) THEN
    ALTER TABLE public.finance_transactions
      ADD CONSTRAINT fk_finance_transactions_venue 
      FOREIGN KEY (organization_id, venue_id) REFERENCES public.venues(organization_id, id) ON DELETE SET NULL;
  END IF;
END $$;
```

### 2.3 Seed Dữ Liệu Danh Mục Mặc Định (Default 2-Level Tree)
Migration chứa một hàm stored procedure để nạp sẵn danh mục chuẩn 2 cấp cho tất cả các tổ chức hiện có và khi một tổ chức mới được tạo:

- **THU (`income`):**
  - 🥋 **Học phí** (`icon: 'school'`):
    - *Học phí lớp thường*
    - *Học phí kèm 1-1*
    - *Học phí trải nghiệm*
  - 🛍️ **Bán đồ & Dụng cụ** (`icon: 'sports_martial_arts'`):
    - *Võ phục*
    - *Đai tập*
    - *Bảo hộ & Giáp*
    - *Dụng cụ tập luyện*
  - 🏆 **Sự kiện & Khác** (`icon: 'emoji_events'`):
    - *Phí thi thăng đai*
    - *Giải đấu & Giao lưu*
    - *Thu khác*

- **CHI (`expense`):**
  - 🏢 **Hóa đơn & Mặt bằng** (`icon: 'apartment'`):
    - *Thuê mặt bằng*
    - *Tiền điện*
    - *Tiền nước*
    - *Internet & Phần mềm*
  - 👥 **Nhân sự & Đào tạo** (`icon: 'badge'`):
    - *Lương HLV*
    - *Phụ cấp / Thưởng*
    - *Tập huấn HLV*
  - 📦 **Mua sắm & Nhập hàng** (`icon: 'shopping_bag'`):
    - *Nhập võ phục & đai*
    - *Mua thảm & bao cát*
    - *Sửa chữa & Bảo trì*
  - 📢 **Marketing & Vận hành** (`icon: 'campaign'`):
    - *Quảng cáo Facebook/Google*
    - *In ấn poster/đồng phục*
    - *Nước uống & Tiếp khách*

### 2.4 Bảo mật RLS (Row Level Security)
```sql
ALTER TABLE public.finance_categories ENABLE ROW LEVEL SECURITY;

-- 1. Xem danh mục: Tất cả thành viên trong tổ chức
CREATE POLICY "Members can view finance categories" 
  ON public.finance_categories FOR SELECT 
  USING (organization_id IN (SELECT public.get_user_organizations()));

-- 2. Quản lý danh mục: Chỉ Admin/Owner của tổ chức
CREATE POLICY "Admins can manage finance categories" 
  ON public.finance_categories FOR ALL 
  USING (public.is_org_admin(organization_id));
```

---

## 3. THIẾT KẾ GIAO DIỆN & TRẢI NGHIỆM NGƯỜI DÙNG (UI/UX)

### 3.1 Ngôn ngữ Thiết kế (Vibrant Athletic & Martial Arts Design System)
- **Bảng màu:** Electric Teal (`#14B8A6`), Vibrant Coral Orange (`#FF6B35`), Success Green (`#10B981`), Danger Red (`#EF4444`).
- **Giao diện:** Dark Mode (`#090A0F`, `#11141C`) và Light Mode (`#FAF9F6`, `#FFFFFF`).
- **Thẻ & Nút:** Border-radius `20px - 28px` cho Cards, `9999px` (Pill) cho Buttons, Badges và Selectors.

### 3.2 Bố cục trang Sổ Quỹ (`/finance`)
1. **PageHeader:**
   - Tiêu đề: *Quản lý Tài chính & Sổ Quỹ*.
   - Mô tả: *Theo dõi dòng tiền thu chi, phân bổ chi phí và lợi nhuận trung tâm*.
   - Cụm Action Buttons:
     - `[Quản lý Danh mục]` (Nút phụ viền tròn, mở modal quản lý cây danh mục).
     - `[Xuất Excel]` (ExportButton định dạng đẹp theo kỳ lọc).
     - `[+ Thêm Giao Dịch]` (Nút chính Pill màu Teal nổi bật).

2. **Dải Bộ Lọc Thời Gian & Đa Chiều (Time Range & Filter Strip):**
   - **Hàng 1 (Presets thời gian):** `Hôm nay` | `Tuần này` | **`Tháng này` (Mặc định)** | `Tháng trước` | `Quý này` | `Năm nay` | `Tùy chọn...`.
     - Khi chọn *Tùy chọn*, hiện 2 ô Date Picker (Từ ngày - Đến ngày).
   - **Hàng 2 (Bộ lọc thuộc tính):**
     - Cơ sở: `Tất cả cơ sở` | `CC Riverside` | `Diamond Plaza` | `Chung toàn trung tâm`.
     - Loại: `Tất cả` | `Thu (+)` | `Chi (-)`.
     - Phương thức: `Tất cả` | `💵 Tiền mặt` | `🏦 Chuyển khoản`.

3. **Lưới 4 Thẻ Bento KPI Cân Đối (KPI Grid):**
   - **Thẻ 1 (Xanh lá - Success):** *Tổng Thu trong kỳ* (`18.500.000 đ`) + Watermark icon `trending_up`.
   - **Thẻ 2 (Đỏ cam - Danger):** *Tổng Chi trong kỳ* (`12.300.000 đ`) + Watermark icon `trending_down`.
   - **Thẻ 3 (Teal/Đỏ):** *Lợi Nhuận Ròng* (`+6.200.000 đ`) + Caption *Tỷ suất lợi nhuận: 33.5%* + Watermark `account_balance_wallet`.
   - **Thẻ 4 (Xanh dương):** *Cơ Cấu Dòng Tiền* + Chi tiết: *Tiền mặt: 35%* | *Ngân hàng: 65%* + Watermark `payments`.

4. **Khu Vực 2 Biểu Đồ Trực Quan (Cashflow & Cost Structure Charts):**
   - Thiết kế dạng Bento Grid 2 cột:
     - **Biểu đồ Cột Xu hướng Dòng tiền (Cashflow Trend):** Thể hiện lượng Thu (cột xanh) và Chi (cột đỏ) theo từng mốc thời gian trong kỳ. Rê chuột hiển thị Tooltip chi tiết.
     - **Biểu đồ Thanh Phân bổ Chi phí (Expense Distribution):** Thể hiện tỷ trọng (%) từng Nhóm danh mục chi tiêu (*Mặt bằng, Lương HLV, Điện nước, Dụng cụ...*), có thanh progress bar màu sắc sinh động.

5. **Bảng Danh Sách Giao Dịch Nâng Cấp (Enhanced Table):**
   - Cột: **Ngày** | **Danh mục** (Badge nhóm cha + Tên mục con in đậm) | **Cơ sở** (Chip cơ sở hoặc Chung) | **Phương thức** (Icon tiền mặt/chuyển khoản) | **Mô tả** | **Số tiền** (+ Thu xanh, - Chi đỏ) | **Thao tác** (Nút Xóa cho Admin, có bảo vệ giao dịch tự động).

6. **Modal Thêm Giao Dịch Mới (Cascading Form):**
   - Toggle Tabs chọn `[Thu (+)]` hoặc `[Chi (-)]`.
   - Chọn Cơ sở: Dropdown danh sách cơ sở + tùy chọn "Chung toàn trung tâm".
   - Chọn Nhóm Cha: Tự động lọc theo Thu hoặc Chi.
   - Chọn Hạng Mục Con: Tự động tải các mục con của Nhóm cha đã chọn.
   - Nhập Số tiền (VNĐ): Có preview định dạng hàng nghìn trực tiếp (ví dụ: `2,500,000 đ`).
   - Chọn Phương thức: Radio pills chọn `💵 Tiền mặt` hoặc `🏦 Chuyển khoản`.
   - Chọn Ngày & Mô tả thêm.

7. **Modal Quản Lý Danh Mục (Category Settings Modal):**
   - Hiển thị danh sách nhóm cha và các mục con theo dạng cây trực quan.
   - Cho phép Admin thêm nhanh 1 danh mục con vào nhóm cha bất kỳ.
   - Cho phép xóa các danh mục con tùy chỉnh (danh mục hệ thống `is_system=true` được bảo vệ).

---

## 4. LUỒNG DỮ LIỆU & PHÂN QUYỀN (Data Flow & Logic)

### 4.1 Hooks
- `hooks/useFinance.ts`: Nhận `organizationId` và bộ lọc `{ startDate, endDate, venueId, type, paymentMethod }`. Truy vấn Supabase có điều kiện lọc trực tiếp từ server để tối ưu hiệu năng.
- `hooks/useFinanceCategories.ts`: Nhận `organizationId`, trả về danh sách danh mục (cả cha và con), phân tách theo `income` và `expense`.

### 4.2 Server Actions (`app/(dashboard)/finance/actions.ts`)
- `addTransactionAction(data)`:
  - Kiểm tra quyền `manage_finance` (Admin/Owner bypass).
  - Validate: `amount > 0`, `date` hợp lệ YYYY-MM-DD, `category_id` hoặc `category`.
  - Lookup tên nhóm cha và mục con để lưu snapshot vào `parent_category` và `sub_category`.
  - Insert vào `finance_transactions` với `source_type = 'MANUAL'`.
  - `revalidatePath('/finance')`.
- `deleteTransactionAction(id)`:
  - Kiểm tra `source_type !== 'MANUAL'`: Chặn xóa các giao dịch sinh từ Học phí (`TUITION_PAYMENT`) hoặc Lương (`PAYROLL_PAYMENT`).
  - Xóa giao dịch thủ công.
- `addCategoryAction(data)`: Thêm mục con mới vào `finance_categories`.
- `deleteCategoryAction(id)`: Kiểm tra `is_system = false` trước khi xóa.

### 4.3 Tương thích ngược (Backwards Compatibility)
- Các giao dịch cũ trong DB chưa có `parent_category`, `sub_category`, `venue_id`:
  - `parent_category` fallback về giá trị `category` cũ.
  - `venue_id` là `null` hiển thị là *"Chung toàn trung tâm"*.
  - `payment_method` mặc định là `cash`.
  - Không bao giờ gây lỗi hoặc crash màn hình.

---

## 5. KẾ HOẠCH TRIỂN KHAI & TIÊU CHÍ NGHIỆM THU (Acceptance Criteria)

### 5.1 Các Bước Triển Khai
1. **Tạo Migration `044_finance_categories_and_enhancements.sql`:**
   - Tạo bảng `finance_categories` với RLS và indexes.
   - Thêm cột cho bảng `finance_transactions`.
   - Seed cây danh mục 2 cấp chuẩn cho toàn bộ tổ chức.
2. **Cập nhật Types & Hooks:**
   - Định nghĩa types cho `FinanceCategory`, `FinanceTransactionFilters`.
   - Viết hook `useFinanceCategories.ts` và nâng cấp `useFinance.ts`.
3. **Cập nhật Server Actions:**
   - Viết các action thêm/xóa giao dịch có danh mục 2 cấp và action quản lý danh mục con.
4. **Xây dựng UI Components:**
   - Nâng cấp `FinanceClient.tsx` với dải chọn thời gian, bộ lọc đa chiều, 4 thẻ Bento KPI.
   - Xây dựng 2 biểu đồ trực quan (Cashflow trend & Expense structure).
   - Xây dựng Modal Thêm Giao Dịch Cascading Form.
   - Xây dựng Modal Quản Lý Danh Mục.
5. **Kiểm thử & Xác thực:**
   - Chạy test CRUD giao dịch, kiểm tra bộ lọc thời gian, test Dark/Light mode, chạy `npm run build`.
   - Tự động Commit, Push GitHub và Deploy theo quy tắc dự án.

### 5.2 Tiêu Chí Nghiệm Thu (Acceptance Criteria)
- [ ] Dữ liệu danh mục 2 cấp nạp sẵn đầy đủ cho tổ chức.
- [ ] Bộ lọc thời gian hoạt động chuẩn xác (Hôm nay, Tuần này, Tháng này, Tháng trước, Quý này, Năm nay, Tùy chọn).
- [ ] 4 Thẻ KPI và 2 Biểu đồ tính toán và hiển thị chính xác theo dữ liệu trong kỳ lọc.
- [ ] Giao dịch cũ vẫn hiển thị bình thường không lỗi.
- [ ] Chặn xóa giao dịch hệ thống từ Lương và Học phí.
- [ ] Build dự án thành công không lỗi type/linting.
