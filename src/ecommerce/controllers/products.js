const prisma = require('../../db');

/**
 * GET /api/ecommerce/products
 * List all active products.
 */
async function listProducts(req, res) {
  try {
    const products = await prisma.product.findMany({
      where: { active: true },
      orderBy: { createdAt: 'desc' },
    });
    res.json({ products });
  } catch (err) {
    console.error('listProducts error:', err);
    res.status(500).json({ error: 'Failed to fetch products' });
  }
}

/**
 * GET /api/ecommerce/products/:id
 * Get a single product by ID.
 */
async function getProduct(req, res) {
  try {
    const product = await prisma.product.findUnique({
      where: { id: req.params.id },
    });
    if (!product || !product.active) {
      return res.status(404).json({ error: 'Product not found' });
    }
    res.json({ product });
  } catch (err) {
    console.error('getProduct error:', err);
    res.status(500).json({ error: 'Failed to fetch product' });
  }
}

/**
 * POST /api/ecommerce/products
 * Create a new product (admin-only in production, guarded by API key middleware).
 */
async function createProduct(req, res) {
  const { name, description, price, currency, stock, imageUrl } = req.body;
  try {
    const product = await prisma.product.create({
      data: {
        name,
        description,
        price: parseInt(price, 10),
        currency: currency || 'usd',
        stock: parseInt(stock, 10) || 0,
        imageUrl,
      },
    });
    res.status(201).json({ product });
  } catch (err) {
    console.error('createProduct error:', err);
    res.status(500).json({ error: 'Failed to create product' });
  }
}

/**
 * PATCH /api/ecommerce/products/:id
 * Update a product.
 */
async function updateProduct(req, res) {
  const { name, description, price, currency, stock, imageUrl, active } =
    req.body;
  try {
    const data = {};
    if (name !== undefined) data.name = name;
    if (description !== undefined) data.description = description;
    if (price !== undefined) data.price = parseInt(price, 10);
    if (currency !== undefined) data.currency = currency;
    if (stock !== undefined) data.stock = parseInt(stock, 10);
    if (imageUrl !== undefined) data.imageUrl = imageUrl;
    if (active !== undefined) data.active = Boolean(active);

    const product = await prisma.product.update({
      where: { id: req.params.id },
      data,
    });
    res.json({ product });
  } catch (err) {
    if (err.code === 'P2025') {
      return res.status(404).json({ error: 'Product not found' });
    }
    console.error('updateProduct error:', err);
    res.status(500).json({ error: 'Failed to update product' });
  }
}

module.exports = { listProducts, getProduct, createProduct, updateProduct };
