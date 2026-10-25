const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Trade = sequelize.define('Trade', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    symbol: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    assetClass: {
      type: DataTypes.ENUM('EQUITY', 'OPTIONS', 'FUTURES', 'CRYPTO', 'FOREX'),
      defaultValue: 'EQUITY',
    },
    tradeType: {
      type: DataTypes.ENUM('BUY', 'SELL'),
      defaultValue: 'BUY',
    },
    quantity: {
      type: DataTypes.FLOAT,
      allowNull: false,
      defaultValue: 1,
    },
    lotSize: {
      type: DataTypes.INTEGER,
      defaultValue: 1,
    },
    entryPrice: {
      type: DataTypes.FLOAT,
      allowNull: false,
    },
    exitPrice: {
      type: DataTypes.FLOAT,
      allowNull: true,
    },
    entryTime: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
    },
    exitTime: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    stopLoss: {
      type: DataTypes.FLOAT,
      allowNull: true,
    },
    target: {
      type: DataTypes.FLOAT,
      allowNull: true,
    },
    grossPnl: {
      type: DataTypes.FLOAT,
      defaultValue: 0,
    },
    netPnl: {
      type: DataTypes.FLOAT,
      defaultValue: 0,
    },
    pnlPercentage: {
      type: DataTypes.FLOAT,
      defaultValue: 0,
    },
    rMultiple: {
      type: DataTypes.FLOAT,
      defaultValue: 0, // Calculated: (netPnl) / (Risk Amount)
    },
    status: {
      type: DataTypes.STRING,
      defaultValue: 'OPEN',
    },
    brokerSource: {
      type: DataTypes.STRING,
      defaultValue: 'MANUAL', // 'DHAN', 'ANGEL_ONE', 'CSV', 'MANUAL'
    },
    brokerTradeId: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    charges: {
      type: DataTypes.JSON, // { stt, gst, exchange, stampDuty, brokerage, total }
      defaultValue: {},
      get() {
        const raw = this.getDataValue('charges');
        if (typeof raw === 'string') {
          try {
            return JSON.parse(raw);
          } catch (e) {
            return {};
          }
        }
        return raw || {};
      },
    },
    emotions: {
      type: DataTypes.JSON, // ['Disciplined', 'FOMO', 'Greed', 'Confident', 'Revenge']
      defaultValue: [],
      get() {
        const raw = this.getDataValue('emotions');
        if (typeof raw === 'string') {
          try {
            return JSON.parse(raw);
          } catch (e) {
            return [];
          }
        }
        return raw || [];
      },
    },
    rulesFollowed: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
    },
    strategyName: {
      type: DataTypes.STRING,
      defaultValue: 'Discretionary',
    },
    playbookId: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    notes: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    chartImage: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    dayOfWeek: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    timeOfDay: {
      type: DataTypes.STRING,
      allowNull: true,
    },
  }, {
    timestamps: true,
    tableName: 'trades',
  });

  return Trade;
};
