# Coach Attendance Tracker — Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a free, responsive web app for a head coach to manage attendance, scheduling, and payroll for assistant coaches using Firebase.

**Architecture:** Single-page application (SPA) with vanilla HTML/CSS/JS. Firebase provides authentication (Google OAuth), database (Firestore), and hosting. Two roles: admin (full access) and coach (limited to own data). Vietnamese language UI with dark mode, premium aesthetics.

**Tech Stack:** HTML5, CSS3, vanilla JavaScript (ES modules), Firebase Auth, Cloud Firestore, Firebase Hosting

**Spec:** `docs/superpowers/specs/2026-06-01-coach-attendance-design.md`

---

## File Structure

```
d:\Project\Cham cong\
├── public/
│   ├── index.html              # Main SPA entry point
│   ├── css/
│   │   └── style.css           # Complete design system + all component styles
│   ├── js/
│   │   ├── app.js              # App initialization, routing, auth state
│   │   ├── firebase-config.js  # Firebase project configuration
│   │   ├── auth.js             # Google Auth login/logout/role detection
│   │   ├── router.js           # Client-side hash router
│   │   ├── db.js               # Firestore CRUD helpers (coaches, venues, schedules, attendance)
│   │   ├── utils.js            # Date formatting, currency formatting, helpers
│   │   ├── pages/
│   │   │   ├── login.js        # Login page (Google Sign-In button)
│   │   │   ├── dashboard.js    # Admin dashboard (today overview)
│   │   │   ├── coaches.js      # Admin: manage coaches CRUD
│   │   │   ├── venues.js       # Admin: manage venues CRUD
│   │   │   ├── schedule.js     # Admin: weekly schedule grid + substitution
│   │   │   ├── attendance.js   # Admin: review/approve attendance
│   │   │   ├── payroll.js      # Admin: monthly payroll summary
│   │   │   ├── my-schedule.js  # Coach: personal schedule view
│   │   │   ├── my-checkin.js   # Coach: check-in button
│   │   │   ├── my-attendance.js # Coach: attendance history
│   │   │   └── my-earnings.js  # Coach: monthly earnings
│   │   └── components/
│   │       ├── navbar.js       # Side navigation + top bar
│   │       ├── modal.js        # Reusable modal dialog
│   │       ├── toast.js        # Toast notification system
│   │       └── calendar.js     # Mini calendar component for date picking
│   └── assets/
│       └── logo.svg            # App logo
├── firestore.rules             # Firestore security rules
├── firebase.json               # Firebase hosting config
└── .firebaserc                 # Firebase project alias
```

---

## Task 1: Project Setup & Firebase Configuration

**Files:**
- Create: `public/index.html`
- Create: `public/js/firebase-config.js`
- Create: `firebase.json`
- Create: `.firebaserc`
- Create: `.gitignore`

- [ ] **Step 1: Create Firebase project**

Go to https://console.firebase.google.com
1. Create new project named "coach-attendance"
2. Enable Authentication → Sign-in method → Google
3. Create Firestore Database (start in test mode for development)
4. Copy project config (apiKey, authDomain, projectId, etc.)

- [ ] **Step 2: Create `.gitignore`**

```
node_modules/
.firebase/
.superpowers/
*.log
```

- [ ] **Step 3: Create `firebase.json`**

```json
{
  "hosting": {
    "public": "public",
    "ignore": ["firebase.json", "**/.*", "**/node_modules/**"],
    "rewrites": [{ "source": "**", "destination": "/index.html" }]
  }
}
```

- [ ] **Step 4: Create `public/js/firebase-config.js`**

```javascript
// Firebase configuration — replace with your project's config
export const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_PROJECT.firebaseapp.com",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_PROJECT.appspot.com",
  messagingSenderId: "YOUR_SENDER_ID",
  appId: "YOUR_APP_ID"
};
```

- [ ] **Step 5: Create `public/index.html`**

Main SPA shell with:
- Firebase SDK imports (from CDN: `firebase-app`, `firebase-auth`, `firebase-firestore`)
- `<div id="app">` container
- CSS link to `css/style.css`
- JS module entry point `js/app.js`
- Meta viewport for mobile responsiveness
- Vietnamese lang attribute

- [ ] **Step 6: Verify** — Open `public/index.html` in browser, check console for no errors

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "feat: project setup with Firebase config and SPA shell"
```

---

## Task 2: Design System (CSS)

**Files:**
- Create: `public/css/style.css`

- [ ] **Step 1: Create complete design system**

Design tokens (CSS custom properties):
- Color palette: dark theme with accent colors
  - `--bg-primary: #0f0f1a` (deep dark)
  - `--bg-secondary: #1a1a2e` (card backgrounds)
  - `--bg-tertiary: #16213e` (hover states)
  - `--accent-primary: #6c63ff` (purple — primary actions)
  - `--accent-success: #00c853` (approved/check-in)
  - `--accent-warning: #ffc107` (pending)
  - `--accent-danger: #ff5252` (rejected/delete)
  - `--text-primary: #e8e8e8`
  - `--text-secondary: #a0a0b0`
- Typography: Google Font "Inter" (400, 500, 600, 700)
- Spacing scale: 4px base (--sp-1 through --sp-8)
- Border radius: `--radius-sm: 8px`, `--radius-md: 12px`, `--radius-lg: 16px`
- Shadows: glassmorphism style
- Transitions: `--transition-fast: 0.15s ease`, `--transition-normal: 0.3s ease`

Component styles:
- Layout: sidebar (280px) + main content, collapsible on mobile
- Cards: glassmorphism (backdrop-filter: blur, semi-transparent bg)
- Buttons: primary, secondary, danger, ghost variants with hover animations
- Form inputs: styled with focus ring animations
- Tables: striped rows, responsive (horizontal scroll on mobile)
- Status badges: color-coded (pending/approved/rejected/absent)
- Modals: centered with backdrop blur
- Toast notifications: slide-in from top-right
- Navigation: active state indicator with animated underline
- Loading skeleton: pulse animation placeholders
- Responsive breakpoints: 768px (tablet), 480px (mobile)

- [ ] **Step 2: Verify** — Create a test HTML page that uses all CSS classes, check visual appearance

- [ ] **Step 3: Commit**

```bash
git add public/css/style.css
git commit -m "feat: complete design system with dark theme and glassmorphism"
```

---

## Task 3: Core Infrastructure (Auth, Router, Utils)

**Files:**
- Create: `public/js/auth.js`
- Create: `public/js/router.js`
- Create: `public/js/utils.js`
- Create: `public/js/app.js`

- [ ] **Step 1: Create `public/js/utils.js`**

Utility functions:
- `formatCurrency(amount)` — format VNĐ (e.g., "250.000 ₫")
- `formatDate(dateStr)` — "01/06/2026"
- `formatTime(timeStr)` — "18:00"
- `formatDayOfWeek(num)` — "Thứ 2", "Thứ 3", etc.
- `getCurrentMonth()` — "2026-06"
- `getMonthDates(yearMonth)` — array of all dates in a month
- `getTodayStr()` — "2026-06-01"
- `getDayOfWeek(dateStr)` — 1-7
- `generateId()` — random ID
- `debounce(fn, ms)` — debounce helper
- `escapeHtml(str)` — XSS prevention

- [ ] **Step 2: Create `public/js/auth.js`**

```javascript
import { firebaseConfig } from './firebase-config.js';

// Initialize Firebase Auth
// signInWithGoogle() — popup Google sign-in
// signOut() — sign out
// onAuthStateChanged(callback) — listen for auth changes
// getCurrentUser() — returns current user object
// getUserRole(uid) — reads Firestore coaches/{uid}.role, returns "admin"|"coach"|null
// isAdmin() — shortcut
```

Key behaviors:
- After Google sign-in, check if user exists in `coaches` collection
- If not found → show "unauthorized" message (admin must add them first)
- If found → read role and redirect to appropriate dashboard
- Admin email is hardcoded or first user becomes admin

- [ ] **Step 3: Create `public/js/router.js`**

Hash-based SPA router:
- Routes map: `{ '#/dashboard': dashboardPage, '#/coaches': coachesPage, ... }`
- `navigate(hash)` — change route
- `onRouteChange(callback)` — listen for hash changes
- Route guards: check auth + role before rendering
- Admin routes: `/dashboard`, `/coaches`, `/venues`, `/schedule`, `/attendance`, `/payroll`
- Coach routes: `/my-schedule`, `/my-checkin`, `/my-attendance`, `/my-earnings`
- Default: redirect to login if not authenticated

- [ ] **Step 4: Create `public/js/app.js`**

App entry point:
- Import Firebase SDK, auth, router
- Initialize Firebase
- Listen to auth state changes
- On authenticated: determine role → render navbar + route to default page
- On unauthenticated: render login page
- Setup global error handling

- [ ] **Step 5: Verify** — Open in browser, Google sign-in works, role detection works

- [ ] **Step 6: Commit**

```bash
git add public/js/
git commit -m "feat: auth, router, utils core infrastructure"
```

---

## Task 4: Reusable Components (Navbar, Modal, Toast)

**Files:**
- Create: `public/js/components/navbar.js`
- Create: `public/js/components/modal.js`
- Create: `public/js/components/toast.js`
- Create: `public/js/components/calendar.js`
- Create: `public/assets/logo.svg`

- [ ] **Step 1: Create `public/js/components/navbar.js`**

Two layouts based on role:
- **Admin sidebar:** Logo, Dashboard, Quản lý HLV, Địa điểm, Lịch dạy, Điểm danh, Bảng lương, user info + logout
- **Coach sidebar:** Logo, Lịch của tôi, Check-in, Điểm danh, Thu nhập, user info + logout
- Responsive: hamburger menu on mobile, slide-in sidebar
- Active route highlight with animated indicator
- User avatar (from Google) + name at bottom

- [ ] **Step 2: Create `public/js/components/modal.js`**

```javascript
// showModal({ title, content, onConfirm, onCancel, confirmText, cancelText })
// closeModal()
// Content can be HTML string or DOM element
// Backdrop click to close
// Escape key to close
// Focus trap inside modal
// Slide-in animation
```

- [ ] **Step 3: Create `public/js/components/toast.js`**

```javascript
// showToast({ message, type: 'success'|'error'|'info'|'warning', duration: 3000 })
// Stack multiple toasts
// Slide-in from top-right
// Auto-dismiss with progress bar
// Click to dismiss
```

- [ ] **Step 4: Create `public/js/components/calendar.js`**

Mini calendar for date/month selection:
- Month grid view
- Highlight today
- onClick date callback
- Navigate months
- Used in attendance and payroll pages

- [ ] **Step 5: Create simple SVG logo**

- [ ] **Step 6: Verify** — All components render correctly, animations work

- [ ] **Step 7: Commit**

```bash
git add public/js/components/ public/assets/
git commit -m "feat: reusable UI components (navbar, modal, toast, calendar)"
```

---

## Task 5: Database Layer (Firestore CRUD)

**Files:**
- Create: `public/js/db.js`

- [ ] **Step 1: Create `public/js/db.js`**

All Firestore operations in one module:

```javascript
// === Coaches ===
// getCoaches() — get all active coaches
// getCoach(id) — get single coach
// addCoach({ name, email, phone, role, rateType, defaultRate })
// updateCoach(id, data)
// deleteCoach(id) — soft delete (set status: "inactive")

// === Venues ===
// getVenues() — get all active venues
// getVenue(id)
// addVenue({ name, address })
// updateVenue(id, data)
// deleteVenue(id) — soft delete

// === Schedules ===
// getSchedules(filters?) — get all, optionally filter by coachId, venueId, dayOfWeek
// getSchedulesByCoach(coachId) — get coach's weekly schedule
// getSchedulesByDay(dayOfWeek) — get all sessions for a day
// addSchedule({ coachId, venueId, dayOfWeek, startTime, endTime, rateType, rate })
// updateSchedule(id, data)
// deleteSchedule(id) — soft delete

// === Attendance ===
// getAttendanceByDate(date) — all records for a date
// getAttendanceByCoachMonth(coachId, yearMonth) — coach's monthly records
// getAttendanceByMonth(yearMonth) — all records for a month
// checkIn(coachId, scheduleId, venueId, date, checkInBy, note?)
// approveAttendance(attendanceId, adminId, earnings)
// rejectAttendance(attendanceId, adminId, reason)
// updateAttendance(id, data)
// deleteAttendance(id)

// === Payroll (computed, not stored) ===
// calculateMonthlyPayroll(yearMonth) — returns { coachId, coachName, totalSessions, totalEarnings }[]
// calculateCoachPayroll(coachId, yearMonth) — detailed breakdown
```

- [ ] **Step 2: Verify** — Call functions from browser console, check Firestore data

- [ ] **Step 3: Commit**

```bash
git add public/js/db.js
git commit -m "feat: Firestore database layer with all CRUD operations"
```

---

## Task 6: Login Page

**Files:**
- Create: `public/js/pages/login.js`

- [ ] **Step 1: Create login page**

Visual design:
- Centered card on dark gradient background
- App logo + title "Quản Lý Chấm Công HLV"
- Subtitle "Hệ thống điểm danh và tính lương"
- Google Sign-In button (large, white, with Google icon)
- Subtle floating animation on the card
- Footer text: "Đăng nhập bằng tài khoản Google đã được quản trị viên cấp quyền"

Behavior:
- Click → Firebase Google popup
- Success + user in coaches collection → redirect to dashboard
- Success + user NOT in collection → show error toast "Tài khoản chưa được cấp quyền"
- Error → show error toast

- [ ] **Step 2: Verify** — Login flow works end-to-end

- [ ] **Step 3: Commit**

```bash
git add public/js/pages/login.js
git commit -m "feat: login page with Google OAuth"
```

---

## Task 7: Admin Dashboard

**Files:**
- Create: `public/js/pages/dashboard.js`

- [ ] **Step 1: Create admin dashboard**

Layout (top to bottom):
1. **Header:** "Dashboard" + today's date formatted nicely
2. **Stats row** (4 cards, glassmorphism):
   - Tổng HLV đang hoạt động
   - Buổi dạy hôm nay (scheduled)
   - Đã check-in hôm nay
   - Chờ duyệt
3. **Today's schedule** (table/cards):
   - List all scheduled sessions today
   - Each row: HLV name, Địa điểm, Giờ, Status (badge)
   - Quick action buttons: Check-in giùm, Duyệt
4. **Monthly payroll summary** (small chart/table):
   - Top 5 coaches by earnings this month
   - Total payroll this month

Data loading:
- Fetch today's schedules (by dayOfWeek)
- Fetch today's attendance records
- Cross-reference to show who checked in, who hasn't
- Fetch monthly attendance for payroll summary

- [ ] **Step 2: Verify** — Dashboard renders with real or seed data

- [ ] **Step 3: Commit**

```bash
git add public/js/pages/dashboard.js
git commit -m "feat: admin dashboard with today overview and stats"
```

---

## Task 8: Coach Management (CRUD)

**Files:**
- Create: `public/js/pages/coaches.js`

- [ ] **Step 1: Create coaches management page**

Layout:
1. **Header:** "Quản Lý HLV" + "Thêm HLV" button
2. **Coaches grid/list:**
   - Card per coach: avatar (Google photo or initials), name, email, phone, default rate, status
   - Edit / Deactivate buttons on each card
3. **Add/Edit modal:**
   - Name (required)
   - Email Google (required — this links to their Google account)
   - Phone (optional)
   - Loại tính lương: dropdown (Theo buổi / Theo giờ)
   - Mức lương mặc định: number input (VNĐ)
   - Role: Admin / HLV (dropdown)
   - Status: Đang hoạt động / Ngưng hoạt động

Behavior:
- Add: create document in `coaches` collection with email as lookup key
- Edit: update document
- Deactivate: set status = "inactive", greyed out in list
- Validate email is valid Gmail
- Show toast on success/error

- [ ] **Step 2: Verify** — Add, edit, deactivate coaches works

- [ ] **Step 3: Commit**

```bash
git add public/js/pages/coaches.js
git commit -m "feat: coach management CRUD page"
```

---

## Task 9: Venue Management (CRUD)

**Files:**
- Create: `public/js/pages/venues.js`

- [ ] **Step 1: Create venues management page**

Similar pattern to coaches:
1. **Header:** "Quản Lý Địa Điểm" + "Thêm Địa Điểm" button
2. **Venues grid:**
   - Card per venue: name, address, number of scheduled sessions
   - Edit / Deactivate buttons
3. **Add/Edit modal:**
   - Tên địa điểm (required)
   - Địa chỉ (required)
   - Status

- [ ] **Step 2: Verify** — CRUD works

- [ ] **Step 3: Commit**

```bash
git add public/js/pages/venues.js
git commit -m "feat: venue management CRUD page"
```

---

## Task 10: Schedule Management

**Files:**
- Create: `public/js/pages/schedule.js`

- [ ] **Step 1: Create schedule page**

Layout:
1. **Header:** "Lịch Dạy Cố Định" + "Thêm Lịch" button
2. **Weekly grid view:**
   - Columns: Thứ 2 → Chủ nhật
   - Rows: time slots
   - Each cell shows: HLV name, Venue name, time, rate
   - Color-coded by coach (each coach gets a unique color)
3. **Add/Edit schedule modal:**
   - Chọn HLV (dropdown from active coaches)
   - Chọn Địa điểm (dropdown from active venues)
   - Ngày trong tuần (dropdown: Thứ 2 - CN)
   - Giờ bắt đầu / Giờ kết thúc (time pickers)
   - Loại tính lương: Theo buổi / Theo giờ
   - Mức lương cho lịch này (VNĐ)
4. **Substitution feature:**
   - Right-click or long-press a schedule → "Đổi ca"
   - Select substitute coach
   - Select date (specific date, not recurring)
   - Enter reason
   - Creates attendance record with `isSubstitution: true`

- [ ] **Step 2: Verify** — Create schedules, view in grid, substitution works

- [ ] **Step 3: Commit**

```bash
git add public/js/pages/schedule.js
git commit -m "feat: weekly schedule management with substitution support"
```

---

## Task 11: Attendance Review (Admin)

**Files:**
- Create: `public/js/pages/attendance.js`

- [ ] **Step 1: Create attendance review page**

Layout:
1. **Header:** "Duyệt Điểm Danh"
2. **Filters bar:**
   - Date picker (default: today)
   - Filter by coach (dropdown)
   - Filter by venue (dropdown)
   - Filter by status (Tất cả / Chờ duyệt / Đã duyệt / Từ chối)
3. **Quick actions bar:**
   - "Check-in giùm" button → modal to select coach + venue + schedule
   - "Duyệt tất cả" button (bulk approve pending)
4. **Attendance table:**
   - Columns: HLV, Địa điểm, Giờ check-in, Trạng thái, Lương, Ghi chú, Hành động
   - Status badges (color-coded)
   - Action buttons: Duyệt ✅ / Từ chối ❌ (for pending records)
   - Click row to see details / edit
5. **Admin check-in giùm modal:**
   - Select coach
   - Select venue (auto-populate from today's schedule)
   - Select schedule slot
   - Optional note
   - Status options: Check-in (pending) or Duyệt luôn (approved immediately)

- [ ] **Step 2: Verify** — Filter, approve, reject, check-in giùm all work

- [ ] **Step 3: Commit**

```bash
git add public/js/pages/attendance.js
git commit -m "feat: attendance review page with admin check-in and bulk approve"
```

---

## Task 12: Payroll Page (Admin)

**Files:**
- Create: `public/js/pages/payroll.js`

- [ ] **Step 1: Create payroll page**

Layout:
1. **Header:** "Bảng Lương" + month selector
2. **Summary cards:**
   - Tổng chi lương tháng
   - Tổng buổi dạy
   - Số HLV
3. **Payroll table:**
   - Columns: HLV, Số buổi duyệt, Số giờ (if per_hour), Tổng lương, Chi tiết
   - Sortable columns
   - Row click → expand detail breakdown by venue/date
4. **Detail modal (per coach):**
   - Calendar view with marked dates
   - List all approved sessions: date, venue, rate, earnings
   - Total at bottom
5. **Print/Export:** "In bảng lương" button → print-friendly CSS

- [ ] **Step 2: Verify** — Payroll calculates correctly from attendance data

- [ ] **Step 3: Commit**

```bash
git add public/js/pages/payroll.js
git commit -m "feat: monthly payroll summary with detail breakdown"
```

---

## Task 13: Coach Pages (My Schedule, Check-in, Attendance, Earnings)

**Files:**
- Create: `public/js/pages/my-schedule.js`
- Create: `public/js/pages/my-checkin.js`
- Create: `public/js/pages/my-attendance.js`
- Create: `public/js/pages/my-earnings.js`

- [ ] **Step 1: Create `my-schedule.js`**

- Simple weekly view of coach's own schedule
- Today's sessions highlighted
- Each session: venue, time, rate

- [ ] **Step 2: Create `my-checkin.js`**

- Show today's scheduled sessions
- Big "CHECK-IN" button for each session (with satisfying animation)
- After check-in: show status "Chờ duyệt" with pulsing indicator
- If already checked in: show timestamp and status
- If no schedule today: show "Hôm nay không có lịch dạy"

- [ ] **Step 3: Create `my-attendance.js`**

- Calendar view of current month
- Color-coded dates (approved=green, pending=yellow, rejected=red, absent=grey)
- Tap date → see details (venue, time, status, earnings)
- Summary stats at top: total approved, total pending, total absent

- [ ] **Step 4: Create `my-earnings.js`**

- Month selector
- Big number: total approved earnings this month (formatted VNĐ)
- Breakdown list: date, venue, earnings per session
- Status: only shows "approved" records

- [ ] **Step 5: Verify** — All coach pages work with coach-role account

- [ ] **Step 6: Commit**

```bash
git add public/js/pages/my-*.js
git commit -m "feat: coach self-service pages (schedule, check-in, attendance, earnings)"
```

---

## Task 14: Firestore Security Rules

**Files:**
- Create: `firestore.rules`

- [ ] **Step 1: Write security rules**

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    
    // Helper: check if user is admin
    function isAdmin() {
      return get(/databases/$(database)/documents/coaches/$(request.auth.uid)).data.role == 'admin';
    }
    
    // Helper: check if user is authenticated and exists in coaches
    function isCoach() {
      return request.auth != null && exists(/databases/$(database)/documents/coaches/$(request.auth.uid));
    }
    
    // Coaches collection
    match /coaches/{coachId} {
      allow read: if isCoach();
      allow write: if isAdmin();
    }
    
    // Venues collection
    match /venues/{venueId} {
      allow read: if isCoach();
      allow write: if isAdmin();
    }
    
    // Schedules collection
    match /schedules/{scheduleId} {
      allow read: if isCoach();
      allow write: if isAdmin();
    }
    
    // Attendance collection
    match /attendance/{attendanceId} {
      allow read: if isAdmin() || 
        (isCoach() && resource.data.coachId == request.auth.uid);
      allow create: if isAdmin() || 
        (isCoach() && request.resource.data.coachId == request.auth.uid);
      allow update, delete: if isAdmin();
    }
  }
}
```

- [ ] **Step 2: Deploy rules** (if Firebase CLI is set up)

- [ ] **Step 3: Commit**

```bash
git add firestore.rules
git commit -m "feat: Firestore security rules with role-based access"
```

---

## Task 15: Seed Data & First Admin Setup

**Files:**
- Create: `public/js/seed.js` (development helper, remove before production)

- [ ] **Step 1: Create seed/setup script**

On first login:
- If `coaches` collection is empty, automatically create the logged-in user as admin
- This bootstraps the system without needing manual Firestore editing

Optional seed data for testing:
- 3-5 sample coaches
- 4 venues
- Weekly schedules
- Some attendance records

- [ ] **Step 2: Verify** — Fresh start flow works: first user becomes admin

- [ ] **Step 3: Commit**

```bash
git add public/js/seed.js
git commit -m "feat: first-admin bootstrap and seed data helper"
```

---

## Task 16: Polish & Final Testing

- [ ] **Step 1: Responsive testing** — Test on Chrome mobile emulator (iPhone SE, Pixel, iPad)
- [ ] **Step 2: Cross-browser** — Test on Chrome, Firefox, Edge
- [ ] **Step 3: Empty states** — Add friendly illustrations/text for empty lists
- [ ] **Step 4: Loading states** — Skeleton loading animations on all pages
- [ ] **Step 5: Error handling** — Network errors, permission errors, display user-friendly messages
- [ ] **Step 6: Micro-animations** — Check-in button pulse, approval confetti, page transitions
- [ ] **Step 7: PWA basics** — Add manifest.json for "Add to Home Screen" on mobile
- [ ] **Step 8: Final commit**

```bash
git add -A
git commit -m "feat: polish, responsive fixes, animations, PWA support"
```

---

## Verification Plan

### Automated Testing
- Open `http://localhost:5000` (Firebase emulator or live-server)
- Test all CRUD operations via browser
- Test role switching (admin vs coach accounts)
- Test responsive layouts via Chrome DevTools

### Manual Testing Checklist
1. ✅ Login with Google → admin role assigned
2. ✅ Add coach → appears in list
3. ✅ Add venue → appears in list
4. ✅ Create weekly schedule → appears in grid
5. ✅ Coach logs in → sees only their pages
6. ✅ Coach checks in → admin sees pending record
7. ✅ Admin approves → earnings calculated correctly
8. ✅ Admin checks in on behalf → record created with correct checkInBy
9. ✅ Substitution flow → original coach not paid, substitute paid
10. ✅ Payroll shows correct totals for the month
11. ✅ Mobile responsive — all pages usable on phone
