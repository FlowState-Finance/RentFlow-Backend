# RentFlow Backend

> **Decentralized rent escrow on the Stellar blockchain.**  
> RentFlow automates rent collection, deposit management, and payment reminders using Soroban smart contracts — giving tenants and landlords a trustless, transparent rental experience.

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Node.js](https://img.shields.io/badge/Node.js-20+-green.svg)](https://nodejs.org)
[![NestJS](https://img.shields.io/badge/NestJS-10-red.svg)](https://nestjs.com)
[![Stellar](https://img.shields.io/badge/Stellar-Soroban-blueviolet.svg)](https://stellar.org)

---

## Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Architecture](#architecture)
- [Getting Started](#getting-started)
- [API Reference](#api-reference)
- [Environment Variables](#environment-variables)
- [Project Structure](#project-structure)
- [Contributing](#contributing)
- [Docs](#docs)
- [License](#license)

---

## Overview

RentFlow is an open-source Web3 fintech backend that bridges traditional rental agreements with blockchain-based escrow. Landlords and tenants interact through a REST API; under the hood, rent payments and deposits are settled on the **Stellar network** via **Soroban smart contracts**.

Key guarantees:
- Deposits are held in escrow on-chain — not by any intermediary
- Payment history is immutable and auditable on the Stellar ledger
- Automated reminders and overdue detection run server-side via cron jobs
- Agreement lifecycle (pending → active → completed) is driven by on-chain events

---

## Features

| Feature | Description |
|---|---|
| **Rent Agreement API** | Create and manage rental agreements between tenants and landlords |
| **Payment Handling** | Submit rent payments to Stellar with window validation |
| **Deposit Escrow** | Deposits locked in Soroban contract, released on agreement completion |
| **Scheduler** | Daily cron jobs for payment reminders and overdue detection |
| **Notifications** | Email alerts for upcoming payments, overdue rent, and agreement events |
| **Blockchain Integration** | Stellar SDK + Soroban contract interaction |
| **Event Listener** | Streams on-chain events to sync agreement state in real time |
| **Auth** | JWT-based authentication with role-based access (tenant / landlord / admin) |
| **Security** | Input validation, rate limiting, global error handling |

---

## Architecture

See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for the full system design, data flow diagrams, and module breakdown.

**High-level:**

```
Client → REST API (NestJS)
              ↓
    ┌─────────────────────┐
    │  Agreements Module  │
    │  Payments Module    │
    │  Auth / Users       │
    └────────┬────────────┘
             ↓
    ┌─────────────────────┐
    │  Stellar Service    │  ←→  Stellar Horizon / Soroban RPC
    │  Event Listener     │
    └────────┬────────────┘
             ↓
    ┌─────────────────────┐
    │  PostgreSQL (TypeORM)│
    └─────────────────────┘
             ↑
    ┌─────────────────────┐
    │  Scheduler (Cron)   │ → Notifications (Email)
    └─────────────────────┘
```

---

## Getting Started

### Prerequisites

- Node.js 20+
- PostgreSQL 14+
- A Stellar testnet account ([Stellar Laboratory](https://laboratory.stellar.org))
- (Optional) A deployed Soroban contract ID

### 1. Clone the repository

```bash
git clone https://github.com/FlowState-Finance/RentFlow-Backend.git
cd RentFlow-Backend
```

### 2. Install dependencies

```bash
npm install
```

### 3. Configure environment

```bash
cp .env.example .env
```

Edit `.env` with your database credentials, JWT secret, Stellar keys, and SMTP settings. See [Environment Variables](#environment-variables) for details.

### 4. Set up the database

```bash
# Create the database
psql -U postgres -c "CREATE DATABASE rentflow;"

# Run migrations (or let TypeORM auto-sync in development)
npm run migration:run
```

> In development, `synchronize: true` is set in the database config — TypeORM will auto-create tables. **Disable this in production.**

### 5. Start the server

```bash
# Development (hot reload)
npm run start:dev

# Production
npm run build
npm run start:prod
```

The API will be available at `http://localhost:3000/api/v1`.

### 6. Run tests

```bash
npm test
npm run test:cov
```

---

## API Reference

All routes are prefixed with `/api/v1`. Protected routes require a `Bearer` JWT token in the `Authorization` header.

### Auth

| Method | Route | Auth | Description |
|---|---|---|---|
| `POST` | `/auth/register` | ❌ | Register a new user |
| `POST` | `/auth/login` | ❌ | Login and receive JWT |

**Register body:**
```json
{
  "email": "tenant@example.com",
  "password": "securepass123",
  "fullName": "Jane Doe",
  "role": "tenant",
  "stellarPublicKey": "GABC..."
}
```

**Login response:**
```json
{
  "accessToken": "eyJhbGci...",
  "user": { "id": "uuid", "email": "...", "role": "tenant" }
}
```

---

### Agreements

| Method | Route | Auth | Description |
|---|---|---|---|
| `POST` | `/agreements/create` | ✅ | Create a new rent agreement |
| `GET` | `/agreements/:id` | ✅ | Get agreement by ID |
| `GET` | `/user/agreements` | ✅ | Get all agreements for the current user |

**Create agreement body:**
```json
{
  "tenantId": "uuid",
  "landlordId": "uuid",
  "monthlyRentXlm": "500",
  "depositXlm": "1000",
  "startDate": "2025-02-01",
  "endDate": "2026-01-31",
  "paymentDayOfMonth": 1,
  "propertyAddress": "123 Main St, Cape Town",
  "contractId": "SOROBAN_CONTRACT_ID"
}
```

---

### Payments

| Method | Route | Auth | Description |
|---|---|---|---|
| `POST` | `/rent/pay` | ✅ | Submit a rent payment |
| `GET` | `/rent/history/:agreementId` | ✅ | Payment history for an agreement |
| `GET` | `/rent/overdue` | ✅ | List all overdue payments |

**Pay rent body:**
```json
{
  "agreementId": "uuid",
  "amountXlm": "500",
  "type": "rent",
  "signerSecret": "SXXX..."
}
```

> ⚠️ In production, signing should happen client-side. The `signerSecret` field is for development/testing only. See [docs/SECURITY.md](docs/SECURITY.md).

---

### Stellar

| Method | Route | Auth | Description |
|---|---|---|---|
| `GET` | `/stellar/balance/:publicKey` | ✅ | Get XLM balance for a wallet |
| `GET` | `/stellar/tx/:hash` | ✅ | Look up a transaction by hash |

---

## Environment Variables

| Variable | Required | Default | Description |
|---|---|---|---|
| `PORT` | No | `3000` | HTTP server port |
| `NODE_ENV` | No | `development` | `development` / `production` |
| `DB_HOST` | Yes | `localhost` | PostgreSQL host |
| `DB_PORT` | No | `5432` | PostgreSQL port |
| `DB_USERNAME` | Yes | — | PostgreSQL username |
| `DB_PASSWORD` | Yes | — | PostgreSQL password |
| `DB_NAME` | Yes | `rentflow` | Database name |
| `JWT_SECRET` | Yes | — | Secret for signing JWTs |
| `JWT_EXPIRES_IN` | No | `7d` | JWT expiry duration |
| `STELLAR_NETWORK` | No | `testnet` | `testnet` or `mainnet` |
| `STELLAR_HORIZON_URL` | No | testnet URL | Horizon server URL |
| `STELLAR_RPC_URL` | No | testnet URL | Soroban RPC URL |
| `SOROBAN_CONTRACT_ID` | No | — | Deployed contract ID |
| `STELLAR_ADMIN_SECRET` | No | — | Admin keypair secret |
| `SMTP_HOST` | Yes | — | SMTP server host |
| `SMTP_PORT` | No | `587` | SMTP port |
| `SMTP_USER` | Yes | — | SMTP username |
| `SMTP_PASS` | Yes | — | SMTP password / app password |
| `SMTP_FROM` | No | — | Sender display name + email |
| `THROTTLE_TTL` | No | `60` | Rate limit window (seconds) |
| `THROTTLE_LIMIT` | No | `100` | Max requests per window |

---

## Project Structure

```
src/
├── agreements/          # Rent agreement CRUD + business logic
├── auth/                # JWT auth, login, register
├── common/              # Shared filters, guards, decorators
├── config/              # Database and app configuration
├── event-listener/      # Stellar contract event streaming
├── notifications/       # Email notifications (nodemailer)
├── payments/            # Payment submission + history
├── scheduler/           # Cron jobs (reminders, overdue detection)
├── stellar/             # Stellar SDK integration
├── users/               # User management
├── app.module.ts
└── main.ts
docs/
├── ARCHITECTURE.md      # System design and data flow
├── SECURITY.md          # Security model and key management
├── API.md               # Full API reference
└── DEPLOYMENT.md        # Production deployment guide
```

---

## Contributing

We welcome contributions! Please read [CONTRIBUTING.md](CONTRIBUTING.md) before opening a pull request.

Quick start:
1. Fork the repo
2. Create a feature branch: `git checkout -b feat/your-feature`
3. Commit your changes: `git commit -m "feat: add your feature"`
4. Push and open a PR against `main`

---

## Docs

| Document | Description |
|---|---|
| [ARCHITECTURE.md](docs/ARCHITECTURE.md) | System design, module map, data flow |
| [CONTRIBUTING.md](CONTRIBUTING.md) | How to contribute, code style, PR process |
| [SECURITY.md](docs/SECURITY.md) | Security model, key handling, threat model |
| [API.md](docs/API.md) | Full API reference with request/response examples |
| [DEPLOYMENT.md](docs/DEPLOYMENT.md) | Docker, environment setup, production checklist |
| [CHANGELOG.md](CHANGELOG.md) | Version history |

---

## License

[MIT](LICENSE) — FlowState Finance, 2025
