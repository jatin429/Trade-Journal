const express = require('express');
const router = express.Router();
const { getModels } = require('../models');

/**
 * GET /api/journal - Get recent daily journal entries
 */
router.get('/', async (req, res) => {
  try {
    const { DailyJournal } = getModels();
    const journals = await DailyJournal.findAll({
      order: [['date', 'DESC']],
      limit: 30,
    });
    res.json({ success: true, journals });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * GET /api/journal/:date - Get single journal entry by date (YYYY-MM-DD)
 */
router.get('/:date', async (req, res) => {
  try {
    const { DailyJournal } = getModels();
    const journal = await DailyJournal.findOne({
      where: { date: req.params.date },
    });
    res.json({ success: true, journal });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/journal - Save or update daily journal
 */
router.post('/', async (req, res) => {
  try {
    const { DailyJournal } = getModels();
    const { date, marketOutlook, preMarketPrep, postMarketReview, disciplineRating, emotionalState, dailyTargetPnl, maxDailyRisk } = req.body;

    const targetDate = date || new Date().toISOString().split('T')[0];

    let [journal, created] = await DailyJournal.findOrCreate({
      where: { date: targetDate },
      defaults: {
        marketOutlook: marketOutlook || 'Neutral',
        preMarketPrep: preMarketPrep || '',
        postMarketReview: postMarketReview || '',
        disciplineRating: disciplineRating || 5,
        emotionalState: emotionalState || 'Calm & Focused',
        dailyTargetPnl: dailyTargetPnl || 0,
        maxDailyRisk: maxDailyRisk || 0,
      }
    });

    if (!created) {
      await journal.update({
        marketOutlook: marketOutlook !== undefined ? marketOutlook : journal.marketOutlook,
        preMarketPrep: preMarketPrep !== undefined ? preMarketPrep : journal.preMarketPrep,
        postMarketReview: postMarketReview !== undefined ? postMarketReview : journal.postMarketReview,
        disciplineRating: disciplineRating !== undefined ? disciplineRating : journal.disciplineRating,
        emotionalState: emotionalState !== undefined ? emotionalState : journal.emotionalState,
        dailyTargetPnl: dailyTargetPnl !== undefined ? dailyTargetPnl : journal.dailyTargetPnl,
        maxDailyRisk: maxDailyRisk !== undefined ? maxDailyRisk : journal.maxDailyRisk,
      });
    }

    res.json({ success: true, journal });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
