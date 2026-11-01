# Thiết Kế Chi Tiết: Nâng Cấp Quản Lý Học Phí & VietQR Động (Smart Tuition & VietQR Billing)

- **Ngày tạo:** 2026-11-01
- **Trạng thái:** Đã được phê duyệt (Approved)
- **Tác giả:** Antigravity & User Pair-Programming
- **Phạm vi:** Trọng tâm 2 — Quản lý học phí theo lớp, Tạo học phí hàng loạt, Tích hợp VietQR Napas 247 động, Phiếu thu điện tử thể thao và Đồng bộ Sổ Quỹ.

---

## 1. TỔNG QUAN & MỤC TIÊU (Overview & Problem Statement)

### 1.1 Vấn đề hiện tại
- Mục Học phí (`/tuition`) của **Yoogi Class Flow** hiện tại còn nhiều bất cập trong vận hành thực tế:
  - Phải nhập tay từng khoản thu đơn lẻ cho từng học viên. Khi trung tâm có từ 50 đến 200 võ sinh, người quản lý phải lặp lại thao tác hàng trăm lần mỗi đầu tháng.
  - Mỗi lớp chưa có mức học phí mặc định định sẵn, dẫn đến việc phải gõ lại số tiền nhiều lần và dễ nhầm lẫn.
  - Chưa có mã **VietQR động**: Phụ huynh khi chuyển khoản phải tự gõ số tài khoản, số tiền và nội dung, thường xuyên quên ghi tên con hoặc chuyển sai số tiền, gây mất thời gian đối soát công nợ.
  - Chưa có **Phiếu thu điện tử / Biên lai (E-Receipt)** chuyên nghiệp để in hoặc xuất ảnh gửi phụ huynh làm bằng chứng xác nhận nộp tiền.
  - Chưa có bảng tổng hợp công nợ 4 ô KPI (Tổng phải thu, Đã thu, Còn nợ, Số học viên nợ) và bộ lọc theo kỳ/lớp.

### 1.2 Mục tiêu sau khi nâng cấp
1. **Mức học phí mặc định theo lớp (`default_tuition_fee`):** Mỗi lớp có mức học phí riêng (ví dụ: Lớp Boxing 600.000đ/tháng, Lớp Taekwondo 500.000đ/tháng).
2. **Tạo học phí cả lớp hàng loạt (Batch Invoicing):** 1-chạm chọn Lớp & Tháng thu phí → Hiện danh sách xem trước tất cả học viên trong lớp kèm học phí mặc định → Tùy chỉnh giảm giá/tích chọn → Sinh toàn bộ khoản thu trong 2 giây.
3. **Mã VietQR động chuẩn Napas 247:** Bấm nút `[VietQR]` trên bất kỳ khoản thu nào sẽ sinh mã QR tự điền đúng STK trung tâm, số tiền nợ còn lại và nội dung `HP <Tên_Học_Viên> <Kỳ_Học>`, phụ huynh quét là chuyển khoản chính xác 100%.
4. **Cấu hình ngân hàng trung tâm:** Cài đặt 1 lần trong `/settings` để toàn bộ mã VietQR dùng chung.
5. **Phiếu thu điện tử thể thao (E-Receipt):** Xem, in và tải ảnh biên lai thu tiền đẹp mắt gửi phụ huynh qua Zalo.
6. **Đồng bộ tự động sang Sổ Quỹ (`finance_transactions`):** Khi học viên đóng tiền (tiền mặt hoặc chuyển khoản), tự động cập nhật sổ quỹ với đầy đủ danh mục "Học phí", cơ sở của lớp học và phương thức thanh toán.

---

## 2. KIẾN TRÚC CƠ SỞ DỮ LIỆU & MIGRATIONS

Tạo migration mới: `database/rebuild/045_tuition_enhancements_and_vietqr.sql`.

### 2.1 Cập nhật bảng `venue_classes`
Bổ sung mức học phí mặc định cho lớp học:
```sql
ALTER TABLE public.venue_classes 
  ADD COLUMN IF NOT EXISTS default_tuition_fee NUMERIC DEFAULT 0;
```

### 2.2 Cập nhật bảng `organizations`
Lưu thông tin tài khoản ngân hàng thụ hưởng phục vụ sinh mã VietQR:
```sql
ALTER TABLE public.organizations 
  ADD COLUMN IF NOT EXISTS bank_bin TEXT,            -- Mã định danh ngân hàng Napas (vd: '970422' cho MBBank)
  ADD COLUMN IF NOT EXISTS bank_account_number TEXT, -- Số tài khoản nhận tiền
  ADD COLUMN IF NOT EXISTS bank_account_name TEXT,   -- Tên chủ tài khoản (in hoa không dấu)
  ADD COLUMN IF NOT EXISTS bank_name TEXT;           -- Tên ngân hàng hiển thị (vd: 'MBBank')
```

### 2.3 Cập nhật bảng `tuition`
```sql
ALTER TABLE public.tuition 
  ADD COLUMN IF NOT EXISTS payment_method TEXT DEFAULT 'bank_transfer'
    CHECK (payment_method IN ('cash', 'bank_transfer', 'other')),
  ADD COLUMN IF NOT EXISTS notes TEXT,               -- Ghi chú (học bổng, giảm anh em ruột...)
  ADD COLUMN IF NOT EXISTS receipt_number TEXT;       -- Mã biên lai (vd: PT-2611-001)

-- Index tìm kiếm nhanh theo kỳ và lớp
CREATE INDEX IF NOT EXISTS idx_tuition_class_due_date 
  ON public.tuition(organization_id, class_id, due_date);
```

### 2.4 Stored Procedure Tạo Học Phí Hàng Loạt (`create_batch_tuition`)
```sql
CREATE OR REPLACE FUNCTION public.create_batch_tuition(
  p_organization_id UUID,
  p_class_id UUID,
  p_due_date TEXT,
  p_items JSONB -- Mảng: [{"student_id": "...", "amount": 500000, "notes": "..."}]
)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_item JSONB;
  v_student_id UUID;
  v_amount NUMERIC;
  v_notes TEXT;
  v_count INT := 0;
  v_receipt_prefix TEXT;
  v_receipt_number TEXT;
BEGIN
  -- Kiểm tra quyền
  IF NOT public.is_org_admin(p_organization_id) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Bạn không có quyền quản lý học phí.');
  END IF;

  v_receipt_prefix := 'PT-' || replace(p_due_date, '-', '') || '-';

  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items) LOOP
    v_student_id := (v_item->>'student_id')::UUID;
    v_amount := (v_item->>'amount')::NUMERIC;
    v_notes := v_item->>'notes';

    -- Tránh tạo trùng lặp trong cùng kỳ và cùng lớp
    IF NOT EXISTS (
      SELECT 1 FROM public.tuition 
      WHERE organization_id = p_organization_id 
        AND student_id = v_student_id 
        AND class_id = p_class_id 
        AND due_date = p_due_date
    ) THEN
      v_receipt_number := v_receipt_prefix || lpad((floor(random() * 9000) + 1000)::text, 4, '0');

      INSERT INTO public.tuition (
        organization_id,
        student_id,
        class_id,
        amount,
        due_date,
        status,
        paid_amount,
        notes,
        receipt_number
      ) VALUES (
        p_organization_id,
        v_student_id,
        p_class_id,
        v_amount,
        p_due_date,
        'unpaid',
        0,
        v_notes,
        v_receipt_number
      );

      v_count := v_count + 1;
    END IF;
  END LOOP;

  RETURN jsonb_build_object('success', true, 'count', v_count);
END;
$$;
```

### 2.5 Nâng Cấp RPC `record_tuition_payment` (Đồng Bộ Sang Sổ Quỹ `/finance`)
Khi ghi nhận thanh toán học phí:
- Cập nhật số tiền `paid_amount` và trạng thái `paid` (nếu đủ) hoặc `partial` (nếu thiếu).
- Tự động tạo giao dịch `income` trong `finance_transactions`:
  - `type = 'income'`
  - `category = 'Thu học phí'`
  - `parent_category = 'Học phí'`
  - `sub_category = 'Học phí lớp thường'`
  - `venue_id = venue_classes.venue_id` (kế thừa theo chi nhánh của lớp học)
  - `payment_method = p_payment_method` (`cash` hoặc `bank_transfer`)
  - `source_type = 'TUITION_PAYMENT'`
  - `reference_id = p_tuition_id`

---

## 3. THIẾT KẾ GIAO DIỆN & TRẢI NGHIỆM NGƯỜI DÙNG (UI/UX)

### 3.1 Bố cục trang Quản lý Học phí (`/tuition`)
1. **PageHeader:**
   - Tiêu đề: *Quản lý Học phí*.
   - Mô tả: *Theo dõi các khoản thu học phí, tạo học phí hàng loạt, VietQR và biên lai*.
   - Cụm Action Buttons:
     - `[Tạo Học Phí Cả Lớp]` (Nút viền bo tròn màu Teal với icon `playlist_add`, mở modal tạo hàng loạt).
     - `[+ Thêm Khoản Thu]` (Nút chính Pill màu Teal nổi bật cho trường hợp thêm lẻ).

2. **Lưới 4 Thẻ Bento KPI Học Phí Cân Đối (`TuitionKpiGrid`):**
   - **Thẻ 1 (Teal - Primary):** *Tổng Phải Thu Trong Kỳ* (`25.000.000 đ`) + Watermark icon `receipt_long`.
   - **Thẻ 2 (Xanh lá - Success):** *Đã Thu Thực Tế* (`18.500.000 đ`) + Caption *Hoàn thành: 74%* + Watermark `paid`.
   - **Thẻ 3 (Đỏ cam - Danger):** *Còn Nợ (Chưa Thu)* (`6.500.000 đ`) + Caption *Cần thu hồi* + Watermark `pending_actions`.
   - **Thẻ 4 (Xanh dương):** *Học Viên Còn Nợ* (`8 võ sinh`) + Caption *Chưa đóng hoặc đóng thiếu* + Watermark `people_outline`.

3. **Thanh Bộ Lọc & Tìm Kiếm Đa Chiều (`TuitionFiltersBar`):**
   - **Kỳ thu phí (Tháng):** Dropdown chọn tháng (mặc định: Tháng này `YYYY-MM`, Tháng trước, Tất cả).
   - **Lớp học:** Dropdown chọn Lớp (Tất cả lớp | Lớp Taekwondo 2-4-6 | Lớp Boxing...).
   - **Trạng thái:** Segmented pills `Tất cả` | `Chưa đóng` | `Đóng 1 phần` | `Đã đóng đủ`.
   - **Tìm kiếm:** Input tìm kiếm tức thì theo tên học viên.

4. **Modal Tạo Học Phí Hàng Loạt Cho Lớp (`BatchTuitionModal`):**
   - Bước 1: Chọn Lớp học & Tháng thu phí (`YYYY-MM`).
   - Bước 2: Bảng danh sách học viên trong lớp lấy từ `class_students`:
     - Cột Checkbox (chọn tất cả / bỏ chọn).
     - Cột Học viên (Avatar + Tên).
     - Cột Số tiền: Tự động điền theo `default_tuition_fee` của lớp, cho phép sửa trực tiếp ô input.
     - Cột Ghi chú: Nhập lý do giảm giá nếu có.
     - Thanh tổng kết: *Đã chọn XX/YY học viên • Tổng tiền: ZZZ.000 đ*.
   - Bước 3: Nút bấm `[Xác Nhận Tạo Cho XX Học Viên]`.

5. **Popup VietQR Động Chuẩn Ngân Hàng (`VietQRModal`):**
   - Khi bấm nút `[VietQR]` trên bất kỳ dòng khoản thu nào:
     - Hiển thị thẻ ngân hàng thể thao với logo ngân hàng trung tâm (MB, Vietcombank...).
     - Sinh mã QR VietQR Napas 247 chính xác số tiền nợ còn lại và cú pháp: `HP <Tên_HocVien> <Ky_Hoc>`.
     - Phụ huynh quét bằng app ngân hàng là điền đúng 100% không lo nhầm lẫn.
     - Nút `[Sao chép STK]`, `[Sao chép Cú pháp]`, `[Tải ảnh QR về máy]`.
     - Nếu chưa cài đặt STK: Hiển thị thông báo hướng dẫn và nút dẫn sang Cài đặt.

6. **Modal Ghi Nhận Thanh Toán (`RecordPaymentModal`):**
   - Hiển thị số tiền nợ còn lại.
   - Nhập số tiền đóng.
   - Chọn phương thức: `[💵 Tiền mặt]` hoặc `[🏦 Chuyển khoản]`.
   - Ghi chú thanh toán.
   - Khi lưu: Tự động cập nhật trạng thái học phí và đẩy ngay sang Sổ Quỹ `/finance`.

7. **Modal Phiếu Thu Điện Tử (`TuitionReceiptModal`):**
   - Thiết kế chuẩn mẫu Phiếu Thu Thể Thao: Logo trung tâm, Mã phiếu thu (`PT-YYYYMM-XXXX`), Tên học viên, Lớp học, Kỳ học, Số tiền đã nộp, Phương thức (Tiền mặt/Chuyển khoản), Ngày giờ nộp.
   - Nút `[In Phiếu Thu]` / `[Tải Ảnh Phiếu Thu]`.

8. **Khu Vực Cài Đặt Ngân Hàng Trong `/settings`:**
   - Thêm khối **Tài Khoản Ngân Hàng Nhận Học Phí (VietQR)** trong Cài đặt trung tâm:
     - Dropdown chọn Ngân hàng (danh mục hơn 50 ngân hàng Việt Nam).
     - Số tài khoản & Tên chủ tài khoản.
     - Nút [Lưu cấu hình ngân hàng].

---

## 4. LUỒNG DỮ LIỆU & PHÂN QUYỀN (Data Flow & Logic)

### 4.1 Danh Mục Ngân Hàng Việt Nam (`constants/banks.ts`)
Tạo file danh mục ngân hàng Việt Nam hỗ trợ chuẩn Napas 247 (VietQR):
- MBBank (`bin: '970422'`)
- Vietcombank (`bin: '970436'`)
- Techcombank (`bin: '970407'`)
- ACB (`bin: '970416'`)
- VPBank (`bin: '970432'`)
- TPBank (`bin: '970423'`)
- BIDV (`bin: '970418'`)
- Agribank (`bin: '970405'`)
- Sacombank (`bin: '970403'`)
- VietinBank (`bin: '970415'`)
- ... cùng đầy đủ các ngân hàng khác.

### 4.2 Cú Pháp Sinh VietQR Chuẩn
```typescript
export function generateVietQRUrl(params: {
  bankBin: string;
  accountNumber: string;
  accountName: string;
  amount: number;
  addInfo: string;
}): string {
  const info = encodeURIComponent(params.addInfo);
  const name = encodeURIComponent(params.accountName);
  return `https://img.vietqr.io/image/${params.bankBin}-${params.accountNumber}-compact2.png?amount=${params.amount}&addInfo=${info}&accountName=${name}`;
}
```

### 4.3 Phân Quyền
- Bắt buộc quyền `manage_tuition` hoặc vai trò Admin/Owner để tạo học phí hàng loạt, thêm mới hoặc ghi nhận thanh toán.
- Bắt buộc quyền `manage_settings` hoặc Admin/Owner để cấu hình thông tin ngân hàng trung tâm.
- Chặn xóa tuyệt đối nếu khoản học phí đã phát sinh thanh toán (`paid_amount > 0`).

---

## 5. KẾ HOẠCH TRIỂN KHAI & TIÊU CHÍ NGHIỆM THU

### 5.1 Các Bước Triển Khai
1. **Migration `045_tuition_enhancements_and_vietqr.sql`:**
   - Thêm `default_tuition_fee` trên `venue_classes`.
   - Thêm thông tin ngân hàng trên `organizations`.
   - Thêm thuộc tính trên `tuition`.
   - Tạo SP `create_batch_tuition`.
   - Cập nhật RPC `record_tuition_payment` đồng bộ sang Sổ Quỹ.
2. **Types & Constants:**
   - Tạo `constants/banks.ts` (danh sách ngân hàng Napas VietQR).
   - Mở rộng `types/tuition.ts` và `types/organization.ts`.
3. **Server Actions:**
   - Viết `createBatchTuitionAction`, `updateOrgBankSettingsAction`, nâng cấp `recordPaymentAction`.
4. **UI Components:**
   - Xây dựng `TuitionKpiGrid.tsx`, `TuitionFiltersBar.tsx`.
   - Xây dựng `BatchTuitionModal.tsx`.
   - Xây dựng `VietQRModal.tsx`.
   - Xây dựng `TuitionReceiptModal.tsx`.
   - Thêm khối cấu hình Ngân hàng trong `/settings`.
5. **Tích Hợp `TuitionClient.tsx` & Kiểm Thử:**
   - Ráp nối toàn bộ giao diện học phí mới.
   - Chạy `npm run build` kiểm tra toàn diện.
   - Commit, push GitHub và deploy tự động.

### 5.2 Tiêu Chí Nghiệm Thu
- [ ] Mức học phí mặc định của lớp được lưu trữ và nạp tự động khi tạo học phí hàng loạt.
- [ ] Tạo học phí hàng loạt cho lớp sinh đúng số lượng học sinh trong 1 transaction an toàn, không bị trùng lặp.
- [ ] Mã VietQR hiển thị chính xác STK, tên chủ tài khoản, số tiền nợ còn lại và nội dung chuyển khoản chuẩn Napas.
- [ ] Ghi nhận thanh toán tự động cập nhật trạng thái và tạo giao dịch trong Sổ Quỹ `/finance` có gắn đúng cơ sở và phương thức thanh toán.
- [ ] Phiếu thu điện tử hiển thị sắc nét, hỗ trợ in ấn.
- [ ] Build Next.js thành công 100% không có lỗi.
