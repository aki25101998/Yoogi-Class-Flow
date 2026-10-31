-- ==============================================================================
-- 044_finance_categories_and_enhancements.sql
-- Nâng cấp hệ thống Tài chính: Danh mục 2 cấp, Gắn Cơ sở & Phương thức thanh toán
-- ==============================================================================

-- 1. TẠO BẢNG FINANCE_CATEGORIES (DANH MỤC THU CHI 2 CẤP)
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

-- Ràng buộc Multi-tenant Unique phục vụ Composite FKs
ALTER TABLE public.finance_categories 
  DROP CONSTRAINT IF EXISTS uq_finance_categories_org_id CASCADE;
ALTER TABLE public.finance_categories 
  ADD CONSTRAINT uq_finance_categories_org_id UNIQUE (organization_id, id);

-- 2. CẬP NHẬT BẢNG FINANCE_TRANSACTIONS
ALTER TABLE public.finance_transactions 
  ALTER COLUMN category DROP NOT NULL;

ALTER TABLE public.finance_transactions 
  ADD COLUMN IF NOT EXISTS category_id UUID,
  ADD COLUMN IF NOT EXISTS parent_category TEXT,
  ADD COLUMN IF NOT EXISTS sub_category TEXT,
  ADD COLUMN IF NOT EXISTS venue_id UUID,
  ADD COLUMN IF NOT EXISTS payment_method TEXT DEFAULT 'cash' 
    CHECK (payment_method IN ('cash', 'bank_transfer', 'other'));

-- Ràng buộc Composite Foreign Keys (§11.3 Multi-tenant isolation)
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

-- 3. BẬT RLS CHO FINANCE_CATEGORIES
ALTER TABLE public.finance_categories ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Members can view finance categories" ON public.finance_categories;
CREATE POLICY "Members can view finance categories" 
  ON public.finance_categories FOR SELECT 
  USING (organization_id IN (SELECT public.get_user_organizations()));

DROP POLICY IF EXISTS "Admins can manage finance categories" ON public.finance_categories;
CREATE POLICY "Admins can manage finance categories" 
  ON public.finance_categories FOR ALL 
  USING (public.is_org_admin(organization_id));

-- 4. STORED PROCEDURE NẠP CÂY DANH MỤC MẶC ĐỊNH (SECURITY DEFINER ĐỂ VƯỢT QUA RLS KHI KHỞI TẠO ORG)
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

-- 5. NẠP DANH MỤC CHO TẤT CẢ CÁC TỔ CHỨC ĐANG CÓ
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN SELECT id FROM public.organizations LOOP
    PERFORM public.seed_default_finance_categories_for_org(r.id);
  END LOOP;
END $$;

-- 6. TRIGGER TỰ ĐỘNG NẠP DANH MỤC CHUẨN KHI TỔ CHỨC MỚI ĐƯỢC TẠO
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
