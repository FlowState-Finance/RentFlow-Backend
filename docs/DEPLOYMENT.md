# Deployment Guide — RentFlow Backend

This guide covers deploying RentFlow to a production environment using Docker, a managed PostgreSQL database, and a process manager.

---

## Table of Contents

- [Prerequisites](#prerequisites)
- [Docker Deployment](#docker-deployment)
- [Manual Deployment](#manual-deployment)
- [Database Migrations](#database-migrations)
- [Environment Configuration](#environment-configuration)
- [Reverse Proxy (nginx)](#reverse-proxy-nginx)
- [Production Checklist](#production-checklist)
- [Health Checks](#health-checks)

---

## Prerequisites

- Docker 24+ and Docker Compose v2
- A PostgreSQL 14+ instance (managed: AWS RDS, Supabase, Neon, or self-hosted)
- A domain name with DNS pointing to your server
- SSL certificate (Let's Encrypt via Certbot, or managed by your cloud provider)

---

## Docker Deployment

### 1. Build the image

```bash
docker build -t rentflow-backend:latest .
```

### 2. Create a `docker-compose.yml`

```yaml
version: '3.9'

services:
  api:
    image: rentflow-backend:latest
    restart: unless-stopped
    ports:
      - "3000:3000"
    environment:
      NODE_ENV: production
      PORT: 3000
      DB_HOST: db
      DB_PORT: 5432
      DB_USERNAME: ${DB_USERNAME}
      DB_PASSWORD: ${DB_PASSWORD}
      DB_NAME: rentflow
      JWT_SECRET: ${JWT_SECRET}
      STELLAR_NETWORK: mainnet
      STELLAR_HORIZON_URL: https://horizon.stellar.org
      SOROBAN_CONTRACT_ID: ${SOROBAN_CONTRACT_ID}
      STELLAR_ADMIN_SECRET: ${STELLAR_ADMIN_SECRET}
      SMTP_HOST: ${SMTP_HOST}
      SMTP_PORT: 587
      SMTP_USER: ${SMTP_USER}
      SMTP_PASS: ${SMTP_PASS}
    depends_on:
      db:
        condition: service_healthy

  db:
    image: postgres:16-alpine
    restart: unless-stopped
    environment:
      POSTGRES_USER: ${DB_USERNAME}
      POSTGRES_PASSWORD: ${DB_PASSWORD}
      POSTGRES_DB: rentflow
    volumes:
      - pgdata:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ${DB_USERNAME}"]
      interval: 10s
      timeout: 5s
      retries: 5

volumes:
  pgdata:
```

### 3. Create a `Dockerfile`

```dockerfile
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY package*.json ./
RUN npm ci --omit=dev
COPY --from=builder /app/dist ./dist
EXPOSE 3000
CMD ["node", "dist/main"]
```

### 4. Deploy

```bash
# Set secrets in a .env file (never commit this)
cp .env.example .env.production
# Edit .env.production with real values

docker compose --env-file .env.production up -d
```

---

## Manual Deployment

If you prefer to deploy without Docker:

```bash
# 1. Install Node.js 20 (via nvm)
nvm install 20 && nvm use 20

# 2. Clone and install
git clone https://github.com/FlowState-Finance/RentFlow-Backend.git
cd RentFlow-Backend
npm ci

# 3. Build
npm run build

# 4. Set environment variables
export NODE_ENV=production
# ... (set all required env vars)

# 5. Run migrations
npm run migration:run

# 6. Start with PM2
npm install -g pm2
pm2 start dist/main.js --name rentflow-api
pm2 save
pm2 startup
```

---

## Database Migrations

In production, `synchronize` is disabled. You must run migrations manually.

```bash
# Generate a migration after changing entities
npm run migration:generate -- src/database/migrations/AddPaymentLedger

# Run pending migrations
npm run migration:run

# Revert the last migration
npm run migration:revert
```

Always run migrations before deploying a new version of the application.

---

## Environment Configuration

Copy `.env.example` to `.env` and fill in all required values. See the [README Environment Variables](../README.md#environment-variables) table for descriptions.

**Critical production settings:**

```bash
NODE_ENV=production          # Disables synchronize, enables production logging
JWT_SECRET=<64-char random>  # Generate: openssl rand -hex 64
STELLAR_NETWORK=mainnet      # Switch from testnet
```

Store secrets in a secrets manager (AWS Secrets Manager, HashiCorp Vault, Doppler) rather than plain `.env` files on the server.

---

## Reverse Proxy (nginx)

Example nginx config for HTTPS termination:

```nginx
server {
    listen 80;
    server_name api.rentflow.io;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl http2;
    server_name api.rentflow.io;

    ssl_certificate /etc/letsencrypt/live/api.rentflow.io/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/api.rentflow.io/privkey.pem;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

---

## Production Checklist

- [ ] `NODE_ENV=production`
- [ ] Strong `JWT_SECRET` (64+ random bytes)
- [ ] TypeORM `synchronize: false` (automatic when `NODE_ENV=production`)
- [ ] Migrations run before deploy
- [ ] HTTPS enabled
- [ ] CORS restricted to your frontend domain
- [ ] `STELLAR_NETWORK=mainnet` (or `testnet` for staging)
- [ ] `STELLAR_ADMIN_SECRET` stored in secrets manager
- [ ] `signerSecret` removed from pay endpoint (or gated behind admin role)
- [ ] Rate limiting tuned for expected traffic
- [ ] Log aggregation configured (CloudWatch, Datadog, Logtail, etc.)
- [ ] Database backups enabled
- [ ] Health check endpoint monitored
- [ ] `npm audit` — no high/critical vulnerabilities

---

## Health Checks

The API does not expose a dedicated `/health` endpoint by default. To add one:

```typescript
// src/app.controller.ts
@Controller()
export class AppController {
  @Get('health')
  health() {
    return { status: 'ok', timestamp: new Date().toISOString() };
  }
}
```

Use this endpoint with your load balancer or uptime monitoring service (UptimeRobot, Better Uptime, AWS ALB health checks).
