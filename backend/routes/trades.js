const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const { Op } = require('sequelize');
const { getModels } = require('../models');
const { calculateIndianCharges } = require('../services/chargesCalculator');
const { parseAndImportCsv } = require('../services/csvParserService');
const { lookupIpoPrice, KNOWN_IPO_DATA } = require('../services/dhanService');

// Multer setup for CSV uploads and screenshots
const upload = multer({
  dest: path.join(__dirname, '..', 'uploads'),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
});

/**
 * GET /api/trades - List trades with flexible filtering
 */
router.get('/', async (req, res) => {
  try {
    const { Trade, Playbook } = getModels();
    const { 
      status, 
      assetClass, 
      brokerSource, 
      strategyName, 
      startDate, 
      endDate, 
      limit = 50, 
      offset = 0,
      sortBy = 'entryTime',
      sortOrder = 'DESC'
    } = req.query;

    const where = {};
    if (status) where.status = status;
    if (assetClass) where.assetClass = assetClass;
    if (brokerSource) where.brokerSource = brokerSource;
    if (strategyName) where.strategyName = strategyName;

    if (startDate && endDate) {
      where.entryTime = {
        [Op.between]: [new Date(startDate), new Date(endDate)],
      };
    } else if (startDate) {
      where.entryTime = { [Op.gte]: new Date(startDate) };
    } else if (endDate) {
      where.entryTime = { [Op.lte]: new Date(endDate) };
    }

    const { count, rows } = await Trade.findAndCountAll({
      where,
      limit: parseInt(limit, 10),
      offset: parseInt(offset, 10),
      order: [[sortBy, sortOrder.toUpperCase()]],
      include: [{ model: Playbook, as: 'playbook', attributes: ['id', 'name', 'color'] }],
    });

    res.json({ success: true, count, trades: rows });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * GET /api/trades/ipo-lookup - Check if symbol matches known IPO (MUST be before /:id)
 */
router.get('/ipo-lookup', async (req, res) => {
  try {
    const { symbol } = req.query;
    if (!symbol) return res.json({ success: true, match: null });
    const match = await lookupIpoPrice(symbol);
    res.json({ success: true, match });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * GET /api/trades/:id - Single trade details
 */
router.get('/:id', async (req, res) => {
  try {
    const { Trade, Playbook } = getModels();
    const trade = await Trade.findByPk(req.params.id, {
      include: [{ model: Playbook, as: 'playbook' }],
    });
    if (!trade) return res.status(404).json({ success: false, error: 'Trade not found' });
    res.json({ success: true, trade });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/trades - Create a new trade with automatic Indian charges & metrics
 */
router.post('/', async (req, res) => {
  try {
    const { Trade } = getModels();
    const data = req.body;

    // Calculate Indian market charges
    const charges = calculateIndianCharges({
      assetClass: data.assetClass || 'EQUITY',
      tradeType: data.tradeType || 'BUY',
      quantity: parseFloat(data.quantity) || 1,
      lotSize: parseInt(data.lotSize, 10) || 1,
      entryPrice: parseFloat(data.entryPrice) || 0,
      exitPrice: parseFloat(data.exitPrice) || 0,
      brokeragePerOrder: parseFloat(data.brokeragePerOrder) || 20,
    });

    const netPnl = charges.netPnl;
    const grossPnl = charges.grossPnl;

    // Calculate R-Multiple
    const riskPerUnit = data.stopLoss ? Math.abs(data.entryPrice - data.stopLoss) : (data.entryPrice * 0.05);
    const totalRisk = riskPerUnit * ((parseFloat(data.quantity) || 1) * (parseInt(data.lotSize, 10) || 1));
    const rMultiple = totalRisk > 0 ? Number((netPnl / totalRisk).toFixed(2)) : 0;

    // Determine status
    let status = 'OPEN';
    if (data.exitPrice && parseFloat(data.exitPrice) > 0) {
      status = netPnl > 0 ? 'WIN' : netPnl < 0 ? 'LOSS' : 'BREAKEVEN';
    }

    const pnlPercentage = data.entryPrice > 0 
      ? Number((((data.exitPrice - data.entryPrice) / data.entryPrice) * 100).toFixed(2)) 
      : 0;

    const entryDate = data.entryTime ? new Date(data.entryTime) : new Date();
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const dayOfWeek = days[entryDate.getDay()];

    const trade = await Trade.create({
      symbol: (data.symbol || 'NIFTY').toUpperCase().trim(),
      assetClass: data.assetClass || 'EQUITY',
      tradeType: data.tradeType || 'BUY',
      quantity: parseFloat(data.quantity) || 1,
      lotSize: parseInt(data.lotSize, 10) || 1,
      entryPrice: parseFloat(data.entryPrice),
      exitPrice: data.exitPrice ? parseFloat(data.exitPrice) : null,
      entryTime: entryDate,
      exitTime: data.exitTime ? new Date(data.exitTime) : null,
      stopLoss: data.stopLoss ? parseFloat(data.stopLoss) : null,
      target: data.target ? parseFloat(data.target) : null,
      grossPnl,
      netPnl,
      pnlPercentage,
      rMultiple,
      status,
      brokerSource: data.brokerSource || 'MANUAL',
      charges,
      emotions: Array.isArray(data.emotions) ? data.emotions : [data.emotions || 'Disciplined'],
      rulesFollowed: data.rulesFollowed ?? true,
      strategyName: data.strategyName || 'Discretionary',
      playbookId: data.playbookId || null,
      notes: data.notes || '',
      chartImage: data.chartImage || null,
      dayOfWeek,
      timeOfDay: data.timeOfDay || (entryDate.getHours() < 12 ? 'Morning' : entryDate.getHours() < 14 ? 'Afternoon' : 'Closing'),
    });

    res.status(201).json({ success: true, trade });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * PUT /api/trades/:id - Update an existing trade
 */
router.put('/:id', async (req, res) => {
  try {
    const { Trade } = getModels();
    const trade = await Trade.findByPk(req.params.id);
    if (!trade) return res.status(404).json({ success: false, error: 'Trade not found' });

    const data = req.body;
    const entryPrice = data.entryPrice !== undefined ? parseFloat(data.entryPrice) : trade.entryPrice;
    const exitPrice = data.exitPrice !== undefined ? parseFloat(data.exitPrice) : trade.exitPrice;
    const quantity = data.quantity !== undefined ? parseFloat(data.quantity) : trade.quantity;
    const lotSize = data.lotSize !== undefined ? parseInt(data.lotSize, 10) : trade.lotSize;
    const assetClass = data.assetClass || trade.assetClass;
    const tradeType = data.tradeType || trade.tradeType;
    const strategyName = data.strategyName || trade.strategyName;

    // Preserve exact charges from DhanHQ if trade originated from broker
    let charges = data.charges;
    if (!charges) {
      let existingCharges = trade.charges;
      if (typeof existingCharges === 'string') {
        try { existingCharges = JSON.parse(existingCharges); } catch (e) { existingCharges = {}; }
      }
      const hasDhanCharges = (trade.brokerSource === 'DHAN' && existingCharges && (existingCharges.fromDhan || Number(existingCharges.totalCharges || existingCharges.total || 0) > 0));
      
      if (hasDhanCharges) {
        charges = existingCharges;
      } else {
        charges = calculateIndianCharges({
          assetClass,
          tradeType,
          quantity,
          lotSize,
          entryPrice,
          exitPrice: exitPrice || 0,
        });
      }
    }

    const totalDed = Number(charges.totalCharges || charges.total || 0);

    // Determine if this is an equity holding / IPO sale (where entryPrice is cost and exitPrice is sold price)
    const isEquityHoldingSale = (assetClass === 'EQUITY' && (tradeType === 'SELL' || (strategyName && strategyName.includes('Sale'))));
    
    let grossPnl = 0;
    if (isEquityHoldingSale) {
      // Sold price minus acquisition cost price
      grossPnl = entryPrice > 0 ? Number(((exitPrice - entryPrice) * quantity * lotSize).toFixed(2)) : 0;
    } else if (tradeType === 'BUY') {
      grossPnl = entryPrice > 0 ? Number(((exitPrice - entryPrice) * quantity * lotSize).toFixed(2)) : 0;
    } else {
      // Short trade
      grossPnl = exitPrice > 0 ? Number(((entryPrice - exitPrice) * quantity * lotSize).toFixed(2)) : 0;
    }

    const netPnl = entryPrice > 0 ? Number((grossPnl - totalDed).toFixed(2)) : 0;
    const riskPerUnit = data.stopLoss ? Math.abs(entryPrice - data.stopLoss) : (trade.stopLoss ? Math.abs(entryPrice - trade.stopLoss) : entryPrice * 0.05);
    const totalRisk = riskPerUnit * (quantity * lotSize);
    const rMultiple = (entryPrice > 0 && totalRisk > 0) ? Number((netPnl / totalRisk).toFixed(2)) : 0;
    
    const status = (exitPrice > 0 && entryPrice > 0) 
      ? (netPnl > 0 ? 'WIN' : netPnl < 0 ? 'LOSS' : 'BREAKEVEN') 
      : (exitPrice > 0 ? 'CLOSED' : 'OPEN');
      
    const pnlPercentage = entryPrice > 0 
      ? Number((((exitPrice - entryPrice) / entryPrice) * 100).toFixed(2)) 
      : 0;

    await trade.update({
      ...data,
      entryPrice,
      exitPrice,
      quantity,
      lotSize,
      grossPnl,
      netPnl,
      pnlPercentage,
      rMultiple,
      status,
      charges,
    });

    res.json({ success: true, trade });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/trades/:id/set-cost - 1-Click quick set cost / IPO price
 */
router.post('/:id/set-cost', async (req, res) => {
  try {
    const { Trade } = getModels();
    const trade = await Trade.findByPk(req.params.id);
    if (!trade) return res.status(404).json({ success: false, error: 'Trade not found' });

    let { costPrice } = req.body;
    costPrice = parseFloat(costPrice);
    if (isNaN(costPrice) || costPrice < 0) {
      return res.status(400).json({ success: false, error: 'Invalid cost price' });
    }

    const exitPrice = trade.exitPrice || trade.entryPrice;
    const isEquityDelivery = (trade.assetClass === 'EQUITY' || !trade.assetClass);
    
    // Preserve exact charges from DhanHQ if available!
    let charges = trade.charges;
    if (typeof charges === 'string') {
      try { charges = JSON.parse(charges); } catch (e) { charges = {}; }
    }
    const hasDhanCharges = (trade.brokerSource === 'DHAN' && charges && (charges.fromDhan || Number(charges.totalCharges || charges.total || 0) > 0));

    if (!hasDhanCharges) {
      charges = calculateIndianCharges({
        assetClass: trade.assetClass || 'EQUITY',
        tradeType: 'SELL',
        quantity: trade.quantity,
        lotSize: trade.lotSize || 1,
        entryPrice: costPrice,
        exitPrice,
        isDelivery: isEquityDelivery,
      });
    }

    const totalDed = Number((charges.totalCharges || charges.total || 0));
    const grossPnl = Number(((exitPrice - costPrice) * trade.quantity * (trade.lotSize || 1)).toFixed(2));
    const netPnl = Number((grossPnl - totalDed).toFixed(2));
    const status = netPnl > 0 ? 'WIN' : netPnl < 0 ? 'LOSS' : 'BREAKEVEN';
    const pnlPercentage = costPrice > 0 ? Number((((exitPrice - costPrice) / costPrice) * 100).toFixed(2)) : 0;
    const totalRisk = (costPrice * 0.05) * trade.quantity * (trade.lotSize || 1);
    const rMultiple = totalRisk > 0 ? Number((netPnl / totalRisk).toFixed(2)) : 0;

    // Check if IPO
    const ipoMatch = await lookupIpoPrice(trade.symbol);
    const strategyName = ipoMatch ? 'IPO Allotment Sale' : 'Equity Holding Sale';
    const notes = ipoMatch 
      ? `Allotted via ${ipoMatch.name} IPO @ ₹${costPrice}. Sold ${trade.quantity} shares on DhanHQ @ ₹${exitPrice}. Charges fetched directly from DhanHQ.`
      : `Sold ${trade.quantity} shares @ ₹${exitPrice} (Purchase Cost: ₹${costPrice}). Charges fetched directly from DhanHQ.`;

    await trade.update({
      entryPrice: costPrice,
      grossPnl,
      netPnl,
      pnlPercentage,
      rMultiple,
      status,
      charges,
      strategyName,
      notes,
    });

    res.json({ success: true, message: `Cost price set to ₹${costPrice}. P&L recalculated using Dhan charges.`, trade });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * DELETE /api/trades/:id
 */
router.delete('/:id', async (req, res) => {
  try {
    const { Trade } = getModels();
    const trade = await Trade.findByPk(req.params.id);
    if (!trade) return res.status(404).json({ success: false, error: 'Trade not found' });
    await trade.destroy();
    res.json({ success: true, message: 'Trade deleted successfully' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/trades/bulk-csv - Upload and parse CSV contract notes
 */
router.post('/bulk-csv', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, error: 'No CSV file provided' });
    }
    const { Trade } = getModels();
    const result = await parseAndImportCsv(req.file.path, Trade);
    res.json({ success: true, message: `Successfully imported ${result.count} trades from CSV.`, count: result.count });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/trades/clear/all - Clear all trades
 */
router.post('/clear/all', async (req, res) => {
  try {
    const { Trade } = getModels();
    const count = await Trade.destroy({ where: {} });
    res.json({ success: true, message: `Cleared ${count} trades successfully`, count });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
