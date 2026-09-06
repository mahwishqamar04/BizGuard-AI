# BizGuard AI — Deployment Guide

This document covers everything needed to deploy BizGuard AI to production.

---

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Prerequisites](#prerequisites)
3. [Backend Deployment](#backend-deployment)
4. [Frontend Deployment](#frontend-deployment)
5. [Alibaba Cloud RDS Configuration](#alibaba-cloud-rds-configuration)
6. [Environment Variables Reference](#environment-variables-reference)
7. [CORS Configuration](#cors-configuration)
8. [Build & Start Commands](#build--start-commands)
9. [Health-Check Endpoint](#health-check-endpoint)
10. [Post-Deployment Verification Checklist](#post-deployment-verification-checklist)
11. [XAMPP / Local Apache Deployment](#xampp--local-apache-deployment)
12. [Recommended Deployment Order](#recommended-deployment-order)
13. [Security Notes](#security-notes)

---

## Architecture Overview

```
┌─────────────────┐       ┌─────────────────┐       ┌─────────────────────┐
│   Frontend      │──────▶│   Backend        │──────▶│  Alibaba Cloud RDS  │
│   (Static SPA)  │ /api  │   (Node.js)      │       │  (MySQL 8.0+)       │
│   Vite / React  │       │   Express 5      │       │                     │
└─────────────────┘       └─────────────────┘       └─────────────────────┘
                                  │
                                  ▼
                          ┌─────────────────┐
                          │  Alibaba Cloud   │
                          │  Qwen API (AI)   │
                          │  — optional —    │
                          └─────────────────┘
```

- **Frontend**: Static SPA built with Vite + React 19. Deploy to any static hosting (Nginx, S3, CDN, etc.).
- **Backend**: Node.js + Express 5 API server. Deploy to any Node.js hosting (ECS, container, PaaS).
- **Database**: MySQL 8.0+ (Alibaba Cloud RDS recommended). Falls back to in-memory if not configured.
- **AI**: Alibaba Cloud Qwen API. Falls back to mock implementation if no API key is set.

---

## Prerequisites

| Requirement | Version | Notes |
|-------------|---------|-------|
| Node.js | v18+ | LTS recommended |
| npm | v9+ | Comes with Node.js |
| MySQL | 8.0+ | Alibaba Cloud RDS or compatible |
| Git | Any | For deployment from repository |

---

## Backend Deployment

### 1. Clone / Copy the Project

```bash
git clone <your-repo-url>
cd BizGuard-AI/backend
```

### 2. Install Dependencies

```bash
npm install --production
```

### 3. Configure Environment

```bash
cp .env.example .env
```

Edit `.env` with your production values. **Minimum required for production:**

```env
PORT=5000
CORS_ORIGINS=https://your-frontend-domain.com

# Database (recommended for production)
DB_HOST=rm-xxxxxxxxxxxxx.mysql.rds.aliyuncs.com
DB_PORT=3306
DB_USER=bizguard_user
DB_PASSWORD=<your-strong-password>
DB_NAME=bizguard_ai
DB_SSL=true
DB_SSL_REJECT_UNAUTHORIZED=true

# AI (optional — mock fallback if not set)
# QWEN_API_KEY=your_qwen_api_key
```

### 4. Set Up the Database

```bash
node setup_cloud.js
```

This script:
- Connects using `.env` credentials
- Creates the `bizguard_ai` database if it doesn't exist
- Applies the schema (tables, indexes, foreign keys)
- Inserts seed data (if tables are empty)
- Verifies everything

### 5. Start the Server

```bash
npm start
```

Or use a process manager (recommended for production):

```bash
# Using PM2
npm install -g pm2
pm2 start server.js --name bizguard-backend
pm2 save
pm2 startup
```

---

## Frontend Deployment

### 1. Configure API URL

Create `frontend/.env.production` (or set environment variable before build):

```env
VITE_API_URL=https://your-backend-domain.com/api/ai
```

For development, create `frontend/.env.development`:

```env
# Leave VITE_API_URL empty — Vite proxy handles it
VITE_API_TARGET=http://localhost:5000
```

### 2. Install Dependencies

```bash
cd frontend
npm install
```

### 3. Build for Production

```bash
npm run build
```

Output goes to `frontend/dist/`.

### 4. Deploy Static Files

Upload the contents of `dist/` to your static hosting:

**Nginx example:**

```nginx
server {
    listen 80;
    server_name your-frontend-domain.com;
    root /var/www/bizguard-frontend/dist;
    index index.html;

    # SPA fallback — serve index.html for all routes
    location / {
        try_files $uri $uri/ /index.html;
    }

    # Cache static assets
    location /assets/ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
```

---

## Alibaba Cloud RDS Configuration

### 1. Create RDS Instance

- Engine: MySQL 8.0+
- Storage: 20GB+ (SSD recommended)
- Enable SSL encryption

### 2. Configure Whitelist

Add your backend server's IP to the RDS whitelist. **Never use 0.0.0.0/0 in production.**

### 3. Create Database and User

```sql
CREATE DATABASE bizguard_ai CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'bizguard_user'@'%' IDENTIFIED BY '<strong-password>';
GRANT ALL PRIVILEGES ON bizguard_ai.* TO 'bizguard_user'@'%';
FLUSH PRIVILEGES;
```

### 4. Get Connection Details

From the Alibaba Cloud RDS console:
- **Internal endpoint** (if backend is on same VPC): `rm-xxxxx.mysql.rds.aliyuncs.com`
- **Port**: 3306
- Enable SSL and download the CA certificate if required

### 5. Configure Backend `.env`

```env
DB_HOST=rm-xxxxxxxxxxxxx.mysql.rds.aliyuncs.com
DB_PORT=3306
DB_USER=bizguard_user
DB_PASSWORD=<your-strong-password>
DB_NAME=bizguard_ai
DB_SSL=true
DB_SSL_REJECT_UNAUTHORIZED=true
```

---

## Environment Variables Reference

### Backend (`.env`)

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `PORT` | No | `5000` | Backend server port |
| `CORS_ORIGINS` | Production | _(empty)_ | Comma-separated frontend origins |
| `DB_HOST` | For DB | _(none)_ | MySQL host |
| `DB_PORT` | No | `3306` | MySQL port |
| `DB_USER` | For DB | _(none)_ | Database user |
| `DB_PASSWORD` | For DB | _(none)_ | Database password |
| `DB_NAME` | For DB | _(none)_ | Database name |
| `DB_SSL` | For RDS | `false` | Enable SSL (required for cloud RDS) |
| `DB_SSL_REJECT_UNAUTHORIZED` | No | `true` | Validate server certificate |
| `QWEN_API_KEY` | No | _(none)_ | Alibaba Cloud Qwen API key |

### Frontend (build-time)

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `VITE_API_URL` | Production | `/api/ai` | Full backend API base URL |
| `VITE_API_TARGET` | Dev only | `http://localhost:5000` | Vite proxy target |

---

## CORS Configuration

The backend CORS policy:
- **Always allows** localhost origins (for development)
- **Always allows** requests with no `Origin` header (curl, mobile apps)
- **Allows** origins listed in `CORS_ORIGINS` (for production)

Example for production:

```env
CORS_ORIGINS=https://bizguard.example.com,https://www.bizguard.example.com
```

---

## Build & Start Commands

### Backend

```bash
cd backend
npm install --production
cp .env.example .env    # Edit with production values
node setup_cloud.js     # Apply schema
npm start               # Or: pm2 start server.js --name bizguard-backend
```

### Frontend

```bash
cd frontend
npm install
# Set VITE_API_URL before building
echo "VITE_API_URL=https://api.bizguard.example.com/api/ai" > .env.production
npm run build           # Output: dist/
```

---

## Health-Check Endpoint

```
GET /health
```

Response:

```json
{
  "status": "ok",
  "timestamp": "2026-09-03T12:00:00.000Z",
  "uptime": 3600.5,
  "database": "connected"
}
```

Use this for:
- Load balancer health checks
- Monitoring / alerting
- Deployment verification

---

## Post-Deployment Verification Checklist

- [ ] Backend starts without errors (`npm start` or `pm2 start`)
- [ ] `GET /` returns `{"message": "BizGuard AI Backend is running"}`
- [ ] `GET /health` returns `{"status": "ok"}`
- [ ] Database is connected (check `/health` → `database: "connected"`)
- [ ] `GET /api/ai/business` returns business data
- [ ] `POST /api/ai/business` saves data successfully
- [ ] `GET /api/ai/metrics` returns calculated metrics
- [ ] `GET /api/ai/inventory` returns inventory items
- [ ] `POST /api/ai/inventory` saves inventory
- [ ] `POST /api/ai/upload` processes CSV correctly
- [ ] `POST /api/ai/analyze` returns analysis with health score
- [ ] `POST /api/ai/ask` returns AI response (or mock response)
- [ ] Frontend loads in browser
- [ ] Frontend can communicate with backend API
- [ ] CORS is working (no CORS errors in browser console)
- [ ] No secrets visible in browser network tab
- [ ] `.env` is NOT committed to Git
- [ ] No API keys in frontend code or build output

---

## XAMPP / Local Apache Deployment

This project is currently designed to run on a local XAMPP stack:

- **Apache** serves the static frontend at `http://localhost/BizGuard-AI/`
- **Node.js** runs the backend API at `http://localhost:5000`

### Setup Steps

1. **Copy project to `htdocs/BizGuard-AI/`**

2. **Install all dependencies:**
   ```bash
   cd BizGuard-AI
   npm install
   cd backend && npm install
   cd ../frontend && npm install
   ```

3. **Configure backend:**
   ```bash
   cd backend
   cp .env.example .env
   # Edit .env with your local MySQL credentials (if using DB)
   ```

4. **Build the frontend:**
   ```bash
   cd frontend
   # Set the API URL for production
   echo "VITE_API_URL=http://localhost:5000/api/ai" > .env.production
   npm run build
   ```

5. **Copy built assets to project root (required for XAMPP):**

   After building, Vite outputs hashed files to `frontend/dist/assets/`.
   For XAMPP, copy them to the project-root `assets/` folder and update
   the root `index.html` to reference the new filenames.

   **Windows (PowerShell):**
   ```powershell
   # Find the new bundle names
   Get-ChildItem frontend\dist\assets\index-*.js
   Get-ChildItem frontend\dist\assets\index-*.css

   # Copy them to root assets/
   Copy-Item frontend\dist\assets\index-*.js assets\
   Copy-Item frontend\dist\assets\index-*.css assets\
   ```

   **Linux / macOS:**
   ```bash
   cp frontend/dist/assets/index-*.js assets/
   cp frontend/dist/assets/index-*.css assets/
   ```

   Then edit the root `index.html` and update the `<script>` and `<link>`
   tags to match the new hashed filenames.

   > **Tip:** If you are deploying to a non-XAMPP host (Vercel, Netlify,
   > Nginx, S3, etc.), you do **not** need to copy assets. Instead,
   > change `base` in `frontend/vite.config.js` from `'/BizGuard-AI/'`
   > to `'/'`, then deploy the entire `frontend/dist/` directory.

6. **Start the backend:**
   ```bash
   cd backend
   npm start
   ```

7. **Open in browser:**
   ```
   http://localhost/BizGuard-AI/
   ```

### Apache Configuration

The `.htaccess` file at the project root handles:
- SPA routing (serves `index.html` for all routes)
- Blocking access to `.env`, `.gitignore`, `package.json`, source directories
- Security headers (`X-Content-Type-Options`, `X-Frame-Options`)
- Static asset caching

---

## Recommended Deployment Order

1. **Database** — Set up MySQL/RDS, run `setup_cloud.js` to apply schema
2. **Backend** — Deploy Node.js server, configure `.env`, verify `/health`
3. **Frontend** — Build with correct `VITE_API_URL`, deploy static files
4. **Integration** — Verify frontend can reach backend API
5. **Security** — Confirm `.env` not exposed, CORS configured, no secrets in bundle

---

## Security Notes

1. **Never commit `.env` files.** They are excluded via `.gitignore`.
2. **Never expose database credentials in frontend code.** Only the backend connects to the database.
3. **Use strong passwords** for both database and API keys.
4. **Enable SSL** for database connections in production (`DB_SSL=true`).
5. **Restrict RDS whitelist** to only the backend server's IP address.
6. **Never use `0.0.0.0/0`** for database access.
7. **CORS is restrictive** — only explicitly allowed origins can access the API.
8. **Error messages are sanitized** — stack traces and internal details are never sent to clients.
9. **All SQL queries use parameterized statements** — no string concatenation.
10. **Process manager** (PM2 or equivalent) recommended for production stability.
