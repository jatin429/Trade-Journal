const { DataTypes } = require('sequelize');

module.exports = function initOtpVerification(sequelize) {
  const OtpVerification = sequelize.define('OtpVerification', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    email: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        isEmail: true,
      },
    },
    otp: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    expiresAt: {
      type: DataTypes.DATE,
      allowNull: false,
    },
    registrationData: {
      type: DataTypes.TEXT('long'),
      allowNull: true,
    },
    verified: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
  }, {
    tableName: 'otp_verifications',
    timestamps: true,
  });

  return OtpVerification;
};
