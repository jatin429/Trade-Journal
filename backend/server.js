const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

const { initializeDatabase, getActiveDialect } = require('./config/database');
const { initModels } = require('./models');
const { seedInitialData } = require('./seeders/seedData');

// Routes
const tradesRoutes = require('./routes/trades');
const analyticsRoutes = require('./routes/analytics');
const brokersRoutes = require('./routes/brokers');
const playbooksRoutes = require('./routes/playbooks');
const journalRoutes = require('./routes/journal');
const aiRoutes = require('./routes/ai');
const { router: authRoutes } = require('./routes/auth');
const marketRoutes = require('./routes/market');

const app = express();
const PORT = process.env.PORT || 5000;

// Ensure uploads folder exists
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Middlewares
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/uploads', express.static(uploadsDir));

// System Status Endpoint
app.get('/api/status', (req, res) => {
  res.json({
    status: 'online',
    database: getActiveDialect() === 'mysql' ? 'MySQL (phpMyAdmin)' : 'Local SQLite Fallback',
    dialect: getActiveDialect(),
    time: new Date(),
    version: '1.0.0',
  });
});

// Mount Routes
app.use('/api/auth', authRoutes);
app.use('/api/trades', tradesRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/brokers', brokersRoutes);
app.use('/api/playbooks', playbooksRoutes);
app.use('/api/journal', journalRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/market', marketRoutes);

// Database Initialization & Server Start
async function startServer() {
  try {
    const seq = await initializeDatabase();
    const models = initModels(seq);

    // Sync database schema with Sequelize
    await seq.sync({ alter: false });
    console.log('[Sequelize] Database schema synchronized.');

    // Demo seeding disabled - ready for real user trades
    // await seedInitialData(models);

    app.listen(PORT, () => {
      console.log(`====================================================`);
      console.log(`🚀 TradeMind Backend Running on http://localhost:${PORT}`);
      console.log(`🧠 Master Your Trades. Master Your Mind.`);
      console.log(`📊 Database Engine: ${getActiveDialect().toUpperCase()}`);
      console.log(`🔗 DhanHQ & Angel One SmartAPI Gateways: Active`);
      console.log(`🤖 TradeMind AI Copilot: Ready`);
      console.log(`====================================================`);
    });
  } catch (error) {
    console.error('[Server] Fatal startup error:', error);
  }
}

startServer();
