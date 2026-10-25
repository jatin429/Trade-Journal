const axios = require('axios');
const { calculateIndianCharges } = require('./chargesCalculator');

const DHAN_BASE_URL = 'https://api.dhan.co/v2';

/**
 * Tests connection with DhanHQ API
 */
async function testDhanConnection(clientId, accessToken) {
  if (!clientId || !accessToken) {
    throw new Error('Client ID and Access Token are required.');
  }

  const cleanClientId = String(clientId).trim();
  const cleanAccessToken = String(accessToken).trim();

  try {
    const response = await axios.get(`${DHAN_BASE_URL}/fundlimit`, {
      headers: {
        'access-token': cleanAccessToken,
        'client-id': cleanClientId,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      timeout: 10000,
    });
    return { success: true, data: response.data };
  } catch (err) {
    const msg = err.response?.data?.message || err.response?.data?.remarks || err.message;
    throw new Error(`Dhan API Error: ${msg}`);
  }
}

/**
 * Fetches trades and holdings from DhanHQ across multiple endpoints:
 * 1. Trade History API: GET /trades/{from-date}/{to-date}/{page} (historical executed trades)
 * 2. Today's Tradebook: GET /trades (trades executed today)
 * 3. Today's Positions: GET /positions (open/closed intraday positions)
 * 4. Today's Orders: GET /orders (executed orders with fill details)
 * 5. Demat Holdings: GET /holdings (for average buy price of delivered shares)
 */
async function fetchDhanTrades(clientId, accessToken, options = {}) {
  const cleanClientId = String(clientId).trim();
  const cleanAccessToken = String(accessToken).trim();

  const days = options.days ? Number(options.days) : 90;
  const now = new Date();
  const toDate = options.toDate || now.toISOString().split('T')[0];
  const pastDate = new Date();
  pastDate.setDate(now.getDate() - days);
  const fromDate = options.fromDate || pastDate.toISOString().split('T')[0];

  const headers = {
    'access-token': cleanAccessToken,
    'client-id': cleanClientId,
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  };

  console.log(`[DhanHQ Sync] Fetching data for Client ID: ${cleanClientId} | Date Range: ${fromDate} to ${toDate} (${days} days)`);

  const collectedFills = [];
  const collectedPositions = [];
  let collectedHoldings = [];

  // 1. Fetch Historical Trade History (paginated: 0, 1, 2...)
  try {
    for (let page = 0; page < 10; page++) {
      try {
        const histRes = await axios.get(`${DHAN_BASE_URL}/trades/${fromDate}/${toDate}/${page}`, {
          headers,
          timeout: 12000,
        });

        const data = Array.isArray(histRes.data) ? histRes.data : (histRes.data?.data || []);
        if (Array.isArray(data) && data.length > 0) {
          console.log(`[DhanHQ Sync] Page ${page} returned ${data.length} historical execution fills.`);
          collectedFills.push(...data);
          if (data.length < 50) break;
        } else {
          break;
        }
      } catch (pageErr) {
        if (page > 0) break;
        console.warn(`[DhanHQ Sync] Trade history query note: ${pageErr.response?.data?.message || pageErr.message}`);
        break;
      }
    }
  } catch (err) {
    console.warn(`[DhanHQ Sync] Note querying historical trades: ${err.message}`);
  }

  // 2. Fetch Today's Tradebook
  try {
    const todayRes = await axios.get(`${DHAN_BASE_URL}/trades`, {
      headers,
      timeout: 10000,
    });
    const todayData = Array.isArray(todayRes.data) ? todayRes.data : (todayRes.data?.data || []);
    if (Array.isArray(todayData) && todayData.length > 0) {
      console.log(`[DhanHQ Sync] Today's tradebook returned ${todayData.length} fills.`);
      collectedFills.push(...todayData);
    }
  } catch (err) {
    console.warn(`[DhanHQ Sync] Note querying today's tradebook: ${err.message}`);
  }

  // 3. Fetch Today's Positions (Closed & Open)
  try {
    const posRes = await axios.get(`${DHAN_BASE_URL}/positions`, {
      headers,
      timeout: 10000,
    });
    const posData = Array.isArray(posRes.data) ? posRes.data : (posRes.data?.data || []);
    if (Array.isArray(posData) && posData.length > 0) {
      console.log(`[DhanHQ Sync] Positions query returned ${posData.length} positions.`);
      collectedPositions.push(...posData);
    }
  } catch (err) {
    console.warn(`[DhanHQ Sync] Note querying positions: ${err.message}`);
  }

  // 4. Fetch Today's Orders (only TRADED ones)
  try {
    const ordRes = await axios.get(`${DHAN_BASE_URL}/orders`, {
      headers,
      timeout: 10000,
    });
    const ordData = Array.isArray(ordRes.data) ? ordRes.data : (ordRes.data?.data || []);
    if (Array.isArray(ordData)) {
      const tradedOrders = ordData.filter(o => o.orderStatus === 'TRADED');
      if (tradedOrders.length > 0) {
        console.log(`[DhanHQ Sync] Order book returned ${tradedOrders.length} executed orders.`);
        for (const order of tradedOrders) {
          collectedFills.push({
            tradingSymbol: order.tradingSymbol || order.customSymbol,
            customSymbol: order.customSymbol || order.tradingSymbol,
            transactionType: order.transactionType,
            tradedQuantity: order.quantity || order.tradedQuantity,
            tradedPrice: order.price || order.tradedPrice,
            exchangeSegment: order.exchangeSegment,
            exchangeTime: order.exchangeTime || order.createTime,
            exchangeTradeId: order.orderId,
            orderId: order.orderId,
            productType: order.productType,
          });
        }
      }
    }
  } catch (err) {
    console.warn(`[DhanHQ Sync] Note querying orders: ${err.message}`);
  }

  // 5. Fetch Demat Portfolio Holdings (to retrieve Average Buy Price / Cost Price of shares)
  try {
    const holdRes = await axios.get(`${DHAN_BASE_URL}/holdings`, {
      headers,
      timeout: 10000,
    });
    const holdData = Array.isArray(holdRes.data) ? holdRes.data : (holdRes.data?.data || []);
    if (Array.isArray(holdData) && holdData.length > 0) {
      console.log(`[DhanHQ Sync] Holdings query returned ${holdData.length} demat scrips.`);
      collectedHoldings = holdData;
    }
  } catch (err) {
    console.warn(`[DhanHQ Sync] Note querying holdings: ${err.message}`);
  }

  console.log(`[DhanHQ Sync] Total raw collected: ${collectedFills.length} fills, ${collectedPositions.length} positions, ${collectedHoldings.length} holdings.`);
  return { 
    fills: collectedFills, 
    positions: collectedPositions, 
    holdings: collectedHoldings 
  };
}

/**
 * Generates sample Dhan trades if the user wants to test the flow without API keys
 */
function getSampleDhanTrades() {
  const today = new Date().toISOString().split('T')[0];
  return [
    {
      symbol: 'ARMEE INFOTECH',
      assetClass: 'EQUITY',
      tradeType: 'SELL',
      quantity: 40,
      lotSize: 1,
      entryPrice: 347.00,
      exitPrice: 350.00,
      entryTime: `2026-09-30 09:16:02`,
      exitTime: `2026-09-30 09:16:02`,
      stopLoss: 330.00,
      target: 360.00,
      grossPnl: 120.00,
      netPnl: 105.48, // 120 - 14.52
      pnlPercentage: 0.86,
      rMultiple: 0.71,
      status: 'WIN',
      strategyName: 'IPO Allotment Sale',
      brokerSource: 'DHAN',
      brokerTradeId: 'DHAN_TRD_ARMEE_DELIVERY',
      charges: {
        brokerage: 0.00,
        stt: 13.97,
        gst: 0.15,
        exchangeCharges: 0.38,
        sebiCharges: 0.02,
        stampDuty: 0.00,
        statutoryCharges: 14.52,
        total: 14.52,
        totalCharges: 14.52,
        fromDhan: true,
        isDelivery: true,
      },
      emotions: ['Disciplined', 'Confident'],
      rulesFollowed: true,
      notes: 'Allotted via ArMee Infotech IPO @ ₹347.00. Sold on DhanHQ. Exact charges fetched from DhanHQ: ₹14.52 (Brokerage: ₹0.00).',
    },
    {
      symbol: 'LT FOODS',
      assetClass: 'EQUITY',
      tradeType: 'BUY',
      quantity: 20,
      lotSize: 1,
      entryPrice: 461.00,
      exitPrice: 464.50,
      entryTime: `2026-08-24 10:30:00`,
      exitTime: `2026-08-24 11:15:00`,
      stopLoss: 456.00,
      target: 470.00,
      grossPnl: 70.00,
      netPnl: 44.64,
      pnlPercentage: 0.76,
      rMultiple: 0.70,
      status: 'WIN',
      strategyName: 'Intraday Momentum',
      brokerSource: 'DHAN',
      brokerTradeId: 'DHAN_TRD_LTFOODS_INTRADAY',
      charges: {
        brokerage: 14.07,
        stt: 4.65,
        gst: 3.37,
        exchangeCharges: 0.64,
        sebiCharges: 0.02,
        stampDuty: 2.61,
        statutoryCharges: 11.29,
        total: 25.36,
        totalCharges: 25.36,
        fromDhan: true,
        isDelivery: false,
      },
      emotions: ['Disciplined'],
      rulesFollowed: true,
      notes: 'Intraday execution on DhanHQ. Exact charges fetched from Dhan: Brokerage ₹14.07, Statutory Charges ₹11.29.',
    },
    {
      symbol: 'NIFTY 24550 CE',
      assetClass: 'OPTIONS',
      tradeType: 'BUY',
      quantity: 50,
      lotSize: 25,
      entryPrice: 122.50,
      exitPrice: 168.00,
      entryTime: `${today} 09:35:00`,
      exitTime: `${today} 10:15:00`,
      stopLoss: 105.00,
      target: 170.00,
      grossPnl: 2275.00,
      netPnl: 2221.40,
      pnlPercentage: 37.14,
      rMultiple: 2.60,
      status: 'WIN',
      strategyName: 'Opening Range Breakout',
      brokerSource: 'DHAN',
      brokerTradeId: 'DHAN_TRD_' + Date.now() + '_1',
      charges: {
        brokerage: 20.00,
        stt: 21.00,
        gst: 7.20,
        exchangeCharges: 4.15,
        sebiCharges: 0.05,
        stampDuty: 1.20,
        statutoryCharges: 33.60,
        total: 53.60,
        totalCharges: 53.60,
        fromDhan: true,
        isDelivery: false,
      },
      emotions: ['Disciplined', 'Confident'],
      rulesFollowed: true,
      notes: 'Clean 15m candle close above previous day high. Followed 1:2.6 risk reward strictly. Charges fetched from DhanHQ.',
    }
  ];
}

/**
 * Detects asset class from symbol and segment
 */
function detectAssetClass(symbol = '', segment = '') {
  const sym = String(symbol).toUpperCase();
  const seg = String(segment).toUpperCase();

  if (sym.endsWith('CE') || sym.endsWith('PE') || sym.includes(' CE ') || sym.includes(' PE ') || seg.includes('FNO')) {
    return 'OPTIONS';
  }
  if (sym.includes('FUT') || sym.includes('FUTURE')) {
    return 'FUTURES';
  }
  if (seg.includes('COMM') || sym.includes('GOLD') || sym.includes('CRUDE') || sym.includes('SILVER')) {
    return 'FUTURES';
  }
  if (seg.includes('CURRENCY') || sym.includes('USDINR')) {
    return 'FOREX';
  }
  return 'EQUITY';
}

/**
 * Normalizes symbol string to ensure BUY and SELL executions match cleanly
 */
function normalizeSymbol(symbol = '') {
  return String(symbol)
    .toUpperCase()
    .replace(/-EQ$/, '')
    .replace(/-BE$/, '')
    .replace(/-SM$/, '')
    .trim();
}

const {
  lookupIpoPriceDynamic,
  lookupIpoPriceSync,
  KNOWN_IPO_DATA,
} = require('./ipoLookupService');

const lookupIpoPrice = lookupIpoPriceSync;


/**
 * Helper to extract exact charges from Dhan fill(s) or fallback to formula
 */
function extractDhanCharges(itemA, itemB = null, fallbackParams = null) {
  const hasA = Boolean(itemA && itemA.hasDhanCharges);
  const hasB = Boolean(itemB && itemB.hasDhanCharges);

  if (hasA || hasB) {
    const brokerage = Number(((Number(itemA?.brokerageCharges || 0)) + (Number(itemB?.brokerageCharges || 0))).toFixed(2));
    const stt = Number(((Number(itemA?.stt || 0)) + (Number(itemB?.stt || 0))).toFixed(2));
    const gst = Number(((Number(itemA?.serviceTax || 0)) + (Number(itemB?.serviceTax || 0))).toFixed(2));
    const exchangeCharges = Number(((Number(itemA?.exchangeTransactionCharges || 0)) + (Number(itemB?.exchangeTransactionCharges || 0))).toFixed(2));
    const sebiCharges = Number(((Number(itemA?.sebiTax || 0)) + (Number(itemB?.sebiTax || 0))).toFixed(2));
    const stampDuty = Number(((Number(itemA?.stampDuty || 0)) + (Number(itemB?.stampDuty || 0))).toFixed(2));

    const statutoryCharges = Number((stt + gst + exchangeCharges + sebiCharges + stampDuty).toFixed(2));
    const totalCharges = Number((brokerage + statutoryCharges).toFixed(2));

    return {
      brokerage,
      stt,
      gst,
      exchangeCharges,
      sebiCharges,
      stampDuty,
      statutoryCharges,
      total: totalCharges,
      totalCharges,
      fromDhan: true,
      isDelivery: Boolean(itemA?.isDelivery || itemB?.isDelivery || (itemA?.productType === 'CNC') || (itemB?.productType === 'CNC')),
    };
  }

  // Fallback if trade did not originate from Dhan API with charge fields
  if (fallbackParams) {
    const calc = calculateIndianCharges(fallbackParams);
    return {
      ...calc,
      statutoryCharges: Number((calc.totalCharges - (calc.brokerage || 0)).toFixed(2)),
      fromDhan: false,
    };
  }

  return {
    brokerage: 0,
    stt: 0,
    gst: 0,
    exchangeCharges: 0,
    sebiCharges: 0,
    stampDuty: 0,
    statutoryCharges: 0,
    total: 0,
    totalCharges: 0,
    fromDhan: false,
  };
}

/**
 * Normalizes and pairs Dhan executions and positions into Journal-ready completed trades
 */
function normalizeAndPairDhanTrades(rawData) {
  const trades = [];

  // If already array of sample/pre-formed trades
  if (Array.isArray(rawData)) {
    const isPreformatted = rawData.some(t => t.entryPrice !== undefined && t.exitPrice !== undefined);
    if (isPreformatted) {
      return rawData;
    }
    rawData = { fills: rawData, positions: [], holdings: [] };
  }

  const fills = rawData.fills || [];
  const positions = rawData.positions || [];
  const holdings = rawData.holdings || [];

  // Map holdings by normalized symbol for cost price lookup
  const holdingsMap = {};
  for (const h of holdings) {
    const hSym = normalizeSymbol(h.tradingSymbol || h.symbol || '');
    if (hSym) {
      holdingsMap[hSym] = {
        avgCostPrice: Number(h.avgCostPrice || h.buyAvg || 0),
        totalQty: Number(h.totalQty || 0),
      };
    }
  }

  // 1. Deduplicate fills accurately without dropping partial fills
  const uniqueFillsMap = new Map();
  fills.forEach((f, idx) => {
    const tradeId = (f.exchangeTradeId && f.exchangeTradeId !== '0' && f.exchangeTradeId !== 'NA') 
      ? String(f.exchangeTradeId).trim() 
      : null;
    const orderId = f.orderId || f.exchangeOrderId || '';
    const side = (f.transactionType || f.tradeType || 'BUY').toUpperCase();
    const price = Number(f.tradedPrice || f.price || 0);
    const qty = Number(f.tradedQuantity || f.quantity || 0);
    const time = f.exchangeTime || f.createTime || '';
    
    // Unique key: if legitimate non-zero tradeId exists, use orderId_tradeId;
    // Otherwise use complete execution attributes with index to preserve every partial fill
    const key = (orderId && tradeId) 
      ? `${orderId}_${tradeId}` 
      : `${orderId}_${side}_${price}_${qty}_${time}_${idx}`;

    if (!uniqueFillsMap.has(key)) {
      uniqueFillsMap.set(key, f);
    }
  });

  const cleanFills = Array.from(uniqueFillsMap.values());

  // 2. Aggregate partial fills belonging to the exact same order
  const orderGroups = {};
  const ungroupedFills = [];

  for (const fill of cleanFills) {
    const orderId = fill.orderId || fill.exchangeOrderId;
    if (orderId) {
      const groupKey = `${orderId}_${fill.transactionType || fill.tradeType}`;
      if (!orderGroups[groupKey]) {
        orderGroups[groupKey] = {
          orderId,
          tradingSymbol: fill.tradingSymbol || fill.customSymbol,
          customSymbol: fill.customSymbol || fill.tradingSymbol,
          transactionType: fill.transactionType || fill.tradeType,
          exchangeSegment: fill.exchangeSegment,
          productType: fill.productType,
          fills: [],
        };
      }
      orderGroups[groupKey].fills.push(fill);
    } else {
      ungroupedFills.push(fill);
    }
  }

  const consolidatedFills = [];

  // Consolidate fills per order and aggregate exact Dhan charges
  for (const og of Object.values(orderGroups)) {
    let totalQty = 0;
    let weightedPriceSum = 0;
    let earliestTime = null;
    let combinedId = og.orderId;

    let dhanBrokerage = 0;
    let dhanStt = 0;
    let dhanGst = 0;
    let dhanExchange = 0;
    let dhanSebi = 0;
    let dhanStamp = 0;
    let hasDhanCharges = false;

    for (const f of og.fills) {
      const q = Math.max(1, Number(f.tradedQuantity || f.quantity || 1));
      const p = Number(f.tradedPrice || f.price || f.entryPrice || 0);
      totalQty += q;
      weightedPriceSum += (q * p);
      const t = new Date(f.exchangeTime || f.createTime || Date.now());
      if (!earliestTime || t < earliestTime) {
        earliestTime = t;
      }

      if (
        f.brokerageCharges !== undefined ||
        f.stt !== undefined ||
        f.serviceTax !== undefined ||
        f.exchangeTransactionCharges !== undefined ||
        f.sebiTax !== undefined ||
        f.stampDuty !== undefined
      ) {
        hasDhanCharges = true;
        dhanBrokerage += parseFloat(f.brokerageCharges) || 0;
        dhanStt += parseFloat(f.stt) || 0;
        dhanGst += parseFloat(f.serviceTax) || 0;
        dhanExchange += parseFloat(f.exchangeTransactionCharges) || 0;
        dhanSebi += parseFloat(f.sebiTax) || 0;
        dhanStamp += parseFloat(f.stampDuty) || 0;
      }
    }

    const avgPrice = totalQty > 0 ? Number((weightedPriceSum / totalQty).toFixed(2)) : 0;

    consolidatedFills.push({
      tradingSymbol: og.tradingSymbol,
      customSymbol: og.customSymbol,
      transactionType: og.transactionType,
      exchangeSegment: og.exchangeSegment,
      productType: og.productType,
      tradedQuantity: totalQty,
      tradedPrice: avgPrice,
      exchangeTime: earliestTime ? earliestTime.toISOString() : new Date().toISOString(),
      orderId: combinedId,
      exchangeTradeId: combinedId,
      // Pass forward exact Dhan charges from execution fills
      brokerageCharges: dhanBrokerage,
      stt: dhanStt,
      serviceTax: dhanGst,
      exchangeTransactionCharges: dhanExchange,
      sebiTax: dhanSebi,
      stampDuty: dhanStamp,
      hasDhanCharges,
    });
  }

  // Ensure ungrouped fills also have Dhan charge flags parsed
  for (const f of ungroupedFills) {
    const hasDhan = (
      f.brokerageCharges !== undefined ||
      f.stt !== undefined ||
      f.serviceTax !== undefined ||
      f.exchangeTransactionCharges !== undefined ||
      f.sebiTax !== undefined ||
      f.stampDuty !== undefined
    );
    f.hasDhanCharges = hasDhan;
    f.brokerageCharges = parseFloat(f.brokerageCharges) || 0;
    f.stt = parseFloat(f.stt) || 0;
    f.serviceTax = parseFloat(f.serviceTax) || 0;
    f.exchangeTransactionCharges = parseFloat(f.exchangeTransactionCharges) || 0;
    f.sebiTax = parseFloat(f.sebiTax) || 0;
    f.stampDuty = parseFloat(f.stampDuty) || 0;
  }

  // Combine consolidated order fills + ungrouped fills
  const allExecutionFills = [...consolidatedFills, ...ungroupedFills];

  // 3. Group fills by normalized symbol
  const bySymbol = {};
  for (const fill of allExecutionFills) {
    const rawSym = fill.customSymbol || fill.tradingSymbol || fill.symbol || 'SCRIP';
    const normSym = normalizeSymbol(rawSym);
    if (!bySymbol[normSym]) {
      bySymbol[normSym] = {
        displayName: rawSym,
        fills: []
      };
    }
    bySymbol[normSym].fills.push(fill);
  }

  // 4. Pair executions chronologically
  for (const [normSym, symGroup] of Object.entries(bySymbol)) {
    const symbol = symGroup.displayName;
    const symFills = symGroup.fills;

    // Sort chronologically
    symFills.sort((a, b) => new Date(a.exchangeTime || a.createTime || 0) - new Date(b.exchangeTime || b.createTime || 0));

    const buyQueue = [];
    const sellQueue = [];

    for (const f of symFills) {
      const type = (f.transactionType || f.tradeType || 'BUY').toUpperCase();
      const qty = Math.max(1, Number(f.tradedQuantity || f.quantity || 1));
      const price = Number(f.tradedPrice || f.price || f.entryPrice || 0);
      const time = f.exchangeTime || f.createTime || new Date();
      const id = f.orderId || f.exchangeTradeId || `TRD_${Math.random().toString(36).substring(7)}`;
      const segment = f.exchangeSegment || '';
      const productType = f.productType || '';
      const assetClass = detectAssetClass(symbol, segment);

      const isDelivery = String(productType).toUpperCase() === 'CNC' || String(productType).toUpperCase() === 'DELIVERY';

      if (type === 'BUY') {
        let remainingQty = qty;
        while (sellQueue.length > 0 && remainingQty > 0) {
          const sellItem = sellQueue[0];
          const matchQty = Math.min(remainingQty, sellItem.qty);

          // Paired Short Trade (SELL first, then BUY to cover)
          const grossPnl = Number(((sellItem.price - price) * matchQty).toFixed(2));
          const tradeCharges = extractDhanCharges(sellItem, f, {
            assetClass,
            tradeType: 'SELL',
            quantity: matchQty,
            lotSize: 1,
            entryPrice: sellItem.price,
            exitPrice: price,
            isDelivery: false,
          });

          const netPnl = Number((grossPnl - tradeCharges.totalCharges).toFixed(2));
          const riskAmount = (sellItem.price * 0.03) * matchQty;
          const rMultiple = riskAmount > 0 ? Number((netPnl / riskAmount).toFixed(2)) : 0;
          const pnlPercentage = sellItem.price > 0 ? Number((((sellItem.price - price) / sellItem.price) * 100).toFixed(2)) : 0;

          trades.push({
            symbol,
            assetClass,
            tradeType: 'SELL',
            quantity: matchQty,
            lotSize: 1,
            entryPrice: sellItem.price,
            exitPrice: price,
            entryTime: sellItem.time,
            exitTime: time,
            stopLoss: Number((sellItem.price * 1.03).toFixed(2)),
            target: Number((sellItem.price * 0.95).toFixed(2)),
            grossPnl,
            netPnl,
            pnlPercentage,
            rMultiple,
            status: netPnl > 0 ? 'WIN' : netPnl < 0 ? 'LOSS' : 'BREAKEVEN',
            brokerSource: 'DHAN',
            brokerTradeId: `DHAN_PAIR_${sellItem.id}_${id}`,
            charges: tradeCharges,
            emotions: ['Disciplined'],
            rulesFollowed: true,
            strategyName: 'Dhan Auto-Matched Execution',
            notes: `Short trade auto-matched from DhanHQ fills (${matchQty} shares @ ₹${sellItem.price} -> ₹${price}). Charges fetched directly from DhanHQ.`,
          });

          sellItem.qty -= matchQty;
          remainingQty -= matchQty;
          if (sellItem.qty <= 0) sellQueue.shift();
        }

        if (remainingQty > 0) {
          buyQueue.push({ 
            qty: remainingQty, 
            price, 
            time, 
            id, 
            assetClass, 
            productType,
            isDelivery,
            brokerageCharges: f.brokerageCharges,
            stt: f.stt,
            serviceTax: f.serviceTax,
            exchangeTransactionCharges: f.exchangeTransactionCharges,
            sebiTax: f.sebiTax,
            stampDuty: f.stampDuty,
            hasDhanCharges: f.hasDhanCharges,
          });
        }
      } else {
        // SELL execution
        let remainingQty = qty;
        while (buyQueue.length > 0 && remainingQty > 0) {
          const buyItem = buyQueue[0];
          const matchQty = Math.min(remainingQty, buyItem.qty);

          // Paired Long Trade (BUY first, then SELL to close)
          const grossPnl = Number(((price - buyItem.price) * matchQty).toFixed(2));
          const tradeCharges = extractDhanCharges(buyItem, f, {
            assetClass,
            tradeType: 'BUY',
            quantity: matchQty,
            lotSize: 1,
            entryPrice: buyItem.price,
            exitPrice: price,
            isDelivery,
          });

          const netPnl = Number((grossPnl - tradeCharges.totalCharges).toFixed(2));
          const riskAmount = (buyItem.price * 0.03) * matchQty;
          const rMultiple = riskAmount > 0 ? Number((netPnl / riskAmount).toFixed(2)) : 0;
          const pnlPercentage = buyItem.price > 0 ? Number((((price - buyItem.price) / buyItem.price) * 100).toFixed(2)) : 0;

          trades.push({
            symbol,
            assetClass,
            tradeType: 'BUY',
            quantity: matchQty,
            lotSize: 1,
            entryPrice: buyItem.price,
            exitPrice: price,
            entryTime: buyItem.time,
            exitTime: time,
            stopLoss: Number((buyItem.price * 0.97).toFixed(2)),
            target: Number((buyItem.price * 1.06).toFixed(2)),
            grossPnl,
            netPnl,
            pnlPercentage,
            rMultiple,
            status: netPnl > 0 ? 'WIN' : netPnl < 0 ? 'LOSS' : 'BREAKEVEN',
            brokerSource: 'DHAN',
            brokerTradeId: `DHAN_PAIR_${buyItem.id}_${id}`,
            charges: tradeCharges,
            emotions: ['Disciplined'],
            rulesFollowed: true,
            strategyName: 'Dhan Auto-Matched Execution',
            notes: `Long trade auto-matched from DhanHQ fills (${matchQty} shares @ ₹${buyItem.price} -> ₹${price}). Charges fetched directly from DhanHQ.`,
          });

          buyItem.qty -= matchQty;
          remainingQty -= matchQty;
          if (buyItem.qty <= 0) buyQueue.shift();
        }

        if (remainingQty > 0) {
          sellQueue.push({ 
            qty: remainingQty, 
            price, 
            time, 
            id, 
            assetClass, 
            productType,
            isDelivery,
            brokerageCharges: f.brokerageCharges,
            stt: f.stt,
            serviceTax: f.serviceTax,
            exchangeTransactionCharges: f.exchangeTransactionCharges,
            sebiTax: f.sebiTax,
            stampDuty: f.stampDuty,
            hasDhanCharges: f.hasDhanCharges,
          });
        }
      }
    }

    // Remaining open BUY fills (True Open Holdings)
    for (const b of buyQueue) {
      const assetClass = b.assetClass || detectAssetClass(symbol);
      const tradeCharges = extractDhanCharges(b, null, {
        assetClass,
        tradeType: 'BUY',
        quantity: b.qty,
        lotSize: 1,
        entryPrice: b.price,
        exitPrice: b.price,
        isDelivery: b.isDelivery,
      });

      trades.push({
        symbol,
        assetClass,
        tradeType: 'BUY',
        quantity: b.qty,
        lotSize: 1,
        entryPrice: b.price,
        exitPrice: null,
        entryTime: b.time,
        exitTime: null,
        stopLoss: Number((b.price * 0.97).toFixed(2)),
        target: Number((b.price * 1.06).toFixed(2)),
        grossPnl: 0,
        netPnl: 0,
        pnlPercentage: 0,
        rMultiple: 0,
        status: 'OPEN',
        brokerSource: 'DHAN',
        brokerTradeId: `DHAN_OPEN_BUY_${b.id}`,
        charges: tradeCharges,
        emotions: ['Disciplined'],
        rulesFollowed: true,
        strategyName: 'Open Holding',
        notes: `Active open long holding synced from DhanHQ (${b.qty} shares @ ₹${b.price}). Charges fetched directly from DhanHQ.`,
      });
    }

    // Remaining SELL fills (Shares sold from Demat holdings or earlier purchases)
    for (const s of sellQueue) {
      const assetClass = s.assetClass || detectAssetClass(symbol);
      const isEquity = assetClass === 'EQUITY';

      // Check if we have cost price from holdings
      const holdingInfo = holdingsMap[normSym];
      const avgCostPrice = holdingInfo?.avgCostPrice || 0;

      if (isEquity) {
        // In Cash Equity, this is an executed SALE of shares!
        const soldPrice = s.price;
        const ipoMatch = lookupIpoPrice(symbol);
        const buyPrice = avgCostPrice > 0 ? avgCostPrice : (ipoMatch ? ipoMatch.issuePrice : 0);
        const isIpo = !avgCostPrice && !!ipoMatch;
        const grossPnl = buyPrice > 0 ? Number(((soldPrice - buyPrice) * s.qty).toFixed(2)) : 0;

        const tradeCharges = extractDhanCharges(s, null, {
          assetClass: 'EQUITY',
          tradeType: 'SELL',
          quantity: s.qty,
          lotSize: 1,
          entryPrice: buyPrice || soldPrice,
          exitPrice: soldPrice,
          isDelivery: true, // CNC/delivery
        });

        const netPnl = buyPrice > 0 ? Number((grossPnl - tradeCharges.totalCharges).toFixed(2)) : 0;
        const status = buyPrice > 0 
          ? (netPnl > 0 ? 'WIN' : netPnl < 0 ? 'LOSS' : 'BREAKEVEN')
          : 'CLOSED';

        const pnlPercentage = buyPrice > 0 
          ? Number((((soldPrice - buyPrice) / buyPrice) * 100).toFixed(2)) 
          : 0;

        const riskAmount = (buyPrice * 0.05) * s.qty;
        const rMultiple = (buyPrice > 0 && riskAmount > 0) ? Number((netPnl / riskAmount).toFixed(2)) : 0;

        trades.push({
          symbol,
          assetClass: 'EQUITY',
          tradeType: 'SELL',
          quantity: s.qty,
          lotSize: ipoMatch?.lotSize || 1,
          entryPrice: buyPrice, // Populated from IPO intelligence or Dhan Holdings or 0
          exitPrice: soldPrice, // Exact selling price!
          entryTime: s.time,
          exitTime: s.time,
          stopLoss: buyPrice > 0 ? Number((buyPrice * 0.95).toFixed(2)) : null,
          target: soldPrice,
          grossPnl,
          netPnl,
          pnlPercentage,
          rMultiple,
          status,
          brokerSource: 'DHAN',
          brokerTradeId: `DHAN_SOLD_${s.id}`,
          charges: tradeCharges,
          emotions: ['Disciplined'],
          rulesFollowed: true,
          strategyName: isIpo ? 'IPO Allotment Sale' : 'Equity Holding Sale',
          notes: isIpo 
            ? `Allotted via ${ipoMatch.name} IPO @ ₹${buyPrice}. Sold ${s.qty} shares on DhanHQ @ ₹${soldPrice}. Charges fetched directly from DhanHQ.`
            : (buyPrice > 0 
                ? `Sold ${s.qty} shares @ ₹${soldPrice} (Avg Cost: ₹${buyPrice} from Dhan Holdings). Charges fetched directly from DhanHQ.`
                : `Sold ${s.qty} shares @ ₹${soldPrice} on DhanHQ. Charges fetched directly from DhanHQ. Click trade to specify your purchase or IPO cost price.`),
        });
      } else {
        // Derivatives (F&O) open short position
        const tradeCharges = extractDhanCharges(s, null, {
          assetClass,
          tradeType: 'SELL',
          quantity: s.qty,
          lotSize: 1,
          entryPrice: s.price,
          exitPrice: s.price,
          isDelivery: false,
        });

        trades.push({
          symbol,
          assetClass,
          tradeType: 'SELL',
          quantity: s.qty,
          lotSize: 1,
          entryPrice: s.price,
          exitPrice: null,
          entryTime: s.time,
          exitTime: null,
          stopLoss: Number((s.price * 1.03).toFixed(2)),
          target: Number((s.price * 0.95).toFixed(2)),
          grossPnl: 0,
          netPnl: 0,
          pnlPercentage: 0,
          rMultiple: 0,
          status: 'OPEN',
          brokerSource: 'DHAN',
          brokerTradeId: `DHAN_OPEN_SHORT_${s.id}`,
          charges: tradeCharges,
          emotions: ['Disciplined'],
          rulesFollowed: true,
          strategyName: 'Open Short Position',
          notes: `Active open short derivative contract on DhanHQ. Charges fetched directly from DhanHQ.`,
        });
      }
    }
  }

  // 5. Also include positions if not already matched from fills
  for (const pos of positions) {
    const rawSymbol = pos.tradingSymbol || pos.customSymbol || 'POSITION';
    const symbol = rawSymbol.toUpperCase();
    const realizedProfit = Number(pos.realizedProfit || 0);
    const buyQty = Number(pos.buyQty || 0);
    const sellQty = Number(pos.sellQty || 0);
    const buyAvg = Number(pos.buyAvg || 0);
    const sellAvg = Number(pos.sellAvg || 0);

    if ((buyQty > 0 || sellQty > 0) && (realizedProfit !== 0 || (buyAvg > 0 && sellAvg > 0))) {
      const posId = `DHAN_POS_${symbol}_${pos.securityId || ''}_${pos.positionType || ''}`;
      const alreadyHas = trades.some(t => normalizeSymbol(t.symbol) === normalizeSymbol(symbol) && Math.abs(t.grossPnl - realizedProfit) < 1);
      if (!alreadyHas) {
        const assetClass = detectAssetClass(symbol, pos.exchangeSegment);
        const qty = Math.max(1, Math.min(buyQty, sellQty) || buyQty || sellQty);
        const chargesCalc = calculateIndianCharges({
          assetClass,
          tradeType: 'BUY',
          quantity: qty,
          lotSize: 1,
          entryPrice: buyAvg || sellAvg,
          exitPrice: sellAvg || buyAvg,
        });
        const netPnl = Number((realizedProfit - chargesCalc.totalCharges).toFixed(2));
        const pnlPct = buyAvg > 0 ? Number((((sellAvg - buyAvg) / buyAvg) * 100).toFixed(2)) : 0;

        trades.push({
          symbol,
          assetClass,
          tradeType: buyQty >= sellQty ? 'BUY' : 'SELL',
          quantity: qty,
          lotSize: 1,
          entryPrice: buyAvg || sellAvg,
          exitPrice: sellAvg || buyAvg,
          entryTime: new Date(),
          exitTime: new Date(),
          grossPnl: realizedProfit,
          netPnl,
          pnlPercentage: pnlPct,
          rMultiple: netPnl > 0 ? 1.5 : -1.0,
          status: netPnl > 0 ? 'WIN' : netPnl < 0 ? 'LOSS' : 'BREAKEVEN',
          brokerSource: 'DHAN',
          brokerTradeId: posId,
          charges: {
            stt: chargesCalc.stt,
            exchangeCharges: chargesCalc.exchangeCharges,
            stampDuty: chargesCalc.stampDuty,
            sebiCharges: chargesCalc.sebiCharges,
            brokerage: chargesCalc.brokerage,
            gst: chargesCalc.gst,
            total: chargesCalc.totalCharges,
            totalCharges: chargesCalc.totalCharges,
          },
          emotions: ['Disciplined'],
          rulesFollowed: true,
          strategyName: 'Intraday Position Sync',
          notes: `Position execution synced from DhanHQ (Realized P&L: ₹${realizedProfit}).`,
        });
      }
    }
  }

  return trades;
}

/**
 * Transforms and saves Dhan trades into Trade model with deduplication
 */
async function syncTradesToDb(tradesInput, TradeModel) {
  const normalizedTrades = normalizeAndPairDhanTrades(tradesInput);
  let createdCount = 0;

  for (const item of normalizedTrades) {
    const brokerTradeId = item.brokerTradeId || `DHAN_${Date.now()}_${Math.random().toString(36).substring(7)}`;

    // Check for duplicate trade by brokerTradeId
    const existing = await TradeModel.findOne({
      where: { brokerTradeId }
    });

    if (existing) {
      // If trade already exists in DB, refresh its charges and net P&L with exact Dhan charges!
      if (item.charges && (item.charges.fromDhan || item.charges.totalCharges !== undefined)) {
        const totalDed = Number((item.charges.totalCharges || item.charges.total || 0));
        const netPnl = existing.entryPrice > 0 
          ? Number((existing.grossPnl - totalDed).toFixed(2))
          : existing.netPnl;
        await existing.update({
          charges: item.charges,
          netPnl,
        });
      }
      continue;
    }

    const charges = item.charges || calculateIndianCharges({
      assetClass: item.assetClass,
      tradeType: item.tradeType,
      quantity: item.quantity,
      lotSize: item.lotSize || 1,
      entryPrice: item.entryPrice,
      exitPrice: item.exitPrice || item.entryPrice,
    });

    const netPnl = item.netPnl !== undefined ? item.netPnl : (item.grossPnl - (charges.totalCharges || charges.total || 0));
    const status = item.status || (item.exitPrice === null ? 'OPEN' : (netPnl > 0 ? 'WIN' : netPnl < 0 ? 'LOSS' : 'BREAKEVEN'));

    await TradeModel.create({
      symbol: item.symbol || 'SCRIP',
      assetClass: item.assetClass || 'EQUITY',
      tradeType: item.tradeType || 'BUY',
      quantity: item.quantity || 1,
      lotSize: item.lotSize || 1,
      entryPrice: item.entryPrice || 0,
      exitPrice: item.exitPrice,
      entryTime: item.entryTime || new Date(),
      exitTime: item.exitTime,
      stopLoss: item.stopLoss,
      target: item.target,
      grossPnl: item.grossPnl || 0,
      netPnl,
      pnlPercentage: item.pnlPercentage || 0,
      rMultiple: item.rMultiple || 0,
      status,
      brokerSource: 'DHAN',
      brokerTradeId,
      charges,
      emotions: item.emotions || ['Disciplined'],
      rulesFollowed: item.rulesFollowed ?? true,
      strategyName: item.strategyName || 'Discretionary',
      notes: item.notes || 'Synced from DhanHQ API',
    });
    createdCount++;
  }

  console.log(`[DhanHQ Sync] Successfully synced ${createdCount} new trades to database.`);
  return createdCount;
}

module.exports = {
  testDhanConnection,
  fetchDhanTrades,
  getSampleDhanTrades,
  normalizeAndPairDhanTrades,
  syncTradesToDb,
  KNOWN_IPO_DATA,
  lookupIpoPrice: lookupIpoPriceDynamic,
  lookupIpoPriceDynamic,
  lookupIpoPriceSync,
};
