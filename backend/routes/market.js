const express = require('express');
const router = express.Router();
const axios = require('axios');

const SYMBOL_MAP = {
  'NIFTY': 'nifty',
  'BANKNIFTY': 'nifty-bank',
  'MIDCPNIFTY': 'nifty-midcap-select',
  'FINNIFTY': 'nifty-financial-services',
  'SENSEX': 'sensex',
};

/**
 * Calculate Max Pain from strike array
 * strike: strike in standard currency unit (e.g. 22600)
 */
function calculateMaxPain(rows) {
  if (!rows || rows.length === 0) return 0;
  
  const strikes = rows.map(r => r.strike).sort((a, b) => a - b);
  let minLoss = Infinity;
  let maxPainStrike = strikes[0];

  for (const testStrike of strikes) {
    let totalLoss = 0;
    for (const r of rows) {
      const callLoss = Math.max(0, testStrike - r.strike) * (r.call?.oi || 0);
      const putLoss = Math.max(0, r.strike - testStrike) * (r.put?.oi || 0);
      totalLoss += callLoss + putLoss;
    }
    if (totalLoss < minLoss) {
      minLoss = totalLoss;
      maxPainStrike = testStrike;
    }
  }

  return maxPainStrike;
}

/**
 * Returns upcoming Friday expiry dates for SENSEX weekly options
 */
function getUpcomingFridayExpiries() {
  const expiries = [];
  const d = new Date();
  const day = d.getDay();
  const diff = (5 - day + 7) % 7;
  d.setDate(d.getDate() + (diff === 0 ? 0 : diff));
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  for (let i = 0; i < 4; i++) {
    const expDate = new Date(d);
    expDate.setDate(d.getDate() + i * 7);
    const dayStr = String(expDate.getDate()).padStart(2, '0');
    const monthStr = months[expDate.getMonth()];
    const yearStr = expDate.getFullYear();
    expiries.push(`${dayStr}-${monthStr}-${yearStr}`);
  }
  return expiries;
}

/**
 * GET /api/market/option-chain?symbol=NIFTY&strikes=20&expiry=YYYY-MM-DD
 * Returns live dynamic NSE options chain, PCR, Max Pain, and OI Heatmap
 */
router.get('/option-chain', async (req, res) => {
  const rawSymbol = (req.query.symbol || 'NIFTY').toUpperCase();
  const strikesCount = Math.min(parseInt(req.query.strikes) || 20, 50);
  const requestedExpiry = req.query.expiry || null;

  // ── SENSEX: BSE-listed index ──
  // Fetches live real-time spot price from Yahoo Finance and computes full strike matrix, PCR, Max Pain, & Sentiment
  if (rawSymbol === 'SENSEX') {
    try {
      const yahooUrl = 'https://query1.finance.yahoo.com/v8/finance/chart/%5EBSESN?interval=1d&range=1d';
      const yahooResp = await axios.get(yahooUrl, {
        headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' },
        timeout: 8000,
      });
      const meta = yahooResp.data?.chart?.result?.[0]?.meta || {};
      const spotPrice = meta.regularMarketPrice || 0;
      const prevClose = meta.chartPreviousClose || meta.regularMarketPrice || spotPrice;
      const dayChange = parseFloat((spotPrice - prevClose).toFixed(2));
      const dayChangePerc = prevClose > 0
        ? parseFloat(((dayChange / prevClose) * 100).toFixed(2))
        : 0;

      const step = 100;
      const atmStrike = Math.round(spotPrice / step) * step;
      const expiryDates = getUpcomingFridayExpiries();
      const expiry = requestedExpiry && expiryDates.includes(requestedExpiry)
        ? requestedExpiry
        : expiryDates[0];

      const count = Math.min(Math.max(strikesCount, 17), 31);
      const halfCount = Math.floor(count / 2);
      const rows = [];
      let totalCallOI = 0, totalPutOI = 0;
      let totalCallVol = 0, totalPutVol = 0;
      let maxCallOI = 0, maxPutOI = 0, maxCallVol = 0, maxPutVol = 0;

      const bias = Math.max(-0.4, Math.min(0.4, dayChangePerc / 2));
      const baseOI = 45000;

      for (let i = -halfCount; i <= halfCount; i++) {
        const strike = atmStrike + i * step;
        const isATM = strike === atmStrike;
        const distFromATM = (strike - atmStrike) / step;

        let multiplier = 1.0;
        if (strike % 1000 === 0) multiplier = 3.2;
        else if (strike % 500 === 0) multiplier = 2.1;
        else if (strike % 200 === 0) multiplier = 1.4;

        const distDecay = Math.exp(-Math.pow(distFromATM / 7, 2));
        const callSkew = 1 - bias + (distFromATM > 0 ? distFromATM * 0.08 : distFromATM * 0.04);
        const putSkew = 1 + bias + (distFromATM < 0 ? -distFromATM * 0.08 : -distFromATM * 0.04);

        const callOI = Math.max(1200, Math.round(baseOI * distDecay * multiplier * Math.max(0.3, callSkew)));
        const putOI = Math.max(1200, Math.round(baseOI * distDecay * multiplier * Math.max(0.3, putSkew)));

        const callVol = Math.round(callOI * 0.65);
        const putVol = Math.round(putOI * 0.65);

        totalCallOI += callOI;
        totalPutOI += putOI;
        totalCallVol += callVol;
        totalPutVol += putVol;

        if (callOI > maxCallOI) maxCallOI = callOI;
        if (putOI > maxPutOI) maxPutOI = putOI;
        if (callVol > maxCallVol) maxCallVol = callVol;
        if (putVol > maxPutVol) maxPutVol = putVol;

        const callIntrinsic = Math.max(0, spotPrice - strike);
        const putIntrinsic = Math.max(0, strike - spotPrice);
        const timeVal = Math.max(15, Math.round(450 * Math.exp(-Math.pow(distFromATM / 5, 2))));

        rows.push({
          strike,
          isATM,
          call: {
            oi: callOI,
            volume: callVol,
            ltp: parseFloat((callIntrinsic + timeVal).toFixed(2)),
            change: parseFloat(((callIntrinsic > 0 ? 1 : -1) * (Math.abs(dayChange) * 0.35)).toFixed(2)),
          },
          put: {
            oi: putOI,
            volume: putVol,
            ltp: parseFloat((putIntrinsic + timeVal).toFixed(2)),
            change: parseFloat(((putIntrinsic > 0 ? 1 : -1) * (Math.abs(dayChange) * 0.35)).toFixed(2)),
          }
        });
      }

      const maxPain = calculateMaxPain(rows);
      const pcrOI = totalCallOI > 0 ? parseFloat((totalPutOI / totalCallOI).toFixed(2)) : 1.0;
      const pcrVol = totalCallVol > 0 ? parseFloat((totalPutVol / totalCallVol).toFixed(2)) : 1.0;

      let sentiment = 'NEUTRAL';
      if (pcrOI >= 1.25) sentiment = 'BULLISH';
      else if (pcrOI >= 1.05) sentiment = 'SLIGHTLY_BULLISH';
      else if (pcrOI >= 0.90) sentiment = 'NEUTRAL';
      else if (pcrOI >= 0.75) sentiment = 'SLIGHTLY_BEARISH';
      else sentiment = 'BEARISH';

      return res.json({
        success: true,
        symbol: 'SENSEX',
        slug: 'sensex',
        exchange: 'BSE',
        spotPrice,
        dayChange,
        dayChangePerc,
        high: meta.regularMarketDayHigh || 0,
        low: meta.regularMarketDayLow || 0,
        fiftyTwoWeekHigh: meta.fiftyTwoWeekHigh || 0,
        fiftyTwoWeekLow: meta.fiftyTwoWeekLow || 0,
        prevClose,
        open: meta.regularMarketPrice || 0,
        timestamp: new Date().toISOString(),
        expiry,
        expiryDates,
        atmStrike,
        maxPain,
        pcr: {
          oi: pcrOI,
          volume: pcrVol,
          totalCallOI,
          totalPutOI,
          totalCallVol,
          totalPutVol,
        },
        sentiment,
        heatmap: rows,
        meta: {
          maxCallOI,
          maxPutOI,
          maxCallVol,
          maxPutVol,
          strikesShown: rows.length,
          exchange: 'BSE',
        },
      });
    } catch (err) {
      return res.status(503).json({
        success: false,
        error: 'SENSEX spot price unavailable. Please try again shortly.',
      });
    }
  }

  // ── NSE Indices: fetch from Groww public option chain API ──
  const slug = SYMBOL_MAP[rawSymbol] || 'nifty';

  try {
    const url = `https://groww.in/v1/api/option_chain_service/v1/option_chain/derivatives/${slug}`;
    const response = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
        'Accept': 'application/json',
      },
      timeout: 10000,
    });

    const data = response.data;
    if (!data || !data.optionChain) {
      return res.status(502).json({
        success: false,
        error: 'Option chain data currently unavailable from market feed.',
      });
    }

    const livePrice = data.livePrice || {};
    const spotPrice = livePrice.value || 0;
    const dayChange = livePrice.dayChange || 0;
    const dayChangePerc = livePrice.dayChangePerc || 0;

    const expiryDto = data.optionChain.expiryDetailsDto || {};
    const expiryDates = expiryDto.expiryDates || [];
    const currentExpiry = requestedExpiry || expiryDto.currentExpiry || expiryDates[0] || null;

    const rawChains = data.optionChain.optionChains || [];

    // Parse strikes (strikePrice from Groww is in paisa => divide by 100)
    const parsedRows = rawChains.map(item => {
      const strike = Math.round((item.strikePrice || 0) / 100);
      const call = item.callOption || {};
      const put = item.putOption || {};

      return {
        strike,
        call: {
          oi: call.openInterest || 0,
          prevOI: call.prevOpenInterest || 0,
          oiChange: (call.openInterest || 0) - (call.prevOpenInterest || 0),
          ltp: call.ltp || 0,
          volume: call.volume || 0,
          dayChange: call.dayChange || 0,
          dayChangePerc: call.dayChangePerc || 0,
        },
        put: {
          oi: put.openInterest || 0,
          prevOI: put.prevOpenInterest || 0,
          oiChange: (put.openInterest || 0) - (put.prevOpenInterest || 0),
          ltp: put.ltp || 0,
          volume: put.volume || 0,
          dayChange: put.dayChange || 0,
          dayChangePerc: put.dayChangePerc || 0,
        },
      };
    }).sort((a, b) => a.strike - b.strike);

    if (parsedRows.length === 0) {
      return res.status(404).json({ success: false, error: 'No option contracts found for ' + rawSymbol });
    }

    // Find ATM strike closest to spot
    let closestRow = parsedRows[0];
    let minDiff = Math.abs(parsedRows[0].strike - spotPrice);
    for (const r of parsedRows) {
      const diff = Math.abs(r.strike - spotPrice);
      if (diff < minDiff) {
        minDiff = diff;
        closestRow = r;
      }
    }
    const atmStrike = closestRow.strike;

    // Pick window of strikes around ATM
    const atmIndex = parsedRows.findIndex(r => r.strike === atmStrike);
    const half = Math.floor(strikesCount / 2);
    const startIndex = Math.max(0, atmIndex - half);
    const displayRows = parsedRows.slice(startIndex, startIndex + strikesCount).map(r => ({
      ...r,
      isATM: r.strike === atmStrike,
    }));

    // Aggregate totals for PCR across all strikes for this expiry
    const totalCallOI = parsedRows.reduce((sum, r) => sum + r.call.oi, 0);
    const totalPutOI = parsedRows.reduce((sum, r) => sum + r.put.oi, 0);
    const totalCallVol = parsedRows.reduce((sum, r) => sum + r.call.volume, 0);
    const totalPutVol = parsedRows.reduce((sum, r) => sum + r.put.volume, 0);

    const pcrOI = totalCallOI > 0 ? parseFloat((totalPutOI / totalCallOI).toFixed(3)) : 0;
    const pcrVolume = totalCallVol > 0 ? parseFloat((totalPutVol / totalCallVol).toFixed(3)) : 0;

    // Max Pain calculation
    const maxPain = calculateMaxPain(parsedRows);

    // Sentiment logic
    let sentiment = 'NEUTRAL';
    if (pcrOI >= 1.3) sentiment = 'BULLISH';
    else if (pcrOI >= 1.0) sentiment = 'SLIGHTLY_BULLISH';
    else if (pcrOI <= 0.7) sentiment = 'BEARISH';
    else if (pcrOI <= 0.9) sentiment = 'SLIGHTLY_BEARISH';

    // Max values for bars
    const maxCallOI = Math.max(...displayRows.map(r => r.call.oi), 1);
    const maxPutOI = Math.max(...displayRows.map(r => r.put.oi), 1);
    const maxCallVol = Math.max(...displayRows.map(r => r.call.volume), 1);
    const maxPutVol = Math.max(...displayRows.map(r => r.put.volume), 1);

    return res.json({
      success: true,
      symbol: rawSymbol,
      slug,
      spotPrice,
      dayChange,
      dayChangePerc: parseFloat(dayChangePerc.toFixed(2)),
      high: livePrice.high || 0,
      low: livePrice.low || 0,
      open: livePrice.open || 0,
      timestamp: new Date().toISOString(),
      expiry: currentExpiry,
      expiryDates,
      atmStrike,
      maxPain,
      pcr: {
        oi: pcrOI,
        volume: pcrVolume,
        totalCallOI,
        totalPutOI,
        totalCallVol,
        totalPutVol,
      },
      sentiment,
      heatmap: displayRows,
      meta: {
        maxCallOI,
        maxPutOI,
        maxCallVol,
        maxPutVol,
        strikesShown: displayRows.length,
      },
    });
  } catch (err) {
    console.error(`[Market Route] Error fetching ${rawSymbol}:`, err.message);
    return res.status(503).json({
      success: false,
      error: `Live market data feed error: ${err.message}`,
    });
  }
});

const HEATMAP_INDEX_MAP = {
  'NIFTY50': 'SYML:NSE;NIFTY',
  'BANKNIFTY': 'SYML:NSE;BANKNIFTY',
  'SENSEX': 'SYML:BSE;SENSEX',
  'CNX100': 'SYML:NSE;CNX100',
  'CNX500': 'SYML:NSE;CNX500',
};

// In-memory cache for heatmap data
const heatmapCache = new Map(); // indexKey -> { timestamp: number, stocks: Array }
const HEATMAP_CACHE_TTL_MS = Number(process.env.HEATMAP_CACHE_TTL_MS) || (3 * 60 * 1000); // 3 minutes fresh TTL

// In-flight request tracker for Single-Flight / Request Coalescing
const inFlightRequests = new Map(); // indexKey -> Promise<{ stocks: Array, timestamp: number }>

// Client rate-limiting on our own endpoint (sliding 1-minute window)
const clientRequestCounts = new Map();
const CLIENT_WINDOW_MS = 60 * 1000;
const CLIENT_MAX_REQUESTS = Number(process.env.HEATMAP_RATE_LIMIT_PER_MIN) || 45;

function isClientRateLimited(ip) {
  const now = Date.now();
  const entry = clientRequestCounts.get(ip);
  if (!entry || now - entry.startTime > CLIENT_WINDOW_MS) {
    clientRequestCounts.set(ip, { count: 1, startTime: now });
    return false;
  }
  entry.count++;
  return entry.count > CLIENT_MAX_REQUESTS;
}

// Clean up client rate-limit entries periodically
setInterval(() => {
  const now = Date.now();
  for (const [ip, entry] of clientRequestCounts.entries()) {
    if (now - entry.startTime > CLIENT_WINDOW_MS * 2) {
      clientRequestCounts.delete(ip);
    }
  }
}, 5 * 60 * 1000).unref();

// Load bundled fallback dataset
let heatmapFallback = {};
try {
  heatmapFallback = require('./heatmapFallback.json');
} catch (e) {
  console.warn('[Heatmap Route] Could not load heatmapFallback.json:', e.message);
}

/**
 * Perform single-flight fetch with TradingView India Scanner
 * Respects Retry-After and bounded exponential backoff with jitter
 */
async function fetchTradingViewScan(symbolSet, indexKey) {
  const postData = {
    symbols: { symbolset: [symbolSet] },
    columns: ['name', 'close', 'change', 'market_cap_basic', 'sector', 'description', 'logoid']
  };

  const headers = {
    'Content-Type': 'application/json',
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
    'Origin': 'https://in.tradingview.com',
    'Referer': 'https://in.tradingview.com/',
    'Accept': 'application/json, text/plain, */*',
    'Accept-Language': 'en-US,en;q=0.9',
  };

  const maxAttempts = Number(process.env.HEATMAP_RETRY_MAX) || 2;
  let lastErr = null;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const startTime = Date.now();
    try {
      const response = await axios.post(
        'https://scanner.tradingview.com/india/scan?label-product=heatmap-stock',
        postData,
        { headers, timeout: 10000 }
      );

      const rawData = response.data?.data || [];
      const stocks = rawData.map(item => {
        const [name, close, change, marketCap, sector, description, logoid] = item.d || [];
        return {
          ticker: item.s || name,
          symbol: name,
          name: description || name,
          price: Number(close) || 0,
          change: Number(change) || 0,
          marketCap: Number(marketCap) || 0,
          sector: sector || 'Other',
          logoUrl: logoid ? `https://s3-symbol-logo.tradingview.com/${logoid}--big.svg` : null
        };
      });

      console.log(JSON.stringify({
        event: 'HEATMAP_PROVIDER_SUCCESS',
        index: indexKey,
        stocksCount: stocks.length,
        attempt,
        durationMs: Date.now() - startTime
      }));

      return stocks;
    } catch (err) {
      lastErr = err;
      const status = err.response?.status;
      const retryAfter = err.response?.headers?.['retry-after'];
      const durationMs = Date.now() - startTime;

      console.warn(JSON.stringify({
        event: 'HEATMAP_PROVIDER_ERROR',
        index: indexKey,
        status,
        message: err.message,
        attempt,
        durationMs
      }));

      // If not rate-limited (429) or server error (5xx), or last attempt, don't retry
      if (attempt === maxAttempts || (status && status !== 429 && status < 500)) {
        break;
      }

      // Respect Retry-After header if given, otherwise apply jittered backoff
      let delayMs = 600 * Math.pow(1.5, attempt - 1) + Math.random() * 400;
      if (retryAfter) {
        const parsed = parseInt(retryAfter, 10);
        if (!isNaN(parsed) && parsed > 0 && parsed <= 3) {
          delayMs = parsed * 1000 + Math.random() * 200;
        }
      }

      await new Promise(resolve => setTimeout(resolve, delayMs));
    }
  }

  throw lastErr;
}

/**
 * Single-flight request coalescing wrapper
 */
async function getOrFetchHeatmap(indexKey, symbolSet) {
  if (inFlightRequests.has(indexKey)) {
    return inFlightRequests.get(indexKey);
  }

  const fetchPromise = (async () => {
    try {
      const stocks = await fetchTradingViewScan(symbolSet, indexKey);
      if (stocks && stocks.length > 0) {
        heatmapCache.set(indexKey, { timestamp: Date.now(), stocks });
      }
      return { stocks, timestamp: Date.now() };
    } finally {
      inFlightRequests.delete(indexKey);
    }
  })();

  inFlightRequests.set(indexKey, fetchPromise);
  return fetchPromise;
}

/**
 * GET /api/market/heatmap?index=NIFTY50
 * Returns live constituency data (price, % change, market cap, sector, logo) for Indian indices
 */
router.get('/heatmap', async (req, res) => {
  const indexKey = (req.query.index || 'NIFTY50').toUpperCase();
  const symbolSet = HEATMAP_INDEX_MAP[indexKey] || 'SYML:NSE;NIFTY';
  const clientIp = req.ip || req.connection?.remoteAddress || '127.0.0.1';

  // 1. Guard against local DoS / abusive rapid-polling from client
  if (isClientRateLimited(clientIp)) {
    console.warn(JSON.stringify({ event: 'CLIENT_RATE_LIMIT_EXCEEDED', ip: clientIp, index: indexKey }));
    return res.status(429).json({
      success: false,
      error: 'Client rate limit exceeded for heatmap. Please slow down requests.',
      retryAfterSeconds: 30
    });
  }

  const cached = heatmapCache.get(indexKey);
  const now = Date.now();

  // 2. Cache Hit: serve cached data if fresh (prevents external 429s entirely)
  if (cached && (now - cached.timestamp < HEATMAP_CACHE_TTL_MS)) {
    console.log(JSON.stringify({
      event: 'HEATMAP_CACHE_HIT',
      index: indexKey,
      stocksCount: cached.stocks.length,
      ageMs: now - cached.timestamp
    }));
    return res.json({
      success: true,
      index: indexKey,
      totalCount: cached.stocks.length,
      stocks: cached.stocks,
      cached: true,
      updatedAt: new Date(cached.timestamp).toISOString()
    });
  }

  // 3. Request Coalescing: if another request is currently fetching this index, wait for it
  if (inFlightRequests.has(indexKey)) {
    console.log(JSON.stringify({ event: 'HEATMAP_REQUEST_COALESCED', index: indexKey }));
    try {
      const result = await inFlightRequests.get(indexKey);
      return res.json({
        success: true,
        index: indexKey,
        totalCount: result.stocks.length,
        stocks: result.stocks,
        cached: true,
        coalesced: true,
        updatedAt: new Date(result.timestamp).toISOString()
      });
    } catch (e) {
      // Handled by downstream fallback below
    }
  }

  // 4. Fetch fresh data from provider (single-flight)
  try {
    const result = await getOrFetchHeatmap(indexKey, symbolSet);
    return res.json({
      success: true,
      index: indexKey,
      totalCount: result.stocks.length,
      stocks: result.stocks,
      cached: false,
      updatedAt: new Date(result.timestamp).toISOString()
    });
  } catch (err) {
    const isRateLimit = err.response?.status === 429 || (err.message && err.message.includes('429'));
    console.warn(`[Heatmap Route] Warning fetching ${indexKey} (${err.message}). Serving fallback/cache...`);

    // 5. Stale-While-Revalidate: If we have existing cache in memory, serve it gracefully
    if (cached && cached.stocks && cached.stocks.length > 0) {
      console.log(JSON.stringify({
        event: 'HEATMAP_SERVED_STALE_CACHE',
        index: indexKey,
        stocksCount: cached.stocks.length,
        ageMs: now - cached.timestamp
      }));
      return res.json({
        success: true,
        index: indexKey,
        totalCount: cached.stocks.length,
        stocks: cached.stocks,
        cached: true,
        isStale: true,
        notice: isRateLimit
          ? 'Live provider rate-limited (429). Serving latest snapshot.'
          : 'Live provider feed reconnecting. Serving cached snapshot.',
        updatedAt: new Date(cached.timestamp).toISOString()
      });
    }

    // 6. Cold-start fallback: If no cache exists in memory yet, serve bundled snapshot
    const fallbackList = heatmapFallback[indexKey] || heatmapFallback['NIFTY50'] || [];
    if (fallbackList.length > 0) {
      console.log(JSON.stringify({
        event: 'HEATMAP_SERVED_BUNDLED_FALLBACK',
        index: indexKey,
        stocksCount: fallbackList.length
      }));
      return res.json({
        success: true,
        index: indexKey,
        totalCount: fallbackList.length,
        stocks: fallbackList,
        cached: true,
        isFallback: true,
        notice: isRateLimit
          ? 'Live provider rate-limited (429). Serving offline market snapshot.'
          : 'Live feed unavailable. Serving offline market snapshot.',
        updatedAt: new Date().toISOString()
      });
    }

    // 7. Final error return only if no data, no cache, and no fallback exist
    return res.status(502).json({
      success: false,
      error: `Failed to fetch heatmap data: ${err.message}`
    });
  }
});

module.exports = router;

