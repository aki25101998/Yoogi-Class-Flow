# Coach Attendance Tracker — Design Spec

**Date:** 2026-06-01  
**Status:** Approved  

## Overview

A web application for a head coach (admin) to manage attendance and payroll for assistant coaches across multiple training venues. The system uses Google Account authentication with role-based access control.

## Business Context

- **Admin:** Head coach who manages all assistant coaches
- **Coaches:** 2-5 assistant coaches hired to teach at various venues
- **Venues:** 4-6 training locations
- **Pay model:** Per-session or per-hour, varies by coach and venue
- **Schedule:** Fixed weekly schedules with substitution support
- **Budget:** Free (Firebase free tier)
- **Devices:** Both mobile and desktop equally

## Architecture

**Stack:** HTML/CSS/JS (vanilla) + Firebase  
- **Firebase Auth** — Google OAuth login  
- **Cloud Firestore** — NoSQL database  
- **Firebase Hosting** — Free static hosting  
- **Firebase Security Rules** — Role-based access control  

## Data Model (Firestore)

### `coaches` collection
```
{coachId} (document, ID = Firebase Auth UID)
├── name: string          // "Nguyễn Văn A"
├── email: string         // Google email
├── phone: string         // Optional
├── role: "admin" | "coach"
├── status: "active" | "inactive"
├── createdAt: timestamp
├── updatedAt: timestamp
```

### `venues` collection
```
{venueId} (auto-generated)
├── name: string          // "Chi nhánh Quận 1"
├── address: string       // Full address
├── status: "active" | "inactive"
├── createdAt: timestamp
```

### `venues/{venueId}/venueCoaches` sub-collection
```
{venueCoachId} (auto-generated)
├── coachId: string       // Reference to coach
├── rateType: "per_session" | "per_hour"  // Salary type for this specific venue
├── rate: number          // Salary rate in VNĐ (e.g., 200000)
├── scheduleDays: number[] // [1, 3, 5] (Recurring days: Monday, Wednesday, Friday)
├── startTime: string     // "18:00"
├── endTime: string       // "20:00"
├── createdAt: timestamp
```

### `schedules` collection (Legacy / Overrides - Now mostly derived from venueCoaches)
```
{scheduleId} (auto-generated)
├── coachId: string       // Reference to coach
├── venueId: string       // Reference to venue
├── dayOfWeek: number     // 1=Monday ... 7=Sunday
├── startTime: string     // "18:00"
├── endTime: string       // "20:00"
├── status: "active" | "inactive"
├── createdAt: timestamp
```

### `attendance` collection
```
{attendanceId} (auto-generated)
├── coachId: string
├── venueCoachId: string  // Reference to the assignment (replaces scheduleId)
├── scheduleId: string    // Legacy or specific override schedule
├── venueId: string
├── date: string          // "2026-06-01" (YYYY-MM-DD)
├── checkInTime: timestamp
├── checkInBy: string     // UID of who checked in (self or admin)
├── status: "checked_in" | "approved" | "rejected" | "absent"
├── approvedBy: string    // Admin UID (when approved/rejected)
├── approvedAt: timestamp
├── earnings: number      // Calculated when approved
├── note: string          // Optional note (e.g., "Dạy thế HLV B")
├── isSubstitution: boolean
├── originalCoachId: string  // If substitution, who was originally assigned
├── createdAt: timestamp
```

## Role-Based Access

### Admin (Head Coach) — Full Access
| Feature | Access |
|---------|--------|
| Dashboard (overview of today) | ✅ |
| Manage coaches (CRUD) | ✅ |
| Manage venues (CRUD) | ✅ |
| Create/edit fixed schedules | ✅ |
| Arrange substitutions | ✅ |
| Check-in on behalf of any coach | ✅ |
| Approve/reject attendance | ✅ |
| View all payroll data | ✅ |
| Edit/delete any record | ✅ |

### Coach — Limited Access
| Feature | Access |
|---------|--------|
| View own schedule | ✅ |
| Self check-in | ✅ |
| View own attendance history | ✅ |
| View own monthly activity (sessions only, no salary) | ✅ |
| Everything else | ❌ |

## Screens

### Admin Screens
1. **Dashboard** — Today's overview: who checked in, who hasn't, total monthly payroll summary
2. **Coach Management** — Add/edit/remove coaches, set email
3. **Venue Management** — Add/edit/remove training venues, assign coaches to venues, set per-coach salary rates and fixed schedules.
4. **Schedule** — Weekly grid view (read-only overview)
5. **Attendance Review** — List of check-ins to approve/reject, bulk approve, filter by date/coach/venue
6. **Payroll** — Monthly summary per coach, breakdown by venue, export-ready view

### Coach Screens
1. **My Schedule** — Weekly fixed teaching schedule (hides salary information)
2. **Check-in** — One-tap check-in button for current scheduled session
3. **My Attendance** — Calendar/list view of attendance this month with status indicators
4. **Hoạt Động (Activity)** — Total approved teaching sessions for current month, breakdown by session (no salary amounts shown)

## Check-in & Approval Flow

```
1. Coach arrives at venue
2. Opens site → taps "Check-in" for today's scheduled session
   → attendance record created with status = "checked_in"
3. Admin sees new check-in on dashboard
4. Admin reviews and approves → status = "approved", earnings auto-calculated
   OR Admin rejects with reason → status = "rejected"

Alternative: Admin checks in on behalf of coach directly
   → attendance record created with status = "approved", checkInBy = admin UID
```

## Substitution Flow

```
1. HLV B is unavailable for a scheduled session
2. Admin opens Schedule → selects the session → marks as substitution
3. Admin assigns HLV A as substitute
4. Attendance record for that date shows:
   - coachId = HLV A (who actually taught)
   - isSubstitution = true
   - originalCoachId = HLV B
   - rate = the venue's rate (paid to HLV A)
5. HLV B gets no pay for that session
```

## Payroll Calculation

```
Monthly earnings for Coach X =
  SUM of all attendance records where:
    - coachId == Coach X
    - status == "approved"
    - date is within the target month
    
For each record:
  if rateType == "per_session": earnings = schedule.rate
  if rateType == "per_hour": earnings = schedule.rate × hours worked
```

## UI/UX Principles

- **Mobile-first responsive** — works equally on phone and desktop
- **Vietnamese language** — all UI text in Vietnamese
- **Dark mode** with modern, premium aesthetics
- **Micro-animations** for interactions (check-in button, approval, etc.)
- **Color-coded statuses:**
  - 🟡 Checked in (pending)
  - 🟢 Approved
  - 🔴 Rejected
  - ⚫ Absent
- **Quick actions** — minimize taps/clicks for daily operations
