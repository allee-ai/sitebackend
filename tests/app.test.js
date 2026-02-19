// Mock Prisma and Stripe before loading the app
jest.mock('../src/db', () => ({
  product: {
    findMany: jest.fn(),
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    updateMany: jest.fn(),
  },
  order: {
    create: jest.fn(),
    findUnique: jest.fn(),
    update: jest.fn(),
    updateMany: jest.fn(),
  },
}));

jest.mock('stripe', () => {
  return jest.fn().mockImplementation(() => ({
    checkout: {
      sessions: {
        create: jest.fn().mockResolvedValue({
          id: 'cs_test_123',
          url: 'https://checkout.stripe.com/test',
        }),
      },
    },
    webhooks: {
      constructEvent: jest.fn(),
    },
  }));
});

const request = require('supertest');
const app = require('../src/index');
const prisma = require('../src/db');

describe('Health check', () => {
  it('GET /health returns 200', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
  });
});

describe('404 handler', () => {
  it('returns 404 for unknown routes', async () => {
    const res = await request(app).get('/no-such-route');
    expect(res.status).toBe(404);
    expect(res.body.error).toBe('Not found');
  });
});

describe('E-Commerce – Products', () => {
  beforeEach(() => jest.clearAllMocks());

  it('GET /api/ecommerce/products returns product list', async () => {
    const mockProducts = [
      { id: 'prod_1', name: 'Widget', price: 999, active: true },
    ];
    prisma.product.findMany.mockResolvedValue(mockProducts);

    const res = await request(app).get('/api/ecommerce/products');
    expect(res.status).toBe(200);
    expect(res.body.products).toEqual(mockProducts);
  });

  it('GET /api/ecommerce/products/:id returns 404 for missing product', async () => {
    prisma.product.findUnique.mockResolvedValue(null);

    const res = await request(app).get('/api/ecommerce/products/nonexistent');
    expect(res.status).toBe(404);
    expect(res.body.error).toBe('Product not found');
  });

  it('GET /api/ecommerce/products/:id returns 404 for inactive product', async () => {
    prisma.product.findUnique.mockResolvedValue({
      id: 'prod_1',
      name: 'Widget',
      active: false,
    });

    const res = await request(app).get('/api/ecommerce/products/prod_1');
    expect(res.status).toBe(404);
  });

  it('GET /api/ecommerce/products/:id returns the product', async () => {
    const mockProduct = { id: 'prod_1', name: 'Widget', price: 999, active: true };
    prisma.product.findUnique.mockResolvedValue(mockProduct);

    const res = await request(app).get('/api/ecommerce/products/prod_1');
    expect(res.status).toBe(200);
    expect(res.body.product).toEqual(mockProduct);
  });

  it('POST /api/ecommerce/products returns 401 without admin key', async () => {
    // Set a key so the middleware is enforced
    process.env.ADMIN_API_KEY = 'secret';
    const res = await request(app)
      .post('/api/ecommerce/products')
      .send({ name: 'New Product', price: 500 });
    expect(res.status).toBe(401);
    delete process.env.ADMIN_API_KEY;
  });

  it('POST /api/ecommerce/products validates required fields', async () => {
    const res = await request(app)
      .post('/api/ecommerce/products')
      .send({}); // missing name and price
    expect(res.status).toBe(400);
    expect(res.body.errors).toBeDefined();
  });
});

describe('E-Commerce – Checkout', () => {
  beforeEach(() => jest.clearAllMocks());

  it('POST /api/ecommerce/checkout validates request body', async () => {
    const res = await request(app)
      .post('/api/ecommerce/checkout')
      .send({}); // missing items and customerEmail
    expect(res.status).toBe(400);
  });

  it('POST /api/ecommerce/checkout returns 400 when products not found', async () => {
    prisma.product.findMany.mockResolvedValue([]); // no products found

    const res = await request(app)
      .post('/api/ecommerce/checkout')
      .send({
        customerEmail: 'test@example.com',
        items: [{ productId: 'prod_missing', quantity: 1 }],
      });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/not found/i);
  });

  it('POST /api/ecommerce/checkout returns session URL on success', async () => {
    const mockProduct = {
      id: 'prod_1',
      name: 'Widget',
      price: 999,
      currency: 'usd',
      stock: 10,
      description: null,
      imageUrl: null,
      active: true,
    };
    prisma.product.findMany.mockResolvedValue([mockProduct]);
    prisma.order.create.mockResolvedValue({ id: 'order_1', items: [] });
    prisma.order.update.mockResolvedValue({});

    const res = await request(app)
      .post('/api/ecommerce/checkout')
      .send({
        customerEmail: 'buyer@example.com',
        items: [{ productId: 'prod_1', quantity: 1 }],
      });
    expect(res.status).toBe(200);
    expect(res.body.url).toBe('https://checkout.stripe.com/test');
    expect(res.body.orderId).toBe('order_1');
  });
});

describe('E-Commerce – Orders', () => {
  beforeEach(() => jest.clearAllMocks());

  it('GET /api/ecommerce/orders/:id returns 404 for unknown order', async () => {
    prisma.order.findUnique.mockResolvedValue(null);

    const res = await request(app).get('/api/ecommerce/orders/nonexistent');
    expect(res.status).toBe(404);
  });

  it('GET /api/ecommerce/orders/:id returns the order', async () => {
    const mockOrder = {
      id: 'order_1',
      customerEmail: 'buyer@example.com',
      status: 'PAID',
      items: [],
    };
    prisma.order.findUnique.mockResolvedValue(mockOrder);

    const res = await request(app).get('/api/ecommerce/orders/order_1');
    expect(res.status).toBe(200);
    expect(res.body.order).toEqual(mockOrder);
  });
});

describe('askAI module', () => {
  it('GET /api/ask-ai/health returns ok', async () => {
    const res = await request(app).get('/api/ask-ai/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
    expect(res.body.ready).toBe(false);
  });

  it('POST /api/ask-ai/ask returns stub answer', async () => {
    const res = await request(app)
      .post('/api/ask-ai/ask')
      .send({ question: 'What is allee-ai?' });
    expect(res.status).toBe(200);
    expect(res.body.answer).toMatch(/stub/i);
    expect(res.body.model).toBe('stub');
  });

  it('POST /api/ask-ai/ask returns 400 without question', async () => {
    const res = await request(app)
      .post('/api/ask-ai/ask')
      .send({});
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('question is required');
  });
});
