const fs = require('fs');
const csv = require('csv-parser');
const { calculateIndianCharges } = require('./chargesCalculator');

/**
 * Parses CSV file from various broker formats and imports trades into the database
 */
async function parseAndImportCsv(filePath, TradeModel) {
  return new Promise((resolve, reject) => {
    const results = [];

    fs.createReadStream(filePath)
      .pipe(csv())
      .on('data', (row) => {
        results.push(row);
      })
      .on('end', async () => {
        try {
          let importedCount = 0;

          for (const row of results) {
            // Normalize keys to lowercase for flexible matching
            const lowerRow = {};
            Object.keys(row).forEach(k => {
              lowerRow[k.trim().toLowerCase()] = row[k]?.trim();
            });

            // Extract Symbol
            const symbol = lowerRow['symbol'] || lowerRow['trading symbol'] || lowerRow['scrip'] || lowerRow['instrument'] || 'UNKNOWN';
            
            // Extract Type (BUY/SELL)
            const rawType = (lowerRow['type'] || lowerRow['trade type'] || lowerRow['buy/sell'] || lowerRow['action'] || 'BUY').toUpperCase();
            const tradeType = rawType.includes('S') ? 'SELL' : 'BUY';

            // Extract Quantities and Prices
            const quantity = parseFloat(lowerRow['quantity'] || lowerRow['qty'] || lowerRow['traded qty'] || '1') || 1;
            const entryPrice = parseFloat(lowerRow['entry price'] || lowerRow['price'] || lowerRow['traded price'] || lowerRow['buy price'] || '100') || 100;
            const exitPrice = parseFloat(lowerRow['exit price'] || lowerRow['sell price'] || (tradeType === 'BUY' ? entryPrice * 1.03 : entryPrice * 0.97)) || entryPrice;

            // Asset class determination
            let assetClass = 'EQUITY';
            const symUpper = symbol.toUpperCase();
            if (symUpper.includes(' CE') || symUpper.includes(' PE') || symUpper.endsWith('CE') || symUpper.endsWith('PE')) {
              assetClass = 'OPTIONS';
            } else if (symUpper.includes('FUT') || symUpper.endsWith('FUT')) {
              assetClass = 'FUTURES';
            }

            const charges = calculateIndianCharges({
              assetClass,
              tradeType,
              quantity,
              lotSize: 1,
              entryPrice,
              exitPrice,
            });

            const status = charges.netPnl > 0 ? 'WIN' : charges.netPnl < 0 ? 'LOSS' : 'BREAKEVEN';
            const rMultiple = charges.netPnl > 0 ? Number((charges.netPnl / (entryPrice * 0.05 * quantity)).toFixed(2)) : -1.0;

            await TradeModel.create({
              symbol,
              assetClass,
              tradeType,
              quantity,
              lotSize: 1,
              entryPrice,
              exitPrice,
              entryTime: lowerRow['entry date'] || lowerRow['trade date'] || lowerRow['order time'] || new Date(),
              exitTime: lowerRow['exit date'] || new Date(),
              stopLoss: entryPrice * 0.95,
              target: entryPrice * 1.05,
              grossPnl: charges.grossPnl,
              netPnl: charges.netPnl,
              pnlPercentage: entryPrice > 0 ? Number((((exitPrice - entryPrice) / entryPrice) * 100).toFixed(2)) : 0,
              rMultiple,
              status,
              brokerSource: 'CSV_IMPORT',
              charges,
              emotions: ['Imported'],
              rulesFollowed: true,
              strategyName: lowerRow['strategy'] || 'CSV Upload',
              notes: 'Imported via CSV file.',
            });

            importedCount++;
          }

          // Clean up temp file
          try { fs.unlinkSync(filePath); } catch (e) {}

          resolve({ success: true, count: importedCount });
        } catch (err) {
          reject(err);
        }
      })
      .on('error', (err) => {
        reject(err);
      });
  });
}

module.exports = { parseAndImportCsv };
