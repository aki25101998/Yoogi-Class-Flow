# Phase 2 Architecture: Organization, Invitation & Members

## Overview
The architecture has shifted completely to a Multi-Tenant SaaS model. Every authenticated user belongs to one or more Organizations through `organization_members`.

## Key Changes
1. **Multi-Tenancy**: Data isolation is enforced strictly at the database level using `organization_id` on all business tables.
2. **Invitation System**: New users can be invited by `email` and their Google OAuth login will match against `organization_invitations`.
3. **Class Assignment**: The new `class_coaches` table maps multiple coaches to a single class, separating `HEAD_COACH` from `ASSISTANT_COACH`.
4. **Data Isolation**: RLS policies restrict viewing of attendance, schedules, and student data to only the classes a coach is explicitly assigned to. Admin/Owner roles retain organization-wide visibility.

## Security Model
- **No hardcoded logic**: Admin rights are no longer based on email matching.
- **Server Context**: Actions and UI rely on `getCurrentOrganizationContext()`, pulling directly from server sessions.
- **Strict RLS**: Data leaks between organizations and between unassigned classes are blocked at the PostgreSQL level.
