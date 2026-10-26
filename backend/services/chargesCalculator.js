/**
 * Indian Market Brokerage & Statutory Taxes Calculator
 * Accurately calculates STT, GST, Exchange Charges, Stamp Duty, SEBI turnover, and Brokerage
 * for NSE/BSE Equity (CNC Delivery & Intraday), Futures, and Options.
 *
 * Delivery / CNC Rates (Dhan / Zerodha / Angel One):
 *   STT:          0.1%  on sell turnover
 *   Brokerage:    ₹0    (all major discount brokers charge ₹0 for delivery)
 *   DP Charge:    ₹13.5 + 18% GST per scrip per sell day (only on sell)
 *   Exchange:     0.00345% on total turnover (NSE)
 *   Stamp Duty:   0.015% on buy turnover
 *   SEBI:         ₹10 per crore turnover
 *
 * Intraday Equity Rates:
 *   STT:          0.025% on sell turnover
 *   Brokerage:    ₹20 per order (capped)
 *   Exchange:     0.00345% on total turnover
 *   Stamp Duty:   0.003% on buy turnover
 *   SEBI:         ₹10 per crore turnover
 */

function calculateIndianCharges({
  assetClass = 'OPTIONS',
  tradeType = 'BUY', // Initial entry direction
  quantity = 1,
  lotSize = 1,
  entryPrice = 0,
  exitPrice = 0,
  brokeragePerOrder = 20, // Standard discount broker rate (₹20/order) — overridden for delivery
  isDelivery = false, // true for CNC/delivery equity (IPO allotments, held shares)
}) {
  const totalQty = Math.max(1, Math.round(quantity * (lotSize || 1)));
  const buyPrice = tradeType === 'BUY' ? entryPrice : exitPrice;
  const sellPrice = tradeType === 'BUY' ? exitPrice : entryPrice;

  const buyTurnover = buyPrice * totalQty;
  const sellTurnover = sellPrice * totalQty;
  const totalTurnover = buyTurnover + sellTurnover;

  const grossPnl = tradeType === 'BUY'
    ? (exitPrice - entryPrice) * totalQty
    : (entryPrice - exitPrice) * totalQty;

  let stt = 0;
  let exchangeCharges = 0;
  let stampDuty = 0;
  let dpCharge = 0;
  let sebiCharges = (totalTurnover / 10000000) * 10; // ₹10 per crore
  let brokerage = 0;

  const asset = (assetClass || 'EQUITY').toUpperCase();

  switch (asset) {
    case 'OPTIONS':
      // STT on Options: 0.1% on sell side (premium value)
      stt = sellTurnover * 0.001;
      // NSE Exchange for Options: 0.053% of premium turnover
      exchangeCharges = totalTurnover * 0.00053;
      // Stamp duty: 0.003% on buy value
      stampDuty = buyTurnover * 0.00003;
      // Brokerage: ₹20/order × 2 sides
      brokerage = exitPrice > 0 ? brokeragePerOrder * 2 : brokeragePerOrder;
      break;

    case 'FUTURES':
      // STT on Futures: 0.0125% on sell turnover
      stt = sellTurnover * 0.000125;
      // NSE Exchange for Futures: 0.002%
      exchangeCharges = totalTurnover * 0.00002;
      // Stamp duty: 0.002% on buy value
      stampDuty = buyTurnover * 0.00002;
      // Brokerage: ₹20/order × 2 sides
      brokerage = exitPrice > 0 ? brokeragePerOrder * 2 : brokeragePerOrder;
      break;

    case 'EQUITY':
    default:
      if (isDelivery) {
        // ── DELIVERY / CNC (Dhan / Angel One held shares & IPO allotment sales) ──
        // STT: 0.1% on sell turnover
        stt = sellTurnover * 0.001;
        // Exchange charge: 0.00345% on sell turnover (NSE)
        exchangeCharges = sellTurnover * 0.0000345;
        // Stamp duty: 0 on sell transaction (stamp duty is only on buy)
        stampDuty = 0;
        // Brokerage: ₹0 for delivery on Dhan
        brokerage = 0;
        // DP charge is billed via CDSL ledger, not part of Dhan trade charges
        dpCharge = 0;
        // SEBI: ₹10 per crore on sell turnover
        sebiCharges = (sellTurnover / 10000000) * 10;
      } else {
        // ── INTRADAY ──
        // STT: 0.025% on sell turnover
        stt = sellTurnover * 0.00025;
        // Exchange charge: 0.00345% on total turnover
        exchangeCharges = totalTurnover * 0.0000345;
        // Stamp duty: 0.003% on buy turnover
        stampDuty = buyTurnover * 0.00003;
        // Brokerage: ₹20/order × 2 sides (or 0.03% capped)
        brokerage = exitPrice > 0 ? brokeragePerOrder * 2 : brokeragePerOrder;
        dpCharge = 0;
      }
      break;
  }

  // GST: 18% on (Brokerage + Exchange Charges + SEBI Charges)
  const gst = (brokerage + exchangeCharges + sebiCharges) * 0.18;

  const totalCharges = Number((stt + exchangeCharges + stampDuty + sebiCharges + brokerage + gst + dpCharge).toFixed(2));
  const netPnl = Number((grossPnl - totalCharges).toFixed(2));

  return {
    stt: Number(stt.toFixed(2)),
    exchangeCharges: Number(exchangeCharges.toFixed(2)),
    stampDuty: Number(stampDuty.toFixed(2)),
    sebiCharges: Number(sebiCharges.toFixed(2)),
    brokerage: Number(brokerage.toFixed(2)),
    dpCharge: Number(dpCharge.toFixed(2)),
    gst: Number(gst.toFixed(2)),
    totalCharges,
    grossPnl: Number(grossPnl.toFixed(2)),
    netPnl,
    isDelivery,
  };
}

module.exports = { calculateIndianCharges };

