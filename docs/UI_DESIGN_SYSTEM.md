# Yoogi Class Flow — UI Design System

> Official design standard document. All UI development must follow this guide.
> Reference: Payroll page (PayrollClient.tsx + PayrollClient.module.css)

---

## 1. Design Philosophy

Six core principles:

| # | Principle | Description |
|---|-----------|-------------|
| 1 | **Compact** | No excessive padding, tall cards, or wasted vertical space |
| 2 | **Horizontal** | Prefer row-based layouts over vertical card stacks |
| 3 | **Information-Dense** | Show maximum useful data per viewport |
| 4 | **Clear Hierarchy** | Page title → Section → Content with consistent sizing |
| 5 | **Low Visual Noise** | Subtle borders, no border-everywhere, minimal decorative elements |
| 6 | **Consistent** | Same patterns across all modules |

---

## 2. Page Structure

```
┌─────────────────────────────────────────────────────────┐
│ PAGE HEADER                                             │
│ Title + Description           [Actions aligned right]   │
└─────────────────────────────────────────────────────────┘
↓ gap: 20-24px
┌─────────────────────────────────────────────────────────┐
│ OVERVIEW CARD (single container)                        │
│ KPI 1  │  KPI 2  │  KPI 3  │  KPI 4                    │
└─────────────────────────────────────────────────────────┘
↓ gap: 20-24px
SECTION HEADING                              count / meta
↓ gap: 12px
TOOLBAR: [Search] [Filters]          [Action]
↓ gap: 12px
CONTENT: Table / List / Cards
↓ gap: 20-24px
NEXT SECTION...
```

---

## 3. Page Header

**Implementation**: CSS module class `.pageHeader` (flex, space-between)

```
Title (h1): 1.5rem, font-weight 700, color var(--text-main)
Description (p): 0.875rem, color var(--text-secondary)
Actions: flex row, gap 8px, aligned right
```

**Rules**:
- No excessive margin-bottom (max 4-8px below header)
- Actions stay on same line as title on desktop
- Mobile: actions wrap below title

**Back link** (detail pages): 0.8125rem, secondary color, arrow_back icon, 4px margin-bottom

---

## 4. Overview / KPIs

**Pattern**: ONE container card with grid of KPI items inside.

```css
.overviewCard {
  background: var(--surface);
  border: 1px solid var(--border-light);
  border-radius: var(--radius-lg);
}

.overviewGrid {
  display: grid;
  grid-template-columns: repeat(N, 1fr); /* 3-4 columns */
  gap: 12px;
  padding: 16-20px;
}

.kpiItem {
  padding: 14px 16px;
  border-radius: var(--radius-md);
  border: 1px solid var(--border-light);
  background: var(--surface-hover);
}
```

**KPI anatomy**:
- Label: 0.6875rem, uppercase, letter-spacing 0.04em, secondary/muted color
- Color dot: 7px circle (optional, semantic color)
- Value: 1.25-1.5rem, font-weight 700, semantic color

**Color variants**: Use `color-mix()` for borders:
- Primary (blue): `var(--primary)`
- Success (green): `var(--success)`
- Warning (orange): `var(--warning)`
- Danger (red): `var(--danger)`

**Never**: Individual Card per metric. Always group in ONE overview container.

---

## 5. Section Header

```css
.sectionHeader {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
}

.sectionTitle {
  font-size: 0.8125rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.sectionCount {
  font-size: 0.75rem;
  color: var(--text-muted);
}
```

---

## 6. List / Entity Display

**When to use List (row-based) vs Card Grid**:

| Data type | Recommended pattern |
|-----------|-------------------|
| Many entities (>3) of same type | **Row-based list** or **Table** |
| 1-3 featured items | Cards acceptable |
| Dashboard stats | Overview container |
| Schedule/calendar | Specialized layout OK |

**Row anatomy**:
```css
.entityRow {
  display: grid;
  grid-template-columns: [name] auto [info cols] auto [actions];
  align-items: center;
  gap: 16px;
  padding: 12px 20px;
  background: var(--surface);
  border: 1px solid var(--border-light);
  border-radius: var(--radius-lg);
  transition: border-color 0.2s;
}

.entityRow:hover {
  border-color: var(--border);
}
```

- Name: 0.9375rem, font-weight 600
- Sub-info labels: 0.6875rem, uppercase, muted
- Sub-info values: 0.8125rem, font-weight 500
- Actions: aligned right, flex row, gap 6px
- Mobile: hide secondary columns, show mobile summary line

---

## 7. Table

Use `TableContainer > Table > TableHeader > TableBody > TableRow > TableHead/TableCell`.

**Rules**:
- Compact padding (existing Table.module.css)
- Header: uppercase labels, muted color
- Hover state on rows
- Status columns use `<Badge>`
- Numeric values right-aligned when appropriate
- Action column last, right-aligned
- Responsive: horizontal scroll or hide columns

---

## 8. Card

Still used for:
- Overview containers
- Forms / specialized content
- Independent information blocks
- Empty states

**NOT used for**:
- Lists of many entities (use rows/table instead)
- Individual metrics (use overview grid instead)

---

## 9. Toolbar / Search / Filter

```
┌────────────────────────────────────────────────────┐
│ [🔍 Search...............] [Filter pills]  [Action] │
└────────────────────────────────────────────────────┘
```

- Search: max-width 340px, height 38px, left icon
- Filter pills: height ~32px, border-radius full, compact padding
- Active filter: primary bg + text-on-primary color
- Actions: aligned right

---

## 10. Button Hierarchy

| Variant | Use case |
|---------|----------|
| `primary` | Main CTA (Create, Save, Submit) |
| `outline` | Secondary actions (Export, Edit, View) |
| `ghost` | Tertiary actions (Refresh, icon-only edit) |
| `secondary` | Cancel in modals |
| `danger` | Destructive actions (Delete, Remove) |

**Size**: Use `sm` for inline/row actions, default for page-level CTAs.
**Icon buttons**: Use for contextual actions (edit, delete) when label adds no value.

---

## 11. Badge / Status

Always use `<Badge variant="...">` for status display.

| Status | Variant | Label |
|--------|---------|-------|
| Active | `success` | Hoạt động / Đang hoạt động |
| Inactive | `default` | Ngừng hoạt động / Đã đóng |
| Pending | `warning` | Chờ duyệt |
| Approved | `primary` | Đã duyệt |
| Paid | `success` | Đã thanh toán |
| Rejected | `danger` | Đã từ chối |
| Info | `info` | Belt names, informational |

---

## 12. Typography Scale

| Element | Size | Weight | Color |
|---------|------|--------|-------|
| Page title (h1) | 1.5rem | 700 | `--text-main` |
| Section title | 0.8125rem | 600 | `--text-main` |
| Entity name | 0.9375rem | 600 | `--text-main` |
| KPI value | 1.25-1.5rem | 700 | semantic color |
| KPI label | 0.6875rem | 600 | semantic/muted |
| Body text | 0.8125rem | 400-500 | `--text-main` |
| Metadata / caption | 0.75rem | 400-500 | `--text-muted` |
| Label (uppercase) | 0.6875rem | 600 | `--text-muted` |

---

## 13. Spacing

| Context | Value |
|---------|-------|
| Page gap (between major sections) | 20-24px |
| Section heading → content | 12px |
| List item gap | 6-8px |
| KPI grid gap | 12px |
| Card internal padding | 16-20px |
| Row internal padding | 12px 20px |
| Toolbar gap | 12px |
| Button group gap | 6-8px |

---

## 14. Color Tokens (Dark Theme)

Use existing CSS custom properties. Never hard-code colors.

| Token | Purpose |
|-------|---------|
| `--text-main` | Primary text |
| `--text-secondary` | Secondary text |
| `--text-muted` | Tertiary/disabled text |
| `--surface` | Card/container background |
| `--surface-hover` | Hover/secondary background |
| `--border-light` | Subtle borders |
| `--border` | Hover/active borders |
| `--primary` | Primary accent |
| `--success` | Success state |
| `--warning` | Warning state |
| `--danger` | Danger state |
| `--info` | Info state |

---

## 15. Icons

Material Icons Rounded (`material-icons-round`). No other icon libraries.

- Inline icons: 16-18px
- Action icons: 18-20px
- Empty state icons: 32-36px (with 0.5 opacity)
- Never purely decorative — every icon must convey meaning

---

## 16. Empty State

Compact empty state (max-height ~180px):
```
┌─ dashed border ────────────────────┐
│     [icon 32px, 0.5 opacity]       │
│     Title (0.875rem, semibold)     │
│     Description (0.75rem, muted)   │
└────────────────────────────────────┘
```

---

## 17. Error State

Three levels:
1. **Page error**: Full empty-state style with error icon
2. **Section error**: Compact inline bar (10px padding, icon + text, danger colors)
3. **Action error**: Same inline bar inside modals/forms

---

## 18. Loading State

Standard loading pattern:
- **Skeleton animation**: `pulse` keyframe (opacity 1→0.4→1, 1.5s)
- **Skeleton bars**: `var(--surface-hover)` background, rounded corners
- Mirror the final layout shape (header → overview → list skeletons)

---

## 19. Modal / Form

- Title in `ModalHeader`
- Form fields in `ModalBody` with `display: grid; gap: 16px`
- Error alert at top of form
- Actions in `ModalFooter`: Cancel (left) + Submit (right)
- No module-specific form styling

---

## 20. Responsive Strategy

| Breakpoint | Behavior |
|------------|----------|
| Desktop (>1024px) | Full horizontal layout, all columns visible |
| Tablet (768-1024px) | Reduce grid columns, hide secondary info columns |
| Mobile (<640px) | Stack layout, hide table columns, show mobile summary lines |

- Tables: horizontal scroll wrapper (`overflow-x: auto`)
- Overview grid: maintain 3 columns even on mobile (reduce padding)
- Row-based lists: switch to 2-column grid on mobile, show summary line
- Page header: stack title + actions vertically

---

## 21. CSS Module Convention

Each page that needs custom layout: `[PageName].module.css` alongside the client component.

Shared UI components: `app/components/ui/[Component].module.css`

**Naming**: camelCase for CSS classes (`.overviewCard`, `.kpiItem`, `.sectionHeader`).

---

*Last updated: 2026-09-03*
