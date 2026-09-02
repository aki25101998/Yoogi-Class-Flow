-- 029_normalize_belts_display_order.sql

-- 1. Normalize existing display_order to remove duplicates within each organization.
-- We use a CTE to rank belts by their current display_order and created_at to break ties.
WITH RankedBelts AS (
    SELECT 
        id, 
        organization_id, 
        ROW_NUMBER() OVER(PARTITION BY organization_id ORDER BY display_order ASC, created_at ASC) as new_order
    FROM public.organization_belts
)
UPDATE public.organization_belts ob
SET display_order = rb.new_order
FROM RankedBelts rb
WHERE ob.id = rb.id AND ob.display_order IS DISTINCT FROM rb.new_order;

-- 2. Add Unique Constraint to prevent future duplicates.
-- We ensure that each organization has unique display orders for its belts.
ALTER TABLE public.organization_belts
ADD CONSTRAINT unique_org_display_order UNIQUE (organization_id, display_order);
