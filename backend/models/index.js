const { sequelize } = require('../config/database');

const initTrade = require('./Trade');
const initPlaybook = require('./Playbook');
const initDailyJournal = require('./DailyJournal');
const initBrokerConfig = require('./BrokerConfig');
const initUser = require('./User');
const initOtpVerification = require('./OtpVerification');

let models = {};

function initModels(seqInstance = sequelize) {
  const User = initUser(seqInstance);
  const OtpVerification = initOtpVerification(seqInstance);
  const Trade = initTrade(seqInstance);
  const Playbook = initPlaybook(seqInstance);
  const DailyJournal = initDailyJournal(seqInstance);
  const BrokerConfig = initBrokerConfig(seqInstance); 

  // Relationships
  Playbook.hasMany(Trade, { foreignKey: 'playbookId', as: 'trades', onDelete: 'SET NULL' });
  Trade.belongsTo(Playbook, { foreignKey: 'playbookId', as: 'playbook' });

  models = {
    User,
    OtpVerification,
    Trade,
    Playbook,
    DailyJournal,
    BrokerConfig,
    sequelize: seqInstance,
  };

  return models;
}

module.exports = {
  initModels,
  getModels: () => models,
};
