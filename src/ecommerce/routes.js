const express = require('express');
const router = express.Router();
const { body, param, validationResult } = require('express-validator');

const {
  listProducts,
  getProduct,
  createProduct,
  updateProduct,
} = require('./controllers/products');
const {
  createCheckoutSession,
  handleWebhook,
  getOrder,
} = require('./controllers/payments');
const { requireAdminKey } = require('./middleware/auth');

// Validation helper
function validate(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  next();
}

// ─── Products ────────────────────────────────────────────────────────────────

router.get('/products', listProducts);

router.get(
  '/products/:id',
  [param('id').isString().notEmpty()],
  validate,
  getProduct
);

router.post(
  '/products',
  requireAdminKey,
  [
    body('name').isString().notEmpty().withMessage('name is required'),
    body('price')
      .isInt({ min: 1 })
      .withMessage('price must be a positive integer (cents)'),
  ],
  validate,
  createProduct
);

router.patch(
  '/products/:id',
  requireAdminKey,
  [param('id').isString().notEmpty()],
  validate,
  updateProduct
);

// ─── Checkout ────────────────────────────────────────────────────────────────

router.post(
  '/checkout',
  [
    body('items')
      .isArray({ min: 1 })
      .withMessage('items must be a non-empty array'),
    body('items.*.productId')
      .isString()
      .notEmpty()
      .withMessage('each item must have a productId'),
    body('items.*.quantity')
      .isInt({ min: 1 })
      .withMessage('each item quantity must be >= 1'),
    body('customerEmail').isEmail().withMessage('valid customerEmail is required'),
  ],
  validate,
  createCheckoutSession
);

// ─── Webhook ─────────────────────────────────────────────────────────────────
// NOTE: raw body is required for Stripe signature verification.
// This route uses express.raw() instead of express.json().
router.post(
  '/webhook',
  express.raw({ type: 'application/json' }),
  handleWebhook
);

// ─── Orders ──────────────────────────────────────────────────────────────────

router.get(
  '/orders/:id',
  [param('id').isString().notEmpty()],
  validate,
  getOrder
);

module.exports = router;
