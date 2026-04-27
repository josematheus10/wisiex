# 🚀 Wisiex Exchange

Order matching system for cryptocurrency trading. Simulates a BTC/USD exchange with authentication, order book, matching engine, and transaction history.

![Wisiex Platform](./docs/plataform.png)

## 🎯 Features

### Authentication
- Login with username (auto-signup if not exists)
- New users start with: 100 BTC + 100,000 USD
- JWT session (Bearer token)

### Trading
- **Buy/Sell Forms** — create orders with price and quantity
- **Order Book (Bid/Ask)** — view active orders, click to prefill
- **Global Matches** — table with latest trades in real-time
- **My Orders** — active (with cancel) + full history
- **Statistics** — last price, 24h volume, high/low, balance

### Matching Engine
- Limit orders: execute at specified price or better
- Partial execution: order stays in book until complete
- Queue processing (BullMQ/Redis) — no race conditions
- Fees: 0.5% maker + 0.3% taker

## 📦 Stack

| Layer | Tech |
|--------|------|
| **Frontend** | Vite, React, Bootstrap 5, Socket.io |
| **Backend** | Fastify, Prisma, Socket.io, BullMQ |
| **Data** | PostgreSQL, Redis |
| **Build** | Turborepo, Docker |
| **Tests** | Playwright, Cucumber (BDD) |
| **Quality** | TypeScript, ESLint, Prettier |

## ⚙️ Prerequisites

- **Node.js** >= 18
- **pnpm** >= 9.0 (monorepo package manager)
- **Docker + Docker Compose** (postgres + redis)

## 🏃 Quick Start

### 1. Install dependencies

```sh
pnpm install
```

### 2. Start databases

```sh
docker-compose up -d
```

Creates: PostgreSQL (port 5432) + Redis (port 6379)

### 3. Database migrations

```sh
cd apps/backend
pnpm db:push
```

### 4. Run dev (frontend + backend)

```sh
pnpm dev
```

- **Backend**: http://localhost:3000
- **Frontend**: http://localhost:5173

## 📝 Main Commands

### Development

```sh
pnpm dev                    # Run all apps
pnpm dev --filter=backend   # Backend only
pnpm dev --filter=frontend  # Frontend only
```

### Build & Quality

```sh
pnpm build                  # Build everything
pnpm lint                   # ESLint
pnpm format                 # Prettier
pnpm check-types            # TypeScript check
```

### Database

```sh
cd apps/backend
pnpm db:push                # Apply schema
pnpm db:migrate dev         # New migration
pnpm db:studio              # Prisma UI
```

### Tests

#### BDD (E2E with Playwright + Cucumber)

```sh
cd packages/bdd

# Install browsers (first time)
pnpm exec playwright install --with-deps chromium

# Run all tests
pnpm test

# Backend only
pnpm test:backend

# Frontend only (requires frontend running at http://localhost:5173)
WEB_BASE=http://localhost:5173 pnpm test:frontend

# Frontend login only
WEB_BASE=http://localhost:5173 pnpm test:frontend:login

# Generate HTML report
pnpm test:report
```

⚠️ **Note**: Frontend + Backend must be running via `pnpm dev` before running E2E tests.

## 📁 Structure

```
wisiex/
├── apps/
│   ├── backend/            # Fastify + Prisma + PostgreSQL + Redis
│   │   └── src/
│   │       ├── routes/     # auth, me, orders, stats, trades
│   │       ├── services/   # matching-engine, order-book, queue
│   │       └── plugins/    # cors, jwt, prisma, redis, socket
│   └── frontend/           # Vite + React + Bootstrap 5
│       └── src/
│           ├── pages/      # Login, Trading
│           ├── components/ # Orders, Stats, OrderBook, Trades
│           └── hooks/      # useAuth, useSocket
├── packages/
│   ├── bdd/                # E2E tests (Cucumber)
│   ├── database/           # Centralized Prisma
│   ├── shared/             # Shared types
│   ├── tsconfig/           # TypeScript configs
│   ├── eslint-config/      # Shared ESLint
│   └── ui/                 # Base components
└── docs/                   # Documentation
```

## 🔌 Environment Variables

### Backend (`apps/backend/.env`)

```env
DATABASE_URL=postgresql://user:pass@localhost:5432/wisiex
REDIS_URL=redis://localhost:6379
JWT_SECRET=your-secret-key
```

### Frontend (`apps/frontend/.env`)

```env
VITE_API_URL=http://localhost:3000
```

## 🚨 Troubleshooting

| Error | Solution |
|-------|----------|
| `ECONNREFUSED:5432` | PostgreSQL not running: `docker-compose up -d` |
| `ECONNREFUSED:6379` | Redis not running: `docker-compose up -d` |
| `ERR_PNPM_WORKSPACE_NOT_FOUND` | Run `pnpm install` in root |
| Frontend can't connect backend | Check `VITE_API_URL` in `apps/frontend/.env` |

## 📚 Documentation

- `docs/index.md` — Project overview
- `docs/specifications.md` — Full requirements
- `docs/balance-and-reserve.md` — Balance & reserve logic

## 🤝 Contributing

1. Feature branch: `git checkout -b feature/x`
2. Code: write + test locally
3. Lint: `pnpm lint && pnpm format`
4. Tests: `pnpm test` (all must pass)
5. Push + PR

## 🧠 Tech Insights

- **Monorepo**: Turborepo orchestrates multiple apps + packages. Runs tasks in parallel.
- **Matching Engine**: BullMQ processes order queue → Redis stores state. No deadlock.
- **Real-time**: Socket.io broadcasts trades + order book updates instantly.
- **Security**: JWT, Prisma prepared queries, rate limiting (recommended).

## 📜 Useful Links

- [Turborepo Docs](https://turborepo.dev/)
- [Fastify](https://www.fastify.io/)
- [Prisma](https://www.prisma.io/)
- [React](https://react.dev/)
