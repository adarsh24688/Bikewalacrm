# Yash CRM — Product Roadmap

> Generated: March 7, 2026 | Based on plan.md v2
> Team: 1 developer + AI assist | Launch: Internal-first (single business)
> Estimated delivery: ~7–8 weeks

---

## 1. Product Map

```
PRODUCT MAP — Yash CRM
═══════════════════════════════════════════════════════════════
Stack: Next.js 14 + Fastify + Prisma + PostgreSQL + Baileys
Type:  Internal CRM for sales-heavy business
Users: Super Admin, Managers, Sales Reps, Frontdesk Staff

CORE MODULES:
═══════════════════════════════════════════════════════════════

1. AUTHENTICATION & ACCESS CONTROL
   ├── Google OAuth login (no passwords)
   ├── Invite-only access (email allowlist)
   ├── Role-based permissions (super_admin, manager, sales_rep, frontdesk)
   ├── Team management UI (add/revoke users)
   └── Branch-level access scoping

   Pages: /login, /settings/team
   API: /auth/*, /users/*
   DB: allowed_users, user_profiles

2. LEAD MANAGEMENT
   ├── Lead CRUD (create, view, edit, delete)
   ├── Lead assignment to reps
   ├── Activity log per lead
   ├── Lead status tracking (new → contacted → qualified → proposal → won/lost)
   ├── Priority & product interest tagging
   ├── Source tracking
   └── Search, filter, pagination

   Pages: /leads, /leads/[id]
   API: /leads/*, /leads/:id/activities
   DB: leads, activities

3. FOLLOW-UP SYSTEM
   ├── Schedule follow-ups per lead
   ├── Today / Upcoming / Missed views
   ├── Follow-up reminders (push notification)
   ├── Complete / reschedule follow-ups
   └── BullMQ-driven reminder jobs

   Pages: /follow-ups
   API: /follow-ups/*
   DB: follow_ups

4. WHATSAPP ENGINE (Baileys)
   ├── QR code connection (Socket.io real-time)
   ├── Session persistence (survives restarts)
   ├── Connection status indicator
   ├── Inbound message capture → DB
   ├── Outbound: text, images, documents
   ├── Message status tracking (sent/delivered/read)
   └── Automated report sending (BullMQ cron)

   Service: baileys-service/
   API: /whatsapp/*
   DB: wa_sessions

5. WHATSAPP INBOX
   ├── Unified conversation list
   ├── Real-time chat window (Socket.io)
   ├── Auto-link conversations to leads (by phone)
   ├── Manual lead linking
   ├── Assign conversations to reps
   ├── Send text + media + PDF attachments
   ├── Filter: All | Unread | Linked | Unassigned
   ├── Search conversations
   └── Lead-embedded chat tab

   Pages: /inbox, /leads/[id] (WhatsApp tab)
   API: /inbox/*
   DB: wa_messages, wa_conversations

6. QUOTATION ENGINE
   ├── Product catalog management
   ├── Quote builder (line items, discount, tax, GST)
   ├── PDF generation (branded template)
   ├── Quote versioning & revisions
   ├── Send via WhatsApp / Email / PDF download
   ├── Public share link (/q/:quoteNumber)
   └── Quick-send from lead profile

   Pages: /quotations, /quotations/[id], /q/[quoteNumber]
   API: /quotations/*, /products/*
   DB: quotations, products

7. CRM PIPELINE
   ├── Kanban board (drag-and-drop)
   ├── Manager team view
   ├── Lead assignment & monitoring
   ├── Advanced filters (date, source, rep, branch, product)
   ├── Stalled lead detection
   └── Won/Lost conversion with reason capture

   Pages: /pipeline
   API: /leads/* (filter extensions)
   DB: leads (status field drives pipeline)

8. REPORTS & DASHBOARD
   ├── Summary cards (total leads, conversions, revenue)
   ├── Charts (Recharts)
   ├── Rep performance reports
   ├── Product-wise, source-wise analysis
   ├── CSV/PDF export
   ├── Automated WA reports (daily/weekly/monthly)
   └── Report config UI (recipients, schedule)

   Pages: /reports, /settings/report-configs
   API: /reports/*
   DB: report_configs

9. PWA & OFFLINE
   ├── Service worker (Workbox/next-pwa)
   ├── Offline lead entry (IndexedDB)
   ├── Background sync on reconnect
   ├── Mobile-first layout for field reps
   └── Push notifications (Web Push API)

   Config: next.config.js, public/sw.js
═══════════════════════════════════════════════════════════════
```

---

## 2. Value-Aligned Priority Analysis

Since this is an **internal-first deployment** (not SaaS), we measure value by **operational impact** rather than ARR.

```
VALUE FRAMEWORK — Internal Deployment
═══════════════════════════════════════════════════════════════

1. 🔴 CRITICAL PATH (Business cannot function without this)
   - Lead entry & tracking
   - Google auth + access control
   - Basic follow-up scheduling

2. 🟠 HIGH VALUE (Major efficiency gains)
   - WhatsApp inbox (replaces manual WA checking)
   - Quotation generation (replaces manual Excel/Word quotes)
   - Pipeline visibility for management

3. 🟡 MULTIPLIER (Automates recurring work)
   - Automated WA reports (replaces daily manual reporting)
   - Push notifications for follow-ups
   - CSV/PDF export

4. 🟢 POLISH (Professional experience)
   - PWA offline mode
   - Kanban drag-and-drop
   - Advanced filters & search
═══════════════════════════════════════════════════════════════
```

### RICE Prioritization

```
RICE SCORING — Yash CRM Modules
═══════════════════════════════════════════════════════════════
Module                      Reach  Impact  Conf  Effort   RICE    Rank
─────────────────────────── ────── ─────── ───── ──────── ─────── ────
Lead CRUD + Auth             ALL    3       100%  1.5w     —       #1 (foundation)
Follow-up System             ALL    2       90%   0.5w     —       #2 (critical path)
WhatsApp Engine (Baileys)    ALL    3       80%   1.5w     —       #3 (core differentiator)
WhatsApp Inbox               ALL    3       80%   1.5w     —       #4 (daily driver)
Quotation Engine             80%    3       90%   1.5w     —       #5 (revenue tool)
Pipeline Kanban              40%    2       90%   1w       —       #6 (manager value)
Reports + Dashboard          30%    2       80%   1w       —       #7 (visibility)
Automated WA Reports         20%    2       70%   0.5w     —       #8 (automation)
PWA Offline                  60%    1       70%   1w       —       #9 (field use)
Polish + Launch              ALL    1       100%  0.5w     —       #10 (ship quality)
═══════════════════════════════════════════════════════════════

Note: RICE scores omitted for internal tool — ranked by operational criticality instead.
Foundation (#1-#2) must ship first regardless of score.
```

---

## 3. Sprint Plan

```
SPRINT CONFIGURATION
═══════════════════════════════════════════════════════════════
Sprint duration:    2 weeks (10 working days)
Team:               1 developer + AI assist
Usable capacity:    ~8 days/sprint (20% buffer for debugging, research)
Total sprints:      4 sprints (~8 weeks)
Start date:         March 10, 2026
Target launch:      May 2, 2026
═══════════════════════════════════════════════════════════════
```

---

### Sprint 1 — "Foundation" (Mar 10–21)

**Goal:** Fully working auth system, lead management, and monorepo skeleton.

```
Sprint 1 — FOUNDATION
────────────────────────────────────────────────────────────────
Epic        Story                                    Size   Days
─────────── ──────────────────────────────────────── ────── ─────
EPIC-01     MONOREPO & INFRASTRUCTURE SETUP
├ S-001     Initialize monorepo (Next.js + Fastify    M      2
│           + Prisma + shared package)
├ S-002     Database schema + Prisma migrations       S      1.5
│           (all tables from plan)
├ S-003     Docker Compose for local dev              S      1
│           (Postgres + Redis)
└ S-004     CI skeleton (lint + type-check)            XS     0.5
                                                             ─────
                                                      Subtotal: 5

EPIC-02     GOOGLE AUTH + ACCESS CONTROL
├ S-005     NextAuth.js Google OAuth setup             S      1
├ S-006     Login page + access denied page            S      0.5
├ S-007     allowed_users check in signIn callback     S      0.5
└ S-008     Role-based API middleware (Fastify)         S      0.5
                                                             ─────
                                                      Subtotal: 2.5

                                                   ═══════════════
                                              Sprint Total: 7.5 ✅
                                                   Buffer: 2.5 days

Sprint 1 Deliverable:
  ✅ Developer can run `docker compose up` and have full local env
  ✅ Google login works end-to-end
  ✅ Unauthorized emails are blocked
  ✅ All DB tables exist with proper relations
────────────────────────────────────────────────────────────────
```

---

### Sprint 2 — "Core CRM" (Mar 24 – Apr 4)

**Goal:** Lead management, follow-ups, and team management — the daily-driver CRM features.

```
Sprint 2 — CORE CRM
────────────────────────────────────────────────────────────────
Epic        Story                                    Size   Days
─────────── ──────────────────────────────────────── ────── ─────
EPIC-03     LEAD MANAGEMENT
├ S-009     Lead CRUD API (Fastify routes +           M      1.5
│           Prisma queries, pagination, search)
├ S-010     Lead list page (table with filters,       M      1.5
│           search, status badges)
├ S-011     Lead detail page (info + activity          M      1.5
│           log + tabs skeleton)
├ S-012     Lead assignment API + UI                   S      0.5
└ S-013     Activity logging (auto-log on              S      0.5
│           create, update, assign)
                                                             ─────
                                                      Subtotal: 5.5

EPIC-04     FOLLOW-UP SYSTEM
├ S-014     Follow-up CRUD API                         S      0.5
├ S-015     Follow-up views (Today / Upcoming /        M      1
│           Missed) — page + API
├ S-016     Schedule follow-up from lead detail         S      0.5
└ S-017     BullMQ follow-up reminder job               S      0.5
                                                             ─────
                                                      Subtotal: 2.5

EPIC-05     TEAM MANAGEMENT (Super Admin)
├ S-018     Team management page (list users,          S      1
│           add by email + role, revoke)
└ S-019     Invite email via Resend                     XS     0.5
                                                             ─────
                                                      Subtotal: 1.5

                                                   ═══════════════
                                              Sprint Total: 9.5
                                    Adjusted with AI assist: ~8 ✅

Sprint 2 Deliverable:
  ✅ Full lead lifecycle: create → assign → track → follow-up
  ✅ Reps can see their daily follow-up schedule
  ✅ Super admin can invite/revoke team members
  ✅ Activity log auto-captures all lead changes
────────────────────────────────────────────────────────────────
```

---

### Sprint 3 — "WhatsApp & Quotations" (Apr 7–18)

**Goal:** Baileys WhatsApp engine live, inbox working, quotation builder functional.

```
Sprint 3 — WHATSAPP & QUOTATIONS
────────────────────────────────────────────────────────────────
Epic        Story                                    Size   Days
─────────── ──────────────────────────────────────── ────── ─────
EPIC-06     BAILEYS WHATSAPP ENGINE
├ S-020     Baileys service setup: socket,             M      2
│           session management, persistent auth
├ S-021     QR code flow → Socket.io → dashboard       M      1
│           connection UI
├ S-022     Inbound message handler → DB +             M      1.5
│           Socket.io emit
├ S-023     Send text + document (PDF) API              S      1
└ S-024     Message status tracking (sent /              S      0.5
│           delivered / read receipts)
                                                             ─────
                                                      Subtotal: 6

EPIC-07     WHATSAPP INBOX UI
├ S-025     Conversation list page (real-time           M      1.5
│           updates, unread badges)
├ S-026     Chat window (send/receive, media            M      1.5
│           display, reply context)
├ S-027     Auto-link conversation to lead by           S      0.5
│           phone + manual link UI
└ S-028     Assign conversation to rep                  S      0.5
                                                             ─────
                                                      Subtotal: 4

                                                   ═══════════════
                                         Sprint Total: 10 (tight)
                          Mitigation: AI assist on UI, S-024 can slip

Sprint 3 Deliverable:
  ✅ Admin can connect WhatsApp via QR scan
  ✅ All inbound messages appear in inbox in real-time
  ✅ Team can reply from inbox (text + files)
  ✅ Conversations auto-linked to leads
────────────────────────────────────────────────────────────────
```

---

### Sprint 4 — "Quotations + Pipeline + Reports" (Apr 21 – May 2)

**Goal:** Quotation engine, pipeline view, reports, and launch readiness.

```
Sprint 4 — QUOTATIONS + PIPELINE + REPORTS + LAUNCH
────────────────────────────────────────────────────────────────
Epic        Story                                    Size   Days
─────────── ──────────────────────────────────────── ────── ─────
EPIC-08     QUOTATION ENGINE
├ S-029     Product catalog CRUD (API + page)           S      1
├ S-030     Quote builder UI (line items, discount,     L      2
│           tax, preview)
├ S-031     PDF generation (@react-pdf/renderer,        M      1.5
│           branded template)
├ S-032     Send quote via WA (Baileys) / Email /       M      1
│           PDF download
└ S-033     Public share link (/q/:quoteNumber)          S      0.5
                                                             ─────
                                                      Subtotal: 6

EPIC-09     PIPELINE & DASHBOARD
├ S-034     Kanban pipeline view (drag-and-drop          M      1.5
│           status changes)
├ S-035     Dashboard summary cards + charts             M      1.5
│           (Recharts)
└ S-036     Won/Lost conversion + lost reason             S      0.5
│           capture
                                                             ─────
                                                      Subtotal: 3.5

EPIC-10     REPORTS & AUTOMATION
├ S-037     Rep performance + source-wise reports         S      1
├ S-038     BullMQ cron: daily WA report via              M      1
│           Baileys
└ S-039     Report config UI (recipients,                 S      0.5
│           schedule, toggle)
                                                             ─────
                                                      Subtotal: 2.5

                                                   ═══════════════
                                             Sprint Total: 12 (over)
                        Plan: S-038/S-039 can move to post-launch week

Sprint 4 Deliverable:
  ✅ Quotes created, PDF generated, sent via WhatsApp
  ✅ Pipeline kanban visible to managers
  ✅ Dashboard with key metrics
  ✅ Automated daily reports (if time permits, else week 9)
────────────────────────────────────────────────────────────────
```

---

### Post-Sprint — "Polish & Launch" (May 5–9, 1 week)

```
POST-SPRINT — POLISH & LAUNCH
────────────────────────────────────────────────────────────────
Task                                                     Days
──────────────────────────────────────────────────────── ─────
UI/UX polish pass (responsive, loading states, errors)    1
PWA setup (Workbox, offline lead entry, manifest)         1
Deployment: Vercel + Railway (API + Baileys persistent)   1
Data import (leads CSV) + user onboarding                 0.5
End-to-end smoke testing                                  1
Buffer / bug fixes                                        0.5
                                                         ─────
                                                  Total:  5 days
────────────────────────────────────────────────────────────────
```

---

## 4. Epic & Story Specifications

Below are detailed specs for each epic. Stories include acceptance criteria
suitable for autonomous implementation.

---

### EPIC-01: Monorepo & Infrastructure Setup

**Vision:** A clean monorepo skeleton where every package builds, types check,
and local dev runs with a single `docker compose up`.

**Scope:**
| Story | Title | Size |
|-------|-------|------|
| S-001 | Initialize monorepo structure | M |
| S-002 | Database schema + Prisma migrations | S |
| S-003 | Docker Compose for local dev | S |
| S-004 | CI skeleton (lint + type-check) | XS |

---

#### S-001: Initialize Monorepo Structure

**As a** developer,
**I want** a working monorepo with Next.js, Fastify, and shared packages,
**So that** I can start building features immediately.

**Requirements:**
```
yash-crm/
├── apps/
│   └── web/                  # Next.js 14 (App Router)
│       ├── app/
│       │   ├── (auth)/login/
│       │   ├── (dashboard)/
│       │   └── layout.tsx
│       ├── next.config.js
│       ├── tailwind.config.ts
│       └── package.json
├── packages/
│   ├── api/                  # Fastify API server
│   │   ├── src/
│   │   │   ├── index.ts      # Entry point
│   │   │   ├── routes/
│   │   │   ├── services/
│   │   │   └── lib/
│   │   └── package.json
│   ├── baileys-service/      # WhatsApp Baileys process
│   │   ├── src/
│   │   │   ├── index.ts
│   │   │   ├── session.ts
│   │   │   ├── handlers/
│   │   │   └── senders/
│   │   └── package.json
│   └── shared/               # Shared types + Zod schemas
│       ├── src/
│       │   ├── types/
│       │   └── schemas/
│       └── package.json
├── package.json              # Root workspace
├── turbo.json                # Turborepo config
├── tsconfig.base.json
├── .env.example
└── docker-compose.yml
```

**Technical decisions:**
- Use **pnpm workspaces** + **Turborepo** for monorepo
- shadcn/ui + Tailwind pre-configured in web app
- Zustand installed in web app
- TypeScript strict mode everywhere
- Path aliases: `@yash/api`, `@yash/shared`, `@yash/baileys`

**Acceptance criteria:**
- [ ] `pnpm install` succeeds from root
- [ ] `pnpm dev` starts Next.js on :3000 and Fastify on :4000
- [ ] TypeScript compiles across all packages with zero errors
- [ ] Fastify health check endpoint `/health` returns `{ status: "ok" }`
- [ ] Next.js renders a placeholder page at `/`
- [ ] shadcn/ui Button component renders correctly
- [ ] `.env.example` documents all required env vars

**Size:** M (2 days)

---

#### S-002: Database Schema + Prisma Migrations

**As a** developer,
**I want** all database tables created via Prisma,
**So that** every module has its data layer ready.

**Requirements:**
Create the full Prisma schema matching the plan (Section 7):

```prisma
// Key models (full list):
model Branch { ... }
model AllowedUser { ... }
model UserProfile { ... }
model Lead { ... }
model Contact { ... }
model Product { ... }
model Quotation { ... }
model FollowUp { ... }
model Activity { ... }
model WaSession { ... }
model WaMessage { ... }
model WaConversation { ... }
model ReportConfig { ... }
```

**Technical notes:**
- Use `uuid` for all primary keys (via `@default(uuid())`)
- Use `@relation` for all foreign keys with proper cascading
- Add indexes on: `leads.phone`, `leads.assigned_to`, `leads.status`,
  `wa_messages.from_number`, `wa_messages.timestamp`,
  `wa_conversations.contact_number`
- `product_interest` on leads = `String[]` (Postgres array)
- `line_items` on quotations = `Json` type
- `variants` on products = `Json` type
- Seed file with: 1 super_admin allowed_user, sample branch, sample products

**Acceptance criteria:**
- [ ] `npx prisma migrate dev` runs without errors
- [ ] All 12 tables created with correct columns and relations
- [ ] Indexes exist on high-query columns
- [ ] Seed script creates initial super admin + branch + 5 sample products
- [ ] Prisma Client generates with full TypeScript types

**Size:** S (1.5 days)

---

#### S-003: Docker Compose for Local Dev

**As a** developer,
**I want** `docker compose up` to start Postgres and Redis,
**So that** I don't need to install databases locally.

**Requirements:**
```yaml
services:
  postgres:
    image: postgres:16
    ports: ["5432:5432"]
    environment:
      POSTGRES_DB: yash_crm
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
    volumes:
      - pgdata:/var/lib/postgresql/data

  redis:
    image: redis:7-alpine
    ports: ["6379:6379"]

volumes:
  pgdata:
```

**Acceptance criteria:**
- [ ] `docker compose up -d` starts both services
- [ ] Prisma connects to Postgres via `DATABASE_URL`
- [ ] BullMQ connects to Redis via `REDIS_URL`
- [ ] Data persists across container restarts (volume mount)

**Size:** S (1 day)

---

#### S-004: CI Skeleton

**As a** developer,
**I want** GitHub Actions to run lint and type-check on push,
**So that** broken code doesn't land on main.

**Acceptance criteria:**
- [ ] `.github/workflows/ci.yml` runs on push and PR
- [ ] Steps: install → lint → type-check → build
- [ ] Fails if TypeScript errors or lint violations

**Size:** XS (0.5 days)

---

### EPIC-02: Google Auth + Access Control

**Vision:** Secure, passwordless login via Google. Only emails in the allowlist can access the app. Super admin controls who has access.

| Story | Title | Size |
|-------|-------|------|
| S-005 | NextAuth.js Google OAuth setup | S |
| S-006 | Login page + access denied page | S |
| S-007 | allowed_users check in signIn callback | S |
| S-008 | Role-based API middleware | S |

---

#### S-005: NextAuth.js Google OAuth Setup

**As a** user,
**I want** to log in with my Google account,
**So that** I don't need to remember a password.

**Requirements:**
- Install `next-auth` with Google provider
- Configure `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET`
- Session strategy: JWT (stateless, works with Fastify)
- Session includes: `email`, `name`, `image`, `role`, `branchId`
- `/api/auth/[...nextauth]/route.ts` handles all auth routes

**Acceptance criteria:**
- [ ] Clicking "Sign in with Google" redirects to Google OAuth
- [ ] Successful auth creates a session cookie
- [ ] Session contains user email, name, avatar from Google
- [ ] `useSession()` hook works in client components
- [ ] Session token can be forwarded to Fastify API for auth

**Size:** S (1 day)

---

#### S-006: Login Page + Access Denied Page

**As a** user,
**I want** a clean login page with Google sign-in button,
**So that** I can access the CRM.

**Requirements:**
- `/login` page with company branding + "Sign in with Google" button
- `/login?error=AccessDenied` shows "Access denied — contact your administrator"
- Redirect authenticated users to `/leads` (default landing)
- Mobile responsive

**Acceptance criteria:**
- [ ] Login page renders with Google sign-in button
- [ ] Error state displays access denied message
- [ ] Authenticated users are redirected away from login
- [ ] Page is responsive on mobile

**Size:** S (0.5 days)

---

#### S-007: Allowed Users Check in signIn Callback

**As a** super admin,
**I want** only invited email addresses to be able to log in,
**So that** unauthorized people cannot access the CRM.

**Requirements:**
- `signIn` callback queries `allowed_users` table
- If email not found OR `is_active = false` → return `false` (block)
- On first successful login → upsert `user_profiles` with name + avatar
- Update `last_login_at` on every login
- `session` callback attaches `role` and `branch_id` to session object

**Acceptance criteria:**
- [ ] Email in `allowed_users` + `is_active = true` → login succeeds
- [ ] Email NOT in `allowed_users` → redirected to access denied
- [ ] `is_active = false` → redirected to access denied
- [ ] First login creates a `user_profiles` record
- [ ] `session.user.role` is available in both client and server
- [ ] `session.user.branchId` is available for branch-scoped queries

**Size:** S (0.5 days)

---

#### S-008: Role-Based API Middleware (Fastify)

**As a** developer,
**I want** Fastify routes to enforce role-based access,
**So that** sales reps can't access admin endpoints.

**Requirements:**
- Fastify `preHandler` hook that validates JWT/session token
- `requireAuth()` — blocks unauthenticated requests
- `requireRole('manager', 'super_admin')` — blocks insufficient roles
- `scopeToUser()` — sales reps only see their own leads
- Attach `request.user` with `{ id, email, role, branchId }`

**Acceptance criteria:**
- [ ] Unauthenticated requests to protected routes return 401
- [ ] Wrong role returns 403 with clear error message
- [ ] `request.user` is populated on all authenticated routes
- [ ] Sales rep calling `/users` (admin-only) gets 403
- [ ] Middleware is reusable across all route files

**Size:** S (0.5 days)

---

### EPIC-03: Lead Management

| Story | Title | Size |
|-------|-------|------|
| S-009 | Lead CRUD API | M |
| S-010 | Lead list page | M |
| S-011 | Lead detail page | M |
| S-012 | Lead assignment API + UI | S |
| S-013 | Activity logging | S |

---

#### S-009: Lead CRUD API

**As a** sales rep,
**I want** API endpoints to create, read, update, and delete leads,
**So that** the frontend can manage leads.

**Requirements:**
- `GET /leads` — paginated, filterable (status, assigned_to, source, branch, date range, search by name/phone)
- `POST /leads` — create with Zod validation
- `GET /leads/:id` — full lead with related contacts
- `PATCH /leads/:id` — partial update
- `DELETE /leads/:id` — soft delete or hard delete
- Sales reps: scoped to own leads only (`assigned_to = currentUser`)
- Managers/admins: see all leads (optionally filtered by branch)

**Acceptance criteria:**
- [ ] All 5 CRUD endpoints work correctly
- [ ] Pagination returns `{ data, total, page, pageSize }`
- [ ] Search by name or phone works (case-insensitive partial match)
- [ ] Filter by status, source, assigned_to, branch_id, date range
- [ ] Sales rep can only see own leads
- [ ] Manager sees all leads
- [ ] Zod validation rejects invalid input with clear errors
- [ ] `created_by` auto-set from session user

**Size:** M (1.5 days)

---

#### S-010: Lead List Page

**As a** sales rep,
**I want** a table view of my leads with search and filters,
**So that** I can quickly find and manage leads.

**Requirements:**
- Data table with columns: Name, Phone, Status, Source, Assigned To, Next Follow-up, Created
- Status badges (color-coded): New (blue), Contacted (yellow), Qualified (orange), Proposal (purple), Won (green), Lost (red)
- Search bar (searches name + phone)
- Filter dropdowns: Status, Source, Assigned To
- "Add Lead" button → modal or slide-over form
- Click row → navigate to lead detail
- Mobile: card layout instead of table

**Acceptance criteria:**
- [ ] Table renders with all columns
- [ ] Status badges are color-coded
- [ ] Search filters results as you type (debounced)
- [ ] Filter dropdowns work and combine correctly
- [ ] "Add Lead" opens a form with required fields
- [ ] Form validates with Zod (React Hook Form)
- [ ] Click on row navigates to `/leads/[id]`
- [ ] Pagination controls work (prev/next, page size)
- [ ] Mobile layout shows cards instead of table

**Size:** M (1.5 days)

---

#### S-011: Lead Detail Page

**As a** sales rep,
**I want** to see all information about a lead in one place,
**So that** I can manage the full customer relationship.

**Requirements:**
- Header: Lead name, status badge, phone, email, source
- Edit button → inline edit or modal
- Tabs skeleton:
  - **Overview:** Lead info, assigned rep, product interest, notes
  - **Activity:** Timeline of all actions (auto-logged)
  - **Follow-ups:** Scheduled + completed follow-ups
  - **Quotations:** (placeholder, built in Sprint 4)
  - **WhatsApp:** (placeholder, built in Sprint 3)
- Status change dropdown (move through pipeline stages)
- Quick actions: Call (tel: link), WhatsApp (link to inbox), Create Follow-up

**Acceptance criteria:**
- [ ] Lead header shows name, status, phone, email
- [ ] Status can be changed via dropdown
- [ ] Tabs render and switch correctly
- [ ] Overview tab shows all lead fields (editable)
- [ ] Activity tab shows chronological timeline
- [ ] Follow-ups tab shows scheduled/completed items
- [ ] Quick action buttons work (call, WhatsApp, follow-up)
- [ ] Breadcrumb navigation: Leads > Lead Name

**Size:** M (1.5 days)

---

#### S-012: Lead Assignment

**As a** manager,
**I want** to assign leads to sales reps,
**So that** every lead has a responsible owner.

**Acceptance criteria:**
- [ ] `POST /leads/:id/assign` accepts `{ userId }` — manager/admin only
- [ ] Lead detail page shows "Assigned to" with user name
- [ ] Manager can change assignment via dropdown
- [ ] Activity log captures: "Lead assigned to [rep name] by [manager name]"
- [ ] Assigned rep sees the lead in their filtered list

**Size:** S (0.5 days)

---

#### S-013: Activity Logging

**As a** manager,
**I want** every action on a lead to be automatically logged,
**So that** I can see the full history of interactions.

**Requirements:**
- Auto-log on: lead created, status changed, assigned, follow-up created/completed, note added, quotation created/sent
- Activity record: `{ type, description, performed_by, metadata, created_at }`
- API: `GET /leads/:id/activities` (paginated, newest first)

**Acceptance criteria:**
- [ ] Lead creation logs "Lead created by [user]"
- [ ] Status change logs "Status changed from [old] to [new] by [user]"
- [ ] Assignment logs "Assigned to [rep] by [manager]"
- [ ] Activity timeline renders in lead detail page
- [ ] Activities are sorted newest-first
- [ ] Each activity shows timestamp, user avatar, description

**Size:** S (0.5 days)

---

### EPIC-04: Follow-Up System

| Story | Title | Size |
|-------|-------|------|
| S-014 | Follow-up CRUD API | S |
| S-015 | Follow-up views (Today/Upcoming/Missed) | M |
| S-016 | Schedule follow-up from lead detail | S |
| S-017 | BullMQ follow-up reminder job | S |

---

#### S-014: Follow-Up CRUD API

**Acceptance criteria:**
- [ ] `POST /follow-ups` — create with `{ lead_id, scheduled_at, type, notes }`
- [ ] `GET /follow-ups` — filter by status (pending/completed/missed), date range
- [ ] `PATCH /follow-ups/:id` — reschedule or mark complete
- [ ] `DELETE /follow-ups/:id` — remove
- [ ] Type enum: call, meeting, visit, whatsapp, email, other
- [ ] Auto-detect "missed": `scheduled_at < now() AND status = pending`
- [ ] Scoped to own follow-ups for reps, all for managers

**Size:** S (0.5 days)

---

#### S-015: Follow-Up Views

**As a** sales rep,
**I want** to see today's follow-ups, upcoming ones, and missed ones,
**So that** I never miss a customer interaction.

**Acceptance criteria:**
- [ ] Three tabs/sections: Today, Upcoming (next 7 days), Missed
- [ ] Each follow-up shows: lead name, type icon, time, notes
- [ ] Click follow-up → navigates to lead detail
- [ ] "Mark Complete" button with completion notes
- [ ] "Reschedule" action with date picker
- [ ] Missed follow-ups highlighted in red
- [ ] Count badges on tabs (Today: 5, Missed: 2)
- [ ] Mobile-friendly card layout

**Size:** M (1 day)

---

#### S-016: Schedule Follow-Up from Lead Detail

**Acceptance criteria:**
- [ ] Button "Schedule Follow-up" in lead detail page
- [ ] Opens modal: type dropdown, date/time picker, notes
- [ ] Created follow-up appears in Follow-ups tab and main follow-up page
- [ ] Activity log captures: "Follow-up scheduled for [date] by [user]"

**Size:** S (0.5 days)

---

#### S-017: BullMQ Follow-Up Reminder Job

**As a** sales rep,
**I want** to get a reminder before a follow-up is due,
**So that** I can prepare for the interaction.

**Requirements:**
- BullMQ delayed job: created when follow-up is scheduled
- Fires 15 minutes before `scheduled_at`
- Emits Socket.io event `followup:due` to the assigned rep
- Frontend shows in-app notification/toast

**Acceptance criteria:**
- [ ] Job is queued when follow-up is created
- [ ] Job fires ~15 minutes before scheduled time
- [ ] Socket.io event reaches the correct user
- [ ] Toast notification appears in the web app
- [ ] Job is cancelled if follow-up is deleted/completed before firing

**Size:** S (0.5 days)

---

### EPIC-05: Team Management (Super Admin)

| Story | Title | Size |
|-------|-------|------|
| S-018 | Team management page | S |
| S-019 | Invite email via Resend | XS |

---

#### S-018: Team Management Page

**As a** super admin,
**I want** to manage who has access to the CRM,
**So that** I control my team's access.

**Acceptance criteria:**
- [ ] Settings > Team Management page (super_admin only)
- [ ] Table: Email, Name, Role, Status (Active/Invited), Last Login
- [ ] "Add User" button → modal: email + role dropdown
- [ ] Edit role inline or via modal
- [ ] Revoke access button (sets `is_active = false`)
- [ ] Status shows "Invited" if user hasn't logged in yet
- [ ] Cannot revoke own super_admin access

**Size:** S (1 day)

---

#### S-019: Invite Email via Resend

**Acceptance criteria:**
- [ ] When super admin adds a user, an invite email is sent via Resend
- [ ] Email contains: "You've been invited to Yash CRM" + login link
- [ ] Branded email template (company name + logo)
- [ ] Graceful failure: if email fails, user is still added (just no email)

**Size:** XS (0.5 days)

---

### EPIC-06: Baileys WhatsApp Engine

**Vision:** Self-hosted WhatsApp integration using Baileys. No per-message cost.
Admin scans QR once, session persists across restarts. All messages flow
through our system.

| Story | Title | Size |
|-------|-------|------|
| S-020 | Baileys service setup | M |
| S-021 | QR code flow + connection UI | M |
| S-022 | Inbound message handler | M |
| S-023 | Send text + document API | S |
| S-024 | Message status tracking | S |

---

#### S-020: Baileys Service Setup

**As a** developer,
**I want** a Baileys service that manages the WhatsApp session,
**So that** the CRM can send and receive WhatsApp messages.

**Requirements:**
- `@whiskeysockets/baileys` pinned to stable version
- `useMultiFileAuthState` for persistent auth (filesystem for now)
- Socket connection with auto-reconnect on disconnect
- Health check endpoint
- Graceful shutdown (save state before exit)
- Socket.io integration for real-time events to frontend

**Acceptance criteria:**
- [ ] Service starts and logs "Baileys service ready"
- [ ] `useMultiFileAuthState` stores creds in `./wa-auth/` (gitignored)
- [ ] On disconnect, service attempts reconnection automatically
- [ ] Service emits `wa:status` events via Socket.io
- [ ] Health endpoint returns `{ status: "connected" | "disconnected" }`
- [ ] Graceful shutdown saves auth state
- [ ] Session survives service restart without re-scan

**Size:** M (2 days)

---

#### S-021: QR Code Flow + Connection UI

**As an** admin,
**I want** to connect WhatsApp by scanning a QR code on the dashboard,
**So that** the CRM can access WhatsApp.

**Requirements:**
- Settings > WhatsApp Connection page
- "Connect WhatsApp" button triggers QR generation
- QR code rendered in UI, refreshes every ~20s via Socket.io
- Status indicator: Disconnected (red) / Connecting (yellow) / Connected (green)
- Once connected, show phone number + "Disconnect" button
- Store session status in `wa_sessions` table

**Acceptance criteria:**
- [ ] "Connect" button triggers `POST /whatsapp/connect`
- [ ] QR code appears and refreshes on each `wa:qr` event
- [ ] Scanning QR with WhatsApp establishes connection
- [ ] Status updates to "Connected" with phone number displayed
- [ ] "Disconnect" button calls `POST /whatsapp/disconnect`
- [ ] Connection status persists in database
- [ ] Status visible on all dashboard pages (header indicator)

**Size:** M (1 day)

---

#### S-022: Inbound Message Handler

**As a** team member,
**I want** all incoming WhatsApp messages saved to the database,
**So that** I can see them in the inbox.

**Requirements:**
- Listen to `messages.upsert` event from Baileys
- Skip `fromMe` messages (handled separately on send)
- Extract: message body, media type, sender number, timestamp
- Download media (images, documents) → store in Supabase Storage
- Auto-match sender to lead by phone number
- Create/update `wa_conversations` record
- Emit `inbox:new_message` via Socket.io

**Acceptance criteria:**
- [ ] Text messages from WhatsApp appear in `wa_messages` table
- [ ] Image messages are downloaded and URL stored
- [ ] Document messages (PDF, etc.) are downloaded and URL stored
- [ ] `wa_conversations` record created/updated with last_message_at
- [ ] `unread_count` incremented on conversation
- [ ] If sender phone matches a lead's phone → `lead_id` auto-set
- [ ] Socket.io event fires for real-time inbox updates
- [ ] Duplicate messages (same `wa_message_id`) are ignored

**Size:** M (1.5 days)

---

#### S-023: Send Text + Document API

**As a** sales rep,
**I want** to send WhatsApp messages from the CRM,
**So that** I can communicate with leads without switching apps.

**Acceptance criteria:**
- [ ] `POST /inbox/conversations/:id/send` accepts `{ body }` for text
- [ ] `POST /inbox/conversations/:id/send` accepts `{ media }` for files
- [ ] Sent messages saved to `wa_messages` with `direction: outbound`
- [ ] Baileys sends the message to the correct WhatsApp number
- [ ] `sent_by` field set to the current user
- [ ] Socket.io emits sent message for real-time UI update
- [ ] Error handling: if Baileys fails to send → `status: failed`

**Size:** S (1 day)

---

#### S-024: Message Status Tracking

**As a** user,
**I want** to see if my WhatsApp message was delivered and read,
**So that** I know the customer received it.

**Acceptance criteria:**
- [ ] Listen to Baileys `messages.update` for delivery/read receipts
- [ ] Update `wa_messages.status` to: sent → delivered → read
- [ ] Emit `inbox:status_update` via Socket.io
- [ ] UI shows tick marks: ✓ sent, ✓✓ delivered, ✓✓ (blue) read
- [ ] Status updates reflected in real-time in chat window

**Size:** S (0.5 days)

---

### EPIC-07: WhatsApp Inbox UI

| Story | Title | Size |
|-------|-------|------|
| S-025 | Conversation list page | M |
| S-026 | Chat window | M |
| S-027 | Auto-link + manual link to lead | S |
| S-028 | Assign conversation to rep | S |

---

#### S-025: Conversation List Page

**As a** team member,
**I want** a list of all WhatsApp conversations,
**So that** I can see and manage all customer chats.

**Acceptance criteria:**
- [ ] `/inbox` page with conversation list on the left
- [ ] Each item shows: contact name, last message preview, timestamp, unread badge
- [ ] Sorted by `last_message_at` descending (newest first)
- [ ] Filters: All | Unread | Linked to Lead | Unassigned
- [ ] Search by contact name or message content
- [ ] Real-time updates: new messages push conversations to top
- [ ] Unread count resets when conversation is opened
- [ ] Click conversation → loads chat window on the right

**Size:** M (1.5 days)

---

#### S-026: Chat Window

**As a** team member,
**I want** a chat interface to read and reply to WhatsApp messages,
**So that** I can have conversations without leaving the CRM.

**Acceptance criteria:**
- [ ] Chat window on the right side of inbox (or full-screen on mobile)
- [ ] Messages displayed in chat bubble layout (inbound left, outbound right)
- [ ] Each message shows: body, timestamp, status ticks
- [ ] Media messages: images render inline, documents show download link
- [ ] Text input field + Send button at bottom
- [ ] File attachment button (images, PDFs)
- [ ] Auto-scroll to newest message
- [ ] Real-time: new messages appear instantly via Socket.io
- [ ] Header shows: contact name, phone, linked lead (if any)
- [ ] "View Lead" button in header (if linked)

**Size:** M (1.5 days)

---

#### S-027: Auto-Link + Manual Link to Lead

**Acceptance criteria:**
- [ ] When a message arrives, system checks if `from_number` matches any lead's phone
- [ ] If match found → `wa_conversations.lead_id` set automatically
- [ ] If no match → conversation shows "Unlinked" status
- [ ] "Link to Lead" button in chat header
- [ ] Clicking opens a lead search modal (search by name/phone)
- [ ] Selecting a lead links the conversation

**Size:** S (0.5 days)

---

#### S-028: Assign Conversation to Rep

**Acceptance criteria:**
- [ ] "Assign" button in chat header (manager/admin only)
- [ ] Opens dropdown of active sales reps
- [ ] Selecting a rep sets `wa_conversations.assigned_to`
- [ ] Assigned rep sees conversation in their filtered inbox
- [ ] Activity logged: "Conversation assigned to [rep]"

**Size:** S (0.5 days)

---

### EPIC-08: Quotation Engine

| Story | Title | Size |
|-------|-------|------|
| S-029 | Product catalog CRUD | S |
| S-030 | Quote builder UI | L |
| S-031 | PDF generation | M |
| S-032 | Send quote via WA/Email/PDF | M |
| S-033 | Public share link | S |

---

#### S-029: Product Catalog CRUD

**Acceptance criteria:**
- [ ] `GET/POST /products` — list all, create new
- [ ] `PATCH/DELETE /products/:id` — update, soft delete
- [ ] Fields: name, category, description, base_price, unit, variants (JSON), is_active
- [ ] Products page: table with add/edit/delete actions
- [ ] Category filter
- [ ] Only admin/manager can manage products

**Size:** S (1 day)

---

#### S-030: Quote Builder UI

**As a** sales rep,
**I want** to build a quotation with line items, discounts, and tax,
**So that** I can send professional quotes to customers.

**Acceptance criteria:**
- [ ] Create quotation page accessible from lead detail or `/quotations/new`
- [ ] Select lead/contact (auto-filled if started from lead detail)
- [ ] Add line items: search/select product → quantity, rate, amount
- [ ] Auto-calculate: subtotal, discount (% or fixed), tax (GST %), total
- [ ] Free-text line items (custom items not in catalog)
- [ ] Terms and conditions text field
- [ ] Notes field
- [ ] Valid-until date picker
- [ ] Save as draft or finalize
- [ ] Preview panel showing formatted quote
- [ ] `quote_number` auto-generated (e.g., YC-2026-0001)

**Size:** L (2 days)

---

#### S-031: PDF Generation

**As a** sales rep,
**I want** to generate a branded PDF of a quotation,
**So that** I can share it professionally.

**Requirements:**
- Use `@react-pdf/renderer` for in-browser PDF generation
- Branded template: company logo, name, address, GST number
- Clean layout: quote number, date, customer info, line items table, totals, terms
- Store generated PDF in Supabase Storage
- Save URL to `quotations.pdf_url`

**Acceptance criteria:**
- [ ] PDF generates with all quote data
- [ ] Company branding (logo, name, address) included
- [ ] Line items table with proper alignment and totals
- [ ] GST breakdown shown
- [ ] PDF uploaded to Supabase Storage
- [ ] PDF URL saved on quotation record
- [ ] "Download PDF" button works in UI

**Size:** M (1.5 days)

---

#### S-032: Send Quote via WA / Email / PDF

**As a** sales rep,
**I want** to send quotes via WhatsApp, email, or download PDF,
**So that** customers receive quotes through their preferred channel.

**Acceptance criteria:**
- [ ] `POST /quotations/:id/send` with `{ channel: "whatsapp" | "email" | "pdf" }`
- [ ] WhatsApp: send PDF as document via Baileys to lead's phone
- [ ] Email: send via Resend with PDF attachment + summary in body
- [ ] PDF: return download URL
- [ ] `shared_at` timestamp updated on quotation
- [ ] Activity logged: "Quotation Q-2026-001 sent via WhatsApp by [user]"
- [ ] Quick-send button in lead detail page (send latest quote via WA)

**Size:** M (1 day)

---

#### S-033: Public Share Link

**Acceptance criteria:**
- [ ] `/q/:quoteNumber` renders quotation in a clean public page (no auth required)
- [ ] Shows: company header, quote details, line items, totals, terms
- [ ] Mobile responsive
- [ ] Optional: track when link is opened (view tracking)
- [ ] Does not expose internal IDs or sensitive data

**Size:** S (0.5 days)

---

### EPIC-09: Pipeline & Dashboard

| Story | Title | Size |
|-------|-------|------|
| S-034 | Kanban pipeline view | M |
| S-035 | Dashboard summary + charts | M |
| S-036 | Won/Lost conversion + lost reason | S |

---

#### S-034: Kanban Pipeline View

**As a** manager,
**I want** a visual pipeline of all leads,
**So that** I can see deal progression at a glance.

**Acceptance criteria:**
- [ ] `/pipeline` page with Kanban columns: New → Contacted → Qualified → Proposal → Won / Lost
- [ ] Each card shows: lead name, phone, assigned rep, value (if quote exists)
- [ ] Drag-and-drop to move between columns
- [ ] Drop triggers `PATCH /leads/:id` to update status
- [ ] Activity logged on drag-move
- [ ] Filter by: assigned rep, branch, date range
- [ ] Card count per column shown in header
- [ ] Won/Lost columns are collapsed by default

**Size:** M (1.5 days)

---

#### S-035: Dashboard Summary + Charts

**As a** manager,
**I want** a dashboard showing key metrics,
**So that** I can monitor sales performance.

**Acceptance criteria:**
- [ ] `/reports` page (dashboard) with summary cards:
  - Total Leads (this month)
  - New Leads (this week)
  - Conversion Rate (won / total)
  - Revenue (sum of won quotations)
  - Follow-ups Due Today
  - WhatsApp Conversations Active
- [ ] Charts (Recharts):
  - Leads by status (bar chart)
  - Leads by source (pie chart)
  - Lead trend (line chart — last 30 days)
- [ ] Date range selector (7d, 30d, 90d, custom)
- [ ] Manager: sees all data; Rep: sees own data

**Size:** M (1.5 days)

---

#### S-036: Won/Lost Conversion + Lost Reason

**Acceptance criteria:**
- [ ] Moving lead to "Won" → prompt for won amount, notes
- [ ] Moving lead to "Lost" → required: select lost reason (dropdown)
- [ ] Lost reasons: Price too high, Went with competitor, No budget, Not interested, Other
- [ ] Custom lost reason via text input
- [ ] Lost reason stored in lead metadata
- [ ] Reports can filter/aggregate by lost reason

**Size:** S (0.5 days)

---

### EPIC-10: Reports & Automation

| Story | Title | Size |
|-------|-------|------|
| S-037 | Rep performance + source-wise reports | S |
| S-038 | BullMQ daily WA report via Baileys | M |
| S-039 | Report config UI | S |

---

#### S-037: Performance & Source Reports

**Acceptance criteria:**
- [ ] Rep performance table: rep name, leads assigned, followed up, converted, conversion rate
- [ ] Source-wise breakdown: source name, lead count, conversion rate
- [ ] Product-wise: product interest, lead count, quote count, won count
- [ ] CSV export button for each report
- [ ] Date range filter applies to all reports

**Size:** S (1 day)

---

#### S-038: Daily WhatsApp Report via Baileys

**As a** manager,
**I want** to receive a daily summary on WhatsApp automatically,
**So that** I stay informed without opening the dashboard.

**Requirements:**
- BullMQ cron job: `0 19 * * *` (daily at 7 PM)
- Generate report: new leads, follow-ups completed, quotations sent, deals won
- Format as clean WhatsApp text message (with emojis for readability)
- Send via Baileys to configured recipient phone numbers

**Acceptance criteria:**
- [ ] BullMQ cron fires daily at configured time
- [ ] Report includes: today's lead count, follow-ups, quotes, conversions
- [ ] Message sent via Baileys to all configured recipients
- [ ] Report stored in `wa_messages` with `is_automated = true`
- [ ] If Baileys is disconnected → log error, retry next day
- [ ] Report config toggleable (on/off)

**Size:** M (1 day)

---

#### S-039: Report Config UI

**Acceptance criteria:**
- [ ] Settings > Report Configuration page
- [ ] Toggle: enable/disable daily report
- [ ] Set send time (time picker)
- [ ] Add/remove recipient phone numbers
- [ ] Weekly/monthly report toggle (future, can be disabled for now)
- [ ] Only super_admin/manager can configure

**Size:** S (0.5 days)

---

## 5. Dependency Map

```
DEPENDENCY FLOW
═══════════════════════════════════════════════════════════════

S-001 Monorepo Setup
  └──→ ALL other stories depend on this

S-002 Database Schema
  └──→ ALL API stories (S-009, S-014, S-020, S-029, etc.)

S-003 Docker Compose
  └──→ S-002 (migrations need running DB)

S-005 NextAuth Setup
  └──→ S-006, S-007, S-008

S-008 Role Middleware
  └──→ S-009, S-014, S-018 (all protected APIs)

S-020 Baileys Service
  └──→ S-021 (QR), S-022 (inbound), S-023 (send), S-024 (status)

S-022 Inbound Handler
  └──→ S-025 (conversation list), S-027 (auto-link)

S-023 Send API
  └──→ S-026 (chat window send), S-032 (send quote via WA)

S-029 Product Catalog
  └──→ S-030 (quote builder needs products)

S-030 Quote Builder
  └──→ S-031 (PDF), S-032 (send), S-033 (share link)

S-009 Lead CRUD API
  └──→ S-010 (list page), S-011 (detail page), S-034 (pipeline)
═══════════════════════════════════════════════════════════════
```

---

## 6. Sprint Summary

```
SPRINT OVERVIEW
═══════════════════════════════════════════════════════════════

Sprint 1 (Mar 10–21)  FOUNDATION
  4 stories | 7.5 days | EPIC-01 + EPIC-02
  Deliverable: Working monorepo + Google auth + DB ready

Sprint 2 (Mar 24–Apr 4)  CORE CRM
  11 stories | 9.5 days | EPIC-03 + EPIC-04 + EPIC-05
  Deliverable: Lead management + follow-ups + team mgmt

Sprint 3 (Apr 7–18)  WHATSAPP
  9 stories | 10 days | EPIC-06 + EPIC-07
  Deliverable: WhatsApp connected + inbox live

Sprint 4 (Apr 21–May 2)  QUOTATIONS + PIPELINE + REPORTS
  9 stories | 12 days | EPIC-08 + EPIC-09 + EPIC-10
  Deliverable: Quotes, pipeline, dashboard, reports

Post-Sprint (May 5–9)  POLISH & LAUNCH
  Polish, PWA, deployment, data import
  Deliverable: Production-ready, deployed, users onboarded

═══════════════════════════════════════════════════════════════
TOTAL: 39 stories across 10 epics, ~8 weeks
═══════════════════════════════════════════════════════════════
```

---

## 7. Risk Register

| # | Risk | Likelihood | Impact | Mitigation |
|---|------|-----------|--------|------------|
| 1 | Baileys session gets banned by WhatsApp | Medium | High | Use dedicated number, add 1-2s delay between messages, avoid bulk sends |
| 2 | Baileys upstream breaking changes | Low | Medium | Pin exact version, test before upgrading |
| 3 | Sprint 3 is overloaded (10 days in 8-day sprint) | High | Medium | AI assist on UI components; S-024 can slip to Sprint 4 |
| 4 | Sprint 4 is overloaded (12 days) | High | Medium | S-038/S-039 (automated reports) can slip to post-launch |
| 5 | Google OAuth setup complexity (GCP console) | Low | Low | Well-documented process, 30-min task |
| 6 | PDF generation performance with complex quotes | Low | Low | Generate async, cache result in Supabase Storage |
| 7 | Socket.io scaling with multiple tabs | Low | Low | Single user per session, not a scale concern for internal use |

---

## 8. What's NOT in v1 (Deferred)

These are explicitly out of scope for the initial launch:

- Multi-branch support (schema ready, UI deferred)
- Quote approval workflow (manager approval before sending)
- WhatsApp chatbot / auto-replies
- Client portal (customer-facing login)
- Inventory / stock management
- Payment tracking / invoicing
- Native mobile app (PWA covers mobile use)
- Multi-language support
- API rate limiting (internal use, low volume)
- Advanced analytics (cohort analysis, funnel metrics)
- WhatsApp Business API migration (if Baileys becomes unreliable)

---

## 9. Next Steps

```
IMMEDIATE ACTIONS
═══════════════════════════════════════════════════════════════

1. Initialize git repo + push to GitHub
   $ git init && gh repo create yash-crm --private

2. Create GitHub Project board
   $ gh project create --title "Yash CRM" --owner <org>

3. Create labels + milestones
   Sprint 1, Sprint 2, Sprint 3, Sprint 4, Post-Launch

4. Set up Google Cloud Console
   Create OAuth 2.0 credentials (Client ID + Secret)

5. Set up Supabase project
   Get DATABASE_URL + SUPABASE_KEY + Storage bucket

6. Set up Resend account
   Get API key for invite emails

7. Start Sprint 1, Story S-001
   Initialize the monorepo skeleton
═══════════════════════════════════════════════════════════════
```

---

*Generated by Horizon — Product Manager*
*Based on plan.md v2 | March 7, 2026*
