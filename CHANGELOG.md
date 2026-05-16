# Changelog

All notable changes to RentFlow Backend will be documented in this file.

The format follows [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).  
This project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [Unreleased]

### Planned
- Soroban RPC contract invocation for deposit locking and release
- Client-side signing flow (signed XDR submission)
- Webhook support for payment events
- Admin dashboard endpoints
- Refresh token support

---

## [0.1.0] — 2025-05-16

### Added
- Initial project scaffold with NestJS 10
- PostgreSQL integration via TypeORM
- `User` entity with roles: `tenant`, `landlord`, `admin`
- `Agreement` entity with full lifecycle status tracking
- `Payment` entity with type and status tracking
- `EventCursor` entity for Stellar stream persistence
- JWT authentication (register + login)
- Role-based access control (`RolesGuard`, `@Roles()` decorator)
- Agreements API: `POST /agreements/create`, `GET /agreements/:id`, `GET /user/agreements`
- Payments API: `POST /rent/pay`, `GET /rent/history/:agreementId`, `GET /rent/overdue`
- Stellar API: `GET /stellar/balance/:publicKey`, `GET /stellar/tx/:hash`
- Payment window validation (±3 days from due date)
- Stellar SDK integration: payment submission, balance queries, transaction lookup
- Contract event streaming via Horizon SSE
- Automatic agreement activation on deposit event
- Daily cron jobs: payment reminders (8 AM) and overdue detection (midnight)
- Email notifications via nodemailer (reminders, overdue alerts, activation)
- Global `ValidationPipe` with whitelist and transform
- Global `AllExceptionsFilter` for consistent error responses
- `ThrottlerModule` rate limiting (100 req/60s per IP)
- Unit test scaffold for `AgreementsService`
- Full documentation: README, ARCHITECTURE, CONTRIBUTING, SECURITY, API, DEPLOYMENT

[Unreleased]: https://github.com/FlowState-Finance/RentFlow-Backend/compare/v0.1.0...HEAD
[0.1.0]: https://github.com/FlowState-Finance/RentFlow-Backend/releases/tag/v0.1.0
