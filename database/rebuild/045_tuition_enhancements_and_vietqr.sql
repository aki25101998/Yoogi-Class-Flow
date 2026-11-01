-- ==============================================================================
-- 045_tuition_enhancements_and_vietqr.sql
-- Nâng cấp Quản lý Học phí: Mức học phí mặc định, Tạo học phí hàng loạt,
-- Cấu hình VietQR trung tâm, Phiếu thu điện tử và Đồng bộ Sổ Quỹ
-- ==============================================================================

-- 1. THÊM MỨC HỌC PHÍ MẶC ĐỊNH VÀO LỚP HỌC (VENUE_CLASSES) & CỘT AVATAR CHO STUDENTS
ALTER TABLE public.venue_classes
  ADD COLUMN IF NOT EXISTS default_tuition_fee NUMERIC DEFAULT 0;

ALTER TABLE public.students
  ADD COLUMN IF NOT EXISTS avatar_url TEXT;

-- 2. THÊM THÔNG TIN NGÂN HÀNG TRUNG TÂM VÀO TỔ CHỨC (ORGANIZATIONS)
ALTER TABLE public.organizations
  ADD COLUMN IF NOT EXISTS bank_bin TEXT,
  ADD COLUMN IF NOT EXISTS bank_account_number TEXT,
  ADD COLUMN IF NOT EXISTS bank_account_name TEXT,
  ADD COLUMN IF NOT EXISTS bank_name TEXT;

-- 3. BỔ SUNG CỘT CHO BẢNG TUITION PHỤC VỤ BIÊN LAI & THANH TOÁN
ALTER TABLE public.tuition
  ADD COLUMN IF NOT EXISTS payment_method TEXT CHECK (payment_method IS NULL OR payment_method IN ('cash', 'bank_transfer', 'other')),
  ADD COLUMN IF NOT EXISTS notes TEXT,
  ADD COLUMN IF NOT EXISTS receipt_number TEXT,
  ADD COLUMN IF NOT EXISTS paid_at TIMESTAMPTZ;

-- Tạo index hỗ trợ tìm kiếm và tra cứu kỳ học
CREATE INDEX IF NOT EXISTS idx_tuition_org_class_due 
  ON public.tuition (organization_id, class_id, due_date);
CREATE INDEX IF NOT EXISTS idx_tuition_receipt_number 
  ON public.tuition (organization_id, receipt_number);

-- 4. STORED PROCEDURE TẠO HỌC PHÍ HÀNG LOẠT (CREATE_BATCH_TUITION)
CREATE OR REPLACE FUNCTION public.create_batch_tuition(
  p_organization_id UUID,
  p_class_id UUID,
  p_due_date TEXT,
  p_students JSONB -- Array of { student_id: UUID, amount: NUMERIC, notes?: TEXT }
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor_profile_id UUID;
  v_has_permission BOOLEAN;
  v_item JSONB;
  v_student_id UUID;
  v_amount NUMERIC;
  v_notes TEXT;
  v_receipt_no TEXT;
  v_inserted_count INT := 0;
  v_skipped_count INT := 0;
BEGIN
  -- 0. Kiểm tra quyền của người gọi (Admin, Owner hoặc có quyền manage_tuition)
  SELECT p.id INTO v_actor_profile_id
  FROM public.profiles p
  WHERE p.auth_user_id = auth.uid();

  IF v_actor_profile_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Không xác định được danh tính người dùng.');
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM public.organization_members om
    WHERE om.organization_id = p_organization_id
      AND om.user_id = v_actor_profile_id
      AND om.status = 'active'
      AND (
        om.role IN ('owner', 'admin')
        OR om.permissions ? 'manage_tuition'
      )
  ) INTO v_has_permission;

  IF NOT v_has_permission THEN
    RETURN jsonb_build_object('success', false, 'error', 'Bạn không có quyền quản lý học phí.');
  END IF;

  -- 1. Duyệt danh sách học viên và insert an toàn (bỏ qua nếu đã tồn tại)
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_students)
  LOOP
    v_student_id := (v_item->>'student_id')::UUID;
    v_amount := COALESCE((v_item->>'amount')::NUMERIC, 0);
    v_notes := v_item->>'notes';

    -- Bỏ qua nếu số tiền không hợp lệ
    IF v_amount <= 0 THEN
      CONTINUE;
    END IF;

    -- Kiểm tra nếu đã có bản ghi học phí của học sinh này trong kỳ
    IF EXISTS (
      SELECT 1 FROM public.tuition
      WHERE organization_id = p_organization_id
        AND student_id = v_student_id
        AND due_date = p_due_date
        AND (class_id = p_class_id OR (class_id IS NULL AND p_class_id IS NULL))
    ) THEN
      v_skipped_count := v_skipped_count + 1;
      CONTINUE;
    END IF;

    -- Sinh mã biên lai tự động: PT-YYYYMM-XXXX
    v_receipt_no := 'PT-' || REPLACE(p_due_date, '-', '') || '-' || LPAD(FLOOR(RANDOM() * 10000)::TEXT, 4, '0');

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
      created_at,
      updated_at
    ) VALUES (
      p_organization_id,
      v_student_id,
      p_class_id,
      v_amount,
      p_due_date,
      'unpaid',
      0,
      v_notes,
      v_receipt_no,
      NOW(),
      NOW()
    );

    v_inserted_count := v_inserted_count + 1;
  END LOOP;

  RETURN jsonb_build_object(
    'success', true,
    'inserted_count', v_inserted_count,
    'skipped_count', v_skipped_count
  );
END;
$$;

-- 5. CẬP NHẬT RPC GHI NHẬN THANH TOÁN (RECORD_TUITION_PAYMENT)
DROP FUNCTION IF EXISTS public.record_tuition_payment(UUID, NUMERIC, UUID, UUID);
DROP FUNCTION IF EXISTS public.record_tuition_payment(UUID, NUMERIC, UUID, TEXT, UUID);

CREATE OR REPLACE FUNCTION public.record_tuition_payment(
  p_tuition_id UUID,
  p_amount NUMERIC,
  p_organization_id UUID,
  p_payment_method TEXT DEFAULT 'cash',
  p_created_by UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tuition RECORD;
  v_new_paid NUMERIC;
  v_new_status TEXT;
  v_category_id UUID;
  v_venue_id UUID;
  v_student_name TEXT;
  v_txn_id UUID;
  v_method TEXT;
  v_actor_profile_id UUID;
  v_has_permission BOOLEAN;
BEGIN
  -- 0. Kiểm tra quyền của người thực hiện
  SELECT p.id INTO v_actor_profile_id
  FROM public.profiles p
  WHERE p.auth_user_id = auth.uid();

  v_actor_profile_id := COALESCE(v_actor_profile_id, p_created_by);

  IF v_actor_profile_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Không xác định được danh tính người dùng.');
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM public.organization_members om
    WHERE om.organization_id = p_organization_id
      AND om.user_id = v_actor_profile_id
      AND om.status = 'active'
      AND (
        om.role IN ('owner', 'admin')
        OR om.permissions ? 'manage_tuition'
      )
  ) INTO v_has_permission;

  IF NOT v_has_permission THEN
    RETURN jsonb_build_object('success', false, 'error', 'Bạn không có quyền thu học phí.');
  END IF;

  -- 1. Validate số tiền
  IF p_amount IS NULL OR p_amount <= 0 OR p_amount = 'NaN'::NUMERIC OR p_amount = 'Infinity'::NUMERIC THEN
    RETURN jsonb_build_object('success', false, 'error', 'Số tiền thanh toán phải lớn hơn 0 và hợp lệ.');
  END IF;

  -- Chuẩn hóa phương thức thanh toán
  v_method := CASE 
    WHEN p_payment_method IN ('cash', 'bank_transfer', 'other') THEN p_payment_method 
    ELSE 'cash' 
  END;

  -- 2. Khóa dòng bản ghi học phí (SELECT FOR UPDATE)
  SELECT * INTO v_tuition
  FROM public.tuition
  WHERE id = p_tuition_id 
    AND organization_id = p_organization_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Không tìm thấy khoản học phí.');
  END IF;

  -- 3. Tính toán số tiền mới
  v_new_paid := COALESCE(v_tuition.paid_amount, 0) + p_amount;

  -- 4. Chặn thanh toán vượt mức còn nợ
  IF v_new_paid > v_tuition.amount THEN
    RETURN jsonb_build_object(
      'success', false, 
      'error', 'Số tiền thanh toán vượt quá số tiền còn lại. Số tiền còn nợ: ' || (v_tuition.amount - COALESCE(v_tuition.paid_amount, 0))::TEXT
    );
  END IF;

  -- 5. Xác định trạng thái mới
  IF v_new_paid >= v_tuition.amount THEN
    v_new_status := 'paid';
  ELSIF v_new_paid > 0 THEN
    v_new_status := 'partial';
  ELSE
    v_new_status := 'unpaid';
  END IF;

  -- Lấy venue_id từ venue_classes nếu có
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

  -- 8. Cập nhật bảng tuition
  UPDATE public.tuition
  SET paid_amount = v_new_paid,
      status = v_new_status,
      payment_method = v_method,
      paid_at = NOW(),
      updated_at = NOW()
  WHERE id = p_tuition_id;

  -- 9. Tự động insert Sổ Quỹ finance_transactions với category 2 cấp, venue và song hành source_id + reference_id
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

-- 6. PHÂN QUYỀN THỰC THI (GRANT EXECUTE)
REVOKE EXECUTE ON FUNCTION public.create_batch_tuition(UUID, UUID, TEXT, JSONB) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_batch_tuition(UUID, UUID, TEXT, JSONB) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.record_tuition_payment(UUID, NUMERIC, UUID, TEXT, UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.record_tuition_payment(UUID, NUMERIC, UUID, TEXT, UUID) TO authenticated;
