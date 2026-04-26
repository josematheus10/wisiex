# 🏗️ Wisiex Exchange 

Resumo do Projeto — Wisiex Development Abilities TestO desafio consiste em construir um sistema de correspondência de ordens (order matching system), simulando uma exchange de criptomoedas para o par BTC/USD.

# Funcionalidades
1. Autenticação

- Login apenas com nome de usuário (cadastro automático se não existir)
- Cada novo usuário recebe 100 BTC e 100.000 USD
- Sessão gerenciada via JWT (Bearer token)

2. Página de Ordens, composta por:

- Estatísticas — último preço, volume BTC/USD nas últimas 24h, máxima, mínima e saldo do usuário
- Global Matches — tabela com as últimas negociações realizadas
- Buy/Sell — formulários para criar ordens (com total calculado automaticamente)
- Minhas Ordens Ativas — listagem com opção de cancelar
- Meu Histórico — ordens que já foram executadas
- Bid/Ask (Livro de Ordens) — todas as ordens ativas agrupadas por preço; ao clicar, preenche o formulário correspondente

Motor de Matching

- Ordens limitadas: executa no preço especificado ou melhor
- Ordens parcialmente executadas ficam no livro; totalmente executadas são marcadas como completas
- Processamento em fila (Redis/RabbitMQ) para evitar condições de corrida
- Taxas: 0,5% para o maker (quem está no livro) e 0,3% para o taker (quem cria a ordem que bate)

# Tecnologias (stack)

    Frontend: 
        Vite
        React 
        Bootstrap 5
        Socket.io

    Backend:
        Fastify
        Prisma
        Socket.io
        BullMQ

    Data & Storage:
        PostgreSQL
        Redis

    Bluid:
        Turborepo
        Docker

## 📁 Estrutura Raiz (Monorepo)
 
```
wisiex/
├── apps/
│   ├── api/                        # Back-end (Fastify + Prisma + PostgreSQL + Redis)
│   │   ├── prisma/
│   │   │   └── schema.prisma
│   │   └── src/
│   │       ├── app.ts
│   │       ├── index.ts
│   │       ├── plugins/            # cors, jwt, prisma, redis, socket
│   │       ├── routes/             # auth, me, orders, stats, trades
│   │       ├── services/           # matching-engine, order-book, order-queue, serializers, stats
│   │       └── types/
│   └── web/                        # Front-end (Vite + React + Bootstrap 5)
│       ├── index.html
│       └── src/
│           ├── App.tsx
│           ├── components/
│           │   ├── orderbook/      # OrderBookPanel
│           │   ├── orders/         # ActiveOrders, OrderForm, OrderHistory
│           │   ├── stats/          # StatsBar
│           │   └── trades/         # GlobalMatches
│           ├── hooks/              # useAuth, useSocket
│           ├── pages/              # LoginPage, TradingPage
│           └── services/           # api
├── packages/
│   ├── bdd/                        # Testes BDD com Cucumber
│   │   ├── features/
│   │   │   ├── login.feature
│   │   │   └── checkout.feature
│   │   ├── steps/
│   │   │   ├── backend/            # auth.steps, orders.steps
│   │   │   └── frontend/           # login.steps, orders.steps (Playwright)
│   │   ├── support/
│   │   │   ├── world.ts
│   │   │   └── hooks.ts
│   │   └── cucumber.json
│   ├── shared/                     # Tipos e interfaces compartilhados
│   │   └── src/
│   │       └── types/
│   ├── tsconfig/                   # Configs TypeScript base (backend, frontend)
│   ├── eslint-config/              # Configs ESLint compartilhadas
│   └── ui/                         # Componentes UI base (button, card, code)
├── docs/
│   ├── authentication.md
│   ├── index.md
│   └── specifications.pdf
├── docker-compose.yml
├── turbo.json                      # Pipeline do Turborepo
├── pnpm-workspace.yaml
└── README.md
```
---



