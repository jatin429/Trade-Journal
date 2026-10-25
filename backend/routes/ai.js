const express = require('express');
const router = express.Router();
const { getModels } = require('../models');
const TradeMindAgent = require('../services/aiAnalystAgent');
const { 
  generateEvidenceBasedInsights, 
  simulateTradingRules, 
  calculateTradeStats, 
  analyzeTraderProgress 
} = require('../services/analyticsEngine');

/**
 * GET /api/ai/progress-audit - Comprehensive progress & behavioral diagnostic
 */
router.get('/progress-audit', async (req, res) => {
  try {
    const { Trade, Playbook } = getModels();
    const trades = await Trade.findAll({
      order: [['entryTime', 'ASC']],
      include: [{ model: Playbook, as: 'playbook' }],
    });

    const progress = analyzeTraderProgress(trades);
    res.json({ success: true, progress });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/ai/chat - Grounded AI Analyst query
 */
router.post('/chat', async (req, res) => {
  try {
    const { message, conversationHistory, apiKey, llmProvider } = req.body;
    if (!message) {
      return res.status(400).json({ success: false, error: 'Query message is required' });
    }

    const models = getModels();
    const agent = new TradeMindAgent(models);

    const result = await agent.processQuery({
      query: message,
      conversationHistory: conversationHistory || [],
      apiKey,
      llmProvider,
    });

    res.json({
      success: true,
      reply: result.reply,
      toolUsed: result.toolUsed,
      toolResult: result.toolResult,
    });
  } catch (err) {
    console.error('[AI Chat Route Error]:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * GET /api/ai/insights - Automatic evidence-based insights
 */
router.get('/insights', async (req, res) => {
  try {
    const { Trade } = getModels();
    const trades = await Trade.findAll({
      order: [['entryTime', 'ASC']],
    });

    const stats = calculateTradeStats(trades);
    const insights = generateEvidenceBasedInsights(trades);

    res.json({
      success: true,
      stats,
      insights,
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/ai/simulate - Direct counterfactual rule simulation
 */
router.post('/simulate', async (req, res) => {
  try {
    const { ruleType = 'maxTradesPerDay', params = { limit: 2 } } = req.body;
    const { Trade } = getModels();
    const trades = await Trade.findAll({
      order: [['entryTime', 'ASC']],
    });

    const simulation = simulateTradingRules(trades, ruleType, params);
    res.json({ success: true, simulation });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
