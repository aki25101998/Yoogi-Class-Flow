# Smart Tuition & Dynamic VietQR Billing Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Upgrade Yoogi Class Flow Tuition management with class-level default tuition fees, 1-click batch tuition generation for classes with enrolled student preview, dynamic Napas 247 VietQR codes with sanitized transfer info, central organization bank settings, printable electronic receipts with CSS print isolation, and atomic finance ledger synchronization.

**Architecture:** 
1. Database migration `045_tuition_enhancements_and_vietqr.sql` adds `default_tuition_fee` to `venue_classes`, central bank credentials to `organizations`, payment & receipt metadata to `tuition`, atomic batch SP `create_batch_tuition`, and atomic payment RPC `record_tuition_payment`.
2. TypeScript types & constants in `constants/banks.ts`, `types/tuition.ts`, and `types/organization.ts`.
3. Server Actions for batch creation, bank settings, class fee persistence, and enhanced payment recording.
4. Athletic martial-arts themed UI components: `TuitionKpiGrid`, `TuitionFiltersBar`, `BatchTuitionModal`, `VietQRModal`, `TuitionReceiptModal`, and central bank settings card.
5. End-to-end integration in `TuitionClient.tsx` and verification via `npm run build`.

**Tech Stack:** Next.js 14 App Router, TypeScript, React Query v5, Supabase PostgreSQL (RPC / RLS), CSS Modules (Athletic Martial Arts design system).

---

### Task 1: Database Migration `045_tuition_enhancements_and_vietqr.sql`

**Files:**
- Create: `database/rebuild/045_tuition_enhancements_and_vietqr.sql`

- [ ] **Step 1: Write SQL migration file**
  Add columns to `venue_classes`, `organizations`, and `tuition`. Create `create_batch_tuition` and replace `record_tuition_payment` with atomic payment logic, `source_id` + `reference_id` sync, and permission checks.

```sql
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
```

- [ ] **Step 2: Commit migration file**
```bash
git add database/rebuild/045_tuition_enhancements_and_vietqr.sql
git commit -m "feat(database): add migration 045 for tuition enhancements and vietqr"
```

---

### Task 2: Constants & Types Definition

**Files:**
- Create: `constants/banks.ts`
- Create: `types/tuition.ts`
- Modify: `types/organization.ts:5-15`

- [ ] **Step 1: Create `constants/banks.ts`**
  Implement the list of Vietnamese banks supporting Napas 247 VietQR, along with `removeVietnameseAccents` and `generateVietQRUrl`.

```typescript
export interface BankDefinition {
  bin: string;
  shortName: string;
  name: string;
  logo: string;
}

export const VIETNAM_BANKS: BankDefinition[] = [
  { bin: '970422', shortName: 'MBBank', name: 'Ngân hàng Quân Đội', logo: 'https://api.vietqr.io/img/MB.png' },
  { bin: '970436', shortName: 'Vietcombank', name: 'Ngân hàng Ngoại Thương Việt Nam', logo: 'https://api.vietqr.io/img/VCB.png' },
  { bin: '970407', shortName: 'Techcombank', name: 'Ngân hàng Kỹ Thương Việt Nam', logo: 'https://api.vietqr.io/img/TCB.png' },
  { bin: '970416', shortName: 'ACB', name: 'Ngân hàng Á Châu', logo: 'https://api.vietqr.io/img/ACB.png' },
  { bin: '970432', shortName: 'VPBank', name: 'Ngân hàng Việt Nam Thịnh Vượng', logo: 'https://api.vietqr.io/img/VPB.png' },
  { bin: '970423', shortName: 'TPBank', name: 'Ngân hàng Tiên Phong', logo: 'https://api.vietqr.io/img/TPB.png' },
  { bin: '970418', shortName: 'BIDV', name: 'Ngân hàng Đầu tư và Phát triển VN', logo: 'https://api.vietqr.io/img/BIDV.png' },
  { bin: '970405', shortName: 'Agribank', name: 'Ngân hàng Nông nghiệp & PTNT VN', logo: 'https://api.vietqr.io/img/VBA.png' },
  { bin: '970403', shortName: 'Sacombank', name: 'Ngân hàng Sài Gòn Thương Tín', logo: 'https://api.vietqr.io/img/STB.png' },
  { bin: '970415', shortName: 'VietinBank', name: 'Ngân hàng Công Thương Việt Nam', logo: 'https://api.vietqr.io/img/CTG.png' },
  { bin: '970448', shortName: 'OCB', name: 'Ngân hàng Phương Đông', logo: 'https://api.vietqr.io/img/OCB.png' },
  { bin: '970441', shortName: 'VIB', name: 'Ngân hàng Quốc tế Việt Nam', logo: 'https://api.vietqr.io/img/VIB.png' },
  { bin: '970428', shortName: 'NamABank', name: 'Ngân hàng Nam Á', logo: 'https://api.vietqr.io/img/NAB.png' },
  { bin: '970454', shortName: 'VietCapitalBank', name: 'Ngân hàng Bản Việt', logo: 'https://api.vietqr.io/img/BVB.png' },
  { bin: '970429', shortName: 'SCB', name: 'Ngân hàng TMCP Sài Gòn', logo: 'https://api.vietqr.io/img/SCB.png' },
  { bin: '970437', shortName: 'HDBank', name: 'Ngân hàng Phát triển TP.HCM', logo: 'https://api.vietqr.io/img/HDB.png' },
  { bin: '970443', shortName: 'SHB', name: 'Ngân hàng Sài Gòn - Hà Nội', logo: 'https://api.vietqr.io/img/SHB.png' },
  { bin: '970414', shortName: 'OceanBank', name: 'Ngân hàng Đại Dương', logo: 'https://api.vietqr.io/img/OJBK.png' },
  { bin: '970438', shortName: 'BaoVietBank', name: 'Ngân hàng Bảo Việt', logo: 'https://api.vietqr.io/img/BVBANK.png' },
  { bin: '970426', shortName: 'MSB', name: 'Ngân hàng Hàng Hải', logo: 'https://api.vietqr.io/img/MSB.png' }
];

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

- [ ] **Step 2: Create `types/tuition.ts`**
  Define `TuitionItem`, `TuitionStatus`, `TuitionPaymentMethod`, `TuitionFilters`, `TuitionSummary`, `BatchStudentItem`, and `ReceiptData`.

```typescript
export type TuitionStatus = 'unpaid' | 'partial' | 'paid';
export type TuitionPaymentMethod = 'cash' | 'bank_transfer' | 'other';

export interface TuitionItem {
  id: string;
  organization_id: string;
  student_id: string;
  class_id?: string | null;
  amount: number;
  due_date: string; // YYYY-MM
  status: TuitionStatus;
  paid_amount: number;
  payment_method?: TuitionPaymentMethod | null;
  notes?: string | null;
  receipt_number?: string | null;
  paid_at?: string | null;
  created_at?: string;
  updated_at?: string;
  students?: {
    id: string;
    name: string;
    avatar_url?: string | null;
    phone?: string | null;
  } | null;
  venue_classes?: {
    id: string;
    name: string;
    venue_id?: string | null;
    default_tuition_fee?: number | null;
  } | null;
}

export interface TuitionFilters {
  month: string; // YYYY-MM
  classId: 'all' | string;
  status: 'all' | TuitionStatus;
  search: string;
}

export interface TuitionSummary {
  totalExpected: number;
  totalCollected: number;
  totalRemaining: number;
  collectionRate: number; // 0 to 100
  totalStudents: number;
  debtStudentsCount: number;
}

export interface BatchStudentItem {
  student_id: string;
  name: string;
  avatar_url?: string | null;
  phone?: string | null;
  amount: number;
  notes: string;
  isSelected: boolean;
}

export interface ReceiptData {
  receipt_number: string;
  student_name: string;
  class_name: string;
  due_date: string;
  amount: number;
  paid_amount: number;
  remaining: number;
  payment_method: TuitionPaymentMethod;
  paid_at: string;
  notes?: string | null;
  org_name: string;
  bank_name?: string | null;
  bank_account_number?: string | null;
  bank_account_name?: string | null;
}
```

- [ ] **Step 3: Modify `types/organization.ts`**
  Add bank details to the `Organization` interface:
```typescript
export interface Organization {
  id: string;
  name: string;
  owner_id: string;
  subscription_plan: string;
  subscription_status: string;
  subscription_started_at: string | null;
  subscription_expires_at: string | null;
  bank_bin?: string | null;
  bank_account_number?: string | null;
  bank_account_name?: string | null;
  bank_name?: string | null;
  created_at: string;
  updated_at: string;
}
```

- [ ] **Step 4: Commit types and constants**
```bash
git add constants/banks.ts types/tuition.ts types/organization.ts
git commit -m "feat(types): add tuition types, organization bank fields, and vietqr constants"
```

---

### Task 3: Data Hooks (`hooks/useTuition.ts` and `hooks/useClassStudents.ts`)

**Files:**
- Modify: `hooks/useTuition.ts`
- Create: `hooks/useClassStudents.ts`

- [ ] **Step 1: Update `hooks/useTuition.ts`**
  Enhance queries to fetch `students(id, name, avatar_url, phone)` and `venue_classes(id, name, venue_id, default_tuition_fee)`.
  Add computation helper for `TuitionSummary` and client-side filtering support.

```typescript
import { useQuery } from '@tanstack/react-query';
import { createClient } from '@/utils/supabase/client';
import { TuitionItem, TuitionSummary, TuitionFilters } from '@/types/tuition';

export function useTuition(organizationId: string | undefined) {
  const supabase = createClient();

  const { data: tuitionList = [], isLoading: isTuitionLoading, refetch } = useQuery<TuitionItem[]>({
    queryKey: ['tuition', organizationId],
    queryFn: async () => {
      if (!organizationId) return [];
      const { data, error } = await supabase
        .from('tuition')
        .select(`
          *,
          students (id, name, avatar_url, phone),
          venue_classes (id, name, venue_id, default_tuition_fee)
        `)
        .eq('organization_id', organizationId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return (data || []) as TuitionItem[];
    },
    enabled: !!organizationId,
  });

  const { data: students = [], isLoading: isStudentsLoading } = useQuery({
    queryKey: ['activeStudents', organizationId],
    queryFn: async () => {
      if (!organizationId) return [];
      const { data, error } = await supabase
        .from('students')
        .select('id, name, avatar_url, phone')
        .eq('organization_id', organizationId)
        .eq('status', 'active');
      if (error) throw error;
      return data || [];
    },
    enabled: !!organizationId,
  });

  const { data: classes = [], isLoading: isClassesLoading } = useQuery({
    queryKey: ['activeClasses', organizationId],
    queryFn: async () => {
      if (!organizationId) return [];
      const { data, error } = await supabase
        .from('venue_classes')
        .select('id, name, venue_id, default_tuition_fee, status')
        .eq('organization_id', organizationId)
        .eq('status', 'active');
      if (error) throw error;
      return data || [];
    },
    enabled: !!organizationId,
  });

  // Calculate summary based on filtered list
  const calculateSummary = (items: TuitionItem[]): TuitionSummary => {
    let totalExpected = 0;
    let totalCollected = 0;
    const uniqueStudents = new Set<string>();
    const debtStudents = new Set<string>();

    items.forEach((item) => {
      const amount = Number(item.amount) || 0;
      const paid = Number(item.paid_amount) || 0;
      totalExpected += amount;
      totalCollected += paid;
      if (item.student_id) {
        uniqueStudents.add(item.student_id);
        if (amount - paid > 0) {
          debtStudents.add(item.student_id);
        }
      }
    });

    const totalRemaining = Math.max(0, totalExpected - totalCollected);
    const collectionRate = totalExpected > 0 ? Math.round((totalCollected / totalExpected) * 100) : 0;

    return {
      totalExpected,
      totalCollected,
      totalRemaining,
      collectionRate,
      totalStudents: uniqueStudents.size,
      debtStudentsCount: debtStudents.size,
    };
  };

  return {
    tuitionList,
    students,
    classes,
    calculateSummary,
    refetch,
    isLoading: isTuitionLoading || isStudentsLoading || isClassesLoading,
  };
}
```

- [ ] **Step 2: Create `hooks/useClassStudents.ts`**
  Query students enrolled in a specific class for the batch tuition modal.

```typescript
import { useQuery } from '@tanstack/react-query';
import { createClient } from '@/utils/supabase/client';

export interface ClassEnrolledStudent {
  id: string;
  student_id: string;
  name: string;
  avatar_url?: string | null;
  phone?: string | null;
}

export function useClassStudents(classId: string | undefined, organizationId: string | undefined) {
  const supabase = createClient();

  return useQuery<ClassEnrolledStudent[]>({
    queryKey: ['class_students_enrolled', classId, organizationId],
    queryFn: async () => {
      if (!classId || !organizationId) return [];

      const { data, error } = await supabase
        .from('class_students')
        .select(`
          id,
          student_id,
          status,
          students (id, name, avatar_url, phone, status)
        `)
        .eq('class_id', classId)
        .eq('organization_id', organizationId)
        .eq('status', 'active');

      if (error) throw error;

      return (data || [])
        .filter((row: any) => row.students && row.students.status === 'active')
        .map((row: any) => ({
          id: row.id,
          student_id: row.student_id,
          name: row.students.name,
          avatar_url: row.students.avatar_url,
          phone: row.students.phone,
        }));
    },
    enabled: !!classId && !!organizationId,
  });
}
```

- [ ] **Step 3: Commit hooks**
```bash
git add hooks/useTuition.ts hooks/useClassStudents.ts
git commit -m "feat(hooks): update useTuition with summary and add useClassStudents"
```

---

### Task 4: Server Actions (`tuition/actions.ts`, `settings/actions.ts`, `training/actions.ts`)

**Files:**
- Modify: `app/(dashboard)/tuition/actions.ts`
- Modify: `app/(dashboard)/settings/actions.ts`
- Modify: `app/(dashboard)/training/actions.ts`

- [ ] **Step 1: Update `app/(dashboard)/tuition/actions.ts`**
  - Update `addTuitionAction` to auto-generate `receipt_number`.
  - Add `createBatchTuitionAction` calling RPC `create_batch_tuition`.
  - Update `recordPaymentAction` to accept `paymentMethod` and `notes`.

```typescript
'use server';

import { createClient } from '@/utils/supabase/server';
import { getCurrentOrganizationContext } from '@/services/organization.service';
import { revalidatePath } from 'next/cache';
import { TuitionPaymentMethod } from '@/types/tuition';

export async function addTuitionAction(data: {
  student_id: string;
  class_id?: string | null;
  amount: number;
  due_date: string;
  notes?: string;
}) {
  const context = await getCurrentOrganizationContext();
  if (!context || !context.organization) return { success: false, error: 'Access Denied' };

  if (!data.amount || data.amount <= 0 || !isFinite(data.amount)) {
    return { success: false, error: 'Số tiền học phí phải lớn hơn 0 và hợp lệ.' };
  }

  const supabase = await createClient();
  const orgId = context.organization.id;

  // Verify student belongs to org
  const { data: student } = await supabase
    .from('students')
    .select('id')
    .eq('id', data.student_id)
    .eq('organization_id', orgId)
    .single();

  if (!student) {
    return { success: false, error: 'Học viên không tồn tại trong tổ chức này.' };
  }

  // Generate receipt_number: PT-YYYYMM-XXXX
  const randomSuffix = Math.floor(1000 + Math.random() * 9000).toString();
  const cleanDueDate = data.due_date.replace(/-/g, '');
  const receiptNumber = `PT-${cleanDueDate}-${randomSuffix}`;

  const { error } = await supabase.from('tuition').insert({
    organization_id: orgId,
    student_id: data.student_id,
    class_id: data.class_id || null,
    amount: data.amount,
    due_date: data.due_date,
    status: 'unpaid',
    paid_amount: 0,
    receipt_number: receiptNumber,
    notes: data.notes || null,
  });

  if (error) return { success: false, error: error.message };

  revalidatePath('/tuition');
  return { success: true };
}

export async function createBatchTuitionAction(payload: {
  class_id: string;
  due_date: string;
  students: { student_id: string; amount: number; notes?: string }[];
}) {
  const context = await getCurrentOrganizationContext();
  if (!context || !context.organization) return { success: false, error: 'Access Denied' };

  const role = context.membership?.role;
  const permissions = context.membership?.permissions || [];
  const canManage = role === 'owner' || role === 'admin' || permissions.includes('manage_tuition');

  if (!canManage) {
    return { success: false, error: 'Bạn không có quyền tạo học phí hàng loạt.' };
  }

  if (!payload.students || payload.students.length === 0) {
    return { success: false, error: 'Vui lòng chọn ít nhất 1 học viên để tạo học phí.' };
  }

  const supabase = await createClient();
  const orgId = context.organization.id;

  const { data, error } = await supabase.rpc('create_batch_tuition', {
    p_organization_id: orgId,
    p_class_id: payload.class_id,
    p_due_date: payload.due_date,
    p_students: payload.students,
  });

  if (error) return { success: false, error: error.message };

  if (data && data.success === false) {
    return { success: false, error: data.error || 'Lỗi khi tạo học phí hàng loạt.' };
  }

  revalidatePath('/tuition');
  return { 
    success: true, 
    inserted_count: data?.inserted_count || 0,
    skipped_count: data?.skipped_count || 0
  };
}

export async function deleteTuitionAction(id: string) {
  const context = await getCurrentOrganizationContext();
  if (!context || !context.organization) return { success: false, error: 'Access Denied' };

  const supabase = await createClient();
  const orgId = context.organization.id;

  const { data: tuition } = await supabase
    .from('tuition')
    .select('paid_amount')
    .eq('id', id)
    .eq('organization_id', orgId)
    .single();

  if (!tuition) {
    return { success: false, error: 'Không tìm thấy khoản học phí.' };
  }

  if (Number(tuition.paid_amount) > 0) {
    return { success: false, error: 'Không thể xóa khoản học phí đã có thanh toán. Vui lòng liên hệ quản trị viên.' };
  }

  const { error } = await supabase.from('tuition')
    .delete()
    .eq('id', id)
    .eq('organization_id', orgId);

  if (error) return { success: false, error: error.message };

  revalidatePath('/tuition');
  return { success: true };
}

export async function recordPaymentAction(
  id: string, 
  paymentAmount: number, 
  paymentMethod: TuitionPaymentMethod = 'cash'
) {
  const context = await getCurrentOrganizationContext();
  if (!context || !context.organization) return { success: false, error: 'Access Denied' };

  const role = context.membership?.role;
  const permissions = context.membership?.permissions || [];
  const canManage = role === 'owner' || role === 'admin' || permissions.includes('manage_tuition');

  if (!canManage) {
    return { success: false, error: 'Bạn không có quyền thu học phí.' };
  }

  if (!paymentAmount || paymentAmount <= 0 || !isFinite(paymentAmount)) {
    return { success: false, error: 'Số tiền thanh toán phải lớn hơn 0 và hợp lệ.' };
  }

  const supabase = await createClient();

  const { data, error } = await supabase.rpc('record_tuition_payment', {
    p_tuition_id: id,
    p_amount: paymentAmount,
    p_organization_id: context.organization.id,
    p_payment_method: paymentMethod,
    p_created_by: context.profile?.id || null,
  });

  if (error) return { success: false, error: error.message };

  if (data && data.success === false) {
    return { success: false, error: data.error || 'Lỗi khi xử lý thanh toán.' };
  }

  revalidatePath('/tuition');
  revalidatePath('/finance');
  return { success: true, data };
}
```

- [ ] **Step 2: Update `app/(dashboard)/settings/actions.ts`**
  Add `updateOrgBankSettingsAction` to persist central bank info.

```typescript
export async function updateOrgBankSettingsAction(data: {
  bank_bin: string;
  bank_account_number: string;
  bank_account_name: string;
  bank_name: string;
}) {
  const context = await getCurrentOrganizationContext();
  if (!context || !context.organization) return { success: false, error: 'Access Denied' };

  if (context.membership?.role !== 'owner' && context.membership?.role !== 'admin') {
    return { success: false, error: 'Chỉ Admin hoặc Chủ sở hữu mới có quyền cấu hình tài khoản ngân hàng.' };
  }

  const supabase = await createClient();

  const { error } = await supabase.from('organizations')
    .update({
      bank_bin: data.bank_bin,
      bank_account_number: data.bank_account_number.trim(),
      bank_account_name: data.bank_account_name.trim().toUpperCase(),
      bank_name: data.bank_name.trim(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', context.organization.id);

  if (error) return { success: false, error: error.message };

  revalidatePath('/settings');
  revalidatePath('/tuition');
  return { success: true };
}
```

- [ ] **Step 3: Update `app/(dashboard)/training/actions.ts`**
  Modify `addClassAction` and `updateClassAction` to accept and persist `default_tuition_fee`.

```typescript
// In addClassAction data parameter:
data: { name: string; venue_id: string; status: string; default_tuition_fee?: number }

// Insert payload:
default_tuition_fee: Number(data.default_tuition_fee) || 0

// In updateClassAction data parameter:
data: { name: string; venue_id: string; status: string; default_tuition_fee?: number }

// Update payload:
default_tuition_fee: Number(data.default_tuition_fee) || 0
```

- [ ] **Step 4: Commit server actions**
```bash
git add app/(dashboard)/tuition/actions.ts app/(dashboard)/settings/actions.ts app/(dashboard)/training/actions.ts
git commit -m "feat(actions): add batch tuition, bank settings, and class fee actions"
```

---

### Task 5: UI Components (KPI Grid, Filters Bar, Modals)

**Files:**
- Create: `app/(dashboard)/tuition/components/TuitionKpiGrid.tsx`
- Create: `app/(dashboard)/tuition/components/TuitionFiltersBar.tsx`
- Create: `app/(dashboard)/tuition/components/BatchTuitionModal.tsx`
- Create: `app/(dashboard)/tuition/components/VietQRModal.tsx`
- Create: `app/(dashboard)/tuition/components/TuitionReceiptModal.tsx`
- Create: `app/(dashboard)/tuition/Tuition.module.css`

- [ ] **Step 1: Create `app/(dashboard)/tuition/Tuition.module.css`**
  Style the 4 Bento cards, receipt print layout with CSS print isolation, and athletic modal details.

```css
.kpiGrid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16px;
  margin-bottom: 24px;
}

@media (max-width: 1024px) {
  .kpiGrid {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (max-width: 640px) {
  .kpiGrid {
    grid-template-columns: 1fr;
  }
}

.kpiCard {
  background: var(--surface);
  border: 1px solid var(--border-light);
  border-radius: var(--radius-xl);
  padding: 20px;
  position: relative;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  justifyContent: space-between;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.03);
}

.kpiLabel {
  font-size: 0.8125rem;
  font-weight: 600;
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: 0.04em;
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
}

.kpiValue {
  font-size: 1.75rem;
  font-weight: 800;
  line-height: 1.2;
  color: var(--text-main);
  letter-spacing: -0.02em;
}

.kpiCaption {
  font-size: 0.75rem;
  color: var(--text-muted);
  margin-top: 8px;
  font-weight: 500;
}

.kpiWatermark {
  position: absolute;
  right: -8px;
  bottom: -8px;
  font-size: 80px !important;
  opacity: 0.05;
  pointer-events: none;
}

/* Card Themes */
.cardPrimary {
  border-left: 4px solid var(--primary);
}
.cardSuccess {
  border-left: 4px solid var(--success);
}
.cardDanger {
  border-left: 4px solid var(--danger);
}
.cardInfo {
  border-left: 4px solid #3B82F6;
}

/* Filter Strip */
.filterStrip {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 20px;
  flex-wrap: wrap;
}

.filterControls {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}

/* Receipt Print Isolation */
@media print {
  body * {
    visibility: hidden !important;
  }
  .receiptContainer, .receiptContainer * {
    visibility: visible !important;
  }
  .receiptContainer {
    position: fixed !important;
    left: 0 !important;
    top: 0 !important;
    width: 100% !important;
    height: 100% !important;
    padding: 24px !important;
    margin: 0 !important;
    background: #ffffff !important;
    color: #000000 !important;
    box-shadow: none !important;
    border: none !important;
    z-index: 999999 !important;
  }
  .noPrint {
    display: none !important;
  }
}
```

- [ ] **Step 2: Create `TuitionKpiGrid.tsx`**
  Implement 4 Bento KPI cards (Tổng học phí kỳ này, Đã thực thu, Còn nợ phải thu, Tỷ lệ hoàn thành).

- [ ] **Step 3: Create `TuitionFiltersBar.tsx`**
  Month picker (`YYYY-MM`), Class selector, Status filter pills, Search input, and `[+ Tạo học phí cả lớp]` & `[+ Thêm học phí đơn]` buttons.

- [ ] **Step 4: Create `BatchTuitionModal.tsx`**
  Class selector, Month selector, Table of enrolled students from `useClassStudents` with Check All, Individual amount & notes edits, Total sum footer, and submit action.

- [ ] **Step 5: Create `VietQRModal.tsx`**
  Generate VietQR Napas 247 image URL, show bank card with logo, account number, account holder name, and copy buttons. Provide fallback guide if bank not configured in settings.

- [ ] **Step 6: Create `TuitionReceiptModal.tsx`**
  Render martial arts e-receipt with logo, receipt number, student name, class name, payment method, paid at, notes, and print button.

- [ ] **Step 7: Commit UI components**
```bash
git add app/(dashboard)/tuition/Tuition.module.css app/(dashboard)/tuition/components/
git commit -m "feat(tuition-ui): add kpi grid, filters bar, batch modal, vietqr modal, and receipt modal"
```

---

### Task 6: Settings & Training Page Enhancements

**Files:**
- Modify: `app/(dashboard)/settings/SettingsClient.tsx`
- Modify: `app/(dashboard)/training/[venueId]/VenueDetailsClient.tsx`

- [ ] **Step 1: Add Bank Account Setting Card in `SettingsClient.tsx`**
  Add a dedicated section for "Tài Khoản Ngân Hàng Nhận Học Phí (VietQR Napas 247)" with:
  - Bank dropdown from `VIETNAM_BANKS` (with logos).
  - Account number input.
  - Account name input (auto-uppercase).
  - [Lưu Cấu Hình Ngân Hàng] button calling `updateOrgBankSettingsAction`.

- [ ] **Step 2: Add Default Tuition Fee input in `VenueDetailsClient.tsx`**
  Add `default_tuition_fee` input inside the class create/edit modal. Include it in `classForm` state (`default_tuition_fee: 0`), in `resetForms()` (`default_tuition_fee: 0`), in `handleEditClass(cls)` (`default_tuition_fee: cls.default_tuition_fee || 0`), and pass to `addClassAction` and `updateClassAction`.

- [ ] **Step 3: Commit settings and training enhancements**
```bash
git add app/(dashboard)/settings/SettingsClient.tsx app/(dashboard)/training/[venueId]/VenueDetailsClient.tsx
git commit -m "feat(settings): add bank config card and default tuition fee input to class modal"
```

---

### Task 7: Tuition Page Refactoring (`TuitionClient.tsx`)

**Files:**
- Modify: `app/(dashboard)/tuition/TuitionClient.tsx`

- [ ] **Step 1: Refactor `TuitionClient.tsx`**
  - Integrate `TuitionKpiGrid` and `TuitionFiltersBar`.
  - Filter `tuitionList` client-side based on `filters` (month, classId, status, search).
  - Modernize table rows with Avatar, Class & Month, Amount, Paid / Remaining status, and Action buttons:
    - `[VietQR]` button (if `remaining > 0` and bank configured).
    - `[Thu tiền]` button (if `status !== 'paid'`).
    - `[Biên lai]` button (if `paid_amount > 0`).
    - `[Xóa]` button (if `paid_amount === 0`).
  - Wire up `BatchTuitionModal`, `RecordPaymentModal`, `VietQRModal`, `TuitionReceiptModal`.

- [ ] **Step 2: Commit `TuitionClient.tsx`**
```bash
git add app/(dashboard)/tuition/TuitionClient.tsx
git commit -m "feat(tuition): complete TuitionClient redesign with batch generation and vietqr"
```

---

### Task 8: Constitution Update & Verification

**Files:**
- Modify: `CONSTITUTION.md`

- [ ] **Step 1: Update `CONSTITUTION.md`**
  - Bump version to `1.9.1`.
  - Update Section 10 (Hệ Thống Tài Chính) and Section 14 (Danh Sách Bảng Database) documenting `default_tuition_fee` on `venue_classes`, bank columns on `organizations`, and receipt/payment metadata on `tuition`.
  - Append changelog entry to Section 15.

- [ ] **Step 2: Run verification build**
```bash
cmd /c "npm run build"
```
Expected: `✓ Generating static pages (35/35)` with 0 TypeScript/lint errors.

- [ ] **Step 3: Final Git commit & push**
```bash
git add .
git commit -m "feat(tuition): complete smart tuition and vietqr integration with constitution v1.9.1"
git push origin main
```
Expected: All commits pushed to GitHub `main`, triggering automated Vercel deployment.

