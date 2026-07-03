# hapuk.io — Invoice Generator & Management SaaS

A multi-tenant SaaS for generating, managing, signing, and exporting invoices.
Users register, create an **organization**, create **projects** (one per client/engagement),
and manage **invoices** inside those projects. Invoices are generated from structured data +
pre-made templates, can carry a signature, and export to pixel-perfect PDF.

> This README is the source of truth for working on this project with Claude Code.
> Keep it up to date. Architectural decisions and conventions live here.

---

## Table of contents

1. [Product overview](#product-overview)
2. [Core concepts & the sender/receiver mapping](#core-concepts--the-senderreceiver-mapping)
3. [Tech stack](#tech-stack)
4. [Multi-tenancy model](#multi-tenancy-model)
5. [Organization members & roles](#organization-members--roles) ← *proposed design*
6. [Data model](#data-model)
7. [Invoice numbering](#invoice-numbering)
8. [Invoice status lifecycle](#invoice-status-lifecycle)
9. [Templates & PDF generation](#templates--pdf-generation)
10. [Signatures](#signatures)
11. [Auth](#auth)
12. [Project structure](#project-structure)
13. [Environment variables](#environment-variables)
14. [Local development](#local-development)
15. [Conventions for Claude Code](#conventions-for-claude-code)
16. [Implementation roadmap](#implementation-roadmap)
17. [Glossary](#glossary)

---

## Product overview

**Primary user flow**

1. User **registers** and verifies their email.
2. User **creates an organization** (their own business entity — this becomes the invoice **receiver**).
3. User fills in **organization info** used to populate invoice **"receiver"** fields, and sets up
   an **organization signature**.
4. User **creates a project** (one per client/engagement — this becomes the invoice **sender**).
5. User fills in **project info** used to populate invoice **"sender"** fields, sets a project
   **default rate** and **default invoice data**, and defines the **services** available in that project.
6. User **creates invoices** inside the project. Each new invoice:
   - gets an **auto-incremented number** scoped to that project,
   - is prefilled from project defaults (sender, currency, rate, terms) and org defaults (receiver, signature),
   - has line items chosen from the project's services (each service has its own rate, defaulting to the project rate),
   - can be assigned a **status** (waiting / paid / unpaid),
   - can be **exported as a PDF** with the organization signature applied.

**Feature checklist**

- [ ] Full auth: register, login, restore password, email verification, profile management
- [ ] Organizations (multi-tenant) with members & roles
- [ ] Organization invoice-receiver defaults + signature
- [ ] Projects with sender defaults, default rate, default invoice data
- [ ] Per-project service catalog with per-service rates
- [ ] Invoices with per-project auto-incremented numbers
- [ ] Invoice line items sourced from services
- [ ] Invoice statuses (waiting / paid / unpaid)
- [ ] Pre-made invoice templates
- [ ] PDF export (pixel-perfect, headless Chromium)
- [ ] Signature applied to generated invoices

---

## Core concepts & the sender/receiver mapping

> ⚠️ **This mapping is intentional and easy to get backwards. Read carefully.**

The sample invoice (`#016`) has two parties:

| Invoice field | Real-world party in sample | Maps to entity in this app |
| ------------- | -------------------------- | -------------------------- |
| **Sender**    | `ANDREW H BLANCHARD` (the client) | **Project** |
| **Receiver**  | `Hapuk Oleh Volodymyrovych` (the freelancer, holds the signature) | **Organization** |

So in hapuk.io:

- An **Organization** = *the user's own business entity*. It provides the **receiver** block on every
  invoice and owns the **signature**. Its data is constant across all the user's invoices.
- A **Project** = *a specific client/engagement* (e.g. "Biltmore", "BZLY"). It provides the **sender**
  block, groups the invoices for that client, and holds per-project defaults (currency, rate, terms, services).
- An **Invoice** belongs to exactly one project (and transitively one organization). At creation it
  **snapshots** the sender/receiver/signature/service data so later edits to the org or project never
  mutate historical invoices.

**Data flow for a new invoice**

```
Organization  ──(receiver defaults + signature)──┐
                                                  ├──▶  Invoice (snapshotted)
Project       ──(sender defaults + rate + terms)──┤
   └─ Services ──(line items with per-service rate)┘
```

---

## Tech stack

| Layer            | Choice                                   | Notes |
| ---------------- | ---------------------------------------- | ----- |
| Framework        | **Next.js 16** (App Router, RSC)          | Already scaffolded |
| Language         | **TypeScript**                            | Strict |
| UI               | **React 19**, **Tailwind CSS v4**, **shadcn/ui** (zinc, `radix-rhea`) | Already scaffolded; icons via `lucide-react` |
| Database         | **PostgreSQL**                            | |
| ORM              | **Drizzle ORM** + `drizzle-kit`           | SQL-first, type-safe migrations |
| Auth             | **Better Auth** + Organization plugin     | Handles orgs, members, roles, invitations, password reset |
| PDF              | **Playwright** (headless Chromium)        | Render the real HTML/Tailwind template → PDF |
| Validation       | **Zod**                                   | Shared schemas for forms + server actions |
| Forms            | **react-hook-form** + `@hookform/resolvers` | |
| Server logic     | **Next.js Server Actions** + a data-access layer | |
| Package manager  | **pnpm**                                  | |
| File storage     | **S3** (signatures & PDFs) via presigned uploads | AWS SDK v3 |
| Email            | **Resend**                                | Verification, reset, invitations |

> Dependencies for Drizzle, Better Auth, Playwright, Zod, react-hook-form etc. are **not yet installed** —
> this document is the plan. See [Implementation roadmap](#implementation-roadmap).

---

## Multi-tenancy model

**Shared database, shared schema, row-level scoping by `organizationId`.**

- Every tenant-owned table carries an `organization_id` FK.
- The active organization lives on the Better Auth **session** (`session.activeOrganizationId`).
- **All** data access goes through a data-access layer (`src/server/db/queries/*`) that requires an
  `organizationId` and asserts the current member belongs to it. Never query tenant tables without it.
- No cross-org reads. A user switching orgs re-scopes every query.

**Golden rule for Claude Code:** if you write a query against a tenant table without filtering by the
active `organizationId`, that is a bug. Prefer helpers like `getActiveOrg()` that throw when no org is active.

---

## Organization members & roles

> This is my **proposed design** for the members/roles feature you were unsure about.
> It uses Better Auth's Organization plugin, which already models members, roles, and email invitations.

### Recommendation: start with 3 roles, keep them coarse

| Role      | Intended for            | Capabilities |
| --------- | ----------------------- | ------------ |
| **Owner** | Whoever created the org | Everything, incl. billing, deleting the org, transferring ownership, managing all members. Exactly **one** owner (transferable). |
| **Admin** | Trusted operators       | Manage projects, services, invoices, templates, org profile & signature; invite/remove **members** (not owners/admins); cannot delete the org or change billing. |
| **Member**| Day-to-day users        | Create/edit invoices and manage services **within projects they can access**; cannot manage members, org settings, or billing. |

Optionally add **Viewer** (read-only) later if clients/accountants need read access — don't build it in v1.

### Why this shape

- It maps 1:1 onto Better Auth's default `owner` / `admin` / `member` roles, so you get invitations,
  role changes, and access checks for free.
- Coarse roles are enough for an invoicing tool; fine-grained per-project permissions add a lot of
  complexity for little early value. **Project-scoped access** (which member can see which project) can
  be layered on later via a `project_member` join table — noted in the data model but not required for v1.

### v1 decision

Ship **Owner / Admin / Member**, org-wide (a member can see all projects in the org). Defer per-project
access control and Viewer until there's a real need.

---

## Data model

Postgres + Drizzle. Below is the intended schema. **Better Auth generates its own core + org tables**
(`user`, `session`, `account`, `verification`, `organization`, `member`, `invitation`) via its CLI —
do not hand-write those; extend them with `additionalFields` where noted.

### Better Auth core (generated)

- `user` — id, name, email, emailVerified, image, createdAt, updatedAt
- `session` — id, userId, token, expiresAt, ipAddress, userAgent, **activeOrganizationId**
- `account` — provider/credential accounts (holds password hash for email/password)
- `verification` — email verification & password-reset tokens

### Organization (generated by org plugin, extended)

`organization`
- `id`, `name`, `slug`, `logo`, `metadata`, `createdAt` (from plugin)
- **additional fields (invoice receiver defaults):**
  - `receiverName` (text)
  - `receiverAddress` (text)
  - `receiverTaxId` (text)
  - `receiverPhone` (text)
  - `receiverEmail` (text)
  - `signatureImageUrl` (text, nullable) — see [Signatures](#signatures)
  - `signatureLabel` (text, nullable) — e.g. printed name under the signature

`member` — id, organizationId, userId, `role` (`owner|admin|member`), createdAt
`invitation` — id, organizationId, email, role, status, expiresAt, inviterId

### Domain tables (hand-written Drizzle)

```
project
  id                uuid pk
  organizationId    uuid  fk -> organization.id   (indexed, NOT NULL)
  name              text  NOT NULL
  slug              text  NOT NULL                 (unique per org)
  description       text
  -- sender defaults (the client on invoices):
  senderName        text
  senderAddress     text
  senderTaxId       text
  senderPhone       text
  senderEmail       text
  -- invoice defaults:
  currency          text  NOT NULL default 'USD'
  defaultRate       numeric(12,2)                  -- default for line items / new services
  defaultNotes      text                           -- default terms/footer text
  defaultDueDays    integer default 30             -- due date = issueDate + N days
  templateId        uuid  fk -> invoice_template.id (nullable -> use org/system default)
  invoiceCounter    integer NOT NULL default 0     -- last used invoice number (see numbering)
  createdAt         timestamptz default now()
  updatedAt         timestamptz
  unique (organizationId, slug)

service
  id                uuid pk
  projectId         uuid  fk -> project.id          (indexed, NOT NULL)
  organizationId    uuid  fk -> organization.id     (denormalized for scoping)
  name              text  NOT NULL                  -- e.g. "Computer Programming Services"
  description       text
  rate              numeric(12,2)                    -- per-service rate; NULL -> fall back to project.defaultRate
  unit              text  NOT NULL default 'h'       -- hour by default
  isActive          boolean default true
  createdAt         timestamptz default now()

invoice
  id                uuid pk
  organizationId    uuid  fk -> organization.id      (indexed, NOT NULL)
  projectId         uuid  fk -> project.id           (indexed, NOT NULL)
  number            integer                          -- NULL until finalized; auto-incremented per project
  status            invoice_status NOT NULL default 'draft'
  finalizedAt       timestamptz                      -- set when moved out of draft (numbering fires here)
  issueDate         date NOT NULL
  dueDate           date NOT NULL
  currency          text NOT NULL
  subtotal          numeric(12,2) NOT NULL
  total             numeric(12,2) NOT NULL
  notes             text                             -- terms/footer, snapshotted from project.defaultNotes
  -- immutable snapshots so historical invoices never change when org/project are edited:
  senderSnapshot    jsonb NOT NULL                   -- {name,address,taxId,phone,email}
  receiverSnapshot  jsonb NOT NULL                   -- {name,address,taxId,phone,email}
  signatureSnapshot jsonb                            -- {imageUrl,label} at time of finalize
  templateKey       text NOT NULL                    -- which template rendered it
  pdfUrl            text                             -- cached exported PDF (nullable until exported)
  createdAt         timestamptz default now()
  updatedAt         timestamptz
  unique (projectId, number)   -- number is NULL for drafts; unique allows multiple NULLs in Postgres

invoice_item
  id                uuid pk
  invoiceId         uuid  fk -> invoice.id            (indexed, NOT NULL, ON DELETE CASCADE)
  serviceId         uuid  fk -> service.id            (nullable — service may be edited/deleted later)
  description       text  NOT NULL                    -- snapshotted service name/description
  qty               numeric(12,2) NOT NULL            -- Qty(h)
  rate              numeric(12,2) NOT NULL            -- snapshotted rate used
  lineTotal         numeric(12,2) NOT NULL            -- qty * rate
  position          integer NOT NULL default 0        -- ordering

invoice_template
  id                uuid pk
  organizationId    uuid  fk -> organization.id        (nullable => system/global template)
  name              text  NOT NULL
  key               text  NOT NULL                      -- maps to a React component in the template registry
  config            jsonb                               -- optional per-template settings (colors, footer, etc.)
  isDefault         boolean default false
  createdAt         timestamptz default now()

-- enum
invoice_status = ('draft', 'waiting', 'paid', 'unpaid')   -- draft = unfinalized/unnumbered; see lifecycle

-- OPTIONAL, deferred (per-project access control):
project_member
  projectId, memberId   -- only if/when you move beyond org-wide access
```

**Key modeling decisions**

- **Snapshots on invoices.** Sender/receiver/signature/line-item data is copied onto the invoice at
  creation/finalize. Editing an org profile or a service later must not silently rewrite past invoices.
- **`organizationId` denormalized** onto `service` and `invoice` for fast, safe tenant scoping without joins.
- **Money as `numeric(12,2)`**, not floats. Do arithmetic in integer cents in app code if you prefer;
  never use JS `number` floats for currency.
- **`serviceId` nullable** on items so services can be deactivated/deleted without breaking history.
- **Auth IDs are TEXT.** Better Auth uses text ids for `user`/`organization`/etc., so every
  `organizationId`/`userId` FK on domain tables is a `text` column, while domain PKs are `uuid`.

---

## Invoice numbering

**Requirement:** each finalized invoice in a project has an auto-incremented number (sample shows `#016`).

**Numbering fires on finalize, not on create.** Drafts have `number = NULL`. When an invoice moves out of
`draft`, a per-project counter is allocated inside a transaction to avoid races.

```
-- on finalize:
BEGIN;
  UPDATE project
     SET invoice_counter = invoice_counter + 1
   WHERE id = $projectId AND organization_id = $orgId
  RETURNING invoice_counter;              -- this value is the new invoice.number
  UPDATE invoice
     SET number = $returnedCounter, status = 'waiting', finalized_at = now()
   WHERE id = $invoiceId AND status = 'draft';
COMMIT;
```

- Use a single transaction so concurrent finalizes can't collide. The `UPDATE ... RETURNING` locks the
  project row.
- `unique (projectId, number)` is a safety net.
- Numbers are **per project**, not per organization. (If you later want per-org numbering, move the
  counter to `organization` — decide before launch; changing it after invoices exist is painful.)
- Display formatting (`#016`, zero-padding, prefixes like `INV-`) is a **presentation** concern — store the
  raw integer, format in the template. Consider a `numberFormat` field on project if clients need custom prefixes.

---

## Invoice status lifecycle

Statuses: **`draft`**, **`waiting`**, **`paid`**, **`unpaid`**.

Semantics:

- **`draft`** — being composed; **no number yet**; freely editable. *(default on create)*
- **`waiting`** — finalized/sent, awaiting payment, not yet past due. Number is assigned on the
  `draft → waiting` transition (the **finalize** step; see [Invoice numbering](#invoice-numbering)).
- **`unpaid`** — overdue (past `dueDate`) or explicitly marked unpaid.
- **`paid`** — settled.

`draft` is the only editable state; once finalized, the invoice snapshots its data and gets a number.
Non-draft transitions (`waiting ↔ unpaid ↔ paid`) are manual. Optionally, a scheduled job can auto-flip
`waiting → unpaid` when `dueDate` passes.

---

## Templates & PDF generation

**Templates** are React components rendered with the invoice's snapshotted data. They are used for
**both** the on-screen preview and the PDF, so what you see is what you export.

- Live in `src/templates/` with a **registry** mapping `templateKey` → component
  (e.g. `classic` → `<ClassicTemplate/>`). `invoice.templateKey` and `invoice_template.key` reference these.
- v1 ships one template, **`classic`**, reproducing the sample layout: header `INVOICE / #NNN`,
  Issued/Due, Sender & Receiver blocks, a services table (`Service | Qty(h) | Rate | Line total`),
  Subtotal/Total/Amount due, the standard terms paragraph, and signature lines at the bottom.

**PDF generation (Playwright / headless Chromium)**

1. A dedicated route renders the invoice template as a standalone, print-optimized HTML page
   (e.g. `/print/invoice/[id]` — no app chrome, print CSS, embedded fonts).
2. A server action / route handler launches Playwright, navigates to that page (authenticated,
   scoped to the active org), and calls `page.pdf({ format: 'A4', printBackground: true })`.
3. The resulting PDF is streamed to the user and/or uploaded to storage; cache the URL on `invoice.pdfUrl`.

Notes:
- Playwright needs a Node runtime (not Edge). Keep the PDF route on the Node runtime.
- For deployment, ensure the Chromium binary is available (locally `pnpm exec playwright install chromium`;
  in Docker/serverless use an image that bundles it, or `@sparticuz/chromium` on Lambda-style hosts).
- Embed fonts and inline critical CSS for deterministic output.

---

## Signatures

- Set at the **organization** level (the receiver signs, per the sample).
- Capture options: upload an image (PNG with transparency), or draw on a canvas
  (e.g. `react-signature-canvas`) and store as PNG.
- Store the file in object storage; keep the URL on `organization.signatureImageUrl` and a printed name in
  `organization.signatureLabel`.
- On invoice finalize, **snapshot** `{imageUrl, label}` into `invoice.signatureSnapshot` so re-uploading a
  new signature never alters past invoices.
- The template renders the signature image above the "(Receiver)" line.

> **Storage: S3** via presigned uploads (AWS SDK v3). The browser uploads directly to S3 with a
> short-lived presigned URL; the app stores only the resulting object key/URL.
>
> **Local dev uses MinIO** (S3-compatible) from `docker-compose.dev.yml` — API on `:9002`, web
> console on `:9003` (`minioadmin` / `minioadmin`), bucket `hapuk-uploads` auto-created with public
> `download` access. When `S3_ENDPOINT` is set (MinIO/R2), construct the S3 client with
> `forcePathStyle: true`; leave it unset for real AWS S3.

---

## Auth

**Better Auth**, self-hosted, with the **Organization plugin**.

- **Email/password** with email verification and **password reset** (Better Auth built-ins).
- **Profile management** — update name, email, avatar, password.
- **Sessions** carry `activeOrganizationId`; org switching updates it.
- **Organization plugin** provides create-org, members, roles (`owner|admin|member`), and email invitations.
- Email delivery (verification, reset, invites) needs a transactional provider (Resend/Postmark/SES) —
  wire a single `sendEmail()` adapter.

Route protection: `src/proxy.ts` (Next 16's `middleware` replacement) optimistically gates the app
routes by session-cookie presence; the `(app)` layout enforces it server-side via `requireUser()`, and
server actions re-check session + membership + role. **Never trust the client for org scoping or roles.**

---

## Project structure

Proposed layout (App Router). Create as you implement each phase.

```
src/
  app/
    (marketing)/            # public landing, pricing
    (auth)/                 # login, register, forgot/reset password
      login/
      register/
      forgot-password/
      reset-password/
    (app)/                  # authenticated app, org-scoped
      layout.tsx            # requires session + active org
      dashboard/
      organizations/
        settings/           # org profile (receiver defaults), signature, members
      projects/
        [projectId]/
          settings/         # sender defaults, rate, services, default invoice data
          services/
          invoices/
            [invoiceId]/
    print/
      invoice/[id]/         # bare print-optimized page for Playwright
    api/
      auth/[...all]/        # Better Auth handler
  components/
    ui/                     # shadcn/ui primitives
  templates/                # invoice templates + registry (classic, ...)
  server/
    auth/                   # better-auth config + client
    db/
      schema/               # drizzle table definitions
      queries/              # data-access layer (all org-scoped)
      index.ts              # drizzle client
    actions/                # server actions grouped by domain
    pdf/                    # playwright render helpers
  lib/                      # utils, zod schemas, formatting (money, dates)
drizzle/                    # generated migrations
```

---

## Environment variables

Create `.env.local` (see `.env.example`, to be added):

```
# Database
DATABASE_URL=postgres://postgres:postgres@localhost:5433/hapuk   # 5433 (compose maps it) to avoid clashing with other local Postgres on 5432

# Better Auth
BETTER_AUTH_SECRET=            # openssl rand -base64 32
BETTER_AUTH_URL=http://localhost:3000

# Email (Resend)
RESEND_API_KEY=
EMAIL_FROM=invoices@hapuk.io

# File storage (S3 — signatures & PDFs)
AWS_REGION=eu-central-1
S3_BUCKET=hapuk-uploads
AWS_ACCESS_KEY_ID=
AWS_SECRET_ACCESS_KEY=
# S3_ENDPOINT=                 # optional: set for S3-compatible providers (R2/MinIO)
```

---

## Local development

> Some of these commands assume dependencies/config not yet installed. They become valid as phases land.

```bash
cp .env.example .env           # fill in DATABASE_URL etc. (.env is read by both Next and drizzle-kit)
pnpm install
pnpm dev                       # Next.js dev server → http://localhost:3000

# Database (Drizzle)
pnpm db:generate               # create migration SQL from schema (no DB needed)
pnpm db:migrate                # apply migrations to DATABASE_URL
pnpm db:push                   # push schema directly (fast local iteration)
pnpm db:studio                 # inspect DB in a browser

# Better Auth — regenerate the expected auth schema to ./src/server/db/schema/auth.generated.ts,
# then diff against the hand-maintained auth.ts and reconcile.
pnpm auth:generate

# PDF (added in Phase 5)
# pnpm add playwright && pnpm exec playwright install chromium

pnpm lint
pnpm build
```

A local Postgres via Docker Compose is the simplest path (credentials match the default
`DATABASE_URL` in `.env.example`):

```bash
docker compose -f docker-compose.dev.yml up -d    # Postgres 16 (:5433) + MinIO (:9002 API, :9003 console)
docker compose -f docker-compose.dev.yml down     # stop (add -v to also wipe data)
```

Then apply the initial migration: `pnpm db:migrate`.

---

## Conventions for Claude Code

- **Tenant scoping is mandatory.** Every tenant-table query filters by the active `organizationId` and
  checks membership. Route through `src/server/db/queries/*`; don't inline raw tenant queries in components.
- **Roles are enforced server-side.** Check role in server actions, not just in the UI.
- **Money is `numeric`/integer cents**, never a float. Centralize formatting in `src/lib/money.ts`.
- **Invoices snapshot their data** at finalize. Do not render invoices by re-reading live org/project rows.
- **One template = screen + PDF.** Don't fork layouts; the print route reuses the template component.
- **Validation with Zod**, shared between client forms and server actions.
- **Server Actions** for mutations; keep them thin and delegate to the data-access layer.
- **Prefer RSC**; add `"use client"` only where interactivity requires it.
- Keep this README updated when a decision changes. Open questions are marked **TBD** — resolve them
  explicitly rather than guessing in code.

**Resolved decisions:**
- File storage: **S3** (presigned uploads, AWS SDK v3).
- **`draft` status + finalize step**: yes. Drafts are unnumbered; numbering fires on finalize.
- Invoice numbering: **per project**.
- Email provider: **Resend**.

**Still open (resolve before the relevant phase):**
- Per-project member access (`project_member`) — only if org-wide access proves too broad.

---

## Implementation roadmap

Each phase is a vertical slice that leaves the app working. Build in order.

**Phase 0 — Foundations** ✅ *done*
- Installed & configured Drizzle (+ Postgres via postgres.js), Better Auth (+ Organization plugin),
  Zod, react-hook-form, Resend, AWS SDK v3. *(Playwright deferred to Phase 5 to avoid the Chromium download.)*
- `src/server/db` client + full schema (`schema/auth.ts`, `schema/app.ts`), initial migration in `drizzle/`.
- `drizzle.config.ts`, validated `src/env.ts`, `.env.example`, Better Auth config + Next handler
  (`api/auth/[...all]`), client (`server/auth/client.ts`), email adapter, and the org-scoping
  data-access skeleton (`server/db/queries/context.ts`).

**Phase 1 — Auth & profile** ✅ *done*
- Register, login, logout, email verification, forgot/reset password — Better Auth client flows in the
  `(auth)` route group, forms via react-hook-form + Zod (`standardSchemaResolver`) + `sonner` toasts.
- Authenticated `(app)` shell (top bar + user menu), placeholder dashboard, route protection via
  `src/proxy.ts` (Next 16 renamed `middleware`→`proxy`) + server-side `requireUser()`.
- Profile management: name, avatar (S3 presigned upload via `createAvatarUploadUrl`), change password.
- Deferred follow-up: **email change** (triggers a re-verification flow) — not built in v1.
- Note: transactional email uses Resend; sends fail loudly if the `EMAIL_FROM` domain isn't verified.
  For local testing you can flip `email_verified` in Postgres to bypass the email step.

**Phase 2 — Organizations (multi-tenant)** ✅ *done*
- Create org (onboarding for new users + `/organization/new`), org switcher, session
  `activeOrganizationId` auto-set on login via a `databaseHooks.session.create` hook.
- `requireActiveOrg()` helper (`src/server/auth/org.ts`) redirects org-less users to onboarding.
- Org settings (`/organization/settings`): receiver defaults + signature (image upload **and** draw-on-canvas),
  persisted to `organization` additionalFields (shared field defs in `src/server/auth/org-fields.ts`).
- Members (`/organization/members`): invite by email, roles (owner/admin/member), change role, remove,
  cancel pending invitations; `/accept-invitation/[id]` for invitees. Role gating via `canManage()` in
  UI + Better Auth default access control server-side.
- Schema fix: added the `invitation.createdAt` column Better Auth expects (migration `0001`).

**Phase 3 — Projects & services**
- CRUD projects with sender defaults, currency, default rate, default notes, due days.
- Per-project service catalog with per-service rates (fallback to project default rate).

**Phase 4 — Invoices**
- Create invoice: transactional per-project numbering, prefill from project + org, line items from services.
- Snapshotting, subtotal/total computation, statuses (waiting/paid/unpaid), edit/list/filter.

**Phase 5 — Templates & PDF**
- `classic` template reproducing the sample layout.
- `/print/invoice/[id]` route + Playwright PDF export + cached `pdfUrl`.

**Phase 6 — Polish**
- Dashboard, invoice search/filter by status, empty states, storage hardening, deploy config
  (Chromium in the deploy target).

---

## Glossary

- **Organization** — the user's own business entity; the invoice **receiver**; owns the signature. Tenant boundary.
- **Project** — a client/engagement; the invoice **sender**; groups invoices and holds defaults + services.
- **Service** — a billable item in a project's catalog with its own rate (defaults to the project rate).
- **Invoice** — a numbered document under a project, with snapshotted parties/items, a status, and a PDF.
- **Snapshot** — a copy of source data frozen onto an invoice so later edits don't alter history.
- **Member / Role** — a user's membership in an organization and their permission level (owner/admin/member).
- **Template** — a React component (used for screen + PDF) that renders invoice data into the invoice layout.
