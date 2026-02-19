const Stripe = require('stripe');
const prisma = require('../../db');

const stripe = Stripe(process.env.STRIPE_SECRET_KEY);

/**
 * POST /api/ecommerce/checkout
 * Create a Stripe Checkout Session for the supplied cart items.
 *
 * Body: { items: [{ productId, quantity }], customerEmail }
 */
async function createCheckoutSession(req, res) {
  const { items, customerEmail } = req.body;

  if (!items || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: 'items array is required' });
  }

  try {
    // Fetch products from DB to get authoritative prices
    const productIds = items.map((i) => i.productId);
    const products = await prisma.product.findMany({
      where: { id: { in: productIds }, active: true },
    });

    if (products.length !== productIds.length) {
      return res
        .status(400)
        .json({ error: 'One or more products not found or inactive' });
    }

    // Build a map for quick lookup
    const productMap = Object.fromEntries(products.map((p) => [p.id, p]));

    // Validate stock
    for (const item of items) {
      const product = productMap[item.productId];
      if (product.stock < item.quantity) {
        return res.status(400).json({
          error: `Insufficient stock for product: ${product.name}`,
        });
      }
    }

    // Build Stripe line items
    const lineItems = items.map((item) => ({
      price_data: {
        currency: productMap[item.productId].currency,
        product_data: {
          name: productMap[item.productId].name,
          description: productMap[item.productId].description || undefined,
          images: productMap[item.productId].imageUrl
            ? [productMap[item.productId].imageUrl]
            : [],
        },
        unit_amount: productMap[item.productId].price,
      },
      quantity: item.quantity,
    }));

    const totalAmount = items.reduce(
      (sum, item) => sum + productMap[item.productId].price * item.quantity,
      0
    );

    // Create an Order record (PENDING until payment confirmed)
    const order = await prisma.order.create({
      data: {
        customerEmail,
        status: 'PENDING',
        totalAmount,
        currency: products[0].currency,
        items: {
          create: items.map((item) => ({
            productId: item.productId,
            quantity: item.quantity,
            unitPrice: productMap[item.productId].price,
          })),
        },
      },
    });

    // Create Stripe Checkout Session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      mode: 'payment',
      customer_email: customerEmail,
      line_items: lineItems,
      metadata: { orderId: order.id },
      success_url: `${process.env.FRONTEND_URL}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.FRONTEND_URL}/checkout/cancel`,
    });

    // Save the session ID on the order
    await prisma.order.update({
      where: { id: order.id },
      data: { stripeSessionId: session.id },
    });

    res.json({ url: session.url, sessionId: session.id, orderId: order.id });
  } catch (err) {
    console.error('createCheckoutSession error:', err);
    res.status(500).json({ error: 'Failed to create checkout session' });
  }
}

/**
 * POST /api/ecommerce/webhook
 * Handle Stripe webhook events (e.g. payment succeeded/failed).
 * Requires raw body – see routes.js for express.raw() usage.
 */
async function handleWebhook(req, res) {
  const sig = req.headers['stripe-signature'];
  let event;

  try {
    event = stripe.webhooks.constructEvent(
      req.body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    console.error('Webhook signature verification failed:', err.message);
    return res.status(400).json({ error: `Webhook Error: ${err.message}` });
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object;
        const orderId = session.metadata?.orderId;
        if (!orderId) break;

        // Atomically mark as PAID and decrement stock
        await prisma.$transaction(async (tx) => {
          await tx.order.update({
            where: { id: orderId },
            data: {
              status: 'PAID',
              stripePaymentIntentId: session.payment_intent,
            },
          });

          const order = await tx.order.findUnique({
            where: { id: orderId },
            include: { items: true },
          });
          for (const item of order.items) {
            await tx.product.update({
              where: { id: item.productId },
              data: { stock: { decrement: item.quantity } },
            });
          }
        });
        break;
      }

      case 'checkout.session.expired': {
        const session = event.data.object;
        const orderId = session.metadata?.orderId;
        if (orderId) {
          await prisma.order.update({
            where: { id: orderId },
            data: { status: 'CANCELLED' },
          });
        }
        break;
      }

      case 'charge.refunded': {
        const charge = event.data.object;
        const paymentIntentId = charge.payment_intent;
        if (paymentIntentId) {
          // Atomically mark order REFUNDED and restore stock
          await prisma.$transaction(async (tx) => {
            const orders = await tx.order.findMany({
              where: { stripePaymentIntentId: paymentIntentId },
              include: { items: true },
            });
            for (const order of orders) {
              await tx.order.update({
                where: { id: order.id },
                data: { status: 'REFUNDED' },
              });
              for (const item of order.items) {
                await tx.product.update({
                  where: { id: item.productId },
                  data: { stock: { increment: item.quantity } },
                });
              }
            }
          });
        }
        break;
      }

      default:
        // Unhandled event type – ignore
        break;
    }

    res.json({ received: true });
  } catch (err) {
    console.error('Webhook handler error:', err);
    res.status(500).json({ error: 'Webhook processing failed' });
  }
}

/**
 * GET /api/ecommerce/orders/:id
 * Retrieve an order and its items.
 */
async function getOrder(req, res) {
  try {
    const order = await prisma.order.findUnique({
      where: { id: req.params.id },
      include: {
        items: {
          include: { product: true },
        },
      },
    });
    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }
    res.json({ order });
  } catch (err) {
    console.error('getOrder error:', err);
    res.status(500).json({ error: 'Failed to fetch order' });
  }
}

module.exports = { createCheckoutSession, handleWebhook, getOrder };
