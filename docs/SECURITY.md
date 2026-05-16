# Security — RentFlow Backend

This document describes the security model, key management practices, threat model, and responsible disclosure policy for RentFlow.

---

## Table of Contents

- [Authentication and Authorization](#authentication-and-authorization)
- [Key Management](#key-management)
- [Input Validation](#input-validation)
- [Rate Limiting](#rate-limiting)
- [Threat Model](#threat-model)
- [Production Checklist](#production-checklist)
- [Responsible Disclosure](#responsible-disclosure)

---

## Authentication and Authorization

### JWT Authentication

All protected routes require a `Bearer` JWT token in the `Authorization` header.

- Algorithm: HS256
- Secret: configured via `JWT_SECRET` environment variable
- Expiry: configurable via `JWT_EXPIRES_IN` (default: `7d`)
- Payload: `{ sub: userId, email, role }`

**Never use a weak or default `JWT_SECRET` in production.** Generate a strong secret:
```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

### Role-Based Access Control

Three roles are supported:

| Role | Description |
|---|---|
| `tenant` | Can create payments, view their own agreements |
| `landlord` | Can view agreements where they are the landlord |
| `admin` | Full access |

Routes can be restricted using the `@Roles()` decorator:
```typescript
@Roles(UserRole.LANDLORD, UserRole.ADMIN)
@Get('agreements')
findAll() { ... }
```

---

## Key Management

### The `signerSecret` Problem

The `POST /rent/pay` endpoint accepts a `signerSecret` field for development convenience. **This is not safe for production.**

In production, the signing flow should be:

1. The client fetches the unsigned transaction XDR from the backend
2. The client signs it locally using their wallet (e.g., Freighter, Albedo, or a hardware wallet)
3. The client submits the signed XDR to the backend
4. The backend forwards it to Horizon

This keeps private keys entirely on the client side and out of the backend.

### Admin Keypair

The `STELLAR_ADMIN_SECRET` is used for server-side operations (e.g., funding escrow accounts). Treat it like a database password:

- Store it in a secrets manager (AWS Secrets Manager, HashiCorp Vault, etc.)
- Never commit it to version control
- Rotate it if it is ever exposed
- Use a dedicated keypair with minimal permissions — not your personal wallet

### Environment Variables

All secrets are loaded from environment variables. Never hardcode secrets in source code. The `.env` file is in `.gitignore` and must never be committed.

---

## Input Validation

All incoming request bodies are validated using NestJS `ValidationPipe` with:

- `whitelist: true` — strips unknown properties
- `forbidNonWhitelisted: true` — rejects requests with unknown properties
- `transform: true` — coerces types (e.g., string → number)

DTOs use `class-validator` decorators to enforce types, formats, and constraints. All UUIDs are validated with `@IsUUID()`. All amounts are validated as strings to avoid floating-point issues.

---

## Rate Limiting

The API is protected by `@nestjs/throttler`:

- Default: 100 requests per 60-second window per IP
- Configurable via `THROTTLE_TTL` and `THROTTLE_LIMIT` environment variables
- Returns `429 Too Many Requests` when the limit is exceeded

For production, consider placing a reverse proxy (nginx, Cloudflare) in front of the API for additional DDoS protection.

---

## Threat Model

| Threat | Mitigation |
|---|---|
| Unauthorized API access | JWT authentication on all protected routes |
| Privilege escalation | `RolesGuard` enforces role checks per route |
| Injection attacks | TypeORM parameterized queries; `ValidationPipe` strips unknown input |
| Brute-force login | Rate limiting (100 req/60s per IP) |
| Private key exposure | `signerSecret` is dev-only; production uses client-side signing |
| Replay attacks | Stellar transactions have a 30-second timeout |
| Overpayment | Payment amount validated against `monthlyRentXlm` before submission |
| Out-of-window payments | Payment window check (±3 days from due date) |
| Secret leakage via logs | Secrets are never logged; `AllExceptionsFilter` sanitizes error responses |
| Dependency vulnerabilities | Pin exact versions; run `npm audit` regularly |

---

## Production Checklist

Before deploying to production:

- [ ] Set a strong, unique `JWT_SECRET`
- [ ] Set `NODE_ENV=production` (disables TypeORM `synchronize`)
- [ ] Use database migrations instead of `synchronize`
- [ ] Store `STELLAR_ADMIN_SECRET` in a secrets manager
- [ ] Remove or disable the `signerSecret` field from the pay endpoint
- [ ] Enable HTTPS (TLS termination at load balancer or reverse proxy)
- [ ] Set `THROTTLE_TTL` and `THROTTLE_LIMIT` appropriate for your traffic
- [ ] Configure CORS to allow only your frontend domain
- [ ] Run `npm audit` and resolve high/critical vulnerabilities
- [ ] Set up log aggregation and alerting
- [ ] Enable PostgreSQL SSL connections

---

## Responsible Disclosure

If you discover a security vulnerability in RentFlow, please **do not open a public GitHub issue**.

Instead, email the maintainers at: **security@rentflow.io** (or open a private security advisory on GitHub).

Please include:
- A description of the vulnerability
- Steps to reproduce
- Potential impact
- Any suggested mitigations

We will acknowledge your report within 48 hours and aim to release a fix within 14 days for critical issues.
