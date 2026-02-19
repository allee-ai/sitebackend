# sitebackend

Backend API for [allee-ai.com](https://allee-ai.com), deployed on [Railway](https://railway.app).

## Modules

| Module | Path | Status | Description |
|---|---|---|---|
| **E-Commerce** | `src/ecommerce/` | ✅ Ready | Products, Stripe Checkout, order tracking (PostgreSQL via Prisma) |
| **askAI** | `src/askAI/` | 🚧 Stub | Question-answering endpoint – AI integration is a TODO |

## Quick Start

```bash
# 1. Install dependencies
npm install

# 2. Copy env template and fill in values
cp .env.example .env

# 3. Run DB migrations (requires a running PostgreSQL)
npx prisma migrate dev --name init

# 4. Start the server
npm start        # production
npm run dev      # watch mode
```

## Environment Variables

See [`.env.example`](.env.example) for the full list.

## API Routes

| Method | Path | Description |
|---|---|---|
| `GET` | `/health` | Server health check |
| `GET` | `/api/ecommerce/products` | List products |
| `GET` | `/api/ecommerce/products/:id` | Get product |
| `POST` | `/api/ecommerce/products` | Create product (admin) |
| `PATCH` | `/api/ecommerce/products/:id` | Update product (admin) |
| `POST` | `/api/ecommerce/checkout` | Create Stripe Checkout session |
| `POST` | `/api/ecommerce/webhook` | Stripe webhook handler |
| `GET` | `/api/ecommerce/orders/:id` | Get order |
| `GET` | `/api/ask-ai/health` | askAI readiness check |
| `POST` | `/api/ask-ai/ask` | Ask a question (stub) |

## Module READMEs

- [E-Commerce module](src/ecommerce/README.md)
- [askAI module](src/askAI/README.md)

## Tests

```bash
npm test
```

## Deploy on Railway

1. Create a new Railway project and link this repo
2. Add a **PostgreSQL** plugin – `DATABASE_URL` is set automatically
3. Set the remaining environment variables (Stripe keys, `ADMIN_API_KEY`, etc.)
4. Railway will use `railway.json` to build and start the service

