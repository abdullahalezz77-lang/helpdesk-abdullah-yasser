# HelpDesk Lite

A full-stack internal help desk / support ticket management system built as an npm-workspaces monorepo. Employees submit tickets, support handlers manage the queue and drive the ticket lifecycle, and managers get operational oversight.

## Features

- **Role-based access** – EMPLOYEE, SUPPORT, and MANAGER with scoped data and endpoints (no IDOR).
- **Controlled ticket lifecycle** – a strict state machine (`NEW → IN_PROGRESS → WAITING → IN_PROGRESS → RESOLVED → CLOSED`, and employee reopen of resolved tickets).
- **Full audit trail** – every create, assign, reassign, status change, reopen, resolve, and close is recorded in history.
- **Notifications** – support and manager users receive in-app (database) notifications on ticket events; unread badge + read-all.
- **Dashboards** – employee (my metrics + recent), support (queue + personal workload), manager (overview, per-handler workload, category/priority breakdown).
- **Security** – bcrypt password hashing, JWT + HTTP-only cookie auth, secure password reset (RFC-style tokens), global API response envelope, and a unified exception filter.
- **Swagger API docs** at `http://localhost:4000/api/docs` in development.

## Tech Stack

| Layer    | Technology                                                        |
| -------- | ----------------------------------------------------------------- |
| Frontend | Next.js 14 (App Router), React 18, Tailwind CSS, TanStack Query, react-hook-form + Zod, lucide-react |
| Backend  | NestJS 10, Prisma ORM, JWT (passport-less guard), bcryptjs         |
| Database | PostgreSQL 18 (embedded option included for zero-setup dev)       |
| Testing  | Jest + ts-jest (backend/shared), Vitest (frontend), Supertest (API e2e) |
| Tooling  | TypeScript, ESLint, Prettier                                       |

## Repository Layout

```
.
├── backend/            # NestJS API
│   ├── prisma/         # schema.prisma + seed.ts
│   └── src/            # auth, tickets, categories, notifications, dashboard, mail, users, audit
├── frontend/           # Next.js 14 application
│   └── src/
│       ├── app/        # routes (login, dashboard, requests, support, notifications, profile)
│       ├── components/ # ui kit, layout/app shell, dashboards, tickets
│       └── lib/        # api client, auth context, react-query hooks, utils
├── shared/             # shared TypeScript enums/interfaces + state machine
├── scripts/db.js       # embedded PostgreSQL lifecycle helper
└── .pgdata/            # local PostgreSQL cluster (git-ignored)
```

## Prerequisites

- Node.js 20+ (tested with Node 24) and npm 10+.
- On Windows, the PowerShell execution policy may block `npm.ps1`. If a command fails with "running scripts is disabled", use `npm.cmd` instead of `npm`.

## Getting Started

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment variables

```bash
copy .env.example .env        # Windows
# or: cp .env.example .env    # macOS/Linux
```

The embedded PostgreSQL cluster (used in dev) authenticates as user `postgres` with password `password`. Update `DATABASE_URL` in `backend/.env` to match your setup if you prefer an external PostgreSQL instance.

Frontend reads `NEXT_PUBLIC_API_URL` from `.env.local` (default `http://localhost:4000/api`).

### 3. Start the database

```bash
npm run db:init     # initialise the embedded PostgreSQL cluster (first time only)
npm run db:start    # start PostgreSQL on localhost:5432 (keep running)
```

Run `npm run db:start` in a dedicated terminal — it runs in the foreground.

### 4. Apply the schema and seed

```bash
npm run prisma:generate   # generate the Prisma client
npm run prisma:push       # apply the schema (no migrations directory in this repo)
npm run prisma:seed       # seed categories, demo users, and sample tickets
```

### 5. Run the application

```bash
npm run dev:backend    # API on http://localhost:4000
npm run dev:frontend   # UI on http://localhost:3000
```

Open http://localhost:3000 and log in with one of the demo accounts:

| Role     | Email                       | Password      |
| -------- | --------------------------- | ------------- |
| Employee | `employee@helpdesk-lite.local`  | `Password123!` |
| Support  | `support1@helpdesk-lite.local`   | `Password123!` |
| Support  | `support2@helpdesk-lite.local`   | `Password123!` |
| Manager  | `manager@helpdesk-lite.local`    | `Password123!` |

## Scripts

| Command                 | Description                                              |
| ----------------------- | -------------------------------------------------------- |
| `npm run dev:backend`   | Start the NestJS API in watch mode                        |
| `npm run dev:frontend`  | Start the Next.js app in dev mode                         |
| `npm run build`         | Build shared, backend, and frontend in order             |
| `npm run test`          | Run backend (Jest + API integration) and frontend (Vitest) suites |
| `npm run test:e2e`      | Run backend API integration tests                        |
| `npm run lint`          | Lint backend and frontend                                |
| `npm run format`        | Format the whole repo with Prettier                      |
| `npm run db:init`       | Initialise the embedded PostgreSQL cluster               |
| `npm run db:start`      | Start the embedded PostgreSQL cluster                    |
| `npm run prisma:generate` / `prisma:push` / `prisma:seed` | Prisma client / schema / seed |

## Testing

Backend unit + integration suites need the database running:

```bash
npm run db:start
npm run test
```

- **Backend**: `backend/test` – service units, roles guard, and a Supertest API integration suite covering auth, IDOR protection, ticket workflow, and password reset.
- **Shared**: vitest unit tests for the ticket state machine.
- **Frontend**: vitest unit tests for helpers in `frontend/src/lib/utils.ts`.

## API Overview

Base URL: `http://localhost:4000/api` · Global prefix `/api` · All responses use the `{ success, data | error }` envelope.

| Area          | Endpoints                                                                 |
| ------------- | ------------------------------------------------------------------------- |
| Auth          | `POST /auth/login`, `POST /auth/logout`, `GET /auth/me`, `POST /auth/change-password`, `POST /auth/forgot-password`, `POST /auth/reset-password` |
| Tickets       | `GET/POST /tickets`, `GET /tickets/:id`, `GET /tickets/:id/history`, `PATCH /tickets/:id/status`, `POST /tickets/:id/assign`, `POST /tickets/:id/reassign`, `POST /tickets/:id/reopen` |
| Categories    | `GET /categories`                                                            |
| Support staff | `GET /users/support-handlers`                                                |
| Dashboard     | `GET /dashboard/employee`, `GET /dashboard/support`, `GET /dashboard/manager` |
| Notifications | `GET /notifications`, `PATCH /notifications/:id/read`, `PATCH /notifications/read-all` |

Interactive Swagger documentation is available at `http://localhost:4000/api/docs`.

## Mail Configuration

`MAIL_TRANSPORT` in `backend/.env`:

- `console` (default) – password-reset links are printed to the API terminal. Ideal for local development.
- `smtp` – set `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASSWORD`, and `SMTP_FROM` to send real emails in production.