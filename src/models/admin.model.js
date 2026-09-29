const { Sequelize, DataTypes, Model } = require("sequelize");
const sequelize = require("../config/central.db");

class Admin extends Model {}
Admin.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    role_id: {
      type: DataTypes.INTEGER,
      references: {
        model: "roles",
        key: "id",
      },
    },
    // department_id: {
    //   type: DataTypes.INTEGER,
    //   references: {
    //     model: "departments",
    //     key: "id",
    //   },
    // },
    name: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    email_id: {
      type: DataTypes.STRING(100),
      allowNull: false,
    },
    password: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    remember_token: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    otp: {
      type: DataTypes.STRING,
      allowNull: true,
      set(value) {
        if (!value) {
          this.setDataValue("is_otp_valid", null);
        } else {
          this.setDataValue("is_otp_valid", true);
        }
        this.setDataValue("otp", value);
      },
    },
    is_otp_valid: {
      type: DataTypes.BOOLEAN,
    },
    is_active: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
    },
    created_at: {
      type: DataTypes.DATE,
      defaultValue: Sequelize.literal("CURRENT_TIMESTAMP"),
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
    tableName: "admins",
    timestamps: true,
    underscored: true,
    paranoid: true,
    createdAt: "created_at",
    updatedAt: "updated_at",
    deletedAt: "deleted_at",
  }
);

//isEmailTaken check email exists or not
Admin.isEmailTaken = async function (email_id) {
  let u = await this.findOne({ where: { email_id: email_id } });
  return !!u;
};
//isMobileTaken check email exists or not
Admin.isMobileTaken = async function (mobile) {
  let u_mobile = await this.findOne({ where: { mobile: mobile } });
  return !!u_mobile;
};
Admin.beforeUpdate(async (Admin) => {
  Admin.updated_at = new Date()
    .toISOString()
    .replace(/T/, " ")
    .replace(/\..+/g, "");
});
Admin.beforeDestroy(async (Admin) => {
  Admin.deleted_at = new Date()
    .toISOString()
    .replace(/T/, " ")
    .replace(/\..+/g, "");
});

module.exports = Admin;
