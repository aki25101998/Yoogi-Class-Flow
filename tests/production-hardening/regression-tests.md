# Production Hardening Regression Tests

This document outlines the critical scenarios that must be tested (manually or via E2E) to verify the integrity constraints implemented in Migration 028 and the accompanying Server Action hardening.

## 1. Security & Isolation (Cross-Tenant)
- **Scenario 1.1:** Admin of Org A attempts to add a student to a Venue belonging to Org B.
  - **Expected:** Blocked by DB composite FK constraint on `students(organization_id, venue_id)` and Server Action validation.
- **Scenario 1.2:** Admin of Org A attempts to enroll a student in a Class belonging to Org B.
  - **Expected:** Blocked by `enrollStudentAction` validation and DB constraints.
- **Scenario 1.3:** Coach from Org A attempts to view version history via API bypassing UI.
  - **Expected:** RLS Policy "Admin can view version changes" blocks read access for non-admin/owner roles.

## 2. Session State Machine
- **Scenario 2.1:** Attempt to change a session from `approved` back to `scheduled`.
  - **Expected:** DB Trigger `session_state_machine` throws exception.
- **Scenario 2.2:** Attempt to `overrideCoach` for a session that is already `paid`.
  - **Expected:** Blocked by `session.service.ts` and DB Trigger.
- **Scenario 2.3:** Cancel a session that is `approved` or `paid`.
  - **Expected:** Blocked by `session.service.ts` and DB Trigger.

## 3. Tuition & Finance (Atomic Payments)
- **Scenario 3.1:** Submit payment greater than the remaining tuition amount (Overpayment).
  - **Expected:** `record_tuition_payment` RPC aborts and returns an overpayment error.
- **Scenario 3.2:** Concurrency: Two admins submit a payment for the exact remaining amount at the same time.
  - **Expected:** First request succeeds. Second request fails due to `SELECT FOR UPDATE` lock and overpayment check in RPC.
- **Scenario 3.3:** Delete a tuition record that has `paid_amount > 0`.
  - **Expected:** `deleteTuitionAction` blocks the deletion to prevent orphaned finance records.
- **Scenario 3.4:** Attempt to delete a system-generated finance transaction (e.g. from Tuition payment).
  - **Expected:** `deleteTransactionAction` blocks deletion because `source_type != 'MANUAL'`.

## 4. Coach Assignment & Integrity
- **Scenario 4.1:** Assign a second `HEAD_COACH` to a single class.
  - **Expected:** DB throws `idx_unique_head_coach_per_class` unique constraint violation.
- **Scenario 4.2:** Attempt to import coaches with missing `email` or duplicate `email`.
  - **Expected:** `import_coaches_batch` handles duplicates cleanly by linking to existing `profiles` or generating fallback emails without failing the batch.

## 5. Attendance Verification
- **Scenario 5.1:** Submit attendance for a student who has been `dropped` from the class.
  - **Expected:** `saveAttendanceAction` rejects the specific student and returns an error because `class_students.status` is not `active`.
- **Scenario 5.2:** Submit attendance for a student who belongs to a different class.
  - **Expected:** Rejected by `saveAttendanceAction` class membership verification.

## 6. Payroll Authorization
- **Scenario 6.1:** A Coach role attempts to call `pay_approved_salary_sessions`.
  - **Expected:** Internal RPC check `public.is_org_admin(p_organization_id)` fails and aborts.
- **Scenario 6.2:** Pay the same `approved` session twice.
  - **Expected:** RPC detects existing `payroll_payment_sessions` record and throws "Session has already been paid".

## 7. Belt Integrity
- **Scenario 7.1:** Attempt to delete a Belt that is currently assigned to a Student.
  - **Expected:** `deleteBeltAction` counts active students and blocks deletion, advising deactivation instead.

## 8. Backup & Restore
- **Scenario 8.1:** Restore a record using a payload that contains an `organization_id` different from the current Org.
  - **Expected:** `restore_record_to_state` throws "Dữ liệu không thuộc về Organization hiện tại".
- **Scenario 8.2:** Attempt to restore a record but manipulate the `sequence_id` or `id` in the JSON payload.
  - **Expected:** `build_dynamic_update` strips immutable/generated columns; manipulation is ignored.
