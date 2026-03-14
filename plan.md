# Yash CRM — Full Project Planning Document (v2)

> Version 2.0 | Updated: March 2026  
> Changes from v1: Baileys WhatsApp engine, WhatsApp Inbox module, Google OAuth login, email-based access control

---

## 1. Project Overview

**Yash CRM** is a full-stack CRM platform for sales-heavy businesses. It combines a **Progressive Web App (PWA)** for field/frontdesk reps, a **web dashboard** for managers, an intelligent **quotation engine**, a built-in **WhatsApp Inbox**, and **automated WhatsApp reporting** — all powered by a self-hosted Baileys session, not a paid gateway.

### Core Goals
- Eliminate paper-based lead tracking and manual follow-ups
- Give sales reps a mobile-first offline-ready tool
- Provide management with real-time pipeline visibility
- Self-hosted WhatsApp with a real inbox — send, receive, and automate without per-message cost
- Secure, invite-only access via Google login

---

## 2. Tech Stack

### Frontend
| Layer | Choice | Reason |
|---|---|---|
| Web + PWA | **Next.js 14 (App Router)** | SSR, PWA, unified codebase |
| UI Library | **shadcn/ui + Tailwind CSS** | Consistent design system |
| State | **Zustand** | Lightweight, clean |
| Offline | **Workbox (next-pwa)** | Service worker + background sync |
| Forms | **React Hook Form + Zod** | Type-safe validation |
| PDF | **@react-pdf/renderer** | In-browser PDF rendering |
| Charts | **Recharts** | Dashboard visualizations |
| Real-time | **Socket.io client** | WhatsApp inbox live updates |

### Backend
| Layer | Choice | Reason |
|---|---|---|
| API Framework | **Fastify (Node.js)** | High performance, matches DINGG stack |
| ORM | **Prisma** | Type-safe DB access |
| Database | **PostgreSQL (Supabase)** | Managed, RLS, real-time |
| Auth | **NextAuth.js (Google Provider)** | Google OAuth, session management |
| File Storage | **Supabase Storage** | PDFs, WA media attachments |
| Queue/Jobs | **BullMQ + Redis** | Follow-up reminders, scheduled WA reports |
| **WhatsApp** | **Baileys (Node.js)** | Self-hosted WA Web protocol — no gateway cost |
| Real-time | **Socket.io** | Push WA messages to inbox in real-time |
| Email | **Resend** | Invite emails + quotation sharing |

### Infrastructure
| Component | Choice |
|---|---|
| Frontend | Vercel |
| API + Baileys Service | Railway or Render (persistent Node.js process) |
| Database | Supabase |
| Redis | Upstash |
| CI/CD | GitHub Actions |

> **Critical Note on Baileys:** Baileys requires a **persistent, always-on Node.js process** (not serverless). It must run on a server/container that doesn't restart frequently. Railway or a VPS (DigitalOcean) is better than serverless for this.

---

## 3. System Architecture

```
┌──────────────────────────────────────────────────────────────────┐
│                           CLIENTS                                │
│  ┌────────────────────┐   ┌──────────────────────────────────┐   │
│  │  PWA               │   │  Web Dashboard                   │   │
│  │  (Sales / Desk)    │   │  (Manager / Admin / Staff)       │   │
│  │  Next.js + Workbox │   │  Inbox | Pipeline | Reports      │   │
│  └────────┬───────────┘   └──────────────┬───────────────────┘   │
└───────────┼──────────────────────────────┼──────────────────────┘
            │      HTTPS + Socket.io        │
┌───────────▼──────────────────────────────▼──────────────────────┐
│                     API LAYER (Fastify)                          │
│                                                                  │
│  /auth  /leads  /quotations  /contacts  /reports                 │
│  /whatsapp  /inbox  /follow-ups  /users  /settings               │
│                                                                  │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │                BAILEYS SERVICE (Node.js)                 │    │
│  │                                                          │    │
│  │  • Manages WA session (QR scan / active session)        │    │
│  │  • Receives all inbound messages → DB + Socket.io       │    │
│  │  • Sends messages / media / documents                   │    │
│  │  • Sends automated reports (BullMQ cron trigger)        │    │
│  │  • Stores auth credentials (encrypted, persistent)      │    │
│  └──────────────────────────┬──────────────────────────────┘    │
└──────────────────────────── ┼ ───────────────────────────────────┘
                              │
         ┌────────────────────┼────────────────────┐
         ▼                    ▼                    ▼
  ┌─────────────┐    ┌──────────────┐    ┌─────────────────┐
  │ PostgreSQL  │    │    Redis     │    │ Supabase Storage│
  │ (Supabase)  │    │  (Upstash)   │    │ (media / PDFs)  │
  └─────────────┘    └──────────────┘    └─────────────────┘
```

---

## 4. Authentication — Google OAuth + Invite-Only Access

### How It Works

```
Super Admin adds email → sends invite → user clicks "Login with Google" 
→ Google OAuth → system checks email against allowed_users table → access granted
```

There are **no passwords** in this system. Google handles all credential management.

### Auth Flow (Step by Step)

```
1. Super Admin opens Settings > Team Management
2. Enters: email address + role (manager / sales_rep / frontdesk)
3. System saves to allowed_users table (status: invited)
4. Optional: system sends invite email via Resend ("You've been invited to Yash CRM")
5. User visits app → clicks "Login with Google"
6. Google OAuth completes → NextAuth receives email from Google profile
7. NextAuth checks: does this email exist in allowed_users? 
   → YES: create/load session, redirect to dashboard
   → NO: show "Access denied — contact your administrator"
8. Super Admin can revoke access anytime (removes from allowed_users)
```

### User Management UI (Super Admin)

```
Settings > Team Management

┌─────────────────────────────────────────────────────────────┐
│ + Add User                                                   │
├───────────────────┬────────────────┬──────────┬─────────────┤
│ Email             │ Name           │ Role     │ Status      │
├───────────────────┼────────────────┼──────────┼─────────────┤
│ raj@example.com   │ Raj Sharma     │ Manager  │ Active   ✓  │
│ priya@example.com │ Priya Mehta    │ Sales Rep│ Active   ✓  │
│ amit@example.com  │ (not joined)   │ Frontdesk│ Invited  ⏳ │
├───────────────────┼────────────────┼──────────┼─────────────┤
│                   │                │          │ Revoke / Edit│
└─────────────────────────────────────────────────────────────┘
```

### Database Tables for Auth

```sql
-- Allowed users (super admin managed)
allowed_users (
  id uuid PRIMARY KEY,
  email text UNIQUE NOT NULL,
  role text NOT NULL,       -- super_admin | manager | sales_rep | frontdesk
  branch_id uuid,           -- optional: restrict to branch
  invited_by uuid,
  invited_at timestamptz,
  last_login_at timestamptz,
  is_active boolean DEFAULT true
)

-- User profiles (auto-created on first Google login)
user_profiles (
  id uuid PRIMARY KEY,
  email text UNIQUE NOT NULL,
  name text,
  avatar_url text,
  allowed_user_id uuid REFERENCES allowed_users(id)
)
```

### NextAuth Configuration

```typescript
// app/api/auth/[...nextauth]/route.ts

export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
  ],
  callbacks: {
    async signIn({ user }) {
      // Check if email is in allowed_users and is active
      const allowed = await db.allowedUsers.findFirst({
        where: { email: user.email, is_active: true }
      });
      if (!allowed) return false; // Block login
      
      // Auto-create profile on first login
      await db.userProfiles.upsert({
        where: { email: user.email },
        update: { name: user.name, last_login_at: new Date() },
        create: { email: user.email, name: user.name, avatar_url: user.image }
      });
      return true;
    },
    async session({ session, token }) {
      // Attach role to session
      const allowed = await db.allowedUsers.findFirst({
        where: { email: session.user.email }
      });
      session.user.role = allowed?.role;
      session.user.branchId = allowed?.branch_id;
      return session;
    }
  },
  pages: {
    signIn: '/login',
    error: '/login?error=AccessDenied',
  }
}
```

---

## 5. WhatsApp Module — Baileys Architecture

### 5.1 Baileys Service Design

The Baileys service runs as a **dedicated Node.js process** (separate from main Fastify API, or as a plugin within the same process on a VPS).

```
baileys-service/
├── src/
│   ├── index.ts              # Entry point, starts Baileys socket
│   ├── session.ts            # Auth state management (persistent)
│   ├── handlers/
│   │   ├── onMessage.ts      # Inbound message handler
│   │   ├── onStatusUpdate.ts # Message delivery/read receipts
│   │   └── onQR.ts           # QR code generation
│   ├── senders/
│   │   ├── sendText.ts
│   │   ├── sendMedia.ts      # Images, documents (quote PDFs)
│   │   └── sendTemplate.ts   # Pre-formatted report messages
│   └── lib/
│       ├── socket.ts         # Socket.io emit helper
│       └── store.ts          # In-memory message cache
```

### 5.2 Session Management (Connect / Reconnect)

```
Dashboard → Settings > WhatsApp Connection

┌────────────────────────────────────────────────────────┐
│  WhatsApp Connection                                    │
│                                                        │
│  Status: ● Disconnected                                │
│                                                        │
│  [Connect WhatsApp Number]                             │
│                                                        │
│  ┌──────────────────────────────────┐                  │
│  │   QR CODE (refreshes every 20s) │  ← Scan with WA  │
│  │                                 │                  │
│  │        ▓▓▓▓▓▓▓▓▓▓▓▓▓            │                  │
│  │        ▓        ▓▓▓             │                  │
│  │        ▓ ▓▓▓▓▓▓ ▓▓▓▓▓▓▓▓▓▓▓    │                  │
│  │        ▓ ▓    ▓ ▓              │                  │
│  │        ▓ ▓▓▓▓▓▓ ▓▓▓▓▓▓▓▓      │                  │
│  │        ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓    │                  │
│  └──────────────────────────────────┘                  │
│                                                        │
│  Status: ● Connected (+91 98765 43210)  [Disconnect]   │
│  Last active: 2 minutes ago                            │
└────────────────────────────────────────────────────────┘
```

**Technical Flow:**
```
1. Admin clicks "Connect" → API calls Baileys startSocket()
2. Baileys generates QR → emits via Socket.io to dashboard
3. Dashboard renders QR (refreshes on each new QR event)
4. Admin scans with WhatsApp → Baileys receives auth
5. Session saved to disk/DB (encrypted auth state)
6. Status updates to Connected → Socket.io broadcasts
7. On server restart → Baileys restores from saved auth (no re-scan needed)
8. On WA logout/disconnect → status updates → admin notified
```

**Auth State Persistence (Baileys):**
```typescript
// Use useMultiFileAuthState for persistent sessions
const { state, saveCreds } = await useMultiFileAuthState('./wa-auth');
// OR store in PostgreSQL for cloud deployments:
const { state, saveCreds } = await useDatabaseAuthState(db); // custom adapter
```

### 5.3 Inbound Message Handling

```typescript
// onMessage handler
sock.ev.on('messages.upsert', async ({ messages }) => {
  for (const msg of messages) {
    if (msg.key.fromMe) continue; // skip own messages
    
    const inboundMsg = {
      wa_message_id: msg.key.id,
      from_number:   msg.key.remoteJid.replace('@s.whatsapp.net', ''),
      body:          msg.message?.conversation || extractMediaCaption(msg),
      media_type:    detectMediaType(msg),   // text | image | document | audio
      media_url:     await downloadAndStore(msg), // to Supabase Storage
      timestamp:     new Date(msg.messageTimestamp * 1000),
      lead_id:       await matchLeadByPhone(from_number), // auto-link to lead
    };
    
    // Save to DB
    await db.whatsappMessages.create({ data: inboundMsg });
    
    // Emit to inbox via Socket.io
    io.emit('inbox:new_message', inboundMsg);
  }
});
```

### 5.4 WhatsApp Inbox UI

The inbox has two views: **Unified Inbox** (all conversations) and **Lead-linked Chat** (inside a lead profile).

```
┌──────────────────────────────────────────────────────────────────┐
│  WhatsApp Inbox                              🔍 Search           │
├───────────────────────────┬──────────────────────────────────────┤
│  CONVERSATIONS            │  Priya Mehta (+91 98100 XXXXX)       │
│  ─────────────────────    │  Lead: #1042 · Kitchen Cabinets      │
│  ● Priya Mehta        2m  │  ──────────────────────────────────  │
│    "Yes send me the..."   │                                      │
│                           │        [Today, 3:45 PM]              │
│  ○ Rajesh Kumar      14m  │  ┌─────────────────────────────┐    │
│    "Quotation recvd"      │  │ Hi, can you send the quote  │    │
│                           │  │ for the modular kitchen?    │    │
│  ○ Amit Verma         1h  │  └─────────────────────────────┘    │
│    "What's the deliv..."  │                 You ↓               │
│                           │    ┌──────────────────────────────┐  │
│  ○ Sunita Patel       2h  │    │ Sure! Sending it right now.  │  │
│    "PDF received"         │    │ Here's the quotation 📎      │  │
│                           │    └──────────────────────────────┘  │
│  ○ Mohan Lal          3h  │                                      │
│                           │  ┌─────────────────────────────┐    │
│  ─────────────────────    │  │ Thank you! Will review and  │    │
│  All · Unread · Leads     │  │ get back to you.            │    │
│  Unassigned               │  └─────────────────────────────┘    │
│                           │  ──────────────────────────────────  │
│                           │  [📎 Attach] [💬 Type a message...]  │
│                           │                        [Send →]      │
└───────────────────────────┴──────────────────────────────────────┘
```

**Inbox Features:**
- Unread count badge per conversation
- Filter: All | Unread | Linked to Lead | Unassigned
- Search conversations by contact name or message content
- Auto-link conversation to lead if phone number matches
- Manual link: "Link to Lead" button if not auto-matched
- Assign conversation to a sales rep
- Send: text, images, PDF attachments (quote PDFs directly)
- Message status: ✓ sent · ✓✓ delivered · ✓✓ (blue) read
- Reply-to-message (threaded context)
- Quick-send quote: button in lead profile to send quote PDF to WA in one click

**Lead-linked Chat (inside Lead Profile):**
```
Lead: Priya Mehta > Communications Tab

[Activity Log]  [Notes]  [WhatsApp Chat ●]  [Email]

  WhatsApp conversation embedded here, 
  same as inbox but scoped to this lead's number.
  New messages from this number auto-appear here.
```

### 5.5 Database Tables for WhatsApp

```sql
-- WhatsApp session config
wa_sessions (
  id uuid PRIMARY KEY,
  phone_number text,
  status text,         -- disconnected | connecting | connected
  connected_at timestamptz,
  disconnected_at timestamptz,
  auth_data jsonb      -- encrypted Baileys credentials (or use filesystem)
)

-- All messages (inbound + outbound)
wa_messages (
  id uuid PRIMARY KEY,
  wa_message_id text,         -- Baileys message key id
  direction text,             -- inbound | outbound
  from_number text,
  to_number text,
  body text,
  media_type text,            -- text | image | document | audio | video
  media_url text,             -- Supabase Storage URL
  status text,                -- sent | delivered | read | failed
  lead_id uuid REFERENCES leads(id),
  contact_id uuid REFERENCES contacts(id),
  sent_by uuid REFERENCES users(id),   -- null if automated/inbound
  is_automated boolean DEFAULT false,  -- true for reports, reminders
  timestamp timestamptz,
  created_at timestamptz
)

-- Conversations (grouped by contact number)
wa_conversations (
  id uuid PRIMARY KEY,
  contact_number text UNIQUE,
  contact_name text,          -- from WA profile or CRM
  lead_id uuid REFERENCES leads(id),
  assigned_to uuid REFERENCES users(id),
  last_message_at timestamptz,
  unread_count int DEFAULT 0,
  is_archived boolean DEFAULT false
)
```

### 5.6 Automated Reports via Baileys

Replaces WATI — same functionality, self-hosted:

```typescript
// BullMQ cron job: Daily report
reportQueue.add('daily-report', {}, {
  repeat: { cron: '0 19 * * *' }  // Every day at 7 PM
});

// Job processor
reportQueue.process('daily-report', async () => {
  const report = await generateDailyReport();  // DB queries
  const message = formatReportMessage(report); // Text + tables
  
  for (const recipient of await getReportRecipients()) {
    await baileysService.sendText(recipient.phone, message);
  }
});
```

---

## 6. User Roles & Permissions

| Role | Lead Access | Inbox Access | Reports | Settings |
|---|---|---|---|---|
| **Super Admin** | All | All conversations | All | Full (incl. user mgmt) |
| **Manager** | All | All conversations | All | Limited (no user mgmt) |
| **Sales Rep** | Own leads only | Own + unassigned | Own performance | None |
| **Frontdesk** | Own entries | None | None | None |

---

## 7. Database Schema (Complete)

```sql
-- Branches
branches (id, name, city, address)

-- Access control
allowed_users (id, email, role, branch_id, invited_by, invited_at, last_login_at, is_active)
user_profiles (id, email, name, avatar_url, allowed_user_id)

-- Leads
leads (
  id, name, phone, email, source, assigned_to, branch_id,
  status, priority, product_interest[], notes,
  next_follow_up, created_by, created_at, updated_at
)

-- Contacts
contacts (id, name, phone, email, address, company, lead_id, tags[])

-- Products
products (id, name, category, description, base_price, unit, variants jsonb, is_active)

-- Quotations
quotations (
  id, quote_number, lead_id, contact_id, created_by, status,
  line_items jsonb, subtotal, discount_amount, tax_rate, tax_amount, total,
  valid_until, terms, notes, pdf_url, version, parent_quote_id,
  shared_at, created_at, updated_at
)

-- Follow-ups
follow_ups (id, lead_id, scheduled_at, type, notes, status, created_by, completed_at)

-- Activities
activities (id, lead_id, type, description, performed_by, metadata jsonb, created_at)

-- WhatsApp
wa_sessions (id, phone_number, status, connected_at, disconnected_at, auth_data jsonb)
wa_messages (id, wa_message_id, direction, from_number, to_number, body, media_type, media_url, status, lead_id, contact_id, sent_by, is_automated, timestamp)
wa_conversations (id, contact_number, contact_name, lead_id, assigned_to, last_message_at, unread_count, is_archived)

-- Report config
report_configs (id, type, recipients[], send_time, send_day, is_active, last_sent_at)
```

---

## 8. API Endpoint Map

```
AUTH
  GET    /auth/session
  GET    /auth/signin/google    (handled by NextAuth)
  POST   /auth/signout

USERS (Super Admin only)
  GET    /users                 list allowed_users
  POST   /users                 add email + role (sends invite)
  PATCH  /users/:id             change role, deactivate
  DELETE /users/:id             revoke access

LEADS
  GET    /leads                 (filter, paginate, search)
  POST   /leads
  GET    /leads/:id
  PATCH  /leads/:id
  DELETE /leads/:id
  POST   /leads/:id/assign
  GET    /leads/:id/activities
  GET    /leads/:id/follow-ups
  GET    /leads/:id/quotations
  GET    /leads/:id/whatsapp    (conversation for this lead's number)

FOLLOW-UPS
  GET    /follow-ups            (today, upcoming, missed)
  POST   /follow-ups
  PATCH  /follow-ups/:id
  DELETE /follow-ups/:id

QUOTATIONS
  GET    /quotations
  POST   /quotations
  GET    /quotations/:id
  PATCH  /quotations/:id
  POST   /quotations/:id/send   { channel: whatsapp|email|pdf }
  POST   /quotations/:id/revise
  POST   /quotations/:id/approve
  GET    /quotations/:id/pdf
  GET    /q/:quoteNumber        (public share — no auth)

PRODUCTS
  GET|POST   /products
  PATCH|DELETE /products/:id

WHATSAPP
  GET    /whatsapp/status             current session status
  POST   /whatsapp/connect            trigger QR generation
  POST   /whatsapp/disconnect
  GET    /whatsapp/qr                 (SSE stream for QR updates)

INBOX
  GET    /inbox/conversations         (paginated, filterable)
  GET    /inbox/conversations/:id/messages
  POST   /inbox/conversations/:id/send  { body, media }
  POST   /inbox/conversations/:id/assign  { userId }
  PATCH  /inbox/conversations/:id/link    { leadId }
  POST   /inbox/conversations/:id/archive

REPORTS
  GET    /reports/dashboard
  GET    /reports/leads
  GET    /reports/reps
  GET    /reports/products
  GET    /reports/export

SETTINGS
  GET|PATCH  /settings                 company, branding, GST
  GET|PATCH  /settings/report-configs
```

---

## 9. Real-Time Events (Socket.io)

| Event | Direction | Payload | Use |
|---|---|---|---|
| `wa:status` | Server → Client | `{ status, phone }` | Update connection status indicator |
| `wa:qr` | Server → Client | `{ qr }` | Render QR code on connect screen |
| `inbox:new_message` | Server → Client | `{ message, conversation }` | Live inbox update |
| `inbox:status_update` | Server → Client | `{ messageId, status }` | Tick updates (sent/delivered/read) |
| `lead:updated` | Server → Client | `{ leadId, changes }` | Pipeline sync across tabs |
| `followup:due` | Server → Client | `{ followUp }` | In-app follow-up alert |

---

## 10. Folder Structure

```
yash-crm/
├── apps/
│   └── web/                         # Next.js 14
│       ├── app/
│       │   ├── (auth)/
│       │   │   └── login/           # Google login page
│       │   ├── (pwa)/               # Mobile-first for reps
│       │   │   ├── leads/
│       │   │   ├── follow-ups/
│       │   │   └── quotations/
│       │   ├── (dashboard)/         # Manager/admin
│       │   │   ├── leads/
│       │   │   ├── pipeline/
│       │   │   ├── inbox/           # WhatsApp Inbox
│       │   │   ├── quotations/
│       │   │   ├── reports/
│       │   │   └── settings/
│       │   │       └── team/        # User management
│       │   └── q/[quoteNumber]/     # Public quote view
│       └── public/sw.js
│
├── packages/
│   ├── api/                         # Fastify API
│   │   ├── src/
│   │   │   ├── routes/
│   │   │   ├── services/
│   │   │   ├── jobs/                # BullMQ crons
│   │   │   └── lib/
│   │   │       ├── pdf.ts
│   │   │       └── email.ts
│   │   └── prisma/schema.prisma
│   │
│   ├── baileys-service/             # Standalone WA process
│   │   ├── src/
│   │   │   ├── index.ts
│   │   │   ├── session.ts
│   │   │   ├── handlers/
│   │   │   │   ├── onMessage.ts
│   │   │   │   └── onStatusUpdate.ts
│   │   │   └── senders/
│   │   │       ├── sendText.ts
│   │   │       ├── sendMedia.ts
│   │   │       └── sendReport.ts
│   │   └── wa-auth/                 # Baileys auth state (gitignored)
│   │
│   └── shared/                      # Shared types + Zod schemas
│
└── docker-compose.yml               # Postgres + Redis + API + Baileys
```

---

## 11. Delivery Phases & Timeline

### Phase 1 — Foundation + Auth (Weeks 1–2)
- [ ] Monorepo setup: Next.js, Fastify, Prisma, Supabase
- [ ] Google OAuth via NextAuth — login page, session handling
- [ ] Super admin: add email + role → allowed_users
- [ ] Invite email via Resend on user add
- [ ] Access denied page (email not in allowed list)
- [ ] Role-based middleware on API routes
- [ ] Lead CRUD (web + PWA), follow-up creation, activity log
- [ ] PWA shell + offline mode (IndexedDB + background sync)

### Phase 2 — WhatsApp Engine (Weeks 3–4)
- [ ] Baileys service setup: session management, persistent auth state
- [ ] QR code generation → Socket.io → dashboard connect UI
- [ ] Connection status indicator (live, across all tabs)
- [ ] Inbound message handler → save to DB → emit to inbox
- [ ] WhatsApp Inbox UI: conversation list + chat window
- [ ] Send text + document (PDF) from inbox
- [ ] Auto-link conversation to lead by phone number
- [ ] Message status ticks (sent / delivered / read)
- [ ] Assign conversation to rep

### Phase 3 — Quotation Engine (Weeks 5–6)
- [ ] Product catalog management
- [ ] Quote builder: line items, pricing, discount, tax
- [ ] PDF generation with branded template
- [ ] Quote versioning + revisions
- [ ] Send quote: WhatsApp (via Baileys) | Email | PDF download
- [ ] Public share link (`/q/:quoteNumber`) with open tracking
- [ ] Lead-linked chat tab (WhatsApp thread inside lead profile)

### Phase 4 — CRM Pipeline + Manager View (Weeks 7–8)
- [ ] Kanban pipeline (drag-and-drop)
- [ ] Manager dashboard: team view, lead assignment, rep monitoring
- [ ] Advanced filters: date, source, rep, branch, product
- [ ] Stalled lead detection
- [ ] Lost reason capture + Won conversion
- [ ] Push notifications (Web Push): follow-up reminders + new lead assigned

### Phase 5 — Reports + Automated WA Reports (Weeks 9–10)
- [ ] Real-time dashboard (summary cards + charts)
- [ ] Rep performance, product-wise, source-wise reports
- [ ] CSV/PDF export
- [ ] BullMQ crons: daily / weekly / monthly report generation
- [ ] Send reports via Baileys to configured manager numbers
- [ ] Report config UI (toggle, time, recipients)

### Phase 6 — Polish + Launch (Week 11)
- [ ] UI/UX polish
- [ ] Lighthouse PWA audit (target > 85)
- [ ] End-to-end testing
- [ ] Deployment: Vercel + Railway (API + Baileys, persistent)
- [ ] Data import (leads CSV), user onboarding, training docs

**Total: ~11 Weeks**

---

## 12. Effort Estimate

| Phase | Dev Days |
|---|---|
| Phase 1 — Foundation + Auth | 10 days |
| Phase 2 — WhatsApp + Inbox | 12 days |
| Phase 3 — Quotation Engine | 10 days |
| Phase 4 — CRM Pipeline | 8 days |
| Phase 5 — Reports + Automation | 8 days |
| Phase 6 — Polish + Launch | 5 days |
| **Total** | **~53 dev days** |

> +10 days from v1 due to Baileys service complexity and Inbox module.
> Based on 1 senior full-stack developer. 2-dev team cuts timeline to ~7 weeks.

---

## 13. Key Technical Decisions & Notes

| # | Topic | Decision |
|---|---|---|
| 1 | WhatsApp | **Baileys** — self-hosted, no per-message cost, full inbox capability |
| 2 | Baileys hosting | Must be **persistent process** (Railway / VPS), NOT serverless |
| 3 | Baileys auth | `useMultiFileAuthState` → stored encrypted in Supabase or filesystem |
| 4 | WA account type | Works with **regular WhatsApp number** (no Business API needed) |
| 5 | Auth | **Google OAuth only** — no passwords. NextAuth.js handles it cleanly |
| 6 | User access | Super admin controls via email allowlist. Google verifies identity |
| 7 | Inbox assignment | Conversations assignable to reps. Manager sees all |
| 8 | QR delivery | Via **Socket.io SSE** — real-time QR refresh every ~20s until scan |
| 9 | Session recovery | Baileys restores from saved creds on restart — no re-scan on deploy |
| 10 | Media storage | All WA media (images, docs) downloaded and stored in Supabase Storage |
| 11 | Multi-branch | `branch_id` on all tables from day 1 |
| 12 | Rate limits | Baileys is unofficial — add message delays (1–2s) for bulk sends |

---

## 14. Risks & Mitigations

| Risk | Likelihood | Mitigation |
|---|---|---|
| WhatsApp bans Baileys session | Medium | Use a dedicated business number; avoid spam patterns; add message delays |
| Baileys API changes (upstream) | Low-Medium | Pin to stable version; monitor `@whiskeysockets/baileys` releases |
| Session drops on server restart | Low | Persistent auth state + health check cron to auto-reconnect |
| Google OAuth token expiry | Low | NextAuth handles refresh automatically |
| Inbox message volume at scale | Low-Medium | Paginate conversations; archive old threads; index `wa_messages` on number + timestamp |

---

## 15. Success Metrics

| Metric | Target |
|---|---|
| Lead entry time (mobile) | < 60 seconds |
| Quotation generated + sent via WA | < 3 minutes |
| WA inbox message delivery | < 3 seconds end-to-end |
| WhatsApp report delivery | 100% on schedule |
| PWA Lighthouse score | > 85 |
| Dashboard load time | < 2 seconds |
| Session uptime (Baileys) | > 99% with auto-reconnect |

---

*v2 — Updated with Baileys WhatsApp engine, full inbox, and Google OAuth access control.*