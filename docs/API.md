# API Reference — RentFlow Backend

Base URL: `http://localhost:3000/api/v1`

All protected routes require:
```
Authorization: Bearer <accessToken>
Content-Type: application/json
```

---

## Auth

### POST `/auth/register`

Register a new user account.

**Request body:**
```json
{
  "email": "tenant@example.com",
  "password": "securepass123",
  "fullName": "Jane Doe",
  "role": "tenant",
  "stellarPublicKey": "GABC123..."
}
```

| Field | Type | Required | Notes |
|---|---|---|---|
| `email` | string | Yes | Must be a valid email |
| `password` | string | Yes | Minimum 8 characters |
| `fullName` | string | Yes | |
| `role` | string | No | `tenant`, `landlord`, or `admin`. Default: `tenant` |
| `stellarPublicKey` | string | No | Stellar G-address |

**Response `201`:**
```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "email": "tenant@example.com",
    "role": "tenant",
    "fullName": "Jane Doe"
  }
}
```

**Errors:**
- `409 Conflict` — email already registered
- `400 Bad Request` — validation failure

---

### POST `/auth/login`

Authenticate and receive a JWT.

**Request body:**
```json
{
  "email": "tenant@example.com",
  "password": "securepass123"
}
```

**Response `200`:**
```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "email": "tenant@example.com",
    "role": "tenant",
    "fullName": "Jane Doe"
  }
}
```

**Errors:**
- `401 Unauthorized` — invalid credentials

---

## Agreements

### POST `/agreements/create` 🔒

Create a new rent agreement.

**Request body:**
```json
{
  "tenantId": "550e8400-e29b-41d4-a716-446655440000",
  "landlordId": "660e8400-e29b-41d4-a716-446655440001",
  "monthlyRentXlm": "500",
  "depositXlm": "1000",
  "startDate": "2025-02-01",
  "endDate": "2026-01-31",
  "paymentDayOfMonth": 1,
  "propertyAddress": "123 Main St, Cape Town",
  "contractId": "CAABC123..."
}
```

| Field | Type | Required | Notes |
|---|---|---|---|
| `tenantId` | UUID | Yes | Must be an existing user |
| `landlordId` | UUID | Yes | Must be an existing user |
| `monthlyRentXlm` | string | Yes | Amount in XLM (decimal string) |
| `depositXlm` | string | Yes | Amount in XLM (decimal string) |
| `startDate` | ISO date | Yes | Must be before `endDate` |
| `endDate` | ISO date | Yes | |
| `paymentDayOfMonth` | number | Yes | 1–28 |
| `propertyAddress` | string | No | |
| `contractId` | string | No | Soroban contract ID |

**Response `201`:**
```json
{
  "id": "770e8400-e29b-41d4-a716-446655440002",
  "tenant": { "id": "...", "email": "...", "fullName": "..." },
  "landlord": { "id": "...", "email": "...", "fullName": "..." },
  "monthlyRentXlm": "500",
  "depositXlm": "1000",
  "startDate": "2025-02-01",
  "endDate": "2026-01-31",
  "paymentDayOfMonth": 1,
  "status": "pending",
  "contractId": "CAABC123...",
  "propertyAddress": "123 Main St, Cape Town",
  "createdAt": "2025-01-15T10:00:00.000Z"
}
```

**Errors:**
- `404 Not Found` — tenant or landlord not found
- `400 Bad Request` — startDate >= endDate, or validation failure

---

### GET `/agreements/:id` 🔒

Fetch a single agreement by ID.

**Response `200`:** Same shape as create response.

**Errors:**
- `404 Not Found` — agreement not found

---

### GET `/user/agreements` 🔒

Get all agreements where the authenticated user is either tenant or landlord.

**Response `200`:**
```json
[
  {
    "id": "...",
    "status": "active",
    "monthlyRentXlm": "500",
    ...
  }
]
```

---

## Payments

### POST `/rent/pay` 🔒

Submit a rent payment to the Stellar network.

**Request body:**
```json
{
  "agreementId": "770e8400-e29b-41d4-a716-446655440002",
  "amountXlm": "500",
  "type": "rent",
  "signerSecret": "SXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX"
}
```

| Field | Type | Required | Notes |
|---|---|---|---|
| `agreementId` | UUID | Yes | Must be an active agreement |
| `amountXlm` | string | Yes | Must be >= `monthlyRentXlm` |
| `type` | string | No | `rent`, `deposit`, `deposit_refund`. Default: `rent` |
| `signerSecret` | string | No | **Dev only.** See [SECURITY.md](SECURITY.md) |

**Response `201`:**
```json
{
  "id": "880e8400-e29b-41d4-a716-446655440003",
  "amountXlm": "500",
  "type": "rent",
  "status": "confirmed",
  "txHash": "abc123def456...",
  "ledger": 12345678,
  "dueDate": "2025-02-01",
  "paidAt": "2025-02-01T09:30:00.000Z",
  "createdAt": "2025-02-01T09:30:00.000Z"
}
```

**Errors:**
- `400 Bad Request` — agreement not active, amount too low, outside payment window
- `400 Bad Request` — Stellar transaction failed (insufficient balance, etc.)
- `404 Not Found` — agreement not found

---

### GET `/rent/history/:agreementId` 🔒

Get all payments for a given agreement, newest first.

**Response `200`:**
```json
[
  {
    "id": "...",
    "amountXlm": "500",
    "status": "confirmed",
    "txHash": "abc123...",
    "dueDate": "2025-02-01",
    "paidAt": "2025-02-01T09:30:00.000Z"
  }
]
```

---

### GET `/rent/overdue` 🔒

List all payments currently marked as overdue.

**Response `200`:**
```json
[
  {
    "id": "...",
    "amountXlm": "500",
    "status": "overdue",
    "dueDate": "2025-01-01",
    "agreement": {
      "id": "...",
      "propertyAddress": "123 Main St",
      "tenant": { "email": "...", "fullName": "..." },
      "landlord": { "email": "...", "fullName": "..." }
    }
  }
]
```

---

## Stellar

### GET `/stellar/balance/:publicKey` 🔒

Get the native XLM balance for a Stellar public key.

**Response `200`:**
```json
{
  "publicKey": "GABC123...",
  "balanceXlm": "9500.0000000"
}
```

**Errors:**
- `400 Bad Request` — account not found on the network

---

### GET `/stellar/tx/:hash` 🔒

Look up a Stellar transaction by its hash.

**Response `200`:** Raw Horizon transaction record.

---

## Error Format

All errors follow a consistent shape:

```json
{
  "statusCode": 400,
  "timestamp": "2025-02-01T09:30:00.000Z",
  "path": "/api/v1/rent/pay",
  "message": {
    "statusCode": 400,
    "message": ["amountXlm must be a string"],
    "error": "Bad Request"
  }
}
```

---

## Rate Limiting

The API enforces a rate limit of **100 requests per 60 seconds per IP** by default. When exceeded, the response is:

```json
{
  "statusCode": 429,
  "message": "ThrottlerException: Too Many Requests"
}
```
