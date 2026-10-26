const { DataTypes } = require('sequelize');

module.exports = function initUser(sequelize) {
  const User = sequelize.define('User', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: 'TradeMind Trader',
    },
    email: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
      validate: {
        isEmail: true,
      },
    },
    password: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    avatar: {
      type: DataTypes.TEXT('long'), // supports URLs or base64 images
      allowNull: true,
    },
    bio: {
      type: DataTypes.STRING,
      defaultValue: 'Disciplined price action trader mastering mind and risk.',
    },
    tradingStyle: {
      type: DataTypes.STRING,
      defaultValue: 'F&O Index Options & Momentum',
    },
    experienceLevel: {
      type: DataTypes.STRING,
      defaultValue: 'Beginner',
    },
    riskPerTrade: {
      type: DataTypes.FLOAT,
      defaultValue: 1000,
    },
    maxDailyLoss: {
      type: DataTypes.FLOAT,
      defaultValue: 2000,
    },
    startingCapital: {
      type: DataTypes.FLOAT,
      defaultValue: 200000,
    },
  }, {
    tableName: 'users',
    timestamps: true,
  });

  return User;
};
