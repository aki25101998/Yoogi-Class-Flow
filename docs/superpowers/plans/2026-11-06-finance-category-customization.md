# Tùy Biến Danh Mục Thu Chi & Khôi Phục Mẫu Mặc Định Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Cho phép quản trị viên toàn quyền Thêm, Sửa, Xóa danh mục cha và con của phân hệ Thu - Chi, đồng thời cung cấp nút khôi phục cây danh mục về mẫu mặc định tiêu chuẩn bất cứ lúc nào.

**Architecture:** Mở rộng Server Actions (`updateCategoryAction`, `deleteCategoryAction` mở khóa, `resetDefaultFinanceCategoriesAction`), cập nhật giao diện `FinanceCategoriesClient.tsx` gỡ bỏ hoàn toàn ổ khóa `is_system`, bổ sung Modal Sửa nhóm cha / mục con và Modal Khôi phục mẫu mặc định, đồng thời cập nhật Hiến pháp dự án.

**Tech Stack:** Next.js 14 App Router, TypeScript, Supabase PostgreSQL, TanStack React Query, CSS Modules / CSS Variables.

---

### Task 1: Nâng Cấp Server Actions Cho Danh Mục Thu Chi

**Files:**
- Modify: `app/(dashboard)/finance/actions.ts:170-238`

- [ ] **Step 1: Viết mới `updateCategoryAction` trong `app/(dashboard)/finance/actions.ts`**

Mục tiêu: Cho phép cập nhật tên, biểu tượng (icon) hoặc đổi nhóm cha của danh mục, kiểm tra phân quyền và xử lý lỗi trùng lặp thân thiện.

```typescript
export async function updateCategoryAction(
  id: string,
  data: { name: string; icon?: string; parent_id?: string | null }
) {
  const context = await getCurrentOrganizationContext();
  if (!context || !context.organization) return { success: false, error: 'Access Denied' };

  const isAdminOrOwner = context.membership?.role === 'admin' || context.membership?.role === 'owner';
  const hasPermission = isAdminOrOwner || (context.permissions && (
    context.permissions.includes('manage_finance') || 
    context.permissions.includes('manage_settings')
  ));
  if (!hasPermission) {
    return { success: false, error: 'Bạn không có quyền chỉnh sửa danh mục tài chính.' };
  }

  if (!data.name || data.name.trim().length === 0) {
    return { success: false, error: 'Tên danh mục không được để trống.' };
  }

  const supabase = await createClient();
  const orgId = context.organization.id;

  const updatePayload: Record<string, any> = {
    name: data.name.trim(),
    updated_at: new Date().toISOString(),
  };

  if (data.icon !== undefined) {
    updatePayload.icon = data.icon;
  }

  if (data.parent_id !== undefined) {
    updatePayload.parent_id = data.parent_id || null;
  }

  const { error } = await supabase
    .from('finance_categories')
    .update(updatePayload)
    .eq('id', id)
    .eq('organization_id', orgId);

  if (error) {
    if (error.code === '23505' || error.message?.includes('duplicate key') || error.message?.includes('uq_finance_categories')) {
      if (error.message?.includes('parent_null')) {
        return { success: false, error: 'Tên nhóm danh mục này đã tồn tại.' };
      }
      return { success: false, error: 'Tên danh mục này đã tồn tại trong nhóm.' };
    }
    return { success: false, error: error.message };
  }

  revalidatePath('/finance');
  revalidatePath('/settings/finance-categories');
  return { success: true };
}
```

- [ ] **Step 2: Cập nhật `deleteCategoryAction` để gỡ bỏ hoàn toàn chặn `is_system`**

Trong `app/(dashboard)/finance/actions.ts`:
Xóa đoạn:
```typescript
  if (cat.is_system) {
    return { success: false, error: 'Không thể xóa danh mục mặc định của hệ thống.' };
  }
```
Để cho phép Admin xóa bất kỳ danh mục nào thuộc tổ chức của mình.

- [ ] **Step 3: Viết mới `resetDefaultFinanceCategoriesAction` trong `app/(dashboard)/finance/actions.ts`**

Mục tiêu: Đặt lại toàn bộ danh mục của tổ chức về mẫu mặc định tiêu chuẩn bằng cách dọn dẹp các mục cũ và gọi RPC `seed_default_finance_categories_for_org`.

```typescript
export async function resetDefaultFinanceCategoriesAction() {
  const context = await getCurrentOrganizationContext();
  if (!context || !context.organization) return { success: false, error: 'Access Denied' };

  const isAdminOrOwner = context.membership?.role === 'admin' || context.membership?.role === 'owner';
  const hasPermission = isAdminOrOwner || (context.permissions && (
    context.permissions.includes('manage_finance') || 
    context.permissions.includes('manage_settings')
  ));
  if (!hasPermission) {
    return { success: false, error: 'Bạn không có quyền đặt lại danh mục tài chính.' };
  }

  const supabase = await createClient();
  const orgId = context.organization.id;

  // Xóa mục con trước, sau đó xóa nhóm cha để tránh lỗi ràng buộc
  const { error: childDeleteError } = await supabase
    .from('finance_categories')
    .delete()
    .eq('organization_id', orgId)
    .not('parent_id', 'is', null);

  if (childDeleteError) {
    return { success: false, error: `Lỗi khi dọn dẹp mục con: ${childDeleteError.message}` };
  }

  const { error: deleteError } = await supabase
    .from('finance_categories')
    .delete()
    .eq('organization_id', orgId);

  if (deleteError) {
    return { success: false, error: `Lỗi khi dọn dẹp danh mục cũ: ${deleteError.message}` };
  }

  // Gọi RPC nạp lại mẫu chuẩn hệ thống
  const { error: seedError } = await supabase.rpc('seed_default_finance_categories_for_org', {
    p_org_id: orgId,
  });

  if (seedError) {
    return { success: false, error: `Lỗi khi nạp danh mục mẫu: ${seedError.message}` };
  }

  revalidatePath('/finance');
  revalidatePath('/settings/finance-categories');
  return { success: true };
}
```

- [ ] **Step 4: Kiểm tra cú pháp và build các action**

Chạy: `npx tsc --noEmit`
Kỳ vọng: Không có lỗi TypeScript liên quan đến `actions.ts`.

- [ ] **Step 5: Commit task 1**

```bash
git add app/\(dashboard\)/finance/actions.ts
git commit -m "feat(finance): add updateCategoryAction, unlocked deleteCategoryAction, and resetDefaultFinanceCategoriesAction"
```

---

### Task 2: Nâng Cấp Giao Diện Quản Lý Danh Mục Thu Chi

**Files:**
- Modify: `app/(dashboard)/settings/finance-categories/FinanceCategoriesClient.tsx`

- [ ] **Step 1: Mở rộng `PARENT_ICON_OPTIONS` với đầy đủ các icon hệ thống**

Bổ sung các icon: `school` (Học phí / Giáo dục), `badge` (Nhân sự), `sports_martial_arts` (Võ phục / Dụng cụ võ), `emoji_events` (Sự kiện / Giải đấu), `local_cafe` (Tiếp khách / Vận hành), `fitness_center` (Dụng cụ tập), `inventory_2` (Nhập hàng).

- [ ] **Step 2: Thêm các state quản lý Sửa danh mục, Khôi phục mẫu & Đồng bộ Bento KPI**

Trong `FinanceCategoriesClient.tsx`:
- Import `updateCategoryAction`, `resetDefaultFinanceCategoriesAction`.
- Cập nhật Bento KPI ô số 4 thành "Tổng Hạng Mục Con" (`totalExpenseSubs + totalIncomeSubs` mục) để phản ánh trạng thái mở khóa toàn diện.
- Thêm state cho Edit Modal:
  - `editModalItem: FinanceCategory | null`
  - `editName: string`
  - `editIcon: string`
  - `editParentId: string | null`
  - `editSubmitting: boolean`
- Thêm state cho Confirm Delete Parent:
  - `deleteParentItem: FinanceCategory | null`
  - `deleteSubmitting: boolean`
- Thêm state cho Reset Template Confirm:
  - `isResetConfirmOpen: boolean`
  - `resetSubmitting: boolean`

- [ ] **Step 3: Cập nhật Header với nút "Khôi Phục Mẫu Mặc Định"**

Thêm nút phụ cạnh nút "+ Thêm Nhóm Cha":
```tsx
<div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
  <Button
    variant="secondary"
    onClick={() => setIsResetConfirmOpen(true)}
    leftIcon={<span className="material-icons-round">restart_alt</span>}
    style={{ borderRadius: 'var(--radius-full)' }}
  >
    Khôi Phục Mẫu Mặc Định
  </Button>
  <Button
    variant="primary"
    onClick={() => {
      setParentType(activeType);
      setIsAddParentModalOpen(true);
    }}
    leftIcon={<span className="material-icons-round">create_new_folder</span>}
    style={{ borderRadius: 'var(--radius-full)' }}
  >
    Thêm Nhóm Cha
  </Button>
</div>
```

- [ ] **Step 4: Nâng cấp Header Thẻ Nhóm Cha (Parent Card)**

- Gỡ bỏ huy hiệu "Mặc định hệ thống" cố định.
- Thêm 2 nút thao tác góc trên bên phải thẻ:
  - Nút Sửa (`edit`): Mở modal sửa nhóm cha (`openEditModal(parent)`).
  - Nút Xóa (`delete_outline`): Mở modal xác nhận xóa nhóm cha (`openDeleteParentModal(parent)`), hiển thị số lượng mục con sẽ bị xóa kèm theo.

- [ ] **Step 5: Nâng cấp Thẻ Mục Con (Subcategory Chips)**

- Gỡ bỏ hoàn toàn icon ổ khóa (`lock`).
- Mỗi chip mục con có:
  - Tên mục con.
  - Nút Sửa nhỏ (`edit`): Mở `openEditModal(sub)` để sửa tên hoặc đổi nhóm cha.
  - Nút Xóa nhỏ (`close`): Gọi `handleDeleteCategory(sub.id, sub.name)`.

- [ ] **Step 6: Thêm Modal `EditCategoryModal` (Dùng chung cho Nhóm Cha và Mục Con)**

- Tiêu đề modal linh hoạt: *"Chỉnh Sửa Nhóm Cha"* hoặc *"Chỉnh Sửa Mục Con"*.
- Nếu là Nhóm Cha: Form có Input Tên và Select Icon (`PARENT_ICON_OPTIONS`).
- Nếu là Mục Con: Form có Input Tên và Select Nhóm Cha trực thuộc (danh sách các nhóm cha cùng loại Thu hoặc Chi).

- [ ] **Step 7: Thêm Modal `DeleteParentConfirmModal` và `ResetTemplateConfirmModal`**

- `DeleteParentConfirmModal`: Cảnh báo số lượng mục con sẽ bị xóa cùng nhóm cha.
- `ResetTemplateConfirmModal`: Cảnh báo đặt lại toàn bộ danh mục Thu - Chi về template chuẩn ban đầu, nhấn mạnh dữ liệu giao dịch cũ vẫn được bảo lưu an toàn.

- [ ] **Step 8: Kiểm tra giao diện và build**

Chạy: `npx tsc --noEmit`
Kỳ vọng: Không có lỗi type trong `FinanceCategoriesClient.tsx`.

- [ ] **Step 9: Commit task 2**

```bash
git add app/\(dashboard\)/settings/finance-categories/FinanceCategoriesClient.tsx
git commit -m "feat(settings): allow editing and deleting parent/child categories, add reset default template modal"
```

---

### Task 3: Cập Nhật Hiến Pháp Dự Án (`CONSTITUTION.md`)

**Files:**
- Modify: `CONSTITUTION.md:537-553` (§10.2 Sổ Quỹ)
- Modify: `CONSTITUTION.md:800+` (§15 Nhật Ký Cập Nhật Hiến Pháp)

- [ ] **Step 1: Cập nhật §10.2 Sổ Quỹ trong `CONSTITUTION.md`**

Ghi nhận kiến trúc mới:
- Cây danh mục 2 cấp linh hoạt: Admin và Owner có toàn quyền Thêm, Sửa (tên, icon, đổi nhóm cha), và Xóa bất kỳ nhóm cha hoặc mục con nào.
- Gỡ bỏ rào cản cấm sửa/xóa đối với danh mục hệ thống mặc định.
- Hỗ trợ tính năng "Khôi phục Mẫu Mặc Định" thông qua RPC `seed_default_finance_categories_for_org`.
- Đảm bảo tính toàn vẹn dữ liệu: Khi xóa/sửa danh mục, `finance_transactions` vẫn bảo lưu nguyên vẹn text snapshot (`parent_category`, `sub_category`).

- [ ] **Step 2: Cập nhật §15 Nhật Ký Cập Nhật Hiến Pháp**

Ghi nhận phiên bản v1.9.6 - Cập nhật cơ chế tùy biến toàn quyền danh mục thu chi và khôi phục template mẫu mặc định.

- [ ] **Step 3: Commit task 3**

```bash
git add CONSTITUTION.md
git commit -m "docs(constitution): update §10.2 and §15 for finance category customization and template reset"
```

---

### Task 4: Kiểm Thử Toàn Diện, Build Production, Push GitHub & Deploy

**Files:**
- Toàn bộ codebase

- [ ] **Step 1: Chạy build production kiểm tra lỗi compile**

Run: `npm run build`
Kỳ vọng: Lệnh `next build` hoàn thành với mã thoát 0 (Build thành công, không có lỗi TypeScript hay cú pháp).

- [ ] **Step 2: Push code lên GitHub**

Run: `git push origin main`
Kỳ vọng: Toàn bộ commit được đồng bộ lên remote GitHub `origin/main`.

- [ ] **Step 3: Xác minh deploy**

Kiểm tra workflow Next.js / Vercel deploy hoàn tất.

