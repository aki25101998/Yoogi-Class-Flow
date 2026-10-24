# 4-Card Overview KPI Grid & Athletic Watermark Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement a balanced, modern 4-card KPI overview grid with martial arts watermark accents on the Coaches page and responsive auto-fit grid across all overview cards to eliminate awkward 3-card void spaces.

**Architecture:** Update shared CSS tokens in `page-standard.module.css` to introduce `.kpiWatermark`, `.kpiCaption`, and flexible `repeat(auto-fit, minmax(220px, 1fr))` grid layout; update `CoachesClient.tsx` to render the 4th "Tổng nhân sự" KPI card; verify with TypeScript and production build.

**Tech Stack:** Next.js 14 (App Router), Vanilla CSS Modules, Google Material Icons Round, TypeScript.

---

### Task 1: Update CSS for Overview KPI Cards (`app/styles/page-standard.module.css`)

**Files:**
- Modify: `app/styles/page-standard.module.css:66-159`

- [ ] **Step 1: Update `.overviewGrid` responsive behavior**
  Replace fixed 4-column rule with dynamic auto-fit grid so 3-card pages expand to 33.3% and 4-card pages expand to 25%:
  ```css
  .overviewGrid {
    display: grid;
    grid-template-columns: repeat(1, 1fr);
    gap: var(--space-4);
    padding: 20px 24px;
  }
  @media (min-width: 640px) {
    .overviewGrid {
      grid-template-columns: repeat(2, 1fr);
    }
  }
  @media (min-width: 1024px) {
    .overviewGrid {
      grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
    }
  }
  ```

- [ ] **Step 2: Add `.kpiWatermark` and `.kpiCaption` styles**
  In `app/styles/page-standard.module.css`:
  - Set `.kpiItem`: `position: relative; overflow: hidden;`
  - Add `.kpiCaption`: `font-size: 0.75rem; color: var(--text-secondary); margin-top: 4px;`
  - Add `.kpiWatermark`:
    ```css
    .kpiWatermark {
      position: absolute;
      right: 14px;
      bottom: 8px;
      font-size: 42px;
      line-height: 1;
      opacity: 0.12;
      pointer-events: none;
      user-select: none;
      transition: opacity 0.2s ease, transform 0.2s ease;
    }
    .kpiItem:hover .kpiWatermark {
      opacity: 0.18;
      transform: scale(1.08);
    }
    ```

- [ ] **Step 3: Verify CSS compilation**
  Run `cmd.exe /c "npx tsc --noEmit"` to ensure no syntax issues.

---

### Task 2: Implement 4-Card Overview on Coaches Page (`app/(dashboard)/coaches/CoachesClient.tsx`)

**Files:**
- Modify: `app/(dashboard)/coaches/CoachesClient.tsx:370-391`

- [ ] **Step 1: Update `overviewHeader` text and layout**
  Update the header to remove the floating "Tổng cộng: 3 nhân sự" text (since it is now Card 1) and replace with a sleek status indicator:
  ```tsx
  <div className={styles.overviewHeader}>
    <div className={styles.overviewTitle}>TỔNG QUAN HUẤN LUYỆN VIÊN</div>
    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 500 }}>
      Cập nhật theo thời gian thực
    </div>
  </div>
  ```

- [ ] **Step 2: Render 4 KPI cards with watermark icons and captions**
  In `CoachesClient.tsx`:
  - Card 1: `kpiPrimary` - "TỔNG NHÂN SỰ" (`totalCount`), caption: "Toàn bộ đội ngũ HLV", icon `sports_martial_arts`
  - Card 2: `kpiSuccess` - "ĐANG HOẠT ĐỘNG" (`activeCount`), caption: "Sẵn sàng đứng lớp", icon `bolt`
  - Card 3: `kpiWarning` - "LỜI MỜI CHỜ" (`invitationsCount`), caption: "Chờ HLV chấp thuận", icon `mail`
  - Card 4: `kpiDanger` - "ĐÃ TẠM NGƯNG" (`suspendedCount`), caption: "Nghỉ phép hoặc tạm ngưng", icon `pause_circle`

- [ ] **Step 3: Update `CoachSkeleton` to reflect 4 cards in skeleton state**
  Ensure overview skeleton or KPI cards match.

---

### Task 3: Constitution Update, Build & Deployment

**Files:**
- Modify: `CONSTITUTION.md`

- [ ] **Step 1: Update CONSTITUTION.md Section 12 & 15**
  Document the 4-Card KPI Overview Grid pattern (v1.3.1).

- [ ] **Step 2: Run Full Typecheck and Production Build**
  - Run: `cmd.exe /c "npx tsc --noEmit"`
  - Run: `cmd.exe /c "npm run build"`
  - Verify all 32/32 routes pass with exit code 0.

- [ ] **Step 3: Commit and Push to GitHub**
  - `git add .`
  - `git commit -m "feat: implement 4-card overview KPI grid with athletic watermark accents"`
  - `git push origin main`
