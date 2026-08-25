# RLS Security Test Plan

## Scenarios
1. **TEST 1**: User in Organization A cannot read data from Organization B. (Verified by `organization_id` policies).
2. **TEST 2**: Assistant Coach A can read classes they are assigned to via `class_coaches`.
3. **TEST 3**: Assistant Coach A cannot read classes they are not assigned to.
4. **TEST 4**: Assistant Coach A cannot insert attendance for an unassigned class (handled by RLS INSERT checks).
5. **TEST 5**: Assistant Coach A cannot read the salary of Coach B (enforced by `coach_id` restriction).
6. **TEST 6**: Admin A cannot read Organization B.
7. **TEST 7**: User with no membership cannot access the dashboard (redirects to `/create-organization`).
8. **TEST 8**: Invitation for Email A cannot be accepted by Email B (Auth callback matches emails).
9. **TEST 9**: Expired invitation cannot be accepted (Checked during `acceptInvitation` service call).
10. **TEST 10**: Accepted invitation cannot be accepted twice (Status check in service).
11. **TEST 11**: Removed member loses access to Organization (Status changed to `removed`, RLS blocks access).
12. **TEST 12**: Suspended member cannot mutate business data (RLS relies on `status = 'active'`).
