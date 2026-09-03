# BizGuard AI

BizGuard AI is an AI-powered business intelligence assistant designed for small business owners. It helps users understand their business data, detect risks, explain problems in plain language, and receive actionable recommendations.

**AI Workflow:** Analyze -> Detect -> Explain -> Recommend

---

## Problem Being Solved

Small business owners often lack the tools and expertise to understand their financial data, spot emerging risks, or make data-driven decisions. Traditional accounting software tracks numbers but does not explain what they mean or what to do next. BizGuard AI fills this gap by providing an AI-powered assistant that automatically analyzes business data, detects risks, explains issues in plain language, and recommends concrete actions — making business intelligence accessible to non-technical users.

---

## Main Features

- **Business Data Upload** - Import business data via CSV files (sales, expenses, inventory)
- **AI-Powered Analysis** - Automated business intelligence using the Analyze -> Detect -> Explain -> Recommend pipeline
- **Risk Detection** - Identifies financial risks, low stock, and operational issues
- **Plain-Language Explanations** - Complex business metrics translated into simple, actionable insights
- **Inventory Management** - Track stock levels, detect low-stock items, manage product categories
- **Dashboard** - Visual overview of business health and key metrics

---

## Technology Stack

| Layer | Technology |
|-------|-----------|
| **Frontend** | React 19, Vite 8, CSS3 |
| **Backend** | Node.js, Express 5 |
| **Database** | MySQL 8.0+ (compatible with Alibaba Cloud RDS) |
| **AI Integration** | Alibaba Cloud Qwen API (with mock fallback) |
| **File Upload** | Multer, csv-parser |

---

## Project Structure

```
BizGuard-AI/
|-- frontend/          # React SPA (Vite + React 19)
|   |-- src/
|   |   |-- App.jsx    # Main application component
|   |   |-- main.jsx   # Entry point
|   |   +-- assets/    # Images and static assets
|   |-- public/        # SVG icons and favicon
|   +-- index.html     # HTML entry point
|
|-- backend/           # Express API server
|   |-- config/        # Database configuration
|   |-- database/      # SQL schema and seed data
|   |-- migrations/    # Database migration scripts
|   |-- routes/        # API route definitions
|   |-- services/      # Business logic and AI integration
|   |-- controllers/   # Request handlers (planned)
|   +-- models/        # Data models (planned)
|
|-- docs/              # Project documentation
+-- server.js          # Root server entry point
```

---

## Local Development Setup

### Prerequisites

- **Node.js** (v18 or later)
- **MySQL 8.0+** (or XAMPP with MySQL)
- **npm**

### Backend

```bash
cd backend
npm install
cp .env.example .env    # Copy and edit environment variables
npm start               # Starts on http://localhost:5000
```

### Frontend

```bash
cd frontend
npm install
npm run dev             # Starts Vite dev server (default: http://localhost:5173)
```

### Database (Optional)

The backend works without a database using in-memory storage. To enable MySQL persistence:

1. Create the database:
   ```sql
   CREATE DATABASE bizguard_ai CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
   ```

2. Run the schema:
   ```bash
   mysql -h localhost -u <user> -p bizguard_ai < backend/database/schema.sql
   ```

3. (Optional) Load sample data:
   ```bash
   mysql -h localhost -u <user> -p bizguard_ai < backend/database/seed.sql
   ```

4. Update `.env` with your database credentials.

---

## Environment Variables

Copy `backend/.env.example` to `backend/.env` and configure:

| Variable | Description | Default |
|----------|-------------|---------|
| `PORT` | Backend server port | `5000` |
| `DB_HOST` | MySQL host | `localhost` |
| `DB_PORT` | MySQL port | `3306` |
| `DB_USER` | Database user | - |
| `DB_PASSWORD` | Database password | - |
| `DB_NAME` | Database name | `bizguard_ai` |
| `DB_SSL` | Enable SSL (required for cloud RDS) | `false` |
| `QWEN_API_KEY` | Alibaba Cloud Qwen API key (optional) | - |

> If no AI API key is configured, the backend uses a built-in mock implementation that provides realistic business insights.

---

## Database Architecture

- **Engine:** MySQL 8.0+ with InnoDB
- **Tables:**
  - `businesses` - Business profiles and financial summaries (sales, expenses, profit, employee count)
  - `inventory_items` - Product/stock tracking per business (quantity, pricing, low-stock thresholds)
- **Relationship:** One-to-many (businesses -> inventory_items)
- **Compatibility:** Works with local MySQL (XAMPP) and Alibaba Cloud RDS
- **Precision:** All monetary values use DECIMAL (no floating-point)

---

## Security

- **Never commit `.env` files.** They are excluded via `.gitignore`.
- All environment variables must be set locally using `backend/.env.example` as a template.
- CORS is restricted to localhost origins only.
- API keys and database credentials must never be hardcoded or pushed to version control.
- The backend uses a global error handler that never exposes stack traces or internal details to clients.

---

## Testing

### Backend Tests

```bash
cd backend
node test_mvp.js          # 168 integration and unit tests
node test_services.js     # Service-level unit tests
```

Tests cover: service loading, business metrics, CSV parsing (financial + inventory), AI mock mode, HTTP endpoints, security checks, and frontend file integrity.

### Frontend Build

```bash
cd frontend
npm run build             # Production build via Vite
```

---

## Deployment Status

- **Current stage:** Hackathon MVP — local development and demo-ready.
- **Backend:** Runs on Node.js with in-memory storage (no database required for demo).
- **Frontend:** Static SPA built with Vite, deployable to any static hosting.
- **Database:** Optional MySQL persistence (local or Alibaba Cloud RDS).
- **AI:** Mock fallback ensures the full workflow runs without an external API key.

---

## License

Private project - not for distribution.
