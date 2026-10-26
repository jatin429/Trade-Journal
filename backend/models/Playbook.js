const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Playbook = sequelize.define('Playbook', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    category: {
      type: DataTypes.STRING, // e.g. "Breakout", "Mean Reversion", "Options Selling", "Scalping"
      defaultValue: 'General',
    },
    rules: {
      type: DataTypes.JSON, // Array of rule checklist strings: ["Confirmed on 5m", "Risk strictly 1%"]
      defaultValue: [],
    },
    targetRR: {
      type: DataTypes.DECIMAL(5, 2), // Expected Risk:Reward ratio e.g. 2.0 or 3.0
      defaultValue: 2.0,
    },
    winRate: {
      type: DataTypes.DECIMAL(5, 2),
      defaultValue: 0,
    },
    color: {
      type: DataTypes.STRING,
      defaultValue: '#3b82f6',
    },
  }, {
    timestamps: true,
    tableName: 'playbooks',
  });

  return Playbook;
};
