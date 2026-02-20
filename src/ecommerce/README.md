# E-Commerce Module

This module provides a complete e-commerce backend including product management, shopping cart checkout via Stripe, and order tracking stored in PostgreSQL.

## Features

- **Product catalogue** – CRUD endpoints for products (price stored in cents)
- **Stripe Checkout** – Creates hosted Stripe Checkout sessions; prices are always fetched from the database (not trusted from the client)
- **Webhook handler** – Listens to `checkout.session.completed`, `checkout.session.expired`, and `charge.refunded` to keep order status in sync
- **Order tracking** – Orders and line items are persisted in PostgreSQL via Prisma ORM
- **Admin protection** – Product creation/update requires an `ADMIN_API_KEY` bearer token

## Environment Variables

| Variable | Description |
|---|---|
| `DATABASE_URL` | PostgreSQL connection string (set automatically on Railway) |
| `STRIPE_SECRET_KEY` | Stripe secret key (`sk_live_…` or `sk_test_…`) |
| `STRIPE_WEBHOOK_SECRET` | Stripe webhook signing secret (`whsec_…`) |
| `FRONTEND_URL` | Frontend origin, e.g. `https://allee-ai.com` (used for Checkout redirect URLs) |
| `ADMIN_API_KEY` | Secret key required to create/update products |

## API Reference

### Products

| Method | Path | Auth | Description |
|---|---|---|---|
| `GET` | `/api/ecommerce/products` | Public | List all active products |
| `GET` | `/api/ecommerce/products/:id` | Public | Get a single product |
| `POST` | `/api/ecommerce/products` | Admin | Create a product |
| `PATCH` | `/api/ecommerce/products/:id` | Admin | Update a product |

**Create / update product body fields:**

```json
{
  "name": "My Product",
  "description": "Optional description",
  "price": 2999,
  "currency": "usd",
  "stock": 100,
  "imageUrl": "https://example.com/image.png",
  "active": true
}
```

> `price` is always in the **smallest currency unit** (cents for USD).

### Checkout

#### `POST /api/ecommerce/checkout`

Initiates a Stripe Checkout session. Returns a `url` to redirect the user to.

**Request body:**
```json
{
  "customerEmail": "customer@example.com",
  "items": [
    { "productId": "clxxx123", "quantity": 2 }
  ]
}
```

**Response:**
```json
{
  "url": "https://checkout.stripe.com/...",
  "sessionId": "cs_test_...",
  "orderId": "clxxx456"
}
```

Configure your Stripe Dashboard to send webhooks to:

```
https://your-railway-app.up.railway.app/api/ecommerce/webhook
```

Recommended events:
- `checkout.session.completed`
- `checkout.session.expired`
- `charge.refunded`

### Orders

#### `GET /api/ecommerce/orders/:id`

Returns an order with its line items and associated product details.

## Database Schema

See [`prisma/schema.prisma`](../../prisma/schema.prisma) for the full schema.

Key models: `Product`, `Order`, `OrderItem`.

## Database Migrations

```bash
# Generate and apply migrations locally
npx prisma migrate dev --name init

# Apply migrations in production (Railway deploy command)
npx prisma migrate deploy
```
