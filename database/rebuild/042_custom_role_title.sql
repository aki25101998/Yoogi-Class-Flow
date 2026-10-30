-- 042_custom_role_title.sql
-- Migration: Add custom_role_title to organization_members and organization_invitations
-- Enables organizations to define custom role names (e.g. Giám đốc kỹ thuật, Quản lý cơ sở, Lễ tân)

ALTER TABLE public.organization_members 
ADD COLUMN IF NOT EXISTS custom_role_title TEXT DEFAULT '';

ALTER TABLE public.organization_invitations 
ADD COLUMN IF NOT EXISTS custom_role_title TEXT DEFAULT '';

