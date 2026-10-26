const axios = require('axios');
const { calculateIndianCharges } = require('./chargesCalculator');

const ANGEL_BASE_URL = 'https://apiconnect.angelbroking.com';

/**
 * Tests connection with Angel One SmartAPI
 */
async function testAngelOneConnection({ clientCode, apiKey, jwtToken }) {
  if (!clientCode || !apiKey) {
    throw new Error('Client Code and API Key are required for Angel One.');
  }

  try {
    const response = await axios.get(`${ANGEL_BASE_URL}/rest/secure/angelbroking/user/v1/getProfile`, {
      headers: {
        'Authorization': `Bearer ${jwtToken || ''}`,
        'X-PrivateKey': apiKey,
        'X-UserType': 'USER',
        'X-SourceID': 'WEB',
        'X-ClientLocalIP': '127.0.0.1',
        'X-ClientPublicIP': '127.0.0.1',
        'X-MACAddress': 'fe80::1',
        'Content-Type': 'application/json',
      },
      timeout: 8000,
    });
    return { success: true, data: response.data };
  } catch (err) {
    const msg = err.response?.data?.message || err.message;
    throw new Error(`Angel One SmartAPI Error: ${msg}`);
  }
}

/**
 * Generates sample Angel One trades for quick demonstration
 */
function getSampleAngelOneTrades() {
  const today = new Date().toISOString().split('T')[0];
  return [
    {
      symbol: 'TCS',
      assetClass: 'EQUITY',
      tradeType: 'BUY',
      quantity: 25,
      lotSize: 1,
      entryPrice: 3880.00,
      exitPrice: 3940.00,
      entryTime: `${today} 09:40:00`,
      exitTime: `${today} 14:15:00`,
      stopLoss: 3850.00,
      target: 3950.00,
      strategyName: 'Support Bounce',
      brokerSource: 'ANGEL_ONE',
      brokerTradeId: 'AO_TRD_' + Date.now() + '_1',
      emotions: ['Patient', 'Disciplined'],
      rulesFollowed: true,
      notes: 'Weekly demand zone retest with bullish engulfing candle.',
    },
    {
      symbol: 'NIFTY 24600 PE',
      assetClass: 'OPTIONS',
      tradeType: 'BUY',
      quantity: 50,
      lotSize: 25,
      entryPrice: 95.00,
      exitPrice: 145.00,
      entryTime: `${today} 13:30:00`,
      exitTime: `${today} 15:05:00`,
      stopLoss: 78.00,
      target: 150.00,
      strategyName: 'Breakdown Continuation',
      brokerSource: 'ANGEL_ONE',
      brokerTradeId: 'AO_TRD_' + Date.now() + '_2',
      emotions: ['Disciplined'],
      rulesFollowed: true,
      notes: 'Day low breakdown with heavy Put buying volume.',
    }
  ];
}

/**
 * Syncs Angel One trade items into Database
 */
async function syncAngelTradesToDb(tradesArray, TradeModel) {
  let createdCount = 0;
  for (const item of tradesArray) {
    const charges = calculateIndianCharges({
      assetClass: item.assetClass,
      tradeType: item.tradeType,
      quantity: item.quantity,
      lotSize: item.lotSize,
      entryPrice: item.entryPrice,
      exitPrice: item.exitPrice || item.entryPrice,
    });

    const riskPerUnit = item.stopLoss ? Math.abs(item.entryPrice - item.stopLoss) : (item.entryPrice * 0.05);
    const totalRisk = riskPerUnit * (item.quantity * (item.lotSize || 1));
    const rMultiple = totalRisk > 0 ? Number((charges.netPnl / totalRisk).toFixed(2)) : 0;
    const status = charges.netPnl > 0 ? 'WIN' : charges.netPnl < 0 ? 'LOSS' : 'BREAKEVEN';
    const pnlPercentage = item.entryPrice > 0 
      ? Number((((item.exitPrice - item.entryPrice) / item.entryPrice) * 100).toFixed(2)) 
      : 0;

    await TradeModel.create({
      symbol: item.symbol,
      assetClass: item.assetClass || 'EQUITY',
      tradeType: item.tradeType || 'BUY',
      quantity: item.quantity,
      lotSize: item.lotSize || 1,
      entryPrice: item.entryPrice,
      exitPrice: item.exitPrice,
      entryTime: item.entryTime || new Date(),
      exitTime: item.exitTime || new Date(),
      stopLoss: item.stopLoss,
      target: item.target,
      grossPnl: charges.grossPnl,
      netPnl: charges.netPnl,
      pnlPercentage,
      rMultiple,
      status,
      brokerSource: 'ANGEL_ONE',
      brokerTradeId: item.brokerTradeId || `AO_${Date.now()}_${Math.random().toString(36).substring(7)}`,
      charges,
      emotions: item.emotions || ['Disciplined'],
      rulesFollowed: item.rulesFollowed ?? true,
      strategyName: item.strategyName || 'Discretionary',
      notes: item.notes || 'Synced from Angel One SmartAPI',
    });
    createdCount++;
  }
  return createdCount;
}

module.exports = {
  testAngelOneConnection,
  getSampleAngelOneTrades,
  syncAngelTradesToDb,
};
