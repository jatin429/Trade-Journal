const { initializeDatabase } = require('../config/database');
const { initModels } = require('../models');

async function clearDemoData() {
  try {
    const seq = await initializeDatabase();
    const { Trade, DailyJournal } = initModels(seq);

    const deletedTrades = await Trade.destroy({ where: {}, truncate: false });
    const deletedJournals = await DailyJournal.destroy({ where: {}, truncate: false });

    console.log(`[Success] Cleared ${deletedTrades} demo trades.`);
    console.log(`[Success] Cleared ${deletedJournals} demo daily journals.`);
    console.log(`[Success] All demo data has been wiped clean! The dashboard is now fresh and ready for your real trades.`);
    process.exit(0);
  } catch (err) {
    console.error('[Error] Failed to clear demo data:', err.message);
    process.exit(1);
  }
}

clearDemoData();
