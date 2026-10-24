# Design Specification: Vibrant Athletic & Martial Arts Design System

**Date:** 2026-10-24  
**Status:** Approved  
**Inspiration:** Quiz App Athletic Modern Style (`https://quiz-app-chi-ashy-27.vercel.app/`)  
**Core Domain:** Physical Education & Martial Arts Academy Management (Võ thuật & Giáo dục Thể chất)  
**Target Files:**
- `app/globals.css` (CSS Variables, theme tokens, typography, dark/light mode palette)
- `app/styles/page-standard.module.css` (Card-Row, Overview KPI, Toolbar, Pill Tabs)
- `app/components/ui/Button.module.css` (Pill buttons, gradient glow, hover lift)
- `app/components/Sidebar.module.css` (Brand gradient, active navigation glow)
- `app/components/ui/Badge.module.css` (Vibrant martial arts belt & status badges)
- `CONSTITUTION.md` (Update Section 12 UI/UX rules)

---

## 1. Context & Motivation

The previous design system used a fintech/developer-oriented SaaS color palette:
- Monochromatic indigo/violet (`#6366f1`) with cool slate grays.
- Boxy rectangular cards (`border-radius: 8px - 12px`).
- While clean, it felt generic, corporate, and lacked the energetic dynamism, vitality, and martial spirit appropriate for a **Sports Training & Martial Arts Academy (Yoogi Class Flow)**.

The reference modern application (`quiz-app-chi-ashy-27.vercel.app`) demonstrates a vibrant, highly engaging design aesthetic:
- A high-energy complementary color pair: **Electric Teal (`#14B8A6`)** and **Vibrant Coral Orange (`#FF6B35`)**.
- Warm, luminous, off-white background with subtle diffused ambient glows in light mode, and obsidian deep slate in dark mode.
- Generous, tactile rounded corners (`border-radius: 20px - 28px`).
- Pill-shaped buttons (`border-radius: 9999px`) with gradient fills, soft colored shadows, and subtle micro-interactions.
- Playful badges and clear, friendly typography.

This specification details the complete transformation of the Yoogi Class Flow visual identity into a **Vibrant Athletic & Martial Arts Design System**.

---

## 2. Color Palette & Design Tokens

### 2.1 Brand & Semantic Tokens (`app/globals.css`)

```css
:root {
  /* Primary Brand: Electric Athletic Teal */
  --primary: #14b8a6;            /* Teal 500: Health, stamina, discipline */
  --primary-hover: #0d9488;      /* Teal 600 */
  --primary-light: #ccfbf1;      /* Teal 100 */
  --primary-glow: rgba(20, 184, 166, 0.35);

  /* Secondary Accent: Vibrant Coral Orange */
  --accent-energy: #ff6b35;      /* Energetic Coral: Passion, martial spirit, action */
  --accent-energy-hover: #f97316;
  --accent-energy-light: #ffedd5;
  --accent-energy-glow: rgba(255, 107, 53, 0.35);

  /* Status Colors */
  --success: #10b981;            /* Emerald 500: Attendance, Active */
  --success-bg: #d1fae5;
  --success-text: #047857;

  --warning: #f59e0b;            /* Amber/Gold 500: Belt promotion, Pending */
  --warning-bg: #fef3c7;
  --warning-text: #b45309;

  --danger: #ef4444;             /* Red 500: Suspended, Cancelled */
  --danger-hover: #dc2626;
  --danger-bg: #fee2e2;
  --danger-text: #b91c1c;

  --info: #06b6d4;               /* Cyan 500: Information, Schedules */
  --info-bg: #cffafe;
  --info-text: #0e7490;

  /* Surfaces & Backgrounds (Light Mode) */
  --background: #faf9f6;         /* Warm athletic cream off-white */
  --surface: #ffffff;
  --surface-hover: #f4f4f5;
  --surface-elevated: #ffffff;

  /* Text */
  --text-main: #0f172a;          /* Slate 900: High-contrast crisp text */
  --text-secondary: #475569;     /* Slate 600 */
  --text-muted: #94a3b8;         /* Slate 400 */
  --text-on-primary: #ffffff;

  /* Borders & Dividers */
  --border-light: #e4e4e7;       /* Soft zinc border */
  --border: #d4d4d8;
  --border-focus: #14b8a6;

  /* Radii - Generous Curved Aesthetic */
  --radius-sm: 0.375rem;         /* 6px */
  --radius-md: 0.625rem;         /* 10px */
  --radius-lg: 1rem;             /* 16px */
  --radius-xl: 1.25rem;          /* 20px */
  --radius-2xl: 1.5rem;          /* 24px */
  --radius-full: 9999px;         /* Fully rounded pills */

  /* Diffused & Colored Glow Shadows */
  --shadow-sm: 0 1px 3px 0 rgba(0, 0, 0, 0.04);
  --shadow-md: 0 6px 16px -2px rgba(0, 0, 0, 0.05), 0 2px 4px -2px rgba(0, 0, 0, 0.03);
  --shadow-lg: 0 12px 30px -8px rgba(0, 0, 0, 0.08), 0 4px 10px -3px rgba(0, 0, 0, 0.04);
  --shadow-modal: 0 24px 48px -12px rgba(15, 23, 42, 0.16);
  --shadow-teal-glow: 0 8px 24px -4px rgba(20, 184, 166, 0.35);
  --shadow-coral-glow: 0 8px 24px -4px rgba(255, 107, 53, 0.35);
}
```

### 2.2 Dark Mode System (`[data-theme="dark"]`)

```css
[data-theme="dark"] {
  --primary: #14b8a6;
  --primary-hover: #2dd4bf;
  --primary-light: rgba(20, 184, 166, 0.18);
  --primary-glow: rgba(45, 212, 191, 0.3);

  --accent-energy: #ff6b35;
  --accent-energy-hover: #fb923c;
  --accent-energy-light: rgba(255, 107, 53, 0.18);
  --accent-energy-glow: rgba(251, 146, 60, 0.3);

  /* Obsidian Deep Black/Navy Surfaces */
  --background: #090a0f;
  --surface: #11131a;
  --surface-hover: #181b24;
  --surface-elevated: #161922;

  --text-main: #f8fafc;
  --text-secondary: #94a3b8;
  --text-muted: #64748b;

  --border-light: rgba(255, 255, 255, 0.08);
  --border: rgba(255, 255, 255, 0.14);
  --border-focus: #2dd4bf;

  --shadow-sm: 0 1px 3px 0 rgba(0, 0, 0, 0.4);
  --shadow-md: 0 6px 16px -2px rgba(0, 0, 0, 0.5);
  --shadow-lg: 0 12px 30px -8px rgba(0, 0, 0, 0.6);
}
```

---

## 3. Component Transformations

### 3.1 Button Component (`app/components/ui/Button.module.css`)
- **Primary Buttons:** Gradient fill `linear-gradient(135deg, var(--primary) 0%, var(--primary-hover) 100%)` with pill shape `border-radius: var(--radius-full)`. On hover: subtle 1px upward lift (`transform: translateY(-1px)`) and luminous shadow (`box-shadow: var(--shadow-teal-glow)`).
- **Secondary / Outline Buttons:** Pill shape, soft background with subtle border, color shifts on hover.
- **Danger / Energy Variant:** Gradient `linear-gradient(135deg, var(--accent-energy) 0%, #ea580c 100%)` with coral glow.

### 3.2 Navigation & Sidebar (`app/components/Sidebar.module.css`)
- **Brand Logo:** Gradient headline text `linear-gradient(135deg, var(--primary) 0%, var(--accent-energy) 100%)`.
- **Active Navigation Items:** Luminous rounded pill indicator with soft background tint (`background: var(--primary-light); color: var(--primary); font-weight: 700;`).
- **Icons:** Energetic alignment with sport and martial arts icons.

### 3.3 Overview Cards & KPI Metrics (`app/styles/page-standard.module.css`)
- Container bo góc 24px (`border-radius: var(--radius-2xl)`).
- KPI metric cards styled with subtle radial ambient glow in the top-right corner, bold numerical figures, and pill-shaped status tags.

### 3.4 Entity Card-Row List
- Cards with 20px radius, clean elevation, and smooth hover transition.
- Badges with colored status dots representing martial arts belts (`Đai Vàng`, `Đai Xanh`, `Đai Đỏ`, `Đai Đen`).

---

## 4. Migration & Compatibility Plan

1. **Zero Breaking Changes:**
   - The token variable names (`--primary`, `--surface`, `--background`, `--text-main`, etc.) remain identical so all 32 existing pages continue to function without any broken references.
   - All components (`Button`, `Badge`, `Card`, `PageHeader`, `Input`) will automatically inherit the upgraded colors, radii, and shadows seamlessly.
2. **Step-by-step rollout:**
   - Step 1: Update `app/globals.css` with the vibrant athletic tokens and theme variables.
   - Step 2: Update `app/components/ui/Button.module.css` for pill buttons and gradient glow.
   - Step 3: Update `app/styles/page-standard.module.css` for the 24px curved cards and vibrant KPI glow.
   - Step 4: Update `app/components/Sidebar.module.css` with brand gradient and active indicators.
   - Step 5: Verify build (`tsc --noEmit` + `npm run build`), commit and deploy.

---

## 5. Verification Plan

1. **Visual Verification:**
   - Inspect Dashboard, Coaches, Schedule, Payroll, and Settings pages.
   - Verify both Light Mode (`#FAF9F6`) and Dark Mode (`#090A0F`).
   - Check pill buttons, hover glow effects, and contrast accessibility (WCAG AA).
2. **Build Verification:**
   - Execute Next.js build to confirm zero TypeScript and CSS module errors.
3. **Constitution & Deployment:**
   - Update `CONSTITUTION.md` section 12 with the new design system specs.
   - Commit and push to GitHub, triggering auto-deploy to Vercel.
