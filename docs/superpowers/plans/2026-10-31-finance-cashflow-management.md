# Nâng Cấp Sổ Quỹ Thu - Chi & Quản Lý Dòng Tiền (Finance & Cashflow Management) Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Nâng cấp toàn diện Sổ Quỹ Thu - Chi (`/finance`) với hệ thống Danh mục 2 cấp linh hoạt (Nhóm cha → Hạng mục con), gắn liền cơ sở đào tạo (Venue Attribution), phân loại phương thức thanh toán (Tiền mặt / Chuyển khoản), bộ lọc thời gian chuẩn kế toán, 4 thẻ Bento KPI cân đối và 2 biểu đồ trực quan hóa dòng tiền theo chuẩn Vibrant Athletic Design System.

**Architecture:** Tạo bảng mới `finance_categories` quản lý cây danh mục đa tổ chức với RLS và tự động nạp sẵn dữ liệu mặc định. Nâng cấp bảng `finance_transactions` với các composite foreign keys bảo vệ multi-tenant. Xây dựng các hook `useFinanceCategories` và `useFinance` với bộ lọc đa chiều (thời gian, cơ sở, phương thức). Thiết kế lại giao diện `/finance` theo kiến trúc module hóa: dải chọn nhanh thời gian, thanh bộ lọc, lưới 4 thẻ KPI, 2 biểu đồ SVG/CSS thuần siêu nhẹ, modal chọn danh mục cascading và modal quản lý danh mục con.

**Tech Stack:** Next.js 14 (App Router), React 18, TypeScript, Supabase PostgreSQL (RLS & Composite FKs), TanStack React Query v5, CSS Modules & CSS Variables (`globals.css` Vibrant Athletic Design System), Pure SVG/CSS Data Visualizations.

---

## File Structure

```
database/rebuild/
└── 044_finance_categories_and_enhancements.sql    # Migration tạo bảng categories, alter transactions, seed dữ liệu mẫu
types/
└── finance.ts                                    # Type definitions cho categories, transactions, filters, summaries
hooks/
├── useFinanceCategories.ts                       # Hook tải và nhóm danh mục 2 cấp (income / expense)
└── useFinance.ts                                 # Hook truy vấn giao dịch theo bộ lọc và tính toán KPI/chart data
app/(dashboard)/finance/
├── actions.ts                                    # Server actions thêm/xóa giao dịch và quản lý danh mục con
├── FinanceClient.tsx                             # Client page chính kết nối toàn bộ các components
├── FinanceClient.module.css                      # Scoped CSS cho các layout đặc thù của Sổ quỹ
└── components/
    ├── FinanceTimeRangeStrip.tsx                 # Dải chọn nhanh mốc thời gian (Hôm nay, Tuần này, Tháng này...)
    ├── FinanceFiltersBar.tsx                     # Thanh lọc theo Cơ sở, Loại Thu/Chi, Phương thức thanh toán
    ├── FinanceKpiGrid.tsx                        # Lưới 4 thẻ Bento KPI cân đối với watermark chìm
    ├── FinanceCharts.tsx                         # 2 biểu đồ trực quan SVG/CSS: Xu hướng dòng tiền & Cơ cấu chi phí
    ├── AddTransactionModal.tsx                   # Modal thêm giao dịch mới với dropdown lọc 2 cấp cascade
    └── ManageCategoriesModal.tsx                 # Modal xem và thêm/xóa danh mục con theo nhóm cha
CONSTITUTION.md                                   # Cập nhật Hiến Pháp về bảng mới và tính năng tài chính
```

---

## Task Decomposition

### Task 1: Database Migration `044_finance_categories_and_enhancements.sql`

**Files:**
- Create: `database/rebuild/044_finance_categories_and_enhancements.sql`

- [ ] **Step 1: Viết migration SQL tạo bảng `finance_categories`, cập nhật `finance_transactions`, thiết lập RLS và seed danh mục chuẩn**

```sql
-- database/rebuild/044_finance_categories_and_enhancements.sql

-- 1. Tạo bảng finance_categories
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

-- Partial Unique Index cho danh mục cha (parent_id IS NULL)
CREATE UNIQUE INDEX IF NOT EXISTS uq_finance_categories_parent_null 
  ON public.finance_categories (organization_id, name) WHERE parent_id IS NULL;

-- Ràng buộc Multi-tenant Unique
ALTER TABLE public.finance_categories 
  DROP CONSTRAINT IF EXISTS uq_finance_categories_org_id CASCADE;
ALTER TABLE public.finance_categories 
  ADD CONSTRAINT uq_finance_categories_org_id UNIQUE (organization_id, id);

-- 2. Cập nhật bảng finance_transactions
ALTER TABLE public.finance_transactions 
  ALTER COLUMN category DROP NOT NULL;

ALTER TABLE public.finance_transactions 
  ADD COLUMN IF NOT EXISTS category_id UUID,
  ADD COLUMN IF NOT EXISTS parent_category TEXT,
  ADD COLUMN IF NOT EXISTS sub_category TEXT,
  ADD COLUMN IF NOT EXISTS venue_id UUID,
  ADD COLUMN IF NOT EXISTS payment_method TEXT DEFAULT 'cash' 
    CHECK (payment_method IN ('cash', 'bank_transfer', 'other'));

-- Composite Foreign Keys
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'fk_finance_transactions_category' 
      AND table_name = 'finance_transactions'
  ) THEN
    ALTER TABLE public.finance_transactions
      ADD CONSTRAINT fk_finance_transactions_category 
      FOREIGN KEY (organization_id, category_id) REFERENCES public.finance_categories(organization_id, id) ON DELETE SET NULL;
  END IF;

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

-- 3. Bật RLS cho finance_categories
ALTER TABLE public.finance_categories ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Members can view finance categories" ON public.finance_categories;
CREATE POLICY "Members can view finance categories" 
  ON public.finance_categories FOR SELECT 
  USING (organization_id IN (SELECT public.get_user_organizations()));

DROP POLICY IF EXISTS "Admins can manage finance categories" ON public.finance_categories;
CREATE POLICY "Admins can manage finance categories" 
  ON public.finance_categories FOR ALL 
  USING (public.is_org_admin(organization_id));

-- 4. Stored Procedure nạp cây danh mục mặc định cho 1 tổ chức (SECURITY DEFINER để vượt qua RLS khi khởi tạo)
CREATE OR REPLACE FUNCTION public.seed_default_finance_categories_for_org(p_org_id UUID)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_parent_id UUID;
BEGIN
  -- === THU (INCOME) ===
  -- 1. Học phí
  INSERT INTO public.finance_categories (organization_id, parent_id, name, type, icon, display_order, is_system)
  VALUES (p_org_id, NULL, 'Học phí', 'income', 'school', 10, true)
  ON CONFLICT (organization_id, name) WHERE parent_id IS NULL DO UPDATE SET icon = 'school'
  RETURNING id INTO v_parent_id;
  
  INSERT INTO public.finance_categories (organization_id, parent_id, name, type, icon, display_order, is_system) VALUES
    (p_org_id, v_parent_id, 'Học phí lớp thường', 'income', 'class', 1, true),
    (p_org_id, v_parent_id, 'Học phí kèm 1-1', 'income', 'person', 2, true),
    (p_org_id, v_parent_id, 'Học phí trải nghiệm', 'income', 'celebration', 3, true)
  ON CONFLICT (organization_id, parent_id, name) DO NOTHING;

  -- 2. Bán đồ & Dụng cụ
  INSERT INTO public.finance_categories (organization_id, parent_id, name, type, icon, display_order, is_system)
  VALUES (p_org_id, NULL, 'Bán đồ & Dụng cụ', 'income', 'sports_martial_arts', 20, true)
  ON CONFLICT (organization_id, name) WHERE parent_id IS NULL DO UPDATE SET icon = 'sports_martial_arts'
  RETURNING id INTO v_parent_id;

  INSERT INTO public.finance_categories (organization_id, parent_id, name, type, icon, display_order, is_system) VALUES
    (p_org_id, v_parent_id, 'Võ phục', 'income', 'checkroom', 1, true),
    (p_org_id, v_parent_id, 'Đai tập', 'income', 'military_tech', 2, true),
    (p_org_id, v_parent_id, 'Bảo hộ & Giáp', 'income', 'shield', 3, true),
    (p_org_id, v_parent_id, 'Dụng cụ tập luyện', 'income', 'fitness_center', 4, true)
  ON CONFLICT (organization_id, parent_id, name) DO NOTHING;

  -- 3. Sự kiện & Khác
  INSERT INTO public.finance_categories (organization_id, parent_id, name, type, icon, display_order, is_system)
  VALUES (p_org_id, NULL, 'Sự kiện & Khác', 'income', 'emoji_events', 30, true)
  ON CONFLICT (organization_id, name) WHERE parent_id IS NULL DO UPDATE SET icon = 'emoji_events'
  RETURNING id INTO v_parent_id;

  INSERT INTO public.finance_categories (organization_id, parent_id, name, type, icon, display_order, is_system) VALUES
    (p_org_id, v_parent_id, 'Phí thi thăng đai', 'income', 'workspace_premium', 1, true),
    (p_org_id, v_parent_id, 'Giải đấu & Giao lưu', 'income', 'sports', 2, true),
    (p_org_id, v_parent_id, 'Thu khác', 'income', 'payments', 3, true)
  ON CONFLICT (organization_id, parent_id, name) DO NOTHING;

  -- === CHI (EXPENSE) ===
  -- 1. Hóa đơn & Mặt bằng
  INSERT INTO public.finance_categories (organization_id, parent_id, name, type, icon, display_order, is_system)
  VALUES (p_org_id, NULL, 'Hóa đơn & Mặt bằng', 'expense', 'apartment', 10, true)
  ON CONFLICT (organization_id, name) WHERE parent_id IS NULL DO UPDATE SET icon = 'apartment'
  RETURNING id INTO v_parent_id;

  INSERT INTO public.finance_categories (organization_id, parent_id, name, type, icon, display_order, is_system) VALUES
    (p_org_id, v_parent_id, 'Thuê mặt bằng', 'expense', 'store', 1, true),
    (p_org_id, v_parent_id, 'Tiền điện', 'expense', 'bolt', 2, true),
    (p_org_id, v_parent_id, 'Tiền nước', 'expense', 'water_drop', 3, true),
    (p_org_id, v_parent_id, 'Internet & Phần mềm', 'expense', 'wifi', 4, true)
  ON CONFLICT (organization_id, parent_id, name) DO NOTHING;

  -- 2. Nhân sự & Đào tạo
  INSERT INTO public.finance_categories (organization_id, parent_id, name, type, icon, display_order, is_system)
  VALUES (p_org_id, NULL, 'Nhân sự & Đào tạo', 'expense', 'badge', 20, true)
  ON CONFLICT (organization_id, name) WHERE parent_id IS NULL DO UPDATE SET icon = 'badge'
  RETURNING id INTO v_parent_id;

  INSERT INTO public.finance_categories (organization_id, parent_id, name, type, icon, display_order, is_system) VALUES
    (p_org_id, v_parent_id, 'Lương HLV', 'expense', 'payments', 1, true),
    (p_org_id, v_parent_id, 'Phụ cấp / Thưởng', 'expense', 'stars', 2, true),
    (p_org_id, v_parent_id, 'Tập huấn HLV', 'expense', 'school', 3, true)
  ON CONFLICT (organization_id, parent_id, name) DO NOTHING;

  -- 3. Mua sắm & Nhập hàng
  INSERT INTO public.finance_categories (organization_id, parent_id, name, type, icon, display_order, is_system)
  VALUES (p_org_id, NULL, 'Mua sắm & Nhập hàng', 'expense', 'shopping_bag', 30, true)
  ON CONFLICT (organization_id, name) WHERE parent_id IS NULL DO UPDATE SET icon = 'shopping_bag'
  RETURNING id INTO v_parent_id;

  INSERT INTO public.finance_categories (organization_id, parent_id, name, type, icon, display_order, is_system) VALUES
    (p_org_id, v_parent_id, 'Nhập võ phục & đai', 'expense', 'inventory_2', 1, true),
    (p_org_id, v_parent_id, 'Mua thảm & bao cát', 'expense', 'fitness_center', 2, true),
    (p_org_id, v_parent_id, 'Sửa chữa & Bảo trì', 'expense', 'build', 3, true)
  ON CONFLICT (organization_id, parent_id, name) DO NOTHING;

  -- 4. Marketing & Vận hành
  INSERT INTO public.finance_categories (organization_id, parent_id, name, type, icon, display_order, is_system)
  VALUES (p_org_id, NULL, 'Marketing & Vận hành', 'expense', 'campaign', 40, true)
  ON CONFLICT (organization_id, name) WHERE parent_id IS NULL DO UPDATE SET icon = 'campaign'
  RETURNING id INTO v_parent_id;

  INSERT INTO public.finance_categories (organization_id, parent_id, name, type, icon, display_order, is_system) VALUES
    (p_org_id, v_parent_id, 'Quảng cáo Facebook/Google', 'expense', 'ads_click', 1, true),
    (p_org_id, v_parent_id, 'In ấn poster/đồng phục', 'expense', 'print', 2, true),
    (p_org_id, v_parent_id, 'Nước uống & Tiếp khách', 'expense', 'local_cafe', 3, true)
  ON CONFLICT (organization_id, parent_id, name) DO NOTHING;
END;
$$;

-- 5. Nạp danh mục cho tất cả các tổ chức đang có
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN SELECT id FROM public.organizations LOOP
    PERFORM public.seed_default_finance_categories_for_org(r.id);
  END LOOP;
END $$;

-- 6. Trigger tự động nạp danh mục chuẩn khi có tổ chức mới được tạo (SECURITY DEFINER để an toàn RLS)
CREATE OR REPLACE FUNCTION public.trigger_seed_finance_categories_on_org_created()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  PERFORM public.seed_default_finance_categories_for_org(NEW.id);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_seed_finance_categories_on_org_created ON public.organizations;
CREATE TRIGGER trg_seed_finance_categories_on_org_created
  AFTER INSERT ON public.organizations
  FOR EACH ROW
  EXECUTE FUNCTION public.trigger_seed_finance_categories_on_org_created();
```

- [ ] **Step 2: Áp dụng migration vào Supabase và kiểm tra cấu trúc bảng**
- [ ] **Step 3: Commit migration**
```bash
git add database/rebuild/044_finance_categories_and_enhancements.sql
git commit -m "feat(database): add migration 044 for finance categories, venue attribution and payment methods"
```

---

### Task 2: Type Definitions & React Query Hooks

**Files:**
- Create: `types/finance.ts`
- Create: `hooks/useFinanceCategories.ts`
- Modify: `hooks/useFinance.ts`

- [ ] **Step 1: Tạo `types/finance.ts` định nghĩa các interface chuẩn**
  - `FinanceCategory`: id, organization_id, parent_id, name, type, icon, display_order, is_system, subcategories
  - `FinanceTransaction`: id, organization_id, type, category, category_id, parent_category, sub_category, amount, date, description, venue_id, payment_method, source_type, created_at, venues?: { name: string }
  - `FinanceFilters`: startDate, endDate, venueId ('all' | 'unassigned' | string), type ('all' | 'income' | 'expense'), paymentMethod ('all' | 'cash' | 'bank_transfer' | 'other')
  - `FinanceSummary`: totalIncome, totalExpense, netProfit, cashAmount, bankAmount, cashRatio, bankRatio
  - `CashflowDataPoint`: date, label, income, expense, net
  - `ExpenseDistributionItem`: parentCategory, icon, amount, percentage

- [ ] **Step 2: Tạo hook `hooks/useFinanceCategories.ts`**
  - Fetch categories theo `organization_id`
  - Group thành: `incomeCategories` (danh sách cha kèm mảng con) và `expenseCategories` (danh sách cha kèm mảng con)
  - Flatten helpers để dễ dùng trong select/dropdown

- [ ] **Step 3: Cập nhật `hooks/useFinance.ts`**
  - Nhận `organizationId` và `filters: FinanceFilters`
  - Query Supabase lọc theo `organization_id`, `gte('date', filters.startDate)`, `lte('date', filters.endDate)`
  - Điều kiện lọc `venueId`: nếu `unassigned` thì `.is('venue_id', null)`, nếu UUID thì `.eq('venue_id', filters.venueId)`, nếu `all` thì không filter
  - Join lấy `venues(id, name)`
  - **Tách bạch tính toán KPI & Biểu đồ vs Danh sách hiển thị:**
    - Tính `summary` (Tổng thu, Tổng chi, Lợi nhuận ròng, Tỷ lệ Tiền mặt/Ngân hàng) và `cashflowTrends` trên **toàn bộ giao dịch trong kỳ & cơ sở** (trước khi lọc `type` Thu/Chi) để tránh việc khi người dùng bấm tab xem "Chi" thì Tổng thu bị nhảy về 0đ làm méo mó các thẻ Bento KPI.
    - Danh sách `transactions` hiển thị sẽ được áp dụng thêm bộ lọc `type` (`income` / `expense`) và `paymentMethod` (`cash` / `bank_transfer`).
  - Chú ý kiểm tra chia cho 0: `cashRatio`, `bankRatio`, `profitMargin` mặc định là 0 nếu tổng thu/chi bằng 0.
  - Tính `cashflowTrends`: tự động gom nhóm linh hoạt — gom theo ngày nếu khoảng thời gian <= 31 ngày, gom theo tháng (ví dụ: `T1`, `T2`...) nếu khoảng thời gian > 31 ngày để tránh nén thanh biểu đồ quá nhỏ.
  - Tính `expenseDistribution`: gom nhóm theo `parent_category`, tính tổng tiền và tỷ lệ % đóng góp.

- [ ] **Step 4: Commit types và hooks**
```bash
git add types/finance.ts hooks/useFinanceCategories.ts hooks/useFinance.ts
git commit -m "feat(finance): add finance types and enhanced hooks for categories and filtered transactions"
```

---

### Task 3: Server Actions (`app/(dashboard)/finance/actions.ts`)

**Files:**
- Modify: `app/(dashboard)/finance/actions.ts`

- [ ] **Step 1: Nâng cấp `addTransactionAction`**
  - Kiểm tra quyền qua `getCurrentOrganizationContext()`: `const isAdminOrOwner = context.membership?.role === 'admin' || context.membership?.role === 'owner'; const hasPermission = isAdminOrOwner || (context.permissions && context.permissions.includes('manage_finance'));` — nếu không có quyền, trả về `{ success: false, error: 'Bạn không có quyền quản lý tài chính.' }`.
  - Validate: `type` in `['income', 'expense']`, `amount > 0`, `date` định dạng `YYYY-MM-DD`.
  - **Kiểm tra danh mục:** Chấp nhận nếu có `category_id` HOẶC `category` (không ép buộc phải có chuỗi `category` cũ ngay từ đầu).
  - Nếu có `category_id`: truy vấn lấy `parent_category` và `sub_category`, đồng thời gán `category = sub_category || parent_category` để duy trì tương thích ngược.
  - Hỗ trợ `venue_id` (nếu rỗng hoặc 'unassigned' thì lưu `null`).
  - Hỗ trợ `payment_method` (`cash` hoặc `bank_transfer`).
  - Insert bản ghi với `source_type = 'MANUAL'`.
  - `revalidatePath('/finance')`.

- [ ] **Step 2: Nâng cấp `deleteTransactionAction` với kiểm tra phân quyền và bảo vệ hệ thống**
  - Kiểm tra quyền: `const isAdminOrOwner = context.membership?.role === 'admin' || context.membership?.role === 'owner'; const hasPermission = isAdminOrOwner || (context.permissions && context.permissions.includes('manage_finance'));` — nếu không có quyền, trả về `{ success: false, error: 'Bạn không có quyền xóa giao dịch.' }`.
  - Chặn xóa nếu `source_type !== 'MANUAL'`.
  - Xóa giao dịch theo `id` và `organization_id`.

- [ ] **Step 3: Bổ sung `addCategoryAction` và `deleteCategoryAction`**
  - `addCategoryAction({ parent_id, name, type, icon })`: kiểm tra quyền Admin/Owner hoặc `manage_finance`, insert vào `finance_categories`.
  - `deleteCategoryAction(id)`: kiểm tra quyền, không cho xóa nếu `is_system === true`.

- [ ] **Step 4: Commit actions**
```bash
git add app/\(dashboard\)/finance/actions.ts
git commit -m "feat(finance): update transaction and category server actions"
```

---

### Task 4: UI Components (Time Strip, Filters Bar, KPI Grid, Charts)

**Files:**
- Create: `app/(dashboard)/finance/components/FinanceTimeRangeStrip.tsx`
- Create: `app/(dashboard)/finance/components/FinanceFiltersBar.tsx`
- Create: `app/(dashboard)/finance/components/FinanceKpiGrid.tsx`
- Create: `app/(dashboard)/finance/components/FinanceCharts.tsx`
- Create: `app/(dashboard)/finance/FinanceClient.module.css`

- [ ] **Step 1: Xây dựng `FinanceTimeRangeStrip.tsx`**
  - Nút preset: `Hôm nay`, `Tuần này`, `Tháng này` (default active), `Tháng trước`, `Quý này`, `Năm nay`, `Tùy chọn`
  - Khi chọn preset: tự động tính `startDate` và `endDate` theo định dạng `YYYY-MM-DD`
  - Khi chọn `Tùy chọn`: hiển thị 2 input date (Từ ngày - Đến ngày) với nút Áp dụng

- [ ] **Step 2: Xây dựng `FinanceFiltersBar.tsx`**
  - Dropdown Cơ sở: `Tất cả cơ sở`, danh sách các venue từ `useVenues`, `Chung toàn trung tâm`
  - Segmented pills Loại giao dịch: `Tất cả`, `Thu (+)`, `Chi (-)`
  - Segmented pills Phương thức: `Tất cả`, `💵 Tiền mặt`, `🏦 Chuyển khoản`

- [ ] **Step 3: Xây dựng `FinanceKpiGrid.tsx`**
  - 4 Thẻ Bento KPI theo chuẩn Athletic:
    - Thẻ 1: Tổng thu (Màu xanh lá + watermark `trending_up`)
    - Thẻ 2: Tổng chi (Màu đỏ cam + watermark `trending_down`)
    - Thẻ 3: Lợi nhuận ròng (Teal nếu >= 0, Đỏ nếu < 0 + watermark `account_balance_wallet` + chú thích Tỷ suất)
    - Thẻ 4: Cơ cấu dòng tiền (Tiền mặt vs Ngân hàng kèm thanh tỷ lệ 2 màu + watermark `payments`)

- [ ] **Step 4: Xây dựng `FinanceCharts.tsx`**
  - Biểu đồ 1: Cashflow Trend Chart (Cột kép SVG thuần mượt mà, cột Thu màu Teal/Xanh, cột Chi màu Đỏ cam, nhãn ngày bên dưới, tooltip khi hover).
  - Biểu đồ 2: Expense Distribution Bars (Danh sách nhóm chi phí cha, số tiền và thanh progress bar tỷ lệ %, hiển thị icon thể thao tương ứng).
  - **Xử lý an toàn khi không có dữ liệu:** Có fallback Empty State nhẹ nhàng khi không có giao dịch hoặc khi tổng chi = 0 (tránh tính toán tọa độ chia cho 0 trong không gian SVG).

- [ ] **Step 5: Xây dựng `FinanceClient.module.css`**
  - Styling chuẩn theo CSS Variables (`globals.css`), tương thích 100% Dark và Light mode

- [ ] **Step 6: Commit components và styles**
```bash
git add app/\(dashboard\)/finance/components/ app/\(dashboard\)/finance/FinanceClient.module.css
git commit -m "feat(finance): add time range strip, filter bar, KPI grid, and SVG/CSS charts"
```

---

### Task 5: Modal Thêm Giao Dịch & Modal Quản Lý Danh Mục

**Files:**
- Create: `app/(dashboard)/finance/components/AddTransactionModal.tsx`
- Create: `app/(dashboard)/finance/components/ManageCategoriesModal.tsx`

- [ ] **Step 1: Xây dựng `AddTransactionModal.tsx`**
  - Toggle Loại: `[Thu (+)]` | `[Chi (-)]`
  - Chọn Cơ sở: Dropdown từ danh sách venues + "Chung toàn trung tâm"
  - Chọn Nhóm Cha: Tự động lọc theo Loại Thu hoặc Chi
  - Chọn Hạng Mục Con: Tự động lọc theo Nhóm Cha đã chọn (hoặc nút bấm "+ Thêm mục mới" nhanh)
  - Nhập Số tiền (VNĐ): Preview số tiền phân cách hàng nghìn (ví dụ: `2,000,000 đ`)
  - Chọn Phương thức: Radio pills `[💵 Tiền mặt]` / `[🏦 Chuyển khoản]`
  - Ngày ghi nhận & Mô tả thêm
  - Xử lý submit qua `addTransactionAction`

- [ ] **Step 2: Xây dựng `ManageCategoriesModal.tsx`**
  - Hiển thị cây danh mục 2 cấp chia 2 tab: Tab Thu và Tab Chi
  - Mỗi nhóm cha hiển thị danh sách các mục con dạng badges/chips
  - Form thêm nhanh mục con vào nhóm cha bất kỳ
  - Nút xóa cho các mục con do người dùng tự tạo (`is_system = false`)
  - Khi thêm hoặc xóa thành công: gọi `queryClient.invalidateQueries({ queryKey: ['financeCategories', organizationId] })` để cập nhật cây danh mục tức thì cho modal thêm giao dịch

- [ ] **Step 3: Commit 2 modals**
```bash
git add app/\(dashboard\)/finance/components/AddTransactionModal.tsx app/\(dashboard\)/finance/components/ManageCategoriesModal.tsx
git commit -m "feat(finance): add cascading transaction modal and category management modal"
```

---

### Task 6: Tích Hợp Toàn Diện `FinanceClient.tsx` & Export Definition

**Files:**
- Modify: `app/(dashboard)/finance/FinanceClient.tsx`
- Modify: `services/excel/definitions/finance.def.ts`

- [ ] **Step 1: Cập nhật `services/excel/definitions/finance.def.ts`**
  - Bổ sung các cột mới: Cơ sở (`format: (_, row) => row.venues?.name || 'Chung toàn trung tâm'`), Nhóm danh mục (`parent_category`), Hạng mục con (`sub_category || category`), Phương thức thanh toán (`payment_method === 'cash' ? 'Tiền mặt' : 'Chuyển khoản'`) vào file Excel xuất ra

- [ ] **Step 2: Tái cấu trúc hoàn thiện `FinanceClient.tsx`**
  - Ráp nối toàn bộ: PageHeader, TimeRangeStrip, FiltersBar, KpiGrid, Charts, Table danh sách giao dịch, AddModal, ManageCategoriesModal
  - Cập nhật bảng giao dịch hiển thị rõ Nhóm cha + Mục con, chip Cơ sở, icon Phương thức thanh toán
  - Phân quyền: Nút Thêm giao dịch và Quản lý danh mục chỉ dành cho `isAdminOrOwner` hoặc có quyền `manage_finance`

- [ ] **Step 3: Commit FinanceClient hoàn chỉnh**
```bash
git add app/\(dashboard\)/finance/FinanceClient.tsx services/excel/definitions/finance.def.ts
git commit -m "feat(finance): integrate enhanced finance page with 2-level categories and multi-filter analytics"
```

---

### Task 7: Cập Nhật Hiến Pháp Dự Án (`CONSTITUTION.md`) & Kiểm Thử Toàn Diện

**Files:**
- Modify: `CONSTITUTION.md`

- [ ] **Step 1: Cập nhật `CONSTITUTION.md`**
  - Cập nhật mục §10 (Hệ Thống Tài Chính): ghi nhận kiến trúc Danh mục 2 cấp (`finance_categories`), gắn cơ sở (`venue_id`), phương thức thanh toán (`payment_method`), bộ lọc thời gian và biểu đồ dòng tiền.
  - Cập nhật mục §14 (Danh Sách Bảng Database): thêm bảng `finance_categories`.
  - Cập nhật mục §15 (Nhật Ký Cập Nhật Hiến Pháp): ghi nhận phiên bản mới (1.9.0).

- [ ] **Step 2: Chạy kiểm tra TypeScript và Build**
```bash
npm run build
```
Expected: Build Next.js thành công không có bất kỳ lỗi nào.

- [ ] **Step 3: Commit và Push GitHub, Deploy tự động theo quy tắc bắt buộc**
```bash
git add CONSTITUTION.md
git commit -m "docs(constitution): bump version to 1.9.0 with 2-level finance categories and cashflow management"
git push origin main
```

---

## Plan Review Loop

Sau khi hoàn thành kế hoạch, điều phối `plan-document-reviewer` subagent để kiểm định tính khả thi và chặt chẽ của kế hoạch trước khi bắt tay thực thi.

