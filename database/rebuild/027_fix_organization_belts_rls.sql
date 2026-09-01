-- 027_fix_organization_belts_rls.sql

-- Xóa policy cũ có thể gây lỗi hoặc không an toàn do dùng FOR ALL mặc định
DROP POLICY IF EXISTS "Admin can do all on organization_belts" ON public.organization_belts;
DROP POLICY IF EXISTS "Everyone can view belts in their org" ON public.organization_belts;

-- Tạo policy an toàn cho từng thao tác

-- 1. INSERT: Admin chỉ có thể thêm belt cho organization mà họ quản lý
CREATE POLICY "Admin can insert organization_belts" 
ON public.organization_belts 
FOR INSERT 
WITH CHECK (public.is_org_admin(organization_id));

-- 2. UPDATE: Admin chỉ có thể sửa belt của organization mà họ quản lý (cả cũ và mới)
CREATE POLICY "Admin can update organization_belts" 
ON public.organization_belts 
FOR UPDATE 
USING (public.is_org_admin(organization_id))
WITH CHECK (public.is_org_admin(organization_id));

-- 3. DELETE: Admin chỉ có thể xóa belt của organization mà họ quản lý
CREATE POLICY "Admin can delete organization_belts" 
ON public.organization_belts 
FOR DELETE 
USING (public.is_org_admin(organization_id));

-- 4. SELECT: Mọi thành viên trong organization có thể xem danh sách belt của organization đó
CREATE POLICY "Members can view organization_belts" 
ON public.organization_belts 
FOR SELECT 
USING (organization_id IN (SELECT public.get_user_organizations()));
