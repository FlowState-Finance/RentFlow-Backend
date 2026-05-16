# Architecture — RentFlow Backend

This document describes the system design, module structure, data flow, and key architectural decisions behind RentFlow.

---

## Table of Contents

- [System Overview](#system-overview)
- [Module Map](#module-map)
- [Data Flow](#data-flow)
- [Database Schema](#database-schema)
- [Stellar Integration](#stellar-integration)
- [Event-Driven State Sync](#event-driven-state-sync)
- [Scheduler Design](#scheduler-design)
- [Security Layers](#security-layers)
- [Key Design Decisions](#key-design-decisions)

---

## System Overview

RentFlow is a NestJS monolith with clear module boundaries. Each module owns its domain — entities, services, controllers, and DTOs — and communicates with other modules only through exported services.

```
┌──────────────────────────────────────────────────────────────┐
│                        REST API Layer                        │
│   /auth   /agreements   /rent   /stellar   /user             │
└──────────────────────┬───────────────────────────────────────┘
                       │
┌──────────────────────▼───────────────────────────────────────┐
│                     Application Layer                        │
│                                                              │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐  │
│  │    Auth     │  │ Agreements  │  │      Payments       │  │
│  │  (JWT/RBAC) │  │  (CRUD +    │  │  (pay + validate +  │  │
│  │             │  │   status)   │  │   history + overdue)│  │
│  └─────────────┘  └──────┬──────┘  └──────────┬──────────┘  │
│                          │                    │              │
│  ┌───────────────────────▼────────────────────▼───────────┐  │
│  │                   Stellar Service                      │  │
│  │   (Horizon SDK · payment submission · balance query)   │  │
│  └───────────────────────┬────────────────────────────────┘  │
│                          │                                   │
│  ┌───────────────────────▼────────────────────────────────┐  │
│  │                  Event Listener                        │  │
│  │   (streams contract events · syncs agreement status)   │  │
│  └────────────────────────────────────────────────────────┘  │
│                                                              │
│  ┌─────────────────────┐   ┌──────────────────────────────┐  │
│  │  Scheduler (Cron)   │──▶│  Notifications (Email)       │  │
│  │  8AM: reminders     │   │  nodemailer · SMTP           │  │
│  │  midnight: overdue  │   └──────────────────────────────┘  │
│  └─────────────────────┘                                     │
└──────────────────────────────────────────────────────────────┘
                       │
┌──────────────────────▼───────────────────────────────────────┐
│                   PostgreSQL (TypeORM)                       │
│   users · agreements · payments · event_cursors              │
└──────────────────────────────────────────────────────────────┘
                       ↕
┌──────────────────────────────────────────────────────────────┐
│              Stellar Network (Testnet / Mainnet)             │
│   Horizon API · Soroban RPC · Contract Events                │
└──────────────────────────────────────────────────────────────┘
```

---

## Module Map

| Module | Responsibility | Key Exports |
|---|---|---|
| `AuthModule` | JWT issuance, login, register | `AuthService` |
| `UsersModule` | User CRUD, role management | `UsersService` |
| `AgreementsModule` | Agreement lifecycle, status transitions | `AgreementsService` |
| `PaymentsModule` | Payment submission, history, overdue tracking | `PaymentsService` |
| `StellarModule` | Horizon SDK wrapper, transaction building | `StellarService` |
| `SchedulerModule` | Cron jobs for reminders and overdue detection | — |
| `NotificationsModule` | Email delivery via nodemailer | `NotificationsService` |
| `EventListenerModule` | Stellar event streaming, cursor persistence | — |

---

## Data Flow

### Rent Payment Flow

```
Tenant → POST /rent/pay
           │
           ▼
  PaymentsService.payRent()
           │
           ├─ Validate agreement is ACTIVE
           ├─ Validate amount >= monthlyRentXlm
           ├─ Validate payment window (±3 days from due date)
           │
           ▼
  StellarService.submitRentPayment()
           │
           ├─ Load source account from Horizon
           ├─ Build TransactionBuilder with payment op
           ├─ Add memo: "rentflow:<agreementId>"
           ├─ Sign with tenant keypair
           └─ Submit to Horizon
           │
           ▼
  Payment record saved (status: CONFIRMED, txHash, ledger)
           │
           ▼
  Response → { id, txHash, amountXlm, status }
```

### Agreement Activation Flow

```
Landlord deploys Soroban contract
           │
           ▼
  POST /agreements/create (status: PENDING)
           │
           ▼
  Tenant sends deposit to contract address
           │
           ▼
  EventListenerService receives on-chain event
           │
           ├─ Parses memo → extracts agreementId
           ├─ Updates agreement status → ACTIVE
           └─ Sends activation email to both parties
```

---

## Database Schema

### `users`

| Column | Type | Notes |
|---|---|---|
| `id` | UUID | Primary key |
| `email` | VARCHAR | Unique |
| `password` | VARCHAR | bcrypt hashed |
| `fullName` | VARCHAR | |
| `role` | ENUM | `tenant`, `landlord`, `admin` |
| `stellarPublicKey` | VARCHAR | Nullable |
| `isActive` | BOOLEAN | Default true |
| `createdAt` | TIMESTAMP | |
| `updatedAt` | TIMESTAMP | |

### `agreements`

| Column | Type | Notes |
|---|---|---|
| `id` | UUID | Primary key |
| `tenant_id` | UUID FK | → users |
| `landlord_id` | UUID FK | → users |
| `monthlyRentXlm` | DECIMAL(18,7) | |
| `depositXlm` | DECIMAL(18,7) | |
| `startDate` | DATE | |
| `endDate` | DATE | |
| `paymentDayOfMonth` | INT | 1–28 |
| `status` | ENUM | `pending`, `active`, `completed`, `terminated`, `disputed` |
| `contractId` | VARCHAR | Soroban contract ID |
| `propertyAddress` | VARCHAR | |
| `depositTxHash` | VARCHAR | |
| `createdAt` | TIMESTAMP | |
| `updatedAt` | TIMESTAMP | |

### `payments`

| Column | Type | Notes |
|---|---|---|
| `id` | UUID | Primary key |
| `agreement_id` | UUID FK | → agreements |
| `payer_id` | UUID FK | → users |
| `amountXlm` | DECIMAL(18,7) | |
| `type` | ENUM | `rent`, `deposit`, `deposit_refund` |
| `status` | ENUM | `pending`, `confirmed`, `failed`, `overdue` |
| `txHash` | VARCHAR | Stellar transaction hash |
| `ledger` | INT | Stellar ledger number |
| `dueDate` | DATE | |
| `paidAt` | TIMESTAMP | |
| `createdAt` | TIMESTAMP | |

### `event_cursors`

| Column | Type | Notes |
|---|---|---|
| `contractId` | VARCHAR | Primary key |
| `cursor` | VARCHAR | Horizon stream cursor |
| `updatedAt` | TIMESTAMP | |

---

## Stellar Integration

RentFlow uses the **Stellar JavaScript SDK** (`@stellar/stellar-sdk`) to interact with the network.

### Horizon vs Soroban RPC

| Concern | Tool |
|---|---|
| Account balance queries | Horizon REST API |
| Payment transactions (XLM) | Horizon REST API |
| Transaction lookup | Horizon REST API |
| Contract event streaming | Horizon transaction stream |
| Soroban contract invocation | Soroban RPC (future) |

### Transaction Structure

Every rent payment transaction includes:
- **Operation**: `payment` — native XLM from tenant to landlord
- **Memo**: `text("rentflow:<agreementId[:20]>")` — links the tx to an agreement
- **Timeout**: 30 seconds
- **Fee**: `BASE_FEE` (100 stroops)

### Key Management

> See [SECURITY.md](SECURITY.md) for the full key management policy.

In development, the tenant's `signerSecret` is passed in the request body for convenience. In production, **signing must happen client-side** — the backend should only receive a signed XDR envelope.

---

## Event-Driven State Sync

The `EventListenerService` opens a persistent SSE stream against Horizon for the configured `SOROBAN_CONTRACT_ID`. On each event:

1. The transaction memo is parsed for a `rentflow:<id>` prefix
2. The matching agreement is looked up in the database
3. If the agreement is `PENDING`, it is transitioned to `ACTIVE`
4. Both parties receive an activation email
5. The Horizon cursor is persisted to `event_cursors` so the stream resumes correctly after a restart

---

## Scheduler Design

Two cron jobs run daily:

| Job | Schedule | Action |
|---|---|---|
| `scheduleUpcomingPayments` | 8:00 AM daily | Creates `PENDING` payment records for active agreements; sends reminders for payments due within 3 days |
| `flagOverduePayments` | Midnight daily | Marks past-due `PENDING` payments as `OVERDUE`; sends overdue alerts to tenant and landlord |

The scheduler is idempotent — it checks for existing pending records before creating new ones.

---

## Security Layers

| Layer | Mechanism |
|---|---|
| Authentication | JWT Bearer tokens (HS256, configurable expiry) |
| Authorization | `RolesGuard` + `@Roles()` decorator |
| Input validation | `ValidationPipe` (whitelist, forbidNonWhitelisted, transform) |
| Rate limiting | `ThrottlerModule` (configurable TTL + limit per IP) |
| Error handling | `AllExceptionsFilter` — normalizes all errors to `{ statusCode, message, path, timestamp }` |
| Password storage | bcrypt (10 rounds) |

---

## Key Design Decisions

**Why NestJS?**  
Dependency injection, module system, and decorator-based guards/pipes make it straightforward to enforce consistent security and validation across all routes without boilerplate.

**Why TypeORM with `synchronize: true` in dev?**  
Reduces friction during development. In production, `synchronize` is disabled and migrations are used instead — this prevents accidental schema changes.

**Why Horizon for event streaming instead of Soroban RPC?**  
Horizon's SSE stream is stable and well-documented. Soroban RPC event subscriptions are still maturing. The architecture is designed so `StellarService.streamContractEvents` can be swapped to Soroban RPC without changing the rest of the system.

**Why store `signerSecret` in the pay endpoint?**  
Development convenience only. The field is clearly documented as dev-only. The production path is for the client to sign the transaction and submit a signed XDR, which the backend forwards to Horizon.

**Why decimal strings for XLM amounts?**  
Stellar amounts are 7 decimal places. Using JavaScript `number` risks floating-point precision loss. Storing and passing amounts as strings avoids this entirely.
