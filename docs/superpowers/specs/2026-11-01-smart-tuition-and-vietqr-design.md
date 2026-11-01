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
1. **Mức học phí mặc định theo lớp (`default_tuition_fee`):** Mỗi lớp có mức học phí riêng (ví dụ: Lớp Boxing 600.000đ/tháng, Lớp Taekwondo 500.000đ/tháng). Quản lý cấu hình trong modal lớp học tại `/training/[venueId]` hoặc ngay tại popup tạo học phí.
2. **Tạo học phí cả lớp hàng loạt (Batch Invoicing):** 1-chạm chọn Lớp & Tháng thu phí → Hiện danh sách xem trước tất cả học viên trong lớp kèm học phí mặc định → Tùy chỉnh giảm giá/tích chọn → Sinh toàn bộ khoản thu trong 2 giây.
3. **Mã VietQR động chuẩn Napas 247:** Bấm nút `[VietQR]` trên bất kỳ khoản thu nào sẽ sinh mã QR tự điền đúng STK trung tâm, số tiền nợ còn lại và nội dung `HP <Tên_Học_Viên> <Kỳ_Học>`, phụ huynh quét là chuyển khoản chính xác 100%.
4. **Cấu hình ngân hàng trung tâm:** Cài đặt 1 lần trong `/settings` để toàn bộ mã VietQR dùng chung.
5. **Phiếu thu điện tử thể thao (E-Receipt):** Xem, in và tải ảnh biên lai thu tiền đẹp mắt gửi phụ huynh qua Zalo (hỗ trợ in chuẩn CSS `@media print` qua `window.print()`).
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
Bổ sung phương thức thanh toán (nullable khi chưa nộp), ghi chú, mã biên lai và thời điểm thanh toán:
```sql
ALTER TABLE public.tuition 
  ADD COLUMN IF NOT EXISTS payment_method TEXT 
    CHECK (payment_method IS NULL OR payment_method IN ('cash', 'bank_transfer', 'other')),
  ADD COLUMN IF NOT EXISTS notes TEXT,               -- Ghi chú (học bổng, giảm anh em ruột...)
  ADD COLUMN IF NOT EXISTS receipt_number TEXT,       -- Mã biên lai (vd: PT-2611-001)
  ADD COLUMN IF NOT EXISTS paid_at TIMESTAMPTZ;      -- Thời điểm nộp tiền thực tế

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
  v_has_perm BOOLEAN := false;
BEGIN
  -- Kiểm tra quyền Admin/Owner hoặc có permission manage_tuition (Join đúng profiles.auth_user_id)
  SELECT (
    public.is_org_admin(p_organization_id) OR EXISTS (
      SELECT 1 
      FROM public.organization_members om
      JOIN public.profiles p ON p.id = om.user_id
      WHERE om.organization_id = p_organization_id 
        AND p.auth_user_id = auth.uid() 
        AND (om.role IN ('owner', 'admin') OR om.permissions ? 'manage_tuition')
    )
  ) INTO v_has_perm;

  IF NOT v_has_perm THEN
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
        receipt_number,
        payment_method,
        paid_at
      ) VALUES (
        p_organization_id,
        v_student_id,
        p_class_id,
        v_amount,
        p_due_date,
        'unpaid',
        0,
        v_notes,
        v_receipt_number,
        NULL,
        NULL
      );

      v_count := v_count + 1;
    END IF;
  END LOOP;

  RETURN jsonb_build_object('success', true, 'count', v_count);
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_batch_tuition(UUID, UUID, TEXT, JSONB) TO authenticated;
```

### 2.5 Nâng Cấp RPC `record_tuition_payment` (Đồng Bộ Sang Sổ Quỹ `/finance`)
```sql
DROP FUNCTION IF EXISTS public.record_tuition_payment(UUID, NUMERIC, UUID, UUID);

CREATE OR REPLACE FUNCTION public.record_tuition_payment(
  p_tuition_id UUID,
  p_amount NUMERIC,
  p_organization_id UUID,
  p_created_by UUID,
  p_payment_method TEXT DEFAULT 'cash'
)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_tuition RECORD;
  v_new_paid NUMERIC;
  v_new_status TEXT;
  v_txn_id UUID;
  v_student_name TEXT;
  v_venue_id UUID := NULL;
  v_category_id UUID := NULL;
  v_method TEXT := COALESCE(p_payment_method, 'cash');
BEGIN
  -- 1. Validate amount
  IF p_amount <= 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Số tiền thanh toán phải lớn hơn 0.');
  END IF;

  -- 2. Lock tuition row FOR UPDATE
  SELECT * INTO v_tuition
  FROM public.tuition
  WHERE id = p_tuition_id AND organization_id = p_organization_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Không tìm thấy khoản học phí.');
  END IF;

  -- 3. Check overpayment
  IF v_tuition.paid_amount + p_amount > v_tuition.amount THEN
    RETURN jsonb_build_object('success', false, 'error', 'Số tiền thanh toán vượt quá số nợ còn lại.');
  END IF;

  -- 4. Calculate new status
  v_new_paid := v_tuition.paid_amount + p_amount;
  IF v_new_paid >= v_tuition.amount THEN
    v_new_status := 'paid';
  ELSE
    v_new_status := 'partial';
  END IF;

  -- 5. Lấy venue_id của lớp học
  IF v_tuition.class_id IS NOT NULL THEN
    SELECT venue_id INTO v_venue_id 
    FROM public.venue_classes 
    WHERE id = v_tuition.class_id AND organization_id = p_organization_id;
  END IF;

  -- 6. Lấy category_id chuẩn từ finance_categories (ưu tiên mục "Học phí lớp thường")
  SELECT id INTO v_category_id 
  FROM public.finance_categories 
  WHERE organization_id = p_organization_id 
    AND name = 'Học phí lớp thường'
  LIMIT 1;

  -- 7. Lấy tên học viên để mô tả
  SELECT name INTO v_student_name 
  FROM public.students 
  WHERE id = v_tuition.student_id;

  -- 8. Update tuition
  UPDATE public.tuition
  SET paid_amount = v_new_paid,
      status = v_new_status,
      payment_method = v_method,
      paid_at = NOW(),
      updated_at = NOW()
  WHERE id = p_tuition_id;

  -- 9. Tự động insert Sổ Quỹ finance_transactions với category 2 cấp & venue
  INSERT INTO public.finance_transactions (
    organization_id,
    type,
    category,
    category_id,
    parent_category,
    sub_category,
    amount,
    date,
    description,
    venue_id,
    payment_method,
    source_type,
    source_id,
    reference_id
  ) VALUES (
    p_organization_id,
    'income',
    'Thu học phí',
    v_category_id,
    'Học phí',
    'Học phí lớp thường',
    p_amount,
    to_char(now() at time zone 'Asia/Ho_Chi_Minh', 'YYYY-MM-DD'),
    'Thu học phí - ' || COALESCE(v_student_name, 'Học viên') || ' (Kỳ ' || COALESCE(v_tuition.due_date, '') || ')',
    v_venue_id,
    v_method,
    'TUITION_PAYMENT',
    p_tuition_id,
    p_tuition_id
  ) RETURNING id INTO v_txn_id;

  RETURN jsonb_build_object(
    'success', true, 
    'paid_amount', v_new_paid, 
    'status', v_new_status, 
    'transaction_id', v_txn_id
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.record_tuition_payment(UUID, NUMERIC, UUID, UUID, TEXT) TO authenticated;
```

---

## 3. THIẾT KẾ GIAO DIỆN & TRẢI NGHIỆM NGƯỜI DÙNG (UI/UX)

### 3.1 Bố cục trang Quản lý Học phí (`/tuition`)
1. **PageHeader:**
   - Tiêu đề: *Quản lý Học phí*.
   - Mô tả: *Theo dõi các khoản thu học phí, tạo học phí hàng loạt, VietQR và biên lai*.
   - Cụm Action Buttons:
     - `[Tạo Học Phí Cả Lớp]`: Nút viền bo tròn màu Teal với icon `playlist_add`, mở modal tạo hàng loạt.
     - `[+ Thêm Khoản Thu]`: Nút chính Pill màu Teal nổi bật cho trường hợp thêm lẻ.

2. **Lưới 4 Thẻ Bento KPI Học Phí Cân Đối (`TuitionKpiGrid`):**
   - **Thẻ 1 (Teal - Primary):** *Tổng Phải Thu Trong Kỳ* (`25.000.000 đ`) + Watermark icon `receipt_long`.
   - **Thẻ 2 (Xanh lá - Success):** *Đã Thu Thực Tế* (`18.500.000 đ`) + Caption *Hoàn thành: 74%* + Watermark `paid`.
   - **Thẻ 3 (Đỏ cam - Danger):** *Còn Nợ (Chưa Thu)* (`6.500.000 đ`) + Caption *Cần thu hồi* + Watermark `pending_actions`.
   - **Thẻ 4 (Xanh dương):** *Học Viên Còn Nợ* (`8 võ sinh`) + Caption *Chưa đóng hoặc đóng thiếu* + Watermark `people_outline`.

3. **Thanh Bộ Lọc & Tìm Kiếm Đa Chiều (`TuitionFiltersBar`):**
   - **Kỳ thu phí (Tháng):** Dropdown chọn tháng (mặc định: Tháng hiện tại `YYYY-MM`, Tháng trước, Tất cả).
   - **Lớp học:** Dropdown chọn Lớp (Tất cả lớp | Lớp Taekwondo 2-4-6 | Lớp Boxing...).
   - **Trạng thái:** Segmented pills `Tất cả` | `Chưa đóng` | `Đóng 1 phần` | `Đã đóng đủ`.
   - **Tìm kiếm:** Input tìm kiếm tức thì theo tên học viên.

4. **Bảng Danh Sách Khoản Thu Nâng Cấp:**
   - Cột: Học viên, Lớp học, Kỳ đóng, Phải đóng, Đã đóng, Còn nợ, Trạng thái (Badge màu bo tròn).
   - Cột Thao tác:
     - `[VietQR]`: Luôn có trên mọi khoản thu còn nợ (`remaining > 0`), bấm mở popup VietQR.
     - `[Thu tiền]`: Hiện khi `remaining > 0`, bấm mở Modal ghi nhận thanh toán.
     - `[Biên lai]`: Hiện khi `paid_amount > 0` (đã nộp tiền), bấm mở Phiếu thu điện tử để xem/in.
     - `[Xóa]`: Nút xóa chỉ hiện khi `paid_amount === 0` (chưa phát sinh thanh toán).

5. **Modal Tạo Học Phí Hàng Loạt Cho Lớp (`BatchTuitionModal`):**
   - Bước 1: Chọn Lớp học & Tháng thu phí (`YYYY-MM`).
   - Bước 2: Bảng danh sách học viên trong lớp lấy từ `class_students` (kết hợp thông tin học sinh active):
     - Cột Checkbox (chọn tất cả / bỏ chọn).
     - Cột Học viên (Avatar + Tên).
     - Cột Số tiền: Tự động điền theo `default_tuition_fee` của lớp, cho phép sửa trực tiếp ô input.
     - Cột Ghi chú: Nhập lý do giảm giá nếu có.
     - Thanh tổng kết: *Đã chọn XX/YY học viên • Tổng tiền: ZZZ.000 đ*.
   - Bước 3: Nút bấm `[Xác Nhận Tạo Cho XX Học Viên]`.

6. **Popup VietQR Động Chuẩn Ngân Hàng (`VietQRModal`):**
   - Khi bấm nút `[VietQR]` trên bất kỳ dòng khoản thu nào:
     - Hiển thị thẻ ngân hàng thể thao với logo ngân hàng trung tâm (MB, Vietcombank...).
     - Sinh mã QR VietQR Napas 247 chính xác số tiền nợ còn lại và cú pháp: `HP <Tên_HocVien> <Ky_Hoc>`.
     - Phụ huynh quét bằng app ngân hàng là điền đúng 100% không lo nhầm lẫn.
     - Nút `[Sao chép STK]`, `[Sao chép Cú pháp]`, `[Tải ảnh QR về máy]`.
     - Nếu chưa cài đặt STK: Hiển thị thông báo hướng dẫn và nút dẫn sang Cài đặt.

7. **Modal Ghi Nhận Thanh Toán (`RecordPaymentModal`):**
   - Hiển thị số tiền nợ còn lại.
   - Nhập số tiền đóng.
   - Chọn phương thức: `[💵 Tiền mặt]` hoặc `[🏦 Chuyển khoản]`.
   - Ghi chú thanh toán.
   - Khi lưu: Tự động cập nhật trạng thái học phí và đẩy ngay sang Sổ Quỹ `/finance`.

8. **Modal Phiếu Thu Điện Tử (`TuitionReceiptModal`):**
   - Thiết kế chuẩn mẫu Phiếu Thu Thể Thao: Logo trung tâm, Mã phiếu thu (`PT-YYYYMM-XXXX`), Tên học viên, Lớp học, Kỳ học, Số tiền đã nộp, Phương thức (Tiền mặt/Chuyển khoản), Ngày giờ nộp (`paid_at`).
   - Tối ưu hóa in ấn với CSS `@media print` chuẩn mực: Bấm `[In Phiếu Thu]` gọi `window.print()` trực tiếp mở trình xem trước in hoặc lưu PDF cực kỳ sắc nét mà không cần cài thêm thư viện bên ngoài gây nặng app. Sử dụng kỹ thuật CSS Print Isolation (ẩn toàn bộ Sidebar, Header, Modal Backdrop ngoài và chỉ hiển thị duy nhất khung Phiếu thu thể thao trên trang in khổ A4/A5).

9. **Khu Vực Cài Đặt Ngân Hàng Trong `/settings`:**
   - Thêm khối **Tài Khoản Ngân Hàng Nhận Học Phí (VietQR)** trong Cài đặt trung tâm:
     - Dropdown chọn Ngân hàng (danh mục hơn 50 ngân hàng Việt Nam).
     - Số tài khoản & Tên chủ tài khoản.
     - Nút [Lưu cấu hình ngân hàng].

10. **Cấu Hình Mức Học Phí Mặc Định Của Lớp Học:**
   - Trong Modal Thêm / Chỉnh sửa Lớp học tại Chi tiết Cơ sở (`/training/[venueId]`), bổ sung trường `Học phí mặc định (VNĐ/tháng)` (input số có format hàng nghìn).
   - Tự động lưu vào cột `default_tuition_fee` của bảng `venue_classes`.

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
- Bổ sung helper `removeVietnameseAccents` để chuẩn hóa chuỗi tiếng Việt không dấu (ví dụ: `HP Nguyen Van An 2026-11`), cắt tối đa 50 ký tự nhằm tương thích 100% với các ứng dụng ngân hàng Napas 247 kén ký tự Unicode.
```typescript
export function removeVietnameseAccents(str: string): string {
  return str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .replace(/[^a-zA-Z0-9\s-_]/g, '')
    .trim();
}

export function generateVietQRUrl(params: {
  bankBin: string;
  accountNumber: string;
  accountName: string;
  amount: number;
  addInfo: string;
}): string {
  const sanitizedInfo = removeVietnameseAccents(params.addInfo).slice(0, 50);
  const info = encodeURIComponent(sanitizedInfo);
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
   - Thêm thuộc tính `payment_method`, `notes`, `receipt_number`, `paid_at` trên `tuition`.
   - Tạo SP `create_batch_tuition`.
   - Cập nhật RPC `record_tuition_payment` đồng bộ sang Sổ Quỹ.
2. **Types & Constants:**
   - Tạo `constants/banks.ts` (danh sách ngân hàng Napas VietQR, helper `removeVietnameseAccents`, `generateVietQRUrl`).
   - Tạo mới `types/tuition.ts` (định nghĩa `TuitionItem`, `BatchTuitionPayload`, `ReceiptData`, `TuitionSummary`, v.v.).
   - Mở rộng `types/organization.ts` bổ sung các trường tài khoản ngân hàng.
3. **Server Actions:**
   - Viết `createBatchTuitionAction`, `updateOrgBankSettingsAction`, nâng cấp `recordPaymentAction`.
   - Cập nhật `addTuitionAction` tự sinh `receipt_number`.
4. **UI Components:**
   - Xây dựng `TuitionKpiGrid.tsx`, `TuitionFiltersBar.tsx`.
   - Xây dựng `BatchTuitionModal.tsx`.
   - Xây dựng `VietQRModal.tsx`.
   - Xây dựng `TuitionReceiptModal.tsx`.
   - Thêm khối cấu hình Ngân hàng trong `/settings`.
   - Thêm ô nhập học phí mặc định trong Modal Lớp học tại `/training/[venueId]`.
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
