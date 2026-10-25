const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const DailyJournal = sequelize.define('DailyJournal', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    date: {
      type: DataTypes.DATEONLY,
      allowNull: false,
      unique: true,
    },
    marketOutlook: {
      type: DataTypes.STRING, // 'Bullish', 'Bearish', 'Sideways', 'Volatile'
      defaultValue: 'Neutral',
    },
    preMarketPrep: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    postMarketReview: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    disciplineRating: {
      type: DataTypes.INTEGER, // 1 to 5 stars
      defaultValue: 5,
    },
    emotionalState: {
      type: DataTypes.STRING, // 'Calm & Focused', 'Excited', 'Anxious', 'Frustrated', 'Revenge-prone'
      defaultValue: 'Calm & Focused',
    },
    dailyTargetPnl: {
      type: DataTypes.FLOAT,
      defaultValue: 0,
    },
    maxDailyRisk: {
      type: DataTypes.FLOAT,
      defaultValue: 0,
    },
    rulesFollowedCount: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
    },
    rulesBrokenCount: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
    },
  }, {
    timestamps: true,
    tableName: 'daily_journals',
  });

  return DailyJournal;
};
