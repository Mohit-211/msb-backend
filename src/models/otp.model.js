const { Sequelize, DataTypes, Model } = require('sequelize');
const sequelize = require('../config/central.db');

class OTP extends Model { }
OTP.init({
    id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true
    },
    email: {
        type: DataTypes.STRING(150),
        allowNull: true
    },
    code: {
        type: DataTypes.STRING(50),
        allowNull: true
    },
    type : {
        type: DataTypes.STRING(150),
        allowNull: false
    },
    otp_expiration_time: {
        type: DataTypes.DATE,
        allowNull : false
    },
    is_verified : {
        type: DataTypes.BOOLEAN,
        defaultValue: false
    },
    is_active: {
        type: DataTypes.BOOLEAN,
        defaultValue: true
    },
    created_at: {
        type: DataTypes.DATE,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
    },
    updated_at: {
        type: DataTypes.DATE,
        allowNull: true,
    },
    deleted_at: {
        type: DataTypes.DATE,
        allowNull: true,
    },
    created_by: {
        type: DataTypes.INTEGER,
        allowNull: true
    },
}, {
    sequelize,
    tableName: 'otps',
    timestamps: true,
    underscored: true,
    paranoid: true,
    'createdAt': 'created_at',
    'updatedAt': 'updated_at',
    'deletedAt': 'deleted_at'
});

OTP.beforeValidate(async (OTP) => {
    const expirationTime = new Date();
    expirationTime.setMinutes(expirationTime.getMinutes() + 5);
    OTP.otp_expiration_time = expirationTime;
});

OTP.beforeUpdate(async (OTP) => {
    OTP.updated_at = new Date().toISOString().replace(/T/, ' ').replace(/\..+/g, '');
});
OTP.beforeDestroy(async (OTP) => {
    OTP.deleted_at = new Date().toISOString().replace(/T/, ' ').replace(/\..+/g, '');
    OTP.is_active = false;
});

module.exports = OTP;
