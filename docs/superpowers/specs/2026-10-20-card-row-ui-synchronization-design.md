# Design Specification: Card-Row UI Synchronization

**Date:** 2026-10-20  
**Status:** Approved  
**Target Pages:** `app/(dashboard)/coaches/CoachesClient.tsx`, followed by `students`, `tuition`, `finance`  
**Shared Style Foundation:** `app/styles/page-standard.module.css`  

---

## 1. Context & Motivation

In the current application, the **Payroll page (`app/(dashboard)/payroll/PayrollClient.tsx`)** has a modern, cohesive UI design:
- An integrated **Overview Card** with rounded KPI boxes, colored status dots, subtle tinted borders (`color-mix`), and large numbers.
- A streamlined **Toolbar** containing a rounded search input with a search icon and pill-shaped tab buttons (`border-radius: var(--radius-full)`).
- A **Card-Row Entity List** where each item is a distinct, rounded card row featuring an avatar circle, primary bold title, secondary info subtitle, badges, labeled metric columns, and clean action buttons.

In contrast, the **Coaches page (`app/(dashboard)/coaches/CoachesClient.tsx`)** (and several other administrative pages) uses an outdated layout:
- Discrete KPI items with harsh left border strips (`border-left: 3px solid ...`) without a container header.
- Classical underlined tabs with a 2px horizontal border that stretches across the page.
- No instant search bar.
- Raw HTML table layout (`<table>`) with text-link action separators (`"Xem thông tin | Xóa"`), which looks cramped, utilitarian, and inconsistent in dark mode.

This specification outlines the standardization of the UI across the application to match the Payroll page aesthetic, beginning with the Coaches page.

---

## 2. Architecture & Design Principles

1. **Shared Design Tokens in `page-standard.module.css`:**
   - Define reusable CSS classes for the Overview Card, Toolbar, Pill Tabs, and Card-Row Entity Lists in `app/styles/page-standard.module.css`.
   - Ensure all classes strictly use CSS Variables from `app/globals.css` (`var(--surface)`, `var(--surface-hover)`, `var(--border-light)`, `var(--primary)`, etc.) to ensure seamless Light and Dark mode support.
   - Absolutely zero Tailwind utility dependencies or hardcoded color values, complying with Section 12 of `CONSTITUTION.md`.

2. **Phase 1: Coaches Page Transformation (`CoachesClient.tsx`):**
   - **Overview Card:**
     - Header: `"TỔNG QUAN HUẤN LUYỆN VIÊN"` with total coach count on the right.
     - 3 rounded KPI cards:
       - `ĐANG HOẠT ĐỘNG`: Active coach count (Primary/Info color).
       - `LỜI MỜI CHỜ`: Pending invitations count (Warning color).
       - `ĐÃ TẠM NGƯNG`: Suspended members count (Danger color).
   - **Toolbar & Pill Tabs:**
     - Left: Real-time search input with magnifying glass icon `[ 🔍 Tìm HLV theo tên hoặc email... ]`.
     - Right: Pill tabs:
       - `Tất cả (${totalCount})`
       - `Đang hoạt động (${activeCount})`
       - `Lời mời (${invitationsCount})`
       - `Đã tạm ngưng (${suspendedCount})`
   - **Card-Row Entity List:**
     - Replace `<TableContainer>` / `<Table>` with `.entityList`.
     - Each member or invitation is rendered in an `.entityCard`:
       - **Avatar**: Circular avatar with coach's photo (`photo_url` / `avatar_url`) or capital initial with colored background.
       - **Coach Info**: Name in bold with inline quick-edit nickname button; subtitle with email.
       - **Role Badge**: Reusable `Badge` component with appropriate color/text.
       - **Metric Column**:
         - For Active/Suspended tabs: Label `"SỐ LỚP PHỤ TRÁCH"` with value `"${m.classCount} lớp"`.
         - For Invitations tab: Label `"HẾT HẠN"` with formatted expiration date and expiration indicator.
       - **Action Buttons**: Modern button group with styled action buttons/icons:
         - Active tab: `"Xem thông tin"` (Primary ghost button), `"Phân quyền"` (Secondary ghost button for owner), `"Xóa"` (Danger ghost button).
         - Invitations tab: `"Sao chép liên kết"` (Button with copy icon), `"Hủy"` (Danger ghost button).
         - Suspended tab: `"Kích hoạt lại"` (Success ghost button), `"Xóa"` (Danger ghost button).
   - **Loading State & Empty States:**
     - Match the pulse skeleton of card rows instead of table rows.
     - Consistent empty state placeholder when searches or filters return no results.

3. **Subsequent Phases (Rollout to Other Pages):**
   - **Học viên (`StudentsClient.tsx`)**: Apply same toolbar search, pill tabs (by status/branch), and student card-rows (avatar, student name, parent contact, belt badge, class count, action buttons).
   - **Học phí (`TuitionClient.tsx`)**: Apply toolbar filters, KPI overview, and financial card rows.
   - **Sổ quỹ (`FinanceClient.tsx`)**: Apply toolbar filters, KPI overview, and transaction card rows.

---

## 3. UI Component Details & Specifications

### 3.1 Overview Card Specification
```css
.overviewCard {
  background: var(--surface);
  border: 1px solid var(--border-light);
  border-radius: var(--radius-lg);
  overflow: hidden;
  margin-bottom: var(--space-4);
}
.overviewHeader {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 18px 24px 0;
}
.overviewTitle {
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--text-muted);
}
.overviewGrid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
  padding: 16px 24px 20px;
}
.overviewKPI {
  padding: 14px 16px;
  border-radius: var(--radius-md);
  background: var(--surface-hover);
  border: 1px solid var(--border-light);
  transition: border-color 0.15s;
}
.kpiPrimary { border-color: color-mix(in srgb, var(--primary) 25%, transparent); }
.kpiWarning { border-color: color-mix(in srgb, var(--warning) 25%, transparent); }
.kpiDanger  { border-color: color-mix(in srgb, var(--danger) 25%, transparent); }
.kpiSuccess { border-color: color-mix(in srgb, var(--success) 25%, transparent); }
```

### 3.2 Toolbar & Filter Pills Specification
```css
.toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;
  margin-bottom: var(--space-4);
}
.searchWrapper {
  position: relative;
  flex: 1;
  min-width: 240px;
  max-width: 380px;
}
.searchInput {
  width: 100%;
  height: 38px;
  padding: 0 14px 0 38px;
  border-radius: var(--radius-md);
  border: 1px solid var(--border-light);
  background: var(--surface);
  color: var(--text-main);
  font-size: 0.8125rem;
}
.filterGroup {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
}
.filterPill {
  padding: 6px 14px;
  font-size: 0.75rem;
  font-weight: 500;
  border-radius: var(--radius-full);
  border: 1px solid var(--border-light);
  background: transparent;
  color: var(--text-secondary);
  cursor: pointer;
  transition: all 0.15s;
}
.filterPillActive {
  background: var(--primary);
  color: var(--text-on-primary);
  border-color: var(--primary);
}
```

### 3.3 Card-Row Entity List Specification
```css
.entityList {
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.entityCard {
  background: var(--surface);
  border: 1px solid var(--border-light);
  border-radius: var(--radius-lg);
  padding: 14px 20px;
  display: grid;
  grid-template-columns: auto 1fr auto auto auto;
  align-items: center;
  gap: 16px;
  transition: border-color 0.2s, background-color 0.2s;
}
.entityCard:hover {
  border-color: var(--border);
  background: var(--surface-hover);
}
```

---

## 4. Error Handling & Edge Cases

1. **Empty Search Result:** Show an `EmptyState` component with a clear message and a "Xóa tìm kiếm" (Clear search) button.
2. **Missing Coach Photos/Names:** Fallback gracefully to uppercase first initial with distinct pastel/accent colors.
3. **Mobile Layout (< 768px):**
   - The `.entityCard` layout switches to flex-direction column or wrap, placing metrics and action buttons neatly below the coach name.
   - The `.overviewGrid` stacks into 1 or 2 columns based on screen width.
4. **Copy Link in Insecure Contexts:** Keep existing robust fallback logic for non-SSL development environments.

---

## 5. Verification Plan

1. **Visual & Behavioral Verification:**
   - Verify Coaches page in both Light Mode and Dark Mode.
   - Verify search filter reacts in real-time to coach name and email.
   - Verify all 4 pill tabs (`Tất cả`, `Đang hoạt động`, `Lời mời`, `Đã tạm ngưng`) filter and render correctly.
   - Verify actions (Xem thông tin modal, Đổi tên gọi, Phân quyền, Xóa, Sao chép link) continue to function identically.
2. **Build & Type Check:**
   - Run Next.js build verification to ensure no TypeScript or CSS module compilation errors.
3. **Git & Deploy Requirements:**
   - Commit and push to GitHub, trigger automatic deployment per project rules.
