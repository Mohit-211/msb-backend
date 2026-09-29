const { Sequelize, DataTypes, Model } = require('sequelize');
const sequelize = require('../config/central.db');


class ContactUs extends Model { };
ContactUs.init(
    {
        id: {
            type: DataTypes.INTEGER,
            autoIncrement: true,
            primaryKey: true,
        },
        email: {
            type: DataTypes.STRING(100),
            allowNull: false,
        },
        address: {
            type: DataTypes.TEXT,
            allowNull: true,
        },
        mobile: {
            type: DataTypes.STRING(50),
            allowNull: true,
        },
        is_active: {
            type: DataTypes.BOOLEAN,
            defaultValue: true,
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
    },
    {
        sequelize,
        tableName: 'contactus',
        timestamps: true,
        underscored: true,
        paranoid: true,
        createdAt: 'created_at',
        updatedAt: 'updated_at',
        deletedAt: 'deleted_at',
    }
);

ContactUs.beforeUpdate((ContactUs) => {
    ContactUs.updated_at = new Date().toISOString().replace(/T/, ' ').replace(/\..+/g, '');
});

ContactUs.beforeDestroy((ContactUs) => {
    ContactUs.deleted_at = new Date().toISOString().replace(/T/, ' ').replace(/\..+/g, '');
    ContactUs.is_active = false;
});

module.exports = ContactUs;
