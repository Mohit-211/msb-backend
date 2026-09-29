const { Sequelize, DataTypes, Model } = require('sequelize');
const sequelize = require('../config/central.db');

class UserAttachment extends Model {};

UserAttachment.init({
    id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true
    },
    user_id: {
        type: DataTypes.INTEGER,
        references: {
            model: 'users',
            key: 'id',
        },
    },
    title: {
        type: DataTypes.STRING,
        allowNull: true
    },
    file_type: {
        type: DataTypes.STRING,
        allowNull: true
    },
    file_name: {
        type: DataTypes.STRING,
        allowNull: true
    },
    file_uri: {
        type: DataTypes.STRING,
        allowNull: true
    },
    file_size: {
        type: DataTypes.STRING,
        allowNull: true
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
    }
}, {
    sequelize,
    tableName: 'user_attachments',
    timestamps: true,
    underscored: true,
    paranoid: true,
    'createdAt': 'created_at',
    'updatedAt': 'updated_at',
    'deletedAt': 'deleted_at'
})

UserAttachment.beforeUpdate(async (UserAttachment) => {
    UserAttachment.updated_at = new Date().toISOString().replace(/T/, ' ').replace(/\..+/g, '');
});

UserAttachment.beforeDestroy(async (UserAttachment) => {
    UserAttachment.deleted_at = new Date().toISOString().replace(/T/, ' ').replace(/\..+/g, '');
    UserAttachment.is_active = false;
});

module.exports = UserAttachment;
