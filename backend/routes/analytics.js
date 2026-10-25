const express = require('express');
const router = express.Router();
const { getModels } = require('../models');

/**
 * GET /api/analytics/summary
 * Master performance dashboard metrics
 */
router.get('/summary', async (req, res) => {
  try {
    const { Trade } = getModels();
    const trades = await Trade.findAll({
      order: [['entryTime', 'ASC']],
    });

    if (trades.length === 0) {
      return res.json({
        success: true,
        stats: {
          totalTrades: 0,
          winners: 0,
          losers: 0,
          breakeven: 0,
          winRate: 0,
          grossPnl: 0,
          netPnl: 0,
          todayNetPnl: 0,
          totalCharges: 0,
          profitFactor: 0,
          avgWin: 0,
          avgLoss: 0,
          expectancy: 0,
          maxDrawdown: 0,
          avgRMultiple: 0,
          rulesFollowedRate: 100,
          chargesBreakdown: { stt: 0, gst: 0, exchange: 0, stampDuty: 0, brokerage: 0 },
        }
      });
    }

    let winners = 0;
    let losers = 0;
    let breakeven = 0;
    let totalWinPnl = 0;
    let totalLossPnl = 0;
    let grossPnl = 0;
    let netPnl = 0;
    let totalCharges = 0;
    let sumR = 0;
    let rulesFollowedCount = 0;
    let todayNetPnl = 0;
    const todayIso = new Date().toISOString().split('T')[0];

    let peakCumulative = 0;
    let currentCumulative = 0;
    let maxDrawdown = 0;

    const chargesBreakdown = { stt: 0, gst: 0, exchangeCharges: 0, stampDuty: 0, brokerage: 0 };
    const emotionsCount = {};
    const dayOfWeekStats = {};

    trades.forEach(t => {
      const net = t.netPnl || 0;
      const gross = t.grossPnl || 0;
      grossPnl += gross;
      netPnl += net;
      sumR += (t.rMultiple || 0);

      const tradeDate = t.entryTime ? new Date(t.entryTime).toISOString().split('T')[0] : '';
      if (tradeDate === todayIso) {
        todayNetPnl += net;
      }

      if (t.rulesFollowed) rulesFollowedCount++;

      if (net > 0) {
        winners++;
        totalWinPnl += net;
      } else if (net < 0) {
        losers++;
        totalLossPnl += Math.abs(net);
      } else {
        breakeven++;
      }

      // Drawdown calculation
      currentCumulative += net;
      if (currentCumulative > peakCumulative) {
        peakCumulative = currentCumulative;
      }
      const drawdown = peakCumulative - currentCumulative;
      if (drawdown > maxDrawdown) {
        maxDrawdown = drawdown;
      }

      // Sum charges safely
      let charges = t.charges;
      if (typeof charges === 'string') {
        try { charges = JSON.parse(charges); } catch (e) { charges = {}; }
      }
      if (charges && typeof charges === 'object') {
        chargesBreakdown.stt += (charges.stt || 0);
        chargesBreakdown.gst += (charges.gst || 0);
        chargesBreakdown.exchangeCharges += (charges.exchangeCharges || 0);
        chargesBreakdown.stampDuty += (charges.stampDuty || 0);
        chargesBreakdown.brokerage += (charges.brokerage || 0);
        totalCharges += (charges.totalCharges || 0);
      }

      // Emotion tracking safely
      let emotions = t.emotions;
      if (typeof emotions === 'string') {
        try { emotions = JSON.parse(emotions); } catch (e) { emotions = [emotions]; }
      }
      if (Array.isArray(emotions)) {
        emotions.forEach(e => {
          emotionsCount[e] = (emotionsCount[e] || 0) + 1;
        });
      }

      // Day of week
      const dow = t.dayOfWeek || 'Other';
      if (!dayOfWeekStats[dow]) dayOfWeekStats[dow] = { count: 0, pnl: 0, wins: 0 };
      dayOfWeekStats[dow].count++;
      dayOfWeekStats[dow].pnl += net;
      if (net > 0) dayOfWeekStats[dow].wins++;
    });

    const totalTrades = trades.length;
    const closedTrades = winners + losers + breakeven;
    const winRate = closedTrades > 0 ? Number(((winners / closedTrades) * 100).toFixed(1)) : 0;
    const avgWin = winners > 0 ? Number((totalWinPnl / winners).toFixed(2)) : 0;
    const avgLoss = losers > 0 ? Number((totalLossPnl / losers).toFixed(2)) : 0;
    const profitFactor = totalLossPnl > 0 ? Number((totalWinPnl / totalLossPnl).toFixed(2)) : (totalWinPnl > 0 ? 99.9 : 0);
    const avgRMultiple = closedTrades > 0 ? Number((sumR / closedTrades).toFixed(2)) : 0;
    const rulesFollowedRate = totalTrades > 0 ? Number(((rulesFollowedCount / totalTrades) * 100).toFixed(1)) : 100;

    // Mathematical trading expectancy per trade
    const winProb = winRate / 100;
    const lossProb = 1 - winProb;
    const expectancy = Number(((winProb * avgWin) - (lossProb * avgLoss)).toFixed(2));

    res.json({
      success: true,
      stats: {
        totalTrades,
        winners,
        losers,
        breakeven,
        winRate,
        grossPnl: Number(grossPnl.toFixed(2)),
        netPnl: Number(netPnl.toFixed(2)),
        todayNetPnl: Number(todayNetPnl.toFixed(2)),
        totalCharges: Number(totalCharges.toFixed(2)),
        profitFactor,
        avgWin,
        avgLoss,
        expectancy,
        maxDrawdown: Number(maxDrawdown.toFixed(2)),
        avgRMultiple,
        rulesFollowedRate,
        chargesBreakdown: {
          stt: Number(chargesBreakdown.stt.toFixed(2)),
          gst: Number(chargesBreakdown.gst.toFixed(2)),
          exchangeCharges: Number(chargesBreakdown.exchangeCharges.toFixed(2)),
          stampDuty: Number(chargesBreakdown.stampDuty.toFixed(2)),
          brokerage: Number(chargesBreakdown.brokerage.toFixed(2)),
        },
        emotionsBreakdown: emotionsCount,
        dayOfWeekBreakdown: dayOfWeekStats,
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * GET /api/analytics/calendar
 * Daily P&L heatmap data
 */
router.get('/calendar', async (req, res) => {
  try {
    const { Trade } = getModels();
    const trades = await Trade.findAll({
      order: [['entryTime', 'ASC']],
    });

    const calendarMap = {};

    trades.forEach(t => {
      const dateStr = t.entryTime ? new Date(t.entryTime).toISOString().split('T')[0] : 'Unknown';
      if (!calendarMap[dateStr]) {
        calendarMap[dateStr] = {
          date: dateStr,
          netPnl: 0,
          grossPnl: 0,
          tradesCount: 0,
          winCount: 0,
          lossCount: 0,
          trades: [],
        };
      }

      calendarMap[dateStr].netPnl = Number((calendarMap[dateStr].netPnl + (t.netPnl || 0)).toFixed(2));
      calendarMap[dateStr].grossPnl = Number((calendarMap[dateStr].grossPnl + (t.grossPnl || 0)).toFixed(2));
      calendarMap[dateStr].tradesCount += 1;
      if (t.netPnl > 0) calendarMap[dateStr].winCount += 1;
      if (t.netPnl < 0) calendarMap[dateStr].lossCount += 1;
      calendarMap[dateStr].trades.push({
        id: t.id,
        symbol: t.symbol,
        netPnl: t.netPnl,
        status: t.status,
        strategyName: t.strategyName,
      });
    });

    res.json({ success: true, calendar: Object.values(calendarMap) });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * GET /api/analytics/equity-curve
 * Chronological equity growth curve points
 */
router.get('/equity-curve', async (req, res) => {
  try {
    const { Trade } = getModels();
    const trades = await Trade.findAll({
      order: [['entryTime', 'ASC']],
    });

    let runningPnl = 0;
    let peak = 0;

    const curve = trades.map((t, idx) => {
      runningPnl = Number((runningPnl + (t.netPnl || 0)).toFixed(2));
      if (runningPnl > peak) peak = runningPnl;
      const drawdown = Number((peak - runningPnl).toFixed(2));

      return {
        tradeIndex: idx + 1,
        date: t.entryTime ? new Date(t.entryTime).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' }) : `T${idx+1}`,
        symbol: t.symbol,
        netPnl: t.netPnl,
        cumulativePnl: runningPnl,
        drawdown: -drawdown,
        status: t.status,
      };
    });

    res.json({ success: true, curve });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * GET /api/analytics/breakdowns
 * Category breakdowns by Strategy, Asset Class, and Sessions
 */
router.get('/breakdowns', async (req, res) => {
  try {
    const { Trade } = getModels();
    const trades = await Trade.findAll();

    const byStrategy = {};
    const byAsset = {};
    const bySession = {};

    trades.forEach(t => {
      // By Strategy
      const strat = t.strategyName || 'Discretionary';
      if (!byStrategy[strat]) byStrategy[strat] = { name: strat, pnl: 0, count: 0, wins: 0 };
      byStrategy[strat].count++;
      byStrategy[strat].pnl = Number((byStrategy[strat].pnl + (t.netPnl || 0)).toFixed(2));
      if (t.netPnl > 0) byStrategy[strat].wins++;

      // By Asset Class
      const asset = t.assetClass || 'EQUITY';
      if (!byAsset[asset]) byAsset[asset] = { name: asset, pnl: 0, count: 0, wins: 0 };
      byAsset[asset].count++;
      byAsset[asset].pnl = Number((byAsset[asset].pnl + (t.netPnl || 0)).toFixed(2));
      if (t.netPnl > 0) byAsset[asset].wins++;

      // By Session (Time of Day)
      const sess = t.timeOfDay || 'Morning';
      if (!bySession[sess]) bySession[sess] = { name: sess, pnl: 0, count: 0, wins: 0 };
      bySession[sess].count++;
      bySession[sess].pnl = Number((bySession[sess].pnl + (t.netPnl || 0)).toFixed(2));
      if (t.netPnl > 0) bySession[sess].wins++;
    });

    res.json({
      success: true,
      byStrategy: Object.values(byStrategy),
      byAsset: Object.values(byAsset),
      bySession: Object.values(bySession),
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
