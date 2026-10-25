const assert = require('assert');
const {
  calculateTradeStats,
  compareTradePeriods,
  analyzeStrategyPerformance,
  analyzeInstrumentPerformance,
  analyzeBehaviorAndRules,
  simulateTradingRules,
  generateEvidenceBasedInsights,
  analyzeTraderProgress,
} = require('../services/analyticsEngine');

console.log('Running TradeMind Analytics & Simulation Engine Tests...');

// 1. Test Empty Dataset Handling
const emptyStats = calculateTradeStats([]);
assert.strictEqual(emptyStats.hasData, false);
assert.strictEqual(emptyStats.totalTrades, 0);
assert.strictEqual(emptyStats.netPnl, 0);
console.log('✔ Test 1 Passed: Empty dataset handled gracefully.');

// 2. Test Master Stats Calculations with Mock Trades
const mockTrades = [
  {
    symbol: 'NIFTY 24500 CE',
    assetClass: 'OPTIONS',
    netPnl: -2000,
    grossPnl: -1880,
    status: 'LOSS',
    rulesFollowed: false,
    rMultiple: -1.0,
    strategyName: 'ORB',
    charges: { totalCharges: 120, stt: 50, brokerage: 40, gst: 20, exchangeCharges: 10 },
    entryTime: '2026-10-10T09:30:00Z',
    exitTime: '2026-10-10T09:45:00Z',
    emotions: ['Anxious'],
  },
  {
    symbol: 'NIFTY 24500 CE',
    assetClass: 'OPTIONS',
    netPnl: -3000,
    grossPnl: -2880,
    status: 'LOSS',
    rulesFollowed: false,
    rMultiple: -1.5,
    strategyName: 'ORB',
    charges: { totalCharges: 120, stt: 50, brokerage: 40, gst: 20, exchangeCharges: 10 },
    entryTime: '2026-10-10T09:55:00Z', // 10 mins after previous loss -> Revenge trigger!
    exitTime: '2026-10-10T10:15:00Z',
    emotions: ['FOMO', 'Revenge'],
  },
  {
    symbol: 'RELIANCE',
    assetClass: 'EQUITY',
    netPnl: 6000,
    grossPnl: 6080,
    status: 'WIN',
    rulesFollowed: true,
    rMultiple: 3.0,
    strategyName: 'VWAP Bounce',
    charges: { totalCharges: 80, stt: 20, brokerage: 40, gst: 15, exchangeCharges: 5 },
    entryTime: '2026-10-11T13:45:00Z',
    exitTime: '2026-10-11T14:30:00Z',
    emotions: ['Patient', 'Disciplined'],
  },
  {
    symbol: 'NIFTY 24600 PE',
    assetClass: 'OPTIONS',
    netPnl: 4000,
    grossPnl: 4100,
    status: 'WIN',
    rulesFollowed: true,
    rMultiple: 2.0,
    strategyName: 'VWAP Bounce',
    charges: { totalCharges: 100, stt: 40, brokerage: 40, gst: 15, exchangeCharges: 5 },
    entryTime: '2026-10-11T14:40:00Z',
    exitTime: '2026-10-11T15:15:00Z',
    emotions: ['Confident'],
  }
];

const stats = calculateTradeStats(mockTrades);
assert.strictEqual(stats.totalTrades, 4);
assert.strictEqual(stats.winners, 2);
assert.strictEqual(stats.losers, 2);
assert.strictEqual(stats.winRate, 50); // 2 of 4 = 50%
assert.strictEqual(stats.netPnl, 5000); // 6000 + 4000 - 2000 - 3000 = 5000
assert.strictEqual(stats.avgWin, 5000); // (6000 + 4000) / 2 = 5000
assert.strictEqual(stats.avgLoss, 2500); // (2000 + 3000) / 2 = 2500
assert.strictEqual(stats.profitFactor, 2.0); // 10000 / 5000 = 2.0
console.log('✔ Test 2 Passed: Master trade statistics calculated accurately.');

// 3. Test Behavioral & Rules Analysis
const behavior = analyzeBehaviorAndRules(mockTrades);
assert.strictEqual(behavior.followedRules.count, 2);
assert.strictEqual(behavior.brokenRules.count, 2);
assert.strictEqual(behavior.followedRules.netPnl, 10000); // 6000 + 4000
assert.strictEqual(behavior.brokenRules.netPnl, -5000); // -2000 - 3000
assert.strictEqual(behavior.revengeTrades.count, 1); // 1 revenge trade detected
console.log('✔ Test 3 Passed: Behavioral audit detected rule violations and revenge trades.');

// 4. Test Strategy Analysis
const strat = analyzeStrategyPerformance(mockTrades);
assert.strictEqual(strat.totalStrategiesTracked, 2);
assert.strictEqual(strat.bestStrategy.strategyName, 'VWAP Bounce');
console.log('✔ Test 4 Passed: Strategy comparison correctly ranked VWAP Bounce over ORB.');

// 5. Test Counterfactual Simulation ("What if stopped after 1 loss?")
const simLoss = simulateTradingRules(mockTrades, 'stopAfterLoss', { maxLosses: 1 });
assert.strictEqual(simLoss.applicable, true);
console.log('✔ Test 5 Passed: Counterfactual simulator executed successfully.');

// 6. Test Automatic Insights Generation
const insights = generateEvidenceBasedInsights(mockTrades);
assert(Array.isArray(insights));
assert(insights.length > 0);
console.log(`✔ Test 6 Passed: Generated ${insights.length} data-supported insights.`);

// 7. Test Trader Progress & Behavioral Diagnostic ("Where am I lacking?")
const progress = analyzeTraderProgress(mockTrades);
assert.strictEqual(progress.hasData, true);
assert.strictEqual(progress.disciplineScore, 50); // 2 followed / 4 total = 50%
assert(Array.isArray(progress.leaks));
assert(progress.leaks.length > 0); // Should detect plan deviations & revenge trade leaks
assert(Array.isArray(progress.strengths));
assert(progress.strengths.length > 0); // Should detect VWAP Bounce edge
assert(Array.isArray(progress.growthRoadmap));
assert.strictEqual(progress.growthRoadmap.length, 3);
console.log('✔ Test 7 Passed: Trader Progress & Behavioral Diagnostic accurately mapped leaks & edge.');

console.log('\nAll 7 TradeMind Analytics Engine Tests Passed Successfully! 🚀');
