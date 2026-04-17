# AASTMT Room Booking System — Tester Guide

## Quick Start

1. Open `schema_complete.sql` → paste into **Supabase SQL Editor** → Run
2. Open `test_seed.sql` → paste into **Supabase SQL Editor** → Run
3. Configure Supabase (see section below)
4. Start the app: `npm run dev` → open `http://localhost:3000`
5. Log in with any account below

---

## Supabase Configuration (Do This Once)

In the Supabase Dashboard for project `stbjtgzcvgwgwbbairir`:

| Setting | Path | Value |
|---------|------|-------|
| Disable email confirmation | Authentication → Settings → Email → **Enable email confirmations** | **OFF** |
| Site URL | Authentication → URL Configuration → Site URL | `http://localhost:3000` |
| Redirect URLs | Authentication → URL Configuration → Redirect URLs | `http://localhost:3000/**` |

---

## Test Accounts

All accounts use the same password: **`Password123!`**

On the login page, enter the **Employee ID** (not the email directly).

| Role | Employee ID | Email | Full Name | Notes |
|------|------------|-------|-----------|-------|
| Admin | `ADMIN01` | admin01@aastmt.edu | Ahmed Al-Admin | Full system access |
| Branch Manager | `BM001` | bm001@aastmt.edu | Bassem Manager | Final approval for multi-purpose rooms |
| Employee 1 | `EMP001` | emp001@aastmt.edu | Emad Employee | 24-hour booking lead time |
| Employee 2 | `EMP002` | emp002@aastmt.edu | Eman Khalil | 24-hour booking lead time |
| Secretary | `SEC001` | sec001@aastmt.edu | Sara El-Secretary | 48-hour booking lead time |

### How Login Works

The app converts `ADMIN01` → `admin01@aastmt.edu` and authenticates via Supabase. You type the Employee ID, not the email.

---

## Rooms in the Database

| Room Name | Type | Used For |
|-----------|------|---------|
| Lecture Hall A | LECTURE | Regular lecture bookings |
| Lecture Hall B | LECTURE | Regular lecture bookings |
| Section Room 101 | LECTURE | Smaller class bookings |
| Section Room 102 | LECTURE | Smaller class bookings |
| Section Room 201 | LECTURE | Smaller class bookings |
| Main Conference Hall | MULTI_PURPOSE | Events, conferences (needs BM approval) |
| Seminar Room 1 | MULTI_PURPOSE | Workshops, seminars (needs BM approval) |
| Seminar Room 2 | MULTI_PURPOSE | Workshops, seminars (needs BM approval) |

---

## Time Slots

| Slot | Start | End |
|------|-------|-----|
| 1 | 08:00 | 09:30 |
| 2 | 09:30 | 11:00 |
| 3 | 11:00 | 12:30 |
| 4 | 12:30 | 14:00 |
| 5 | 14:00 | 15:30 |
| 6 | 15:30 | 17:00 |
| 7 | 17:00 | 18:30 |

---

## Pre-Loaded Bookings

The seed script creates these bookings relative to **today's date**:

| What | Requester | Room | Date | Status | Type |
|------|-----------|------|------|--------|------|
| Fixed lecture | EMP001 | Lecture Hall A | Today, Tomorrow, Day+2 | APPROVED | FIXED |
| Pending lecture | EMP001 | Section Room 101 | Day+3 | PENDING | EXCEPTIONAL |
| Pending lecture | EMP002 | Section Room 102 | Day+3 | PENDING | EXCEPTIONAL |
| Pending lecture | SEC001 | Lecture Hall B | Day+3 | PENDING | EXCEPTIONAL |
| Tech Conference (awaiting BM) | EMP001 | Main Conference Hall | Day+2 | ADMIN_APPROVED | MULTI_PURPOSE |
| Orientation Workshop (awaiting BM) | SEC001 | Seminar Room 1 | Day+3 | ADMIN_APPROVED | MULTI_PURPOSE |
| Approved booking | EMP002 | Lecture Hall B | Today | APPROVED | EXCEPTIONAL |
| Approved booking | SEC001 | Section Room 101 | Tomorrow | APPROVED | EXCEPTIONAL |
| Approved booking | EMP001 | Section Room 102 | Day+2 | APPROVED | EXCEPTIONAL |
| Rejected (past) | EMP001 | Lecture Hall A | Yesterday | REJECTED | EXCEPTIONAL |
| Rejected (past) | EMP002 | Main Conference Hall | Last week | REJECTED | MULTI_PURPOSE |

**Delegation:** SEC001 is currently substituting for EMP001 (active from yesterday through Day+5). This means SEC001 can view the room availability calendar.

---

## Booking Approval Flows

### Lecture / Exceptional Room (EMPLOYEE or SECRETARY)
```
Employee submits → PENDING → Admin approves → APPROVED ✓
                                    └──► Admin rejects → REJECTED ✗
```

### Multi-Purpose Room (EMPLOYEE or SECRETARY)
```
Employee submits → PENDING → Admin reviews → ADMIN_APPROVED
                                                    └──► Branch Manager approves → APPROVED ✓
                                                    └──► Branch Manager rejects  → REJECTED ✗
```

---

## Test Scenario Quick Reference

### As Admin (`ADMIN01`)

1. **Approve a pending booking** — Dashboard shows pending bookings; click Approve on any PENDING item
2. **Reject a booking with reason** — Click Reject, enter a reason, confirm
3. **Approve a user** — Go to Manage Users; any new registrations appear with "Pending" status
4. **Change user role** — Manage Users → change dropdown for any user
5. **Toggle calendar access** — Manage Users → click the Eye/EyeOff button
6. **Manage rooms** — Settings → Rooms section → Add / Edit / Toggle active
7. **Manage time slots** — Settings → Time Slots section
8. **Manage fixed schedules** — Settings → Fixed Schedules section
9. **Search room availability** — Room Search → pick a date and type
10. **View calendar** — Calendar page → navigate weeks
11. **Manage delegations** — Delegations → assign SEC001 as substitute for EMP001

### As Branch Manager (`BM001`)

1. **View BM dashboard** — Shows bookings with status `ADMIN_APPROVED` and type `MULTI_PURPOSE`
2. **Approve multi-purpose booking** — 2 pre-loaded items ready to approve
3. **Reject multi-purpose booking** — Click Reject, provide reason

### As Employee (`EMP001` or `EMP002`)

1. **Submit a lecture booking** — Dashboard → pick LECTURE room → pick slot → Submit (must be 24h+ in the future)
2. **Submit a multi-purpose booking** — Select Multi-Purpose type → fill form including manager details
3. **View booking history** — Scroll down on dashboard to see Approved / Rejected / Pending bookings
4. **See rejection reason** — Rejected bookings show the admin's reason

### As Secretary (`SEC001`)

Same as Employee but with **48-hour** minimum lead time. Also can view the availability calendar because an active delegation exists for this account.

---

## Lead Time Rules

| Role | Minimum advance booking time |
|------|------------------------------|
| EMPLOYEE | 24 hours |
| SECRETARY | 48 hours |
| ADMIN | No restriction (can book any time) |

All times are calculated in **Cairo timezone (Africa/Cairo)**.

---

## Testing a New User Registration

1. Go to `/login` → click **"Register New Account"** (or similar link)
2. Fill in a new Employee ID (e.g., `EMP099`), name, and password
3. After registration, the user lands on a **"Pending Approval"** screen
4. Log in as `ADMIN01` → go to **Manage Users** → approve the new user
5. The user can now log in normally

---

## Troubleshooting

| Problem | Fix |
|---------|-----|
| "Invalid login credentials" | Make sure email confirmation is **OFF** in Supabase Auth settings |
| Booking form won't submit | Check lead time — must be 24h (employee) or 48h (secretary) in the future |
| Admin dashboard shows no pending items | The 3 PENDING bookings are there by default; if cleared, submit new ones via employee accounts |
| BM dashboard is empty | The 2 ADMIN_APPROVED multi-purpose bookings are pre-loaded; if cleared, approve a MULTI_PURPOSE booking as admin first |
| Calendar shows no data | Fixed and Approved bookings are seeded for today through Day+2; navigate to current week |
| Delegation not working | SEC001 delegation is active from yesterday to Day+5; check date range in Delegations page as admin |
