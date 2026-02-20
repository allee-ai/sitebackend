const express = require('express');
const router = express.Router();

/**
 * POST /api/ask-ai/ask
 *
 * STUB – Returns a placeholder response.
 * Replace the handler body with your AI integration
 * (e.g. OpenAI, Anthropic, custom model endpoint).
 */
router.post('/ask', (req, res) => {
  const { question } = req.body;

  if (!question || typeof question !== 'string' || !question.trim()) {
    return res.status(400).json({ error: 'question is required' });
  }

  // TODO: integrate AI provider here
  res.json({
    answer: `[stub] Received your question: "${question.trim()}"`,
    model: 'stub',
    usage: null,
  });
});

/**
 * GET /api/ask-ai/health
 * Simple health/readiness check for the askAI module.
 */
router.get('/health', (req, res) => {
  res.json({ status: 'ok', module: 'askAI', ready: false });
});

module.exports = router;
