# Vibrant Athletic & Martial Arts Design System Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Transform the Yoogi Class Flow UI into a vibrant, high-energy physical education & martial arts design system featuring Electric Teal (`#14B8A6`) and Vibrant Coral Orange (`#FF6B35`), generous 20-28px curved cards, pill-shaped buttons with glowing gradients, and full light/dark mode compatibility.

**Architecture:** Update the root CSS variables in `app/globals.css` to define the new athletic palette, shadows, and radii while maintaining 100% backward compatibility for existing variable names. Upgrade `Button.module.css`, `Sidebar.module.css`, and `page-standard.module.css` to reflect the new visual identity. Verify through Next.js type check, production build, and automated deploy.

**Tech Stack:** Next.js 14 App Router, TypeScript, Vanilla CSS Modules, CSS Variables. Zero external CSS frameworks or Tailwind.

---

### Task 1: Core Design System Tokens & Global Styles (`app/globals.css`)

**Files:**
- Modify: `app/globals.css:1-120`

- [ ] **Step 1: Update Light Mode Tokens in `app/globals.css`**
  - Set `--primary: #14b8a6` (Teal 500)
  - Set `--primary-hover: #0d9488` (Teal 600)
  - Set `--primary-light: #ccfbf1` (Teal 100)
  - Set `--accent-energy: #ff6b35` (Vibrant Coral)
  - Set `--accent-energy-hover: #f97316`
  - Set `--accent-energy-light: #ffedd5`
  - Set `--background: #faf9f6` (Warm athletic cream)
  - Set radii: `--radius-lg: 1rem`, `--radius-xl: 1.25rem`, `--radius-2xl: 1.5rem`
  - Add glowing shadow tokens: `--shadow-teal-glow`, `--shadow-coral-glow`

- [ ] **Step 2: Update Dark Mode Tokens in `app/globals.css`**
  - Set `--background: #090a0f` (Obsidian space black)
  - Set `--surface: #11131a`
  - Set `--surface-hover: #181b24`
  - Set `--primary: #14b8a6`
  - Set `--primary-hover: #2dd4bf`
  - Set `--primary-light: rgba(20, 184, 166, 0.18)`
  - Set `--accent-energy: #ff6b35`
  - Set `--border-light: rgba(255, 255, 255, 0.08)`
  - Set `--border: rgba(255, 255, 255, 0.14)`

- [ ] **Step 3: Verify TypeScript & CSS compilation**
  Run: `cmd.exe /c npx tsc --noEmit`
  Expected: Exit code 0

---

### Task 2: Button Component Upgrade (`app/components/ui/Button.module.css`)

**Files:**
- Modify: `app/components/ui/Button.module.css`

- [ ] **Step 1: Add Pill Styling & Gradient Fills**
  - Upgrade `.button` border-radius to `var(--radius-full)` (or `var(--radius-md)` depending on context).
  - Update `.primary`: `background: linear-gradient(135deg, var(--primary) 0%, var(--primary-hover) 100%)`, `color: #ffffff`, `box-shadow: 0 4px 14px -2px rgba(20, 184, 166, 0.3)`.
  - Add hover micro-interaction: `transform: translateY(-1px)`, `box-shadow: 0 8px 24px -4px rgba(20, 184, 166, 0.45)`.
  - Update `.danger`: `background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%)`.

- [ ] **Step 2: Verify Button styling**
  Run: `cmd.exe /c npx tsc --noEmit`
  Expected: Exit code 0

---

### Task 3: Sidebar Brand Header & Active Item Glow (`app/components/Sidebar.tsx` & `Sidebar.module.css`)

**Files:**
- Modify: `app/components/Sidebar.tsx`
- Modify: `app/components/Sidebar.module.css`

- [ ] **Step 1: Add Brand Gradient in `Sidebar.tsx` / `Sidebar.module.css`**
  - Enhance logo text with gradient: `background: linear-gradient(135deg, var(--primary) 0%, var(--accent-energy) 100%); -webkit-background-clip: text; -webkit-text-fill-color: transparent;`
  - Add martial arts/sports badge under brand name: `✦ DOJO & CLASS FLOW`.

- [ ] **Step 2: Update Active Navigation Indicators**
  - Active menu link: `border-radius: var(--radius-full)`, `background: var(--primary-light)`, `color: var(--primary)`, `font-weight: 700`.

- [ ] **Step 3: Verify Sidebar compilation**
  Run: `cmd.exe /c npx tsc --noEmit`
  Expected: Exit code 0

---

### Task 4: Card-Row & Overview KPI Styling (`app/styles/page-standard.module.css`)

**Files:**
- Modify: `app/styles/page-standard.module.css`

- [ ] **Step 1: Upgrade Overview Card & KPI Items**
  - `.overviewCard`: `border-radius: 24px`, soft diffused shadow `var(--shadow-md)`.
  - `.overviewKPI`: `border-radius: 18px`, ambient glow accent.
  - `.kpiPrimary`: border tint with `--primary`.
  - `.kpiWarning`: border tint with `--accent-energy`.

- [ ] **Step 2: Upgrade Toolbar & Entity Cards**
  - `.searchInput`: `border-radius: var(--radius-full)`, focus ring with `--primary`.
  - `.filterPill`: `border-radius: var(--radius-full)`, active with `linear-gradient(135deg, var(--primary) 0%, var(--primary-hover) 100%)`.
  - `.entityCard`: `border-radius: 20px`, smooth hover transition and diffused shadow.

- [ ] **Step 3: Verify page-standard compilation**
  Run: `cmd.exe /c npx tsc --noEmit`
  Expected: Exit code 0

---

### Task 5: Constitution Update, Production Build & Auto-Deploy

**Files:**
- Modify: `CONSTITUTION.md`

- [ ] **Step 1: Update Section 12 in `CONSTITUTION.md`**
  - Record the new Vibrant Athletic & Martial Arts Design System (v1.3.0).
  - Document Electric Teal and Vibrant Coral color tokens.

- [ ] **Step 2: Run Full Next.js Production Build**
  Run: `cmd.exe /c npm run build`
  Expected: All 32 routes compiled successfully with 0 errors.

- [ ] **Step 3: Commit and Push to GitHub**
  - `git add .`
  - `git commit -m "feat: implement vibrant athletic and martial arts design system"`
  - `git push origin main`
  - Vercel auto-deploys via GitHub push.
