const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const BrokerConfig = sequelize.define('BrokerConfig', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    brokerName: {
      type: DataTypes.STRING, // 'DHAN', 'ANGEL_ONE'
      allowNull: false,
      unique: true,
    },
    clientId: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    apiKey: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    accessToken: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    pin: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    totpKey: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    isConnected: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    lastSyncTime: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    syncStatusMessage: {
      type: DataTypes.STRING,
      allowNull: true,
    },
  }, {
    timestamps: true,
    tableName: 'broker_configs',
  });

  return BrokerConfig;
};
