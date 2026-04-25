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
│   ├── web/                        # Front-end (Vite + React + Bootstrap 5)
│   └── api/                        # Back-end (Fastify + Prisma + PostgreSQL + Redis)
│   └── daemon/                     # motor de matching (processo isolado)
├── packages/
│   ├── shared/                     # Tipos, interfaces e utilitários compartilhados
│   └── tsconfig/                   # Configs TypeScript base
├── docs/
│   └── specifications.pdf          # Especificações do projeto, requisitos obrigatórios
├── turbo.json                      # Pipeline do Turborepo
└── README.md
```
---

## Backend — Matching Daemon
 
### Node.js (processo isolado)
O daemon é o componente mais crítico do sistema. Roda como um **processo
completamente separado da API**, consumindo a fila do Redis.
 
Suas responsabilidades:
1. Ler uma ordem da fila (uma por vez)
2. Verificar a idempotency key — descartar se já processada
3. Executar o algoritmo de matching contra o livro de ordens
4. Persistir o resultado em uma **única transação atômica** no PostgreSQL
   (débito, crédito, atualização de status, registro do match, outbox)
5. Confirmar o dequeue no Redis (ACK) **somente após o commit**
6. Reiniciar o ciclo
O daemon é **stateless entre execuções**: se crashar, o Docker o reinicia
e ele retoma a partir da fila sem perder contexto. A resiliência não está
no processo, está no design da fila + transação.
 
### BullMQ (Redis consumer)
Biblioteca de filas sobre Redis com suporte nativo a:
- Jobs com retry automático e backoff
- Exactly-once processing com locks distribuídos
- Visibilidade de jobs (pending, active, completed, failed)
Alternativa mais robusta a usar `ioredis` diretamente para gerenciar a fila.
 

---


