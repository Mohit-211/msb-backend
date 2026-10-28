const jwt = require('jsonwebtoken')
const config = require('../config/config');

const  tokenTypes  = require('../config/tokens');
const { QueryTypes } = require('sequelize');
const  sequelize  = require('../config/central.db');

const toUnixSeconds = (date) => Math.floor(date.getTime() / 1000);

const generateToken = (userId, expires, type, secret = config.jwt.secret) => {

    const payload = {
        sub: userId,
        iat: toUnixSeconds(new Date()),
        exp: toUnixSeconds(expires),
        type,
    };
    return jwt.sign(payload, secret);
};

const saveToken = async (token, userId, expires, type) => {

    let sql = `INSERT INTO user_tokens ( user_id, token_type, token, expired_at, created_at, updated_at) values (
	  '${userId}', '${type}', '${token}', '${expires}' , now(), now())`;

    let tokenDoc = await sequelize.query(
        sql, {
        type: QueryTypes.INSERT
    });
    return tokenDoc;
};

const saveLoginTiming = async (token, userId) => {
    let sql = `INSERT INTO user_login_timing (user_id, token, login_time, created_at) values (
      '${userId}', '${token}', NOW(), NOW())`;
  
    let tokenDoc = await sequelize.query(sql, {
      type: QueryTypes.INSERT,
    });
    return tokenDoc;
  };

const generateAuthTokens = async (user) => {

    const accessTokenExpires = new Date();
    accessTokenExpires.setDate(accessTokenExpires.getDate() + config.jwt.accessExpirationMinutes);
    const accessToken = generateToken(user.id, accessTokenExpires, tokenTypes.ACCESS);

    // MySQL DATETIME in UTC, e.g. "2026-10-28 14:05:09"
    const expiredAt = accessTokenExpires.toISOString().slice(0, 19).replace('T', ' ');
    await saveToken(accessToken, user.id, expiredAt, tokenTypes.ACCESS);

    await saveLoginTiming(
        accessToken,
        user.id,
      )

    return {
        access: {
            token: accessToken,
            expires: accessTokenExpires,
        },
        refresh: {
            token: '',
            expires: ''
        }
    };
};

module.exports = {
    generateAuthTokens
};
