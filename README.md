# Yash CRM

A full-featured dealership CRM built with **Fastify**, **Prisma**, **Next.js 14**, and **PostgreSQL** (Supabase). Includes WhatsApp integration, quotation management, follow-up automation, and reporting.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 14 (App Router), React 18, TailwindCSS, Radix UI, Recharts |
| Backend | Fastify 4, Prisma ORM, Zod validation |
| Database | PostgreSQL (Supabase or local) |
| Queue | BullMQ + Redis (follow-up automation) |
| WhatsApp | Baileys (WhatsApp Web) + Socket.io |
| Auth | NextAuth (Google OAuth) |
| AI | OpenAI gpt-4o-mini (optional) |
| PDF | html2canvas + jsPDF (client), pdfkit (server fallback) |
| Monorepo | pnpm workspaces + Turborepo |
| CI/CD | GitHub Actions |

## Project Structure

```
yash_crm/
├── apps/
│   └── web/                    # Next.js 14 frontend (PWA)
│       ├── app/                # App Router pages
│       ├── components/ui/      # shadcn/ui components
│       └── lib/                # Hooks, utilities
│
├── packages/
│   ├── api/                    # Fastify API server (port 4000)
│   │   ├── src/
│   │   │   ├── routes/         # REST endpoints
│   │   │   ├── services/       # Business logic (PDF, activity, auto-followup)
│   │   │   ├── middleware/     # Auth & RBAC
│   │   │   ├── plugins/        # Fastify plugins
│   │   │   └── workers/        # BullMQ workers
│   │   └── prisma/
│   │       ├── schema.prisma   # Database schema (16 models)
│   │       ├── seed.ts         # Seeder entry point
│   │       └── seed-honda-products.ts  # Product catalog (40+ items)
│   │
│   ├── baileys-service/        # WhatsApp service (port 4001)
│   │   └── src/
│   │       ├── index.ts        # Socket.io + HTTP server
│   │       ├── handlers/       # Inbound message handling
│   │       └── senders/        # Outbound message sending
│   │
│   └── shared/                 # Shared types & Zod schemas
│
├── docker-compose.yml          # PostgreSQL + Redis
├── .env.example                # Environment variable template
├── turbo.json                  # Turborepo config
└── pnpm-workspace.yaml         # Monorepo workspace config
```

---

## Prerequisites

| Tool | Version | Purpose |
|------|---------|---------|
| Node.js | >= 20 | Runtime |
| pnpm | >= 9 | Package manager |
| Docker | Latest | PostgreSQL + Redis (or use hosted services) |
| Git | Latest | Version control |

---

## Setup (New Machine)

### Step 1: Clone & Install Dependencies

```bash
git clone <repo-url>
cd yash_crm
pnpm install
```

### Step 2: Start Infrastructure (PostgreSQL + Redis)

**Option A: Docker (recommended for local dev)**

```bash
docker compose up -d
```

This starts:
- **PostgreSQL 16** on port `5432` (user: `postgres`, password: `postgres`, db: `yash_crm`)
- **Redis 7** on port `6379`

**Option B: Use hosted services**

- **Database**: Use [Supabase](https://supabase.com) (free tier works) — get the Session Pooler connection string
- **Redis**: Use [Upstash](https://upstash.com) or [Redis Cloud](https://redis.com/cloud/)

### Step 3: Configure Environment Variables

```bash
# Copy template to root (used by Next.js and Baileys service)
cp .env.example .env

# Copy template to API package (used by Prisma and Fastify)
cp .env.example packages/api/.env
```

Edit both `.env` files:

```env
# ── Database ──────────────────────────────────────────────
# Local Docker:
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/yash_crm

# OR Supabase (use Session Pooler, not Direct):
# DATABASE_URL=postgresql://postgres.[ref]:[password]@aws-0-[region].pooler.supabase.com:5432/postgres

# ── Redis ─────────────────────────────────────────────────
REDIS_URL=redis://localhost:6379

# ── Google OAuth ──────────────────────────────────────────
# Create at: https://console.cloud.google.com/apis/credentials
# Authorized redirect URI: http://localhost:3000/api/auth/callback/google
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret

# ── NextAuth ──────────────────────────────────────────────
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=run-openssl-rand-base64-32

# ── Access Control ────────────────────────────────────────
# This email gets super_admin role on first login
SUPER_ADMIN_EMAIL=your-email@gmail.com

# ── API ───────────────────────────────────────────────────
API_PORT=4000
NEXT_PUBLIC_API_URL=http://localhost:4000

# ── WhatsApp (Baileys Service) ────────────────────────────
BAILEYS_PORT=4001
NEXT_PUBLIC_BAILEYS_URL=http://localhost:4001
BAILEYS_SERVICE_URL=http://localhost:4001

# ── Default country code for phone normalization ──────────
DEFAULT_COUNTRY_CODE=91

# ── Optional ──────────────────────────────────────────────
OPENAI_API_KEY=                  # Enables AI message generation
RESEND_API_KEY=                  # Enables email sending
```

> **Important**: Prisma reads `.env` from `packages/api/` (next to the `prisma/` folder). Make sure `DATABASE_URL` is set there.

### Step 4: Generate NextAuth Secret

```bash
openssl rand -base64 32
```

Paste the output as `NEXTAUTH_SECRET` in both `.env` files.

### Step 5: Setup Database

```bash
cd packages/api

# Generate Prisma client
npx prisma generate

# Push schema to database (creates all tables)
npx prisma db push

# Go back to root
cd ../..
```

> **Note**: Use `db push` for Supabase (doesn't require a shadow database). Use `npx prisma migrate dev` for local PostgreSQL if you want migration history.

### Step 6: Seed Database

```bash
cd packages/api
npx prisma db seed
cd ../..
```

This creates:
- **Main branch** ("Main Branch", Mumbai)
- **Super admin user** (using `SUPER_ADMIN_EMAIL` from `.env`)
- **40+ Honda 2-wheeler products** with full specs, images, color variants, trims, and features (EVs, scooters, motorcycles)

### Step 7: Generate Prisma Client for Baileys Service

The Baileys service shares the same Prisma schema but needs its own generated client:

```bash
cd packages/baileys-service
pnpm db:generate
cd ../..
```

### Step 8: Start Development Servers

```bash
pnpm dev
```

This starts all 3 services via Turborepo:

| Service | Port | URL |
|---------|------|-----|
| Next.js (Web) | 3000 | http://localhost:3000 |
| Fastify (API) | 4000 | http://localhost:4000 |
| Baileys (WhatsApp) | 4001 | http://localhost:4001 |

### Step 9: First Login

1. Open http://localhost:3000
2. Click "Sign in with Google"
3. Sign in with the email you set as `SUPER_ADMIN_EMAIL`
4. You'll be logged in as **Super Admin** with full access

---

## Quick Setup (Copy-Paste)

For those who want the fastest path:

```bash
# Clone and install
git clone <repo-url> && cd yash_crm
pnpm install

# Start DB + Redis
docker compose up -d

# Setup env
cp .env.example .env
cp .env.example packages/api/.env
# Edit .env files with your Google OAuth credentials and SUPER_ADMIN_EMAIL

# Database
cd packages/api
npx prisma generate
npx prisma db push
npx prisma db seed
cd ../..

# Baileys Prisma client
cd packages/baileys-service && pnpm db:generate && cd ../..

# Start everything
pnpm dev
```

---

## Available Scripts

### Root (runs across all packages via Turborepo)

| Command | Description |
|---------|-------------|
| `pnpm dev` | Start all dev servers (web + api + baileys) |
| `pnpm build` | Production build all packages |
| `pnpm lint` | ESLint across monorepo |
| `pnpm type-check` | TypeScript validation across all packages |
| `pnpm format` | Prettier formatting |

### API Package (`packages/api/`)

| Command | Description |
|---------|-------------|
| `pnpm dev` | Start API server with hot reload |
| `pnpm build` | Compile TypeScript to `dist/` |
| `pnpm db:generate` | Generate Prisma client |
| `pnpm db:push` | Push schema to DB (no migrations) |
| `pnpm db:migrate` | Run Prisma migrations |
| `pnpm db:seed` | Seed database (branch + admin + products) |

### Baileys Service (`packages/baileys-service/`)

| Command | Description |
|---------|-------------|
| `pnpm dev` | Start WhatsApp service with hot reload |
| `pnpm db:generate` | Generate Prisma client (uses shared schema) |

### Web App (`apps/web/`)

| Command | Description |
|---------|-------------|
| `pnpm dev` | Start Next.js dev server |
| `pnpm build` | Production build |
| `pnpm start` | Start production server |

### Prisma Utilities (run from `packages/api/`)

```bash
npx prisma studio             # Visual database browser (opens in browser)
npx prisma db pull             # Pull existing DB schema into schema.prisma
npx prisma format              # Format schema.prisma
npx prisma migrate reset       # Reset DB and re-seed (DESTRUCTIVE)
```

---

## Database Schema

16 models across lead management, messaging, automation, and products:

```
Branch ──< AllowedUser ──< UserProfile
              │
Lead ──< Contact
  │──< Quotation
  │──< FollowUp
  │──< Activity
  │──< WaMessage
  │──< WaConversation
  │──< AutoFollowUpLog

Product (standalone catalog)
WaSession (WhatsApp connection state)
FollowUpRule ──< AutoFollowUpLog
QuoteTemplate (saved quotation templates)
```

### Key Enums

- **Roles**: `super_admin`, `manager`, `sales_rep`, `frontdesk`
- **Lead Status**: `new` > `contacted` > `qualified` > `proposal_sent` > `negotiation` > `won`/`lost`
- **Lead Priority**: `low`, `medium`, `high`, `urgent`
- **Quotation Status**: `draft` > `sent` > `accepted`/`rejected`/`expired`/`revised`

---

## Features

### Lead Management
- Create, update, assign, and track leads through pipeline stages
- Multi-branch support with role-based data scoping
- Activity timeline with notes, status changes, and follow-ups
- Auto-link WhatsApp conversations to leads by phone number

### WhatsApp Integration (Baileys)
- QR code scanning to connect WhatsApp Web
- Send/receive messages from CRM inbox
- Send quotation PDFs via WhatsApp
- Auto-send welcome message on lead creation
- Real-time message updates via Socket.io
- LID (Linked Identity) resolution for incoming messages

### Quotations
- Create quotations with product line items, discounts, and taxes
- Auto-numbering (`YC-2026-0001`, `YC-2026-0002`, ...)
- Client-side PDF generation (captures the exact UI design)
- Server-side PDF fallback (pdfkit)
- Send via WhatsApp as PDF document
- Public share link (`/q/:quoteNumber`)
- Revision tracking with version history

### Follow-ups & Automation
- Schedule follow-ups (call, email, WhatsApp, visit, meeting)
- BullMQ worker processes automation rules
- Triggers: lead created, status changed
- Actions: create follow-up, send WhatsApp, send email
- Configurable delay and message templates with variables

### Reports & Analytics
- Dashboard overview with KPI cards
- Lead trends, pipeline funnel, conversion rates
- Revenue tracking, quotation analysis
- Team performance comparison
- Date range presets + CSV export

### Team Management
- Role-based access control (RBAC)
- Invite users via email (Google OAuth)
- Data scoping: `sales_rep` sees only assigned leads

---

## API Endpoints

### Leads
```
GET    /leads                    # List (paginated, filterable)
POST   /leads                    # Create (auto-sends WhatsApp welcome)
GET    /leads/:id                # Detail with contacts, quotations, follow-ups
PATCH  /leads/:id                # Update
DELETE /leads/:id                # Delete (super_admin/manager only)
POST   /leads/:id/assign         # Assign to team member
GET    /leads/:id/activities      # Activity timeline
POST   /leads/:id/notes           # Add note
```

### Quotations
```
GET    /quotations               # List
POST   /quotations               # Create
GET    /quotations/:id           # Detail
PATCH  /quotations/:id           # Update
POST   /quotations/:id/send      # Send via WhatsApp/email
POST   /quotations/:id/revise    # Create revision
GET    /q/:quoteNumber           # Public share (no auth)
```

### Inbox (WhatsApp)
```
GET    /inbox/conversations               # List conversations
GET    /inbox/conversations/:id/messages  # Messages for conversation
POST   /inbox/conversations/:id/send      # Send message
POST   /inbox/conversations/:id/assign    # Assign conversation
PATCH  /inbox/conversations/:id/link      # Link to lead
GET    /inbox/by-lead/:leadId             # Messages for a lead
```

### Follow-ups
```
GET    /follow-ups               # List (today/upcoming/overdue)
POST   /follow-ups               # Schedule
PATCH  /follow-ups/:id           # Update
POST   /follow-ups/:id/complete  # Mark complete
```

### Automation
```
GET    /automation/rules         # List rules
POST   /automation/rules         # Create rule
PATCH  /automation/rules/:id     # Update
DELETE /automation/rules/:id     # Delete
PATCH  /automation/rules/:id/toggle  # Enable/disable
```

### Other
```
GET    /health                   # API health check
GET    /users                    # Team members
POST   /users/invite             # Invite user
GET    /products                 # Product catalog
GET    /reports/*                # Dashboard, pipeline, revenue, team reports
GET    /ai/status                # OpenAI availability
POST   /ai/generate-message      # Generate AI message
GET    /whatsapp/status          # WhatsApp connection status
GET    /quote-templates          # Saved quotation templates
```

### Baileys Service (port 4001)
```
GET    /health                   # Connection status
POST   /api/send/text            # Send text message { to, text }
POST   /api/send/document        # Send document { to, document (base64), filename, caption, mimeType }
```

---

## Environment Variables Reference

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `DATABASE_URL` | Yes | - | PostgreSQL connection string |
| `REDIS_URL` | Yes | `redis://localhost:6379` | Redis for BullMQ |
| `GOOGLE_CLIENT_ID` | Yes | - | Google OAuth client ID |
| `GOOGLE_CLIENT_SECRET` | Yes | - | Google OAuth client secret |
| `NEXTAUTH_URL` | Yes | `http://localhost:3000` | App URL for auth callbacks |
| `NEXTAUTH_SECRET` | Yes | - | Random secret for JWT signing |
| `SUPER_ADMIN_EMAIL` | Yes | - | Email that gets super_admin role |
| `API_PORT` | No | `4000` | Fastify API port |
| `NEXT_PUBLIC_API_URL` | No | `http://localhost:4000` | API URL for frontend (browser-accessible) |
| `BAILEYS_PORT` | No | `4001` | WhatsApp service port |
| `NEXT_PUBLIC_BAILEYS_URL` | No | `http://localhost:4001` | Baileys URL (browser-accessible) |
| `BAILEYS_SERVICE_URL` | No | `http://localhost:4001` | Baileys URL (server-to-server) |
| `BAILEYS_API_KEY` | No | - | Optional API key to protect Baileys HTTP endpoints (`/api/send/*`) |
| `WA_AUTH_DIR` | No | `./wa-auth` | Directory for storing WhatsApp auth state (use a persistent volume in production) |
| `DEFAULT_COUNTRY_CODE` | No | `91` | Country code for phone normalization |
| `OPENAI_API_KEY` | No | - | Enables AI message generation |
| `RESEND_API_KEY` | No | - | Enables email sending |

---

## Google OAuth Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com/apis/credentials)
2. Create a new project (or select existing)
3. Go to **APIs & Services > Credentials**
4. Click **Create Credentials > OAuth client ID**
5. Application type: **Web application**
6. Authorized JavaScript origins: `http://localhost:3000`
7. Authorized redirect URIs: `http://localhost:3000/api/auth/callback/google`
8. Copy **Client ID** and **Client Secret** to your `.env` files

---

## Supabase Setup (if not using Docker)

1. Create a project at [supabase.com](https://supabase.com)
2. Go to **Settings > Database > Connection String**
3. Select **Type: URI**, **Method: Session Pooler** (not Direct)
4. Copy the connection string as `DATABASE_URL`
5. Replace `[YOUR-PASSWORD]` with your database password

> Direct connections on port 5432 may fail on IPv4-only networks. Session Pooler works everywhere.

---

## WhatsApp Setup

1. Start all services: `pnpm dev`
2. Go to **Settings > WhatsApp** in the CRM
3. Click **Connect** — a QR code will appear
4. Open WhatsApp on your phone > **Linked Devices** > **Link a Device**
5. Scan the QR code
6. Status will change to "Connected"

The WhatsApp session persists in `packages/baileys-service/wa-auth/`. Delete this folder to reset the session.

---

## Troubleshooting

### Database connection fails
- Check `DATABASE_URL` in `packages/api/.env`
- For Docker: ensure `docker compose up -d` is running
- For Supabase: use Session Pooler URL, not Direct

### Prisma client not found
- Run `npx prisma generate` in `packages/api/`
- For Baileys service: run `pnpm db:generate` in `packages/baileys-service/`

### Google OAuth callback error
- Verify redirect URI exactly matches: `http://localhost:3000/api/auth/callback/google`
- Check `NEXTAUTH_URL` is `http://localhost:3000`

### WhatsApp QR code not appearing
- Check Baileys service is running on port 4001
- Check browser console for Socket.io connection errors
- Verify `NEXT_PUBLIC_BAILEYS_URL` is set in root `.env`

### Redis connection refused
- Start Redis: `docker compose up -d redis`
- Or install locally: `brew install redis && brew services start redis`

### Port already in use
- Kill existing processes: `lsof -ti:3000 | xargs kill` (replace 3000 with the port)

---

## Production Deployment

```bash
# Build all packages
pnpm build

# Start production servers
cd apps/web && pnpm start          # Next.js on port 3000
cd packages/api && pnpm start      # Fastify on port 4000
cd packages/baileys-service && pnpm start  # Baileys (WhatsApp service) on port 4001
```

For production, use a process manager like **PM2** or deploy as containers.

### Deploying the Web App on Vercel

If you deploy only `apps/web` to Vercel, you must deploy the Fastify API (`packages/api`) and the WhatsApp service (`packages/baileys-service`) separately (any Node host/VPS). Then set these in Vercel and redeploy:

- `NEXT_PUBLIC_API_URL` → your API origin
- `NEXT_PUBLIC_BAILEYS_URL` → your Baileys service origin
