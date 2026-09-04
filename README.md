# BizGuard AI

**BizGuard AI** is an AI-powered business intelligence assistant designed for small business owners. It helps users understand their business data, detect risks, explain problems in plain language, and receive actionable recommendations.

### AI Workflow

**Analyze → Detect → Explain → Recommend**

---

## Problem Being Solved

Small business owners often lack the tools and expertise to understand their financial data, spot emerging risks, or make data-driven decisions.

Traditional accounting software mainly tracks numbers but does not explain what they mean or what to do next.

BizGuard AI fills this gap by providing an AI-powered assistant that:

* Analyzes business data
* Detects potential risks
* Explains problems in simple language
* Recommends practical actions

This makes business intelligence more accessible to non-technical small business owners.

---

# Main Features

### Business Setup

Configure basic business information through a simple setup form.

### Dashboard

Provides a visual overview of important business metrics and business health.

### Financial Analysis

Analyzes sales, expenses, profit, profit margin, and related financial indicators.

### Inventory Management

Manage products, quantities, stock levels, categories, and identify low-stock items.

### AI Business Assistant

Ask business questions and receive understandable, actionable recommendations based on available business data.

### Risk Detection

Identifies supported financial, inventory, and operational risks.

### Plain-Language Explanations

Converts business metrics and detected problems into easy-to-understand explanations.

### CSV Data Import

The current MVP supports two CSV data formats:

**Financial CSV**

```text
date,sales,expenses
```

**Inventory CSV**

```text
name,quantity,stock
```

The CSV importer validates and processes uploaded records and supports bulk data import.

### Automatic Dashboard Navigation

After a successful CSV upload, the application automatically navigates to the Dashboard so the user can immediately view the updated information.

### Responsive UI

The interface is designed for desktop, tablet, and mobile screen sizes.

---

# Currently Supported CSV Formats

## 1. Financial CSV

Required columns:

```text
date,sales,expenses
```

Example:

```csv
date,sales,expenses
2026-08-01,125000,72000
2026-08-02,118000,69000
2026-08-03,132000,76000
2026-08-04,98000,71000
2026-08-05,145000,80000
```

Financial CSV data can be used for:

* Sales analysis
* Expense analysis
* Profit calculation
* Profit margin
* Expense ratio
* Financial risk detection
* Business recommendations

## 2. Inventory CSV

Required columns:

```text
name,quantity,stock
```

Example:

```csv
name,quantity,stock
Laptop,25,25
Wireless Mouse,80,80
Keyboard,55,55
USB Cable,120,120
Headphones,8,8
```

Inventory CSV data can be used for:

* Product tracking
* Stock monitoring
* Quantity management
* Low-stock detection

### Future Extensibility

The current MVP intentionally focuses on **Financial and Inventory CSV formats**.

Additional real-world formats, such as detailed sales/order transaction datasets, can be added in future versions without changing the core BizGuard AI concept.

---

# Technology Stack

| Layer               | Technology                                |
| ------------------- | ----------------------------------------- |
| Frontend            | React 19, Vite 8, CSS3                    |
| Backend             | Node.js, Express 5                        |
| Database            | MySQL 8.0+                                |
| Cloud Compatibility | Alibaba Cloud RDS                         |
| AI Integration      | Alibaba Cloud Qwen API with mock fallback |
| File Upload         | Multer, csv-parser                        |

---

# Project Structure

```text
BizGuard-AI/
│
├── frontend/
│   ├── src/
│   │   ├── App.jsx
│   │   ├── main.jsx
│   │   └── assets/
│   ├── public/
│   └── index.html
│
├── backend/
│   ├── config/
│   ├── database/
│   ├── migrations/
│   ├── routes/
│   ├── services/
│   ├── controllers/
│   └── models/
│
├── docs/
├── .htaccess
├── PROJECT_GUIDE.md
├── README.md
└── server.js
```

---

# Local Demo Setup

## Prerequisites

* Windows
* Node.js v18 or later
* npm
* XAMPP
* Modern web browser

XAMPP provides the local Apache and MySQL environment used for the demo.

---

# XAMPP Demo

## 1. Start XAMPP

Open **XAMPP Control Panel**.

Start:

* Apache
* MySQL

---

## 2. Start Backend

Open PowerShell:

```powershell
cd E:\Downloads\xampp_setup\htdocs\BizGuard-AI\backend
```

Then run:

```powershell
E:\Downloads\xampp_setup\htdocs\BizGuard-AI\nodejs\node.exe server.js
```

Successful startup:

```text
BizGuard AI backend running on http://localhost:5000
```

Keep this PowerShell window open while using the application.

---

## 3. Open the Application

Open:

```text
http://localhost/BizGuard-AI/
```

This is the recommended local XAMPP demo URL.

The Vite development URL (`localhost:5173`) is not required for the final XAMPP demo.

---

# Recommended Judge Demo Flow

A short demonstration can follow this sequence:

### 1. Business Setup

Enter the required business information.

### 2. Dashboard

Show the main business metrics and business health.

### 3. Financial CSV

Upload the Financial CSV and demonstrate automatic financial analysis.

### 4. Dashboard

Show updated sales, expenses, profit, and related metrics.

### 5. AI Assistant

Ask:

**"How can I improve my profit?"**

Demonstrate the AI explanation and recommendations.

### 6. Inventory

Open Inventory Management and show stock information and low-stock detection.

### 7. Inventory CSV

Upload the Inventory CSV and demonstrate bulk inventory import.

---

# AI Workflow

BizGuard AI follows:

**Analyze → Detect → Explain → Recommend**

### Analyze

The system processes the available business information.

### Detect

Potential financial and inventory risks are identified.

### Explain

The detected issue is explained in simple language.

### Recommend

The AI provides practical actions the business owner can take.

---

# Database

BizGuard AI supports MySQL 8.0+ and is compatible with Alibaba Cloud RDS.

The backend can also operate using in-memory storage for basic local demo scenarios when database persistence is unavailable.

### Database Architecture

* Engine: MySQL 8.0+
* Storage: InnoDB
* Monetary values: DECIMAL
* Business profiles and financial summaries
* Inventory/product tracking

The project can therefore be demonstrated locally with XAMPP and can be extended to Alibaba Cloud RDS for future deployment.

---

# AI Configuration

BizGuard AI integrates with the **Alibaba Cloud Qwen API**.

The Qwen API key is optional for the local demo.

If no API key is configured, the backend provides a built-in mock AI implementation so that the complete analysis workflow can still be demonstrated.

API keys must be stored locally in environment variables and must never be committed to GitHub.

---

# Security

The project follows basic security practices:

* `.env` files are excluded from Git.
* API keys are not hardcoded.
* Database credentials are not committed.
* CORS is restricted to allowed local origins.
* Backend errors do not expose internal stack traces.
* Sensitive configuration remains local.
* Apache security rules are included for the XAMPP demo.

---

# Testing

The project includes automated tests covering:

* Service loading
* Business metrics
* Financial CSV parsing
* Inventory CSV parsing
* AI mock mode
* HTTP endpoints
* Security checks
* Persistence
* End-to-end flow
* Responsive behavior

The frontend can also be verified with a production Vite build.

---

# Current MVP Scope

The current BizGuard AI MVP includes:

* Business Setup
* Dashboard
* Financial Analysis
* Inventory Management
* Financial CSV Import
* Inventory CSV Import
* Risk Detection
* AI Business Assistant
* Plain-language explanations
* Actionable recommendations
* Responsive UI
* MySQL compatibility
* Local XAMPP demo

### CSV Scope

**Currently supported:**

1. Financial CSV
2. Inventory CSV

**Future:** Additional CSV formats and business data sources can be added as the project evolves.

---

# Deployment Status

**Current stage:** Hackathon MVP — local development and demo-ready.

### Local Demo

* Frontend: Apache/XAMPP
* Backend: Node.js/Express
* Database: MySQL/XAMPP
* AI: Alibaba Cloud Qwen API with mock fallback
* Demo URL:

```text
http://localhost/BizGuard-AI/
```

### Future Cloud Deployment

The architecture is compatible with Alibaba Cloud services, including Alibaba Cloud RDS for MySQL and Qwen-based AI integration.

---

# Documentation

For complete installation, startup, troubleshooting, CSV formats, and judge demonstration instructions, see:

**`PROJECT_GUIDE.md`**

---

# Repository

**GitHub Repository:**
`https://github.com/mahwishqamar04/BizGuard-AI`

---

# Project Vision

BizGuard AI aims to make business intelligence simple and accessible for small business owners.

Instead of only showing numbers, BizGuard AI helps answer:

**What is happening? → What is wrong? → Why is it happening? → What should I do?**

---

## BizGuard AI

**Analyze → Detect → Explain → Recommend**
