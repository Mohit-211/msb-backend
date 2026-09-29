const { Sequelize, DataTypes, Model } = require("sequelize");
const sequelize = require("../config/central.db");

class User extends Model {}
User.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    email: {
      type: DataTypes.STRING(200),
      allowNull: true,
    },
    fcm_token: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    name: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    gender: {
      type: DataTypes.ENUM,
      values: ["Male", "Female", "Others"],
      allowNull: true,
    },
    payment_status: {
      type: DataTypes.ENUM,
      values: ["SUBSCRIBED", "UNSUBSCRIBED"],
      allowNull: true,
      defaultValue: "UNSUBSCRIBED",
    },
    dialing_code: {
      type: DataTypes.STRING(50),
      allowNull: true,
    },
    mobile: {
      type: DataTypes.STRING(50),
      allowNull: true,
    },
    password: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    proof: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    remember_token: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    is_proof_verify: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    address: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    is_active: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
    },
    is_subscribed: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    stripe_customer_id: {
      type: DataTypes.STRING(200),
      allowNull: true,
    },
    created_by: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    created_at: {
      type: DataTypes.DATE,
      defaultValue: Sequelize.literal("CURRENT_TIMESTAMP"),
    },
    updated_by: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    updated_at: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    deleted_by: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    deleted_at: {
      type: DataTypes.DATE,
      allowNull: true,
    },
  },
  {
    sequelize,
    tableName: "users",
    timestamps: true,
    underscored: true,
    paranoid: true,
    createdAt: "created_at",
    updatedAt: "updated_at",
    deletedAt: "deleted_at",
  }
);

User.isEmailTaken = async function (email) {
  let u = await this.findOne({ where: { email: email.toLowerCase() } });
  return u;
};

User.isUserNameTaken = async function (user_name) {
  let u_n = await this.findOne({
    where: { user_name: user_name, is_active: true },
  });
  return !!u_n;
};

User.beforeUpdate(async (User) => {
  User.updated_at = new Date()
    .toISOString()
    .replace(/T/, " ")
    .replace(/\..+/g, "");
});
User.beforeDestroy(async (User) => {
  User.deleted_at = new Date()
    .toISOString()
    .replace(/T/, " ")
    .replace(/\..+/g, "");
  User.is_active = false;
});

module.exports = User;