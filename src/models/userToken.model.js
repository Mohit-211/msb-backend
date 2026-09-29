const { Sequelize, DataTypes, Model } = require('sequelize');
const sequelize = require('../config/central.db');

class UserToken extends Model { }
UserToken.init({
    id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true
    },
    user_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: 'users',
            key: 'id',
        }
    },
    token_type: {
        type: DataTypes.STRING,
        allowNull: false,
        defaultValue: "session"
    },
    token: {
        type: DataTypes.STRING,
        allowNull: true
    },
    is_active: {
        type: DataTypes.BOOLEAN,
        defaultValue: true,
    },
    expired_at: {
        type: DataTypes.DATE,
        allowNull: true
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
    }
}, {
    sequelize,
    tableName: 'user_tokens',
    timestamps: true,
    underscored: true,
    paranoid: true,
    'createdAt': 'created_at',
    'updatedAt': 'updated_at',
    'deletedAt': 'deleted_at'
});

UserToken.beforeUpdate(async (UserToken) => {
    UserToken.updated_at = new Date().toISOString().replace(/T/, ' ').replace(/\..+/g, '');
});

UserToken.beforeDestroy(async (UserToken) => {
    UserToken.deleted_at = new Date().toISOString().replace(/T/, ' ').replace(/\..+/g, '');
    UserToken.is_active = false;
});



module.exports = UserToken;
