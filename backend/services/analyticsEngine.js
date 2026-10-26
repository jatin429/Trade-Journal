/**
 * TradeMind Deterministic Analytics & Simulation Engine
 * 
 * Performs audited, accurate financial and statistical calculations directly on trade records.
 * The AI uses these verified figures and never computes financial metrics from scratch.
 */

const { Op } = require('sequelize');

/**
 * Calculates master performance statistics over a list of trades
 */
function calculateTradeStats(trades = [], options = {}) {
  const totalTrades = trades.length;

  if (totalTrades === 0) {
    return {
      hasData: false,
      sampleSize: 0,
      totalTrades: 0,
      closedTrades: 0,
      openTrades: 0,
      winners: 0,
      losers: 0,
      breakeven: 0,
      winRate: 0,
      lossRate: 0,
      grossPnl: 0,
      netPnl: 0,
      totalCharges: 0,
      profitFactor: 0,
      avgWin: 0,
      avgLoss: 0,
      winLossRatio: 0,
      expectancy: 0,
      maxDrawdown: 0,
      avgRMultiple: 0,
      totalR: 0,
      rulesFollowedRate: 100,
      sampleWarning: 'No trade records found for the requested criteria.',
    };
  }

  let winners = 0;
  let losers = 0;
  let breakeven = 0;
  let openTrades = 0;

  let totalWinPnl = 0;
  let totalLossPnl = 0;
  let grossPnl = 0;
  let netPnl = 0;
  let totalCharges = 0;
  let sumR = 0;
  let rulesFollowedCount = 0;

  let peakCumulative = 0;
  let currentCumulative = 0;
  let maxDrawdown = 0;

  const chargesBreakdown = {
    stt: 0,
    gst: 0,
    exchangeCharges: 0,
    stampDuty: 0,
    brokerage: 0,
  };

  // Sort chronologically for accurate cumulative drawdown calculation
  const sorted = [...trades].sort((a, b) => new Date(a.entryTime) - new Date(b.entryTime));

  sorted.forEach(t => {
    if (t.status === 'OPEN') {
      openTrades++;
      return;
    }

    const net = Number(t.netPnl || 0);
    const gross = Number(t.grossPnl || 0);
    grossPnl += gross;
    netPnl += net;
    sumR += Number(t.rMultiple || 0);

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

    // Cumulative Drawdown tracking
    currentCumulative += net;
    if (currentCumulative > peakCumulative) {
      peakCumulative = currentCumulative;
    }
    const dd = peakCumulative - currentCumulative;
    if (dd > maxDrawdown) {
      maxDrawdown = dd;
    }

    // Charges summation
    let chg = t.charges;
    if (typeof chg === 'string') {
      try { chg = JSON.parse(chg); } catch (e) { chg = {}; }
    }
    if (chg && typeof chg === 'object') {
      chargesBreakdown.stt += Number(chg.stt || 0);
      chargesBreakdown.gst += Number(chg.gst || 0);
      chargesBreakdown.exchangeCharges += Number(chg.exchangeCharges || 0);
      chargesBreakdown.stampDuty += Number(chg.stampDuty || 0);
      chargesBreakdown.brokerage += Number(chg.brokerage || 0);
      totalCharges += Number(chg.totalCharges || 0);
    }
  });

  const closedTrades = winners + losers + breakeven;
  const winRate = closedTrades > 0 ? Number(((winners / closedTrades) * 100).toFixed(1)) : 0;
  const lossRate = closedTrades > 0 ? Number(((losers / closedTrades) * 100).toFixed(1)) : 0;
  const avgWin = winners > 0 ? Number((totalWinPnl / winners).toFixed(2)) : 0;
  const avgLoss = losers > 0 ? Number((totalLossPnl / losers).toFixed(2)) : 0;
  const profitFactor = totalLossPnl > 0 ? Number((totalWinPnl / totalLossPnl).toFixed(2)) : (totalWinPnl > 0 ? 99.9 : 0);
  const winLossRatio = avgLoss > 0 ? Number((avgWin / avgLoss).toFixed(2)) : (avgWin > 0 ? 99.9 : 0);
  const avgRMultiple = closedTrades > 0 ? Number((sumR / closedTrades).toFixed(2)) : 0;
  const rulesFollowedRate = totalTrades > 0 ? Number(((rulesFollowedCount / totalTrades) * 100).toFixed(1)) : 100;

  // Mathematical trading expectancy per trade = (Win Rate * Avg Win) - (Loss Rate * Avg Loss)
  const winProb = winRate / 100;
  const lossProb = lossRate / 100;
  const expectancy = Number(((winProb * avgWin) - (lossProb * avgLoss)).toFixed(2));

  // Sample size qualification
  let sampleWarning = null;
  if (closedTrades > 0 && closedTrades < 10) {
    sampleWarning = `Sample size is very small (${closedTrades} trades). Statistical reliability is low; treat figures with caution.`;
  } else if (closedTrades >= 10 && closedTrades < 30) {
    sampleWarning = `Moderate sample size (${closedTrades} trades). Trends are indicative but require more observations.`;
  }

  return {
    hasData: closedTrades > 0,
    sampleSize: closedTrades,
    totalTrades,
    closedTrades,
    openTrades,
    winners,
    losers,
    breakeven,
    winRate,
    lossRate,
    grossPnl: Number(grossPnl.toFixed(2)),
    netPnl: Number(netPnl.toFixed(2)),
    totalWinPnl: Number(totalWinPnl.toFixed(2)),
    totalLossPnl: Number(totalLossPnl.toFixed(2)),
    totalCharges: Number(totalCharges.toFixed(2)),
    profitFactor,
    avgWin,
    avgLoss,
    winLossRatio,
    expectancy,
    maxDrawdown: Number(maxDrawdown.toFixed(2)),
    avgRMultiple,
    totalR: Number(sumR.toFixed(2)),
    rulesFollowedRate,
    chargesBreakdown: {
      stt: Number(chargesBreakdown.stt.toFixed(2)),
      gst: Number(chargesBreakdown.gst.toFixed(2)),
      exchangeCharges: Number(chargesBreakdown.exchangeCharges.toFixed(2)),
      stampDuty: Number(chargesBreakdown.stampDuty.toFixed(2)),
      brokerage: Number(chargesBreakdown.brokerage.toFixed(2)),
    },
    sampleWarning,
  };
}

/**
 * Compares performance across two date ranges (e.g., this week vs last week, or this month vs last month)
 */
function compareTradePeriods(periodA = { label: 'Current Period', trades: [] }, periodB = { label: 'Previous Period', trades: [] }) {
  const statsA = calculateTradeStats(periodA.trades);
  const statsB = calculateTradeStats(periodB.trades);

  const deltaPnl = Number((statsA.netPnl - statsB.netPnl).toFixed(2));
  const deltaWinRate = Number((statsA.winRate - statsB.winRate).toFixed(1));
  const deltaTrades = statsA.closedTrades - statsB.closedTrades;
  const deltaProfitFactor = Number((statsA.profitFactor - statsB.profitFactor).toFixed(2));
  const deltaExpectancy = Number((statsA.expectancy - statsB.expectancy).toFixed(2));

  return {
    periodA: { label: periodA.label, stats: statsA },
    periodB: { label: periodB.label, stats: statsB },
    comparison: {
      deltaPnl,
      deltaWinRate,
      deltaTrades,
      deltaProfitFactor,
      deltaExpectancy,
      improved: deltaPnl > 0,
      summaryText: deltaPnl >= 0 
        ? `Net P&L improved by ₹${Math.abs(deltaPnl).toLocaleString('en-IN')} with a win rate change of ${deltaWinRate > 0 ? `+${deltaWinRate}%` : `${deltaWinRate}%`}.`
        : `Net P&L declined by ₹${Math.abs(deltaPnl).toLocaleString('en-IN')} with a win rate change of ${deltaWinRate > 0 ? `+${deltaWinRate}%` : `${deltaWinRate}%`}.`,
    }
  };
}

/**
 * Breakdown performance by Trading Strategy / Playbook
 */
function analyzeStrategyPerformance(trades = []) {
  const groups = {};

  trades.forEach(t => {
    const strat = (t.strategyName || 'Discretionary').trim();
    if (!groups[strat]) groups[strat] = [];
    groups[strat].push(t);
  });

  const breakdown = Object.keys(groups).map(name => {
    const stratTrades = groups[name];
    const stats = calculateTradeStats(stratTrades);
    return {
      strategyName: name,
      sampleSize: stats.closedTrades,
      winRate: stats.winRate,
      netPnl: stats.netPnl,
      grossPnl: stats.grossPnl,
      profitFactor: stats.profitFactor,
      expectancy: stats.expectancy,
      avgWin: stats.avgWin,
      avgLoss: stats.avgLoss,
      avgRMultiple: stats.avgRMultiple,
      sampleWarning: stats.sampleWarning,
    };
  });

  // Sort best to worst by Net P&L
  breakdown.sort((a, b) => b.netPnl - a.netPnl);

  const bestStrategy = breakdown.length > 0 && breakdown[0].netPnl > 0 ? breakdown[0] : null;
  const worstStrategy = breakdown.length > 0 && breakdown[breakdown.length - 1].netPnl < 0 ? breakdown[breakdown.length - 1] : null;

  return {
    strategies: breakdown,
    bestStrategy,
    worstStrategy,
    totalStrategiesTracked: breakdown.length,
  };
}

/**
 * Breakdown performance by Instrument & Asset Class (e.g. NIFTY Options vs BANKNIFTY Options vs Equities)
 */
function analyzeInstrumentPerformance(trades = []) {
  const byInstrument = {};
  const byAssetClass = {};

  trades.forEach(t => {
    // Extract root ticker: e.g. "NIFTY 24500 CE" -> "NIFTY", "RELIANCE" -> "RELIANCE"
    const rawSym = (t.symbol || 'UNKNOWN').toUpperCase().trim();
    let root = rawSym.split(' ')[0];
    if (root.includes('BANKNIFTY')) root = 'BANKNIFTY';
    else if (root.includes('FINNIFTY')) root = 'FINNIFTY';
    else if (root.includes('MIDCPNIFTY')) root = 'MIDCPNIFTY';
    else if (root.includes('NIFTY')) root = 'NIFTY';

    if (!byInstrument[root]) byInstrument[root] = [];
    byInstrument[root].push(t);

    const asset = t.assetClass || 'EQUITY';
    if (!byAssetClass[asset]) byAssetClass[asset] = [];
    byAssetClass[asset].push(t);
  });

  const instrumentStats = Object.keys(byInstrument).map(inst => {
    const stats = calculateTradeStats(byInstrument[inst]);
    return {
      instrument: inst,
      ...stats,
    };
  }).sort((a, b) => b.netPnl - a.netPnl);

  const assetClassStats = Object.keys(byAssetClass).map(asset => {
    const stats = calculateTradeStats(byAssetClass[asset]);
    return {
      assetClass: asset,
      ...stats,
    };
  }).sort((a, b) => b.netPnl - a.netPnl);

  return {
    byInstrument: instrumentStats,
    byAssetClass: assetClassStats,
  };
}

/**
 * Breakdown performance by Day of Week and Session Time
 */
function analyzeSessionAndTiming(trades = []) {
  const dayMap = {
    Monday: [],
    Tuesday: [],
    Wednesday: [],
    Thursday: [],
    Friday: [],
  };

  const sessionMap = {
    Morning: [],    // 9:15 - 11:30
    MidDay: [],     // 11:30 - 13:30
    Afternoon: [],  // 13:30 - 15:30
  };

  const daysOfWeek = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

  trades.forEach(t => {
    const entryDate = t.entryTime ? new Date(t.entryTime) : null;
    if (entryDate) {
      const dayName = daysOfWeek[entryDate.getDay()];
      if (dayMap[dayName]) dayMap[dayName].push(t);

      const hour = entryDate.getHours();
      const minute = entryDate.getMinutes();
      const timeInMinutes = (hour * 60) + minute;

      // 9:15 AM = 555 min, 11:30 AM = 690 min, 13:30 PM = 810 min
      if (timeInMinutes < 690) {
        sessionMap.Morning.push(t);
      } else if (timeInMinutes < 810) {
        sessionMap.MidDay.push(t);
      } else {
        sessionMap.Afternoon.push(t);
      }
    }
  });

  const dayBreakdown = Object.keys(dayMap).map(day => {
    const stats = calculateTradeStats(dayMap[day]);
    return {
      day,
      tradesCount: stats.closedTrades,
      winRate: stats.winRate,
      netPnl: stats.netPnl,
      profitFactor: stats.profitFactor,
    };
  });

  const sessionBreakdown = Object.keys(sessionMap).map(session => {
    const stats = calculateTradeStats(sessionMap[session]);
    return {
      session,
      tradesCount: stats.closedTrades,
      winRate: stats.winRate,
      netPnl: stats.netPnl,
      profitFactor: stats.profitFactor,
    };
  });

  return {
    days: dayBreakdown,
    sessions: sessionBreakdown,
  };
}

/**
 * Psychological & Behavioral Audit:
 * Analyzes rule adherence vs violation, and emotional leaks (FOMO, Revenge, Overtrading).
 */
function analyzeBehaviorAndRules(trades = []) {
  const rulesFollowedTrades = [];
  const rulesBrokenTrades = [];
  const emotionBuckets = {};

  trades.forEach(t => {
    if (t.rulesFollowed) {
      rulesFollowedTrades.push(t);
    } else {
      rulesBrokenTrades.push(t);
    }

    let emotions = t.emotions;
    if (typeof emotions === 'string') {
      try { emotions = JSON.parse(emotions); } catch (e) { emotions = [emotions]; }
    }
    if (Array.isArray(emotions)) {
      emotions.forEach(e => {
        const emo = e.trim();
        if (!emotionBuckets[emo]) emotionBuckets[emo] = [];
        emotionBuckets[emo].push(t);
      });
    }
  });

  const followedStats = calculateTradeStats(rulesFollowedTrades);
  const brokenStats = calculateTradeStats(rulesBrokenTrades);

  const emotionsSummary = Object.keys(emotionBuckets).map(emo => {
    const s = calculateTradeStats(emotionBuckets[emo]);
    return {
      emotion: emo,
      count: s.closedTrades,
      winRate: s.winRate,
      netPnl: s.netPnl,
      avgLoss: s.avgLoss,
    };
  }).sort((a, b) => a.netPnl - b.netPnl); // Worst first

  // Detect Revenge Trading Clusters:
  // A loss followed by another trade within 20 minutes
  let revengeTradeCount = 0;
  let revengeLossTotal = 0;
  const sorted = [...trades].sort((a, b) => new Date(a.entryTime) - new Date(b.entryTime));

  for (let i = 1; i < sorted.length; i++) {
    const prev = sorted[i - 1];
    const curr = sorted[i];

    if (prev.netPnl < 0 && prev.exitTime && curr.entryTime) {
      const diffMinutes = (new Date(curr.entryTime) - new Date(prev.exitTime)) / (1000 * 60);
      if (diffMinutes >= 0 && diffMinutes <= 25) {
        revengeTradeCount++;
        if (curr.netPnl < 0) {
          revengeLossTotal += Math.abs(curr.netPnl);
        }
      }
    }
  }

  // Cost of rule breaking
  const ruleBreakerCost = brokenStats.netPnl < 0 ? Math.abs(brokenStats.netPnl) : 0;

  return {
    totalTrades: trades.length,
    followedRules: {
      count: rulesFollowedTrades.length,
      winRate: followedStats.winRate,
      netPnl: followedStats.netPnl,
      profitFactor: followedStats.profitFactor,
      expectancy: followedStats.expectancy,
    },
    brokenRules: {
      count: rulesBrokenTrades.length,
      winRate: brokenStats.winRate,
      netPnl: brokenStats.netPnl,
      profitFactor: brokenStats.profitFactor,
      costOfBrokenRules: ruleBreakerCost,
    },
    ruleAdherenceRate: trades.length > 0 ? Number(((rulesFollowedTrades.length / trades.length) * 100).toFixed(1)) : 100,
    emotionsBreakdown: emotionsSummary,
    revengeTrades: {
      count: revengeTradeCount,
      associatedLoss: Number(revengeLossTotal.toFixed(2)),
    }
  };
}

/**
 * Counterfactual Rules Simulator:
 * Evaluates "What If" scenarios against actual recorded trades:
 * 1. maxTradesPerDay: "What if I stopped trading after N trades per day?"
 * 2. stopAfterLoss: "What if I stopped trading for the day after 1 loss?"
 * 3. maxLossCap: "What if every losing trade was strictly cut at 1R (e.g. ₹2,000)?"
 */
function simulateTradingRules(trades = [], ruleType = 'maxTradesPerDay', params = {}) {
  const actualStats = calculateTradeStats(trades);
  if (!actualStats.hasData) {
    return {
      applicable: false,
      message: 'Insufficient trade data to execute counterfactual simulation.',
    };
  }

  // Group trades by date (YYYY-MM-DD)
  const byDate = {};
  trades.forEach(t => {
    const dStr = t.entryTime ? new Date(t.entryTime).toISOString().split('T')[0] : 'Unknown';
    if (!byDate[dStr]) byDate[dStr] = [];
    byDate[dStr].push(t);
  });

  // Sort trades chronologically within each day
  Object.keys(byDate).forEach(d => {
    byDate[d].sort((a, b) => new Date(a.entryTime) - new Date(b.entryTime));
  });

  let simulatedTrades = [];
  let description = '';

  if (ruleType === 'maxTradesPerDay') {
    const maxTrades = params.limit || 2;
    description = `Simulating capping maximum trades to ${maxTrades} per day.`;

    Object.keys(byDate).forEach(d => {
      const dailyTrades = byDate[d];
      simulatedTrades.push(...dailyTrades.slice(0, maxTrades));
    });
  } else if (ruleType === 'stopAfterLoss') {
    const maxLosses = params.maxLosses || 1;
    description = `Simulating stopping for the day after ${maxLosses} losing trade(s).`;

    Object.keys(byDate).forEach(d => {
      const dailyTrades = byDate[d];
      let lossesToday = 0;
      for (const t of dailyTrades) {
        if (lossesToday >= maxLosses) {
          // Stop trading for the day
          break;
        }
        simulatedTrades.push(t);
        if (t.netPnl < 0) {
          lossesToday++;
        }
      }
    });
  } else if (ruleType === 'maxLossCap') {
    const capAmount = params.capAmount || 2000;
    description = `Simulating strictly capping every loss to maximum ₹${capAmount.toLocaleString('en-IN')}.`;

    simulatedTrades = trades.map(t => {
      if (t.netPnl < -capAmount) {
        return {
          ...t,
          netPnl: -capAmount,
          status: 'LOSS',
        };
      }
      return t;
    });
  } else {
    // Default: Max 2 trades per day
    return simulateTradingRules(trades, 'maxTradesPerDay', { limit: 2 });
  }

  const simulatedStats = calculateTradeStats(simulatedTrades);
  const pnlDelta = Number((simulatedStats.netPnl - actualStats.netPnl).toFixed(2));
  const tradesAvoided = actualStats.closedTrades - simulatedStats.closedTrades;

  return {
    applicable: true,
    ruleType,
    description,
    actual: {
      tradesCount: actualStats.closedTrades,
      netPnl: actualStats.netPnl,
      winRate: actualStats.winRate,
      profitFactor: actualStats.profitFactor,
      maxDrawdown: actualStats.maxDrawdown,
    },
    simulated: {
      tradesCount: simulatedStats.closedTrades,
      netPnl: simulatedStats.netPnl,
      winRate: simulatedStats.winRate,
      profitFactor: simulatedStats.profitFactor,
      maxDrawdown: simulatedStats.maxDrawdown,
    },
    delta: {
      pnlImpact: pnlDelta,
      improved: pnlDelta > 0,
      tradesAvoided,
      capitalPreserved: pnlDelta > 0 ? pnlDelta : 0,
    },
    conclusion: pnlDelta > 0
      ? `By enforcing this rule, your Net P&L would have improved by ₹${pnlDelta.toLocaleString('en-IN')} (from ₹${actualStats.netPnl.toLocaleString('en-IN')} to ₹${simulatedStats.netPnl.toLocaleString('en-IN')}), avoiding ${tradesAvoided} overtraded fills.`
      : `Enforcing this rule would have reduced Net P&L by ₹${Math.abs(pnlDelta).toLocaleString('en-IN')} because some subsequent trades were profitable winners.`,
  };
}

/**
 * Automatic Insights Generator:
 * Generates verified, data-backed insights from the trader's actual records.
 */
function generateEvidenceBasedInsights(trades = []) {
  const stats = calculateTradeStats(trades);
  if (!stats.hasData) {
    return [
      {
        type: 'INFO',
        title: 'No Trade History Yet',
        description: 'Log or sync your trades from DhanHQ, Angel One, or CSV to unlock automated performance insights.',
        evidence: '0 records in journal.',
      }
    ];
  }

  const insights = [];

  // 1. Loss Asymmetry Check
  if (stats.avgLoss > stats.avgWin && stats.losers >= 3) {
    insights.push({
      type: 'LEAK',
      severity: 'HIGH',
      title: 'Loss Asymmetry Leak Detected',
      description: `Your average losing trade (₹${stats.avgLoss.toLocaleString('en-IN')}) is larger than your average winning trade (₹${stats.avgWin.toLocaleString('en-IN')}). Even with a high win rate, outsized losses will erode account equity over time.`,
      evidence: `Avg Win: ₹${stats.avgWin} vs Avg Loss: ₹${stats.avgLoss} over ${stats.closedTrades} trades.`,
      recommendation: 'Enforce a strict 1R stop loss and do not move stops once entered.',
    });
  }

  // 2. Brokerage & Taxes Friction Check
  if (stats.grossPnl > 0 && stats.totalCharges > 0) {
    const costPercent = Number(((stats.totalCharges / stats.grossPnl) * 100).toFixed(1));
    if (costPercent >= 15) {
      insights.push({
        type: 'COST_DRAG',
        severity: 'MEDIUM',
        title: 'High Brokerage & Statutory Taxes Friction',
        description: `Trading charges (STT, GST, Exchange fees, and Brokerage) have consumed ${costPercent}% of your gross profits.`,
        evidence: `Total charges ₹${stats.totalCharges.toLocaleString('en-IN')} on ₹${stats.grossPnl.toLocaleString('en-IN')} gross gains.`,
        recommendation: 'Reduce scalp frequency or increase profit targets so friction represents < 10% of gross gains.',
      });
    }
  }

  // 3. Behavioral Rule Breaker Audit
  const behavior = analyzeBehaviorAndRules(trades);
  if (behavior.brokenRules.count > 0) {
    insights.push({
      type: 'DISCIPLINE',
      severity: behavior.brokenRules.netPnl < 0 ? 'HIGH' : 'MEDIUM',
      title: 'Discipline & Plan Adherence Impact',
      description: `When following your rules, your win rate is ${behavior.followedRules.winRate}%. When breaking rules, your win rate dropped to ${behavior.brokenRules.winRate}%.`,
      evidence: `${behavior.brokenRules.count} of ${stats.closedTrades} trades broke rules, resulting in Net P&L of ₹${behavior.brokenRules.netPnl.toLocaleString('en-IN')}.`,
      recommendation: 'Use the pre-trade checklist to confirm setup criteria before clicking BUY/SELL.',
    });
  }

  // 4. Strategy Edge
  const stratAnalysis = analyzeStrategyPerformance(trades);
  if (stratAnalysis.bestStrategy && stratAnalysis.bestStrategy.sampleSize >= 3) {
    insights.push({
      type: 'EDGE',
      severity: 'POSITIVE',
      title: `Proven Edge in "${stratAnalysis.bestStrategy.strategyName}"`,
      description: `Your highest expectancy strategy is "${stratAnalysis.bestStrategy.strategyName}" with a ${stratAnalysis.bestStrategy.winRate}% win rate and ₹${stratAnalysis.bestStrategy.expectancy} expectancy per trade.`,
      evidence: `${stratAnalysis.bestStrategy.sampleSize} trades, Net ₹${stratAnalysis.bestStrategy.netPnl.toLocaleString('en-IN')}.`,
      recommendation: 'Focus position sizing on this setup and eliminate underperforming setups.',
    });
  }

  // 5. Positive Expectancy Acknowledgment
  if (stats.expectancy > 0 && stats.profitFactor >= 1.5 && stats.closedTrades >= 5) {
    insights.push({
      type: 'HEALTH',
      severity: 'POSITIVE',
      title: 'Positive Mathematical Expectancy',
      description: `Your trading system currently yields a positive expectancy of +₹${stats.expectancy.toLocaleString('en-IN')} per trade with a Profit Factor of ${stats.profitFactor}.`,
      evidence: `${stats.closedTrades} closed trades, Net P&L ₹${stats.netPnl.toLocaleString('en-IN')}.`,
      recommendation: 'Maintain consistency and avoid over-leveraging.',
    });
  }

  return insights;
}

/**
 * Trader Progress & Behavioral Diagnostic:
 * Synthesizes all journal records and trader psychology to answer:
 * "Where am I lacking?" and "How can I progress as a trader?"
 */
function analyzeTraderProgress(trades = []) {
  const stats = calculateTradeStats(trades);
  if (!stats.hasData) {
    return {
      hasData: false,
      disciplineScore: 100,
      totalTrades: 0,
      leaks: [],
      strengths: [],
      growthRoadmap: [
        'Log or sync your first 5-10 trades from DhanHQ or Angel One to establish your baseline.',
        'Tag every trade with its setup (Playbook) and confirm your pre-trade checklist.',
        'Record emotional tags (FOMO, Revenge, Greed, Calm) to map psychological triggers.'
      ],
      summary: 'No trade history available yet. TradeMind AI is ready to audit your edge as soon as records are logged.'
    };
  }

  const behavior = analyzeBehaviorAndRules(trades);
  const stratAnalysis = analyzeStrategyPerformance(trades);
  const timing = analyzeSessionAndTiming(trades);

  const leaks = [];

  // Leak 1: Broken Rules Cost
  if (behavior.brokenRules.count > 0) {
    const cost = Math.abs(behavior.brokenRules.netPnl);
    leaks.push({
      category: 'Discipline & Rules',
      severity: behavior.brokenRules.netPnl < 0 ? 'HIGH' : 'MEDIUM',
      title: `Plan Deviations Cost ₹${cost.toLocaleString('en-IN')}`,
      metric: `${behavior.brokenRules.count} rule-broken trades`,
      detail: `When executing within rules, win rate is ${behavior.followedRules.winRate}%. When breaking rules, win rate is ${behavior.brokenRules.winRate}%.`,
      action: 'Do not click BUY or SELL without verifying all playbook entry criteria.',
    });
  }

  // Leak 2: Revenge Trading
  if (behavior.revengeTrades.count > 0) {
    leaks.push({
      category: 'Tilt & Revenge Trading',
      severity: 'HIGH',
      title: `${behavior.revengeTrades.count} Tilt Executions (Within 25 Min of Loss)`,
      metric: `₹${behavior.revengeTrades.associatedLoss.toLocaleString('en-IN')} lost on revenge`,
      detail: 'Entering immediate trades following a stop-out indicates emotional reactivity rather than setup availability.',
      action: 'Institute a mandatory 15-minute away-from-desk rule after every losing exit.',
    });
  }

  // Leak 3: Loss Asymmetry (Avg Loss > Avg Win)
  if (stats.avgLoss > stats.avgWin) {
    leaks.push({
      category: 'Risk Management',
      severity: 'HIGH',
      title: `Loss Asymmetry: Avg Loss (-₹${stats.avgLoss.toLocaleString('en-IN')}) > Avg Win (+₹${stats.avgWin.toLocaleString('en-IN')})`,
      metric: `Win/Loss Ratio: ${stats.winLossRatio}:1`,
      detail: 'Allowing losing trades to expand beyond 1R erodes the edge generated by your winning trades.',
      action: 'Place hard system stop-loss orders at trade entry and never move stops against your position.',
    });
  }

  // Leak 4: Brokerage & Taxes Drag
  if (stats.grossPnl > 0 && stats.totalCharges > 0) {
    const costPct = Number(((stats.totalCharges / stats.grossPnl) * 100).toFixed(1));
    if (costPct >= 15) {
      leaks.push({
        category: 'Charges & Friction',
        severity: 'MEDIUM',
        title: `Charges Consume ${costPct}% of Gross Gains`,
        metric: `₹${stats.totalCharges.toLocaleString('en-IN')} in STT, GST & fees`,
        detail: 'Excessive scalping or rapid in-and-out churning transfers edge to the exchange and broker.',
        action: 'Target higher risk-to-reward swing setups and cap daily order frequency.',
      });
    }
  }

  // Leak 5: Toxic / Negative Expectancy Setup
  if (stratAnalysis.worstStrategy && stratAnalysis.worstStrategy.netPnl < 0) {
    leaks.push({
      category: 'Strategy Selection',
      severity: 'MEDIUM',
      title: `Setup "${stratAnalysis.worstStrategy.strategyName}" Leaking Capital`,
      metric: `-₹${Math.abs(stratAnalysis.worstStrategy.netPnl).toLocaleString('en-IN')} Net P&L`,
      detail: `${stratAnalysis.worstStrategy.sampleSize} trades with ${stratAnalysis.worstStrategy.winRate}% win rate.`,
      action: `Cease live execution of "${stratAnalysis.worstStrategy.strategyName}" until revised in paper trading.`,
    });
  }

  // Strengths / Edge
  const strengths = [];
  if (stratAnalysis.bestStrategy && stratAnalysis.bestStrategy.netPnl > 0) {
    strengths.push({
      title: `Core Edge: "${stratAnalysis.bestStrategy.strategyName}"`,
      detail: `+₹${stratAnalysis.bestStrategy.netPnl.toLocaleString('en-IN')} Net P&L (${stratAnalysis.bestStrategy.winRate}% win rate, ${stratAnalysis.bestStrategy.sampleSize} trades).`,
    });
  }
  if (behavior.followedRules.count > 0 && behavior.followedRules.netPnl > 0) {
    strengths.push({
      title: 'Profitable Planned Execution',
      detail: `+₹${behavior.followedRules.netPnl.toLocaleString('en-IN')} generated when strictly following rules.`,
    });
  }
  if (stats.expectancy > 0) {
    strengths.push({
      title: 'Positive Mathematical Expectancy',
      detail: `+₹${stats.expectancy} per trade baseline expectancy.`,
    });
  }

  // Practical 3-Step Growth Roadmap
  const growthRoadmap = [
    leaks.length > 0 
      ? `Eliminate primary leak: ${leaks[0].title} (${leaks[0].action}).`
      : 'Maintain disciplined trade logging and risk-per-trade consistency.',
    strengths.length > 0
      ? `Double down on your proven edge: ${strengths[0].title}.`
      : 'Focus on 1 specific setup until you accumulate a 20-trade statistically significant sample.',
    'Cap your daily trading volume to 2 trades maximum to protect mental focus and eliminate churn.'
  ];

  return {
    hasData: true,
    totalTrades: stats.closedTrades,
    netPnl: stats.netPnl,
    winRate: stats.winRate,
    profitFactor: stats.profitFactor,
    expectancy: stats.expectancy,
    disciplineScore: behavior.ruleAdherenceRate,
    leaks,
    strengths,
    growthRoadmap,
    behavior,
    stats,
  };
}

module.exports = {
  calculateTradeStats,
  compareTradePeriods,
  analyzeStrategyPerformance,
  analyzeInstrumentPerformance,
  analyzeSessionAndTiming,
  analyzeBehaviorAndRules,
  simulateTradingRules,
  generateEvidenceBasedInsights,
  analyzeTraderProgress,
};
