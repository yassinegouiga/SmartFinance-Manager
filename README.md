# SmartFinance Manager

A full-stack personal finance management application built with a microservices architecture.

## Services

| Service | Port | Description |
|---------|------|-------------|
| `service-user` | 8001 | Authentication via Firebase, user profiles |
| `service-transaction` | 8002 | Transactions, categories, income/expense tracking |
| `service-billing` | 8003 | Bills, recurring payments, due date reminders |
| `service-budget` | 8004 | Monthly budgets, saving pots |
| `service-analytics` | 8005 | Dashboard, financial reports, notifications |
| `service-notification` | 8006 | Scheduled email notifications (Resend) |
| `frontend` | 3000 | React + TypeScript SPA |

## Tech Stack

- **Backend**: FastAPI, SQLAlchemy (async), PostgreSQL, Alembic
- **Frontend**: React, TypeScript, Vite, TailwindCSS
- **Auth**: Firebase Authentication
- **Email**: Resend
- **Infrastructure**: Docker, Docker Compose, Nginx

## Design Patterns

Eight Gang-of-Four patterns applied across the codebase:

| Pattern | Location |
|---------|----------|
| Proxy | `service-user` — Firebase token cache |
| Decorator | `service-transaction` — CRUD audit logging |
| Flyweight | `service-transaction` — shared category icon/color metadata |
| Composite | `service-analytics` — financial report tree |
| Facade | `service-analytics` — dashboard data aggregation |
| Adapter | `service-notification` — email provider abstraction |
| Strategy | `service-notification` — swappable delivery strategies |
| Bridge | `service-notification` — notification type × delivery channel |

## Getting Started

1. Copy `.env.example` to `.env` and fill in your credentials
2. Run `docker-compose up --build`
3. Access the app at `http://localhost`
