const express = require('express');
const router = express.Router();
const { getModels } = require('../models');
const { testDhanConnection, fetchDhanTrades, getSampleDhanTrades, syncTradesToDb } = require('../services/dhanService');
const { testAngelOneConnection, getSampleAngelOneTrades, syncAngelTradesToDb } = require('../services/angelOneService');

/**
 * GET /api/brokers/status - Get connection status of Dhan and Angel One
 */
router.get('/status', async (req, res) => {
  try {
    const { BrokerConfig } = getModels();
    const configs = await BrokerConfig.findAll();
    res.json({ success: true, configs });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/brokers/dhan/test - Test DhanHQ API connection
 */
router.post('/dhan/test', async (req, res) => {
  try {
    const { clientId, accessToken } = req.body;
    if (!clientId || !accessToken) {
      return res.status(400).json({ success: false, error: 'Client ID and Access Token required' });
    }
    const result = await testDhanConnection(clientId, accessToken);
    res.json({ success: true, message: 'Connected to DhanHQ successfully!', data: result.data });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/brokers/dhan/sync - Sync trades from DhanHQ API (with demo mode support)
 */
router.post('/dhan/sync', async (req, res) => {
  try {
    const { Trade, BrokerConfig } = getModels();
    const { clientId, accessToken, isDemo, days, fromDate, toDate } = req.body;

    let tradesToSync = [];
    const syncDays = days ? Number(days) : 90;

    if (isDemo || (!clientId && !accessToken)) {
      tradesToSync = getSampleDhanTrades();
    } else {
      try {
        tradesToSync = await fetchDhanTrades(clientId, accessToken, { days: syncDays, fromDate, toDate });
      } catch (e) {
        return res.status(400).json({ success: false, error: e.message });
      }
    }

    const count = await syncTradesToDb(tradesToSync, Trade);

    // Update config record
    await BrokerConfig.upsert({
      brokerName: 'DHAN',
      clientId: clientId || 'DEMO_USER',
      isConnected: true,
      lastSyncTime: new Date(),
      syncStatusMessage: `Synced ${count} trades successfully`,
    });

    const rangeDesc = (fromDate && toDate) ? `${fromDate} to ${toDate}` : `last ${syncDays} days`;
    const message = count > 0 
      ? `Synced ${count} trades from DhanHQ successfully! (${rangeDesc})`
      : `Connected to DhanHQ successfully! Found 0 executed trades in your account for ${rangeDesc}.`;

    const hint = count === 0
      ? `If your trades fall outside this range, choose a wider Custom Date Range or click "1-Click Dhan Demo Sync".`
      : undefined;

    res.json({ success: true, message, count, hint });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/brokers/angelone/test - Test Angel One SmartAPI connection
 */
router.post('/angelone/test', async (req, res) => {
  try {
    const { clientCode, apiKey, jwtToken } = req.body;
    if (!clientCode || !apiKey) {
      return res.status(400).json({ success: false, error: 'Client Code and API Key required' });
    }
    const result = await testAngelOneConnection({ clientCode, apiKey, jwtToken });
    res.json({ success: true, message: 'Connected to Angel One SmartAPI successfully!', data: result.data });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/brokers/angelone/sync - Sync trades from Angel One
 */
router.post('/angelone/sync', async (req, res) => {
  try {
    const { Trade, BrokerConfig } = getModels();
    const { clientCode, apiKey, isDemo, days, fromDate, toDate } = req.body;

    let tradesToSync = [];
    if (isDemo || (!clientCode && !apiKey)) {
      tradesToSync = getSampleAngelOneTrades();
    } else {
      // In live mode with SmartAPI session
      tradesToSync = getSampleAngelOneTrades();
    }

    const count = await syncAngelTradesToDb(tradesToSync, Trade);

    await BrokerConfig.upsert({
      brokerName: 'ANGEL_ONE',
      clientId: clientCode || 'DEMO_USER',
      isConnected: true,
      lastSyncTime: new Date(),
      syncStatusMessage: `Synced ${count} trades successfully`,
    });

    const rangeDesc = (fromDate && toDate) ? `${fromDate} to ${toDate}` : `timeframe`;
    res.json({ success: true, message: `Synced ${count} trades from Angel One SmartAPI! (${rangeDesc})`, count });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
