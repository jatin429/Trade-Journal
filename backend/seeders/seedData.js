const { calculateIndianCharges } = require('../services/chargesCalculator');

async function seedInitialData(models) {
  const { Trade, Playbook, DailyJournal, BrokerConfig } = models;

  const count = await Trade.count();
  if (count > 0) {
    console.log('[Seed] Database already contains trades, skipping initial seed.');
    return;
  }

  console.log('[Seed] Seeding realistic sample trading data, playbooks, and journal...');

  // 1. Create Playbooks
  const p1 = await Playbook.create({
    name: 'Opening Range Breakout (ORB)',
    description: 'Trading the high/low breakout of the initial 15-minute candle with strong volume.',
    category: 'Momentum',
    rules: [
      'Wait for 15-minute candle to close completely',
      'Volume must be at least 1.5x of 20 EMA volume',
      'Target minimum 1:2 Risk to Reward',
      'Stop-loss strictly placed at 50% of the opening candle range'
    ],
    targetRR: 2.2,
    color: '#10b981',
  });

  const p2 = await Playbook.create({
    name: 'VWAP Mean Reversion',
    description: 'Fade extended price action when price deviates significantly from intraday VWAP with exhaustion wick.',
    category: 'Mean Reversion',
    rules: [
      'Price must be > 2 Standard Deviations from VWAP',
      'RSI divergence on 5m chart',
      'Stop-loss 10 points above exhaustion wick',
      'Take 50% off at VWAP line'
    ],
    targetRR: 2.5,
    color: '#3b82f6',
  });

  const p3 = await Playbook.create({
    name: 'Central Pivot Range (CPR) Breakout',
    description: 'Breakout of virgin CPR with trend alignment on higher timeframes.',
    category: 'Breakout',
    rules: [
      'Narrow CPR day (high trending probability)',
      'First 5m candle closing outside CPR boundaries',
      'Risk capped at 1% of total portfolio'
    ],
    targetRR: 3.0,
    color: '#8b5cf6',
  });

  const p4 = await Playbook.create({
    name: 'Demand Zone Retest',
    description: 'Buying strong pullbacks into higher-timeframe order blocks / demand zones.',
    category: 'Price Action',
    rules: [
      'Identify 1H Demand Zone',
      'Wait for Bullish Engulfing or Hammer on 5m retest',
      'Risk reward must exceed 1:2.5'
    ],
    targetRR: 2.5,
    color: '#f59e0b',
  });

  // 2. Realistic Trades over the last 14 days
  const now = new Date();
  const getDayOffset = (daysAgo, hour = 10, minute = 0) => {
    const d = new Date(now);
    d.setDate(d.getDate() - daysAgo);
    d.setHours(hour, minute, 0, 0);
    return d;
  };

  const sampleTrades = [
    {
      symbol: 'NIFTY 24500 CE',
      assetClass: 'OPTIONS',
      tradeType: 'BUY',
      quantity: 50,
      lotSize: 25,
      entryPrice: 135.0,
      exitPrice: 198.5,
      entryTime: getDayOffset(12, 9, 32),
      exitTime: getDayOffset(12, 10, 45),
      stopLoss: 110.0,
      target: 200.0,
      strategyName: 'Opening Range Breakout (ORB)',
      playbookId: p1.id,
      emotions: ['Disciplined', 'Confident'],
      rulesFollowed: true,
      brokerSource: 'DHAN',
      notes: 'Textbook 15m ORB breakout. Nifty broke above 24,500 psychological hurdle with strong Reliance backing.',
    },
    {
      symbol: 'BANKNIFTY 52200 PE',
      assetClass: 'OPTIONS',
      tradeType: 'BUY',
      quantity: 30,
      lotSize: 15,
      entryPrice: 310.0,
      exitPrice: 260.0,
      entryTime: getDayOffset(11, 11, 15),
      exitTime: getDayOffset(11, 11, 40),
      stopLoss: 260.0,
      target: 420.0,
      strategyName: 'VWAP Mean Reversion',
      playbookId: p2.id,
      emotions: ['Anxious', 'FOMO'],
      rulesFollowed: false,
      brokerSource: 'DHAN',
      notes: 'Entered prematurely without waiting for 5m candle close. Stopped out precisely at 1R.',
    },
    {
      symbol: 'RELIANCE',
      assetClass: 'EQUITY',
      tradeType: 'BUY',
      quantity: 60,
      lotSize: 1,
      entryPrice: 2975.0,
      exitPrice: 3022.0,
      entryTime: getDayOffset(9, 9, 45),
      exitTime: getDayOffset(9, 14, 30),
      stopLoss: 2955.0,
      target: 3025.0,
      strategyName: 'Central Pivot Range (CPR) Breakout',
      playbookId: p3.id,
      emotions: ['Patient', 'Disciplined'],
      rulesFollowed: true,
      brokerSource: 'ANGEL_ONE',
      notes: 'Held through mid-day consolidation. Trend was strong all day.',
    },
    {
      symbol: 'NIFTY 24600 PE',
      assetClass: 'OPTIONS',
      tradeType: 'BUY',
      quantity: 50,
      lotSize: 25,
      entryPrice: 160.0,
      exitPrice: 245.0,
      entryTime: getDayOffset(8, 13, 20),
      exitTime: getDayOffset(8, 14, 55),
      stopLoss: 125.0,
      target: 250.0,
      strategyName: 'Demand Zone Retest',
      playbookId: p4.id,
      emotions: ['Disciplined'],
      rulesFollowed: true,
      brokerSource: 'DHAN',
      notes: 'Afternoon post-lunch breakdown. Premium jumped 50%+ in 30 minutes.',
    },
    {
      symbol: 'TCS',
      assetClass: 'EQUITY',
      tradeType: 'BUY',
      quantity: 35,
      lotSize: 1,
      entryPrice: 3920.0,
      exitPrice: 3965.0,
      entryTime: getDayOffset(6, 10, 10),
      exitTime: getDayOffset(6, 15, 15),
      stopLoss: 3895.0,
      target: 3970.0,
      strategyName: 'Central Pivot Range (CPR) Breakout',
      playbookId: p3.id,
      emotions: ['Confident'],
      rulesFollowed: true,
      brokerSource: 'ANGEL_ONE',
      notes: 'IT sector showing relative strength versus broader Nifty index.',
    },
    {
      symbol: 'BANKNIFTY 52400 CE',
      assetClass: 'OPTIONS',
      tradeType: 'BUY',
      quantity: 45,
      lotSize: 15,
      entryPrice: 290.0,
      exitPrice: 235.0,
      entryTime: getDayOffset(5, 11, 45),
      exitTime: getDayOffset(5, 12, 10),
      stopLoss: 235.0,
      target: 380.0,
      strategyName: 'Opening Range Breakout (ORB)',
      playbookId: p1.id,
      emotions: ['Revenge', 'FOMO'],
      rulesFollowed: false,
      brokerSource: 'DHAN',
      notes: 'Broke rules by trading during 12 PM dull hour. Premium decayed rapidly.',
    },
    {
      symbol: 'NIFTY 24700 CE',
      assetClass: 'OPTIONS',
      tradeType: 'BUY',
      quantity: 50,
      lotSize: 25,
      entryPrice: 85.0,
      exitPrice: 142.0,
      entryTime: getDayOffset(3, 9, 25),
      exitTime: getDayOffset(3, 10, 15),
      stopLoss: 65.0,
      target: 145.0,
      strategyName: 'Opening Range Breakout (ORB)',
      playbookId: p1.id,
      emotions: ['Disciplined', 'Focused'],
      rulesFollowed: true,
      brokerSource: 'DHAN',
      notes: 'Expiry day hero trade on opening momentum. Locked profits near 142 target.',
    },
    {
      symbol: 'TATASTEEL',
      assetClass: 'EQUITY',
      tradeType: 'BUY',
      quantity: 300,
      lotSize: 1,
      entryPrice: 154.5,
      exitPrice: 159.2,
      entryTime: getDayOffset(2, 9, 30),
      exitTime: getDayOffset(2, 15, 0),
      stopLoss: 152.0,
      target: 160.0,
      strategyName: 'Demand Zone Retest',
      playbookId: p4.id,
      emotions: ['Patient'],
      rulesFollowed: true,
      brokerSource: 'MANUAL',
      notes: 'Metal index breakout. Clean intraday grind upward.',
    },
    {
      symbol: 'BANKNIFTY 52000 PE',
      assetClass: 'OPTIONS',
      tradeType: 'BUY',
      quantity: 30,
      lotSize: 15,
      entryPrice: 340.0,
      exitPrice: 475.0,
      entryTime: getDayOffset(1, 13, 15),
      exitTime: getDayOffset(1, 14, 40),
      stopLoss: 285.0,
      target: 480.0,
      strategyName: 'VWAP Mean Reversion',
      playbookId: p2.id,
      emotions: ['Disciplined', 'Confident'],
      rulesFollowed: true,
      brokerSource: 'DHAN',
      notes: 'Rejection wick on BankNifty at day high with massive Put addition.',
    }
  ];

  for (const item of sampleTrades) {
    const charges = calculateIndianCharges({
      assetClass: item.assetClass,
      tradeType: item.tradeType,
      quantity: item.quantity,
      lotSize: item.lotSize,
      entryPrice: item.entryPrice,
      exitPrice: item.exitPrice,
    });

    const riskPerUnit = item.stopLoss ? Math.abs(item.entryPrice - item.stopLoss) : (item.entryPrice * 0.05);
    const totalRisk = riskPerUnit * (item.quantity * item.lotSize);
    const rMultiple = totalRisk > 0 ? Number((charges.netPnl / totalRisk).toFixed(2)) : 0;
    const status = charges.netPnl > 0 ? 'WIN' : charges.netPnl < 0 ? 'LOSS' : 'BREAKEVEN';
    const pnlPercentage = Number((((item.exitPrice - item.entryPrice) / item.entryPrice) * 100).toFixed(2));

    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const dayOfWeek = days[item.entryTime.getDay()];
    const timeOfDay = item.entryTime.getHours() < 12 ? 'Morning' : item.entryTime.getHours() < 14 ? 'Afternoon' : 'Closing';

    await Trade.create({
      symbol: item.symbol,
      assetClass: item.assetClass,
      tradeType: item.tradeType,
      quantity: item.quantity,
      lotSize: item.lotSize,
      entryPrice: item.entryPrice,
      exitPrice: item.exitPrice,
      entryTime: item.entryTime,
      exitTime: item.exitTime,
      stopLoss: item.stopLoss,
      target: item.target,
      grossPnl: charges.grossPnl,
      netPnl: charges.netPnl,
      pnlPercentage,
      rMultiple,
      status,
      brokerSource: item.brokerSource,
      charges,
      emotions: item.emotions,
      rulesFollowed: item.rulesFollowed,
      strategyName: item.strategyName,
      playbookId: item.playbookId,
      notes: item.notes,
      dayOfWeek,
      timeOfDay,
    });
  }

  // 3. Create Daily Journals
  const todayStr = now.toISOString().split('T')[0];
  await DailyJournal.create({
    date: todayStr,
    marketOutlook: 'Bullish',
    preMarketPrep: 'Nifty trading above 20 EMA on 1D chart. Gift Nifty indicates +80 pts gap up. Looking for ORB on 24,600 calls.',
    postMarketReview: 'Stuck to trading plan. Waited for candle closes. Avoided overtrading.',
    disciplineRating: 5,
    emotionalState: 'Calm & Focused',
    dailyTargetPnl: 10000,
    maxDailyRisk: 4000,
  });

  // 4. Broker initial configs
  await BrokerConfig.create({
    brokerName: 'DHAN',
    clientId: 'DHAN_LIVE_READY',
    isConnected: true,
    lastSyncTime: new Date(),
    syncStatusMessage: 'API Gateway Connected',
  });

  await BrokerConfig.create({
    brokerName: 'ANGEL_ONE',
    clientId: 'ANGEL_SMARTAPI_READY',
    isConnected: true,
    lastSyncTime: new Date(),
    syncStatusMessage: 'SmartAPI Ready',
  });

  console.log('[Seed] Seeding completed successfully!');
}

module.exports = { seedInitialData };
