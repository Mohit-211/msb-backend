const jwt = require('jsonwebtoken')
const moment = require('moment')
const config = require('../config/config');

const { UserToken } = require('../models');
const  tokenTypes  = require('../config/tokens');
const { QueryTypes } = require('sequelize');
const  sequelize  = require('../config/central.db');

const generateToken = (userId, expires, type, secret = config.jwt.secret) => {

    const payload = {
        sub: userId,
        iat: moment().unix(),
        exp: expires.unix(),
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

const verifyToken = async (token, type) => {

    const payload = jwt.verify(token, config.jwt.secret);
    if (!payload) {
        throw new Error('Invalid Token');
    };
    const tokenDoc = await UserToken.findOne({
        where: {
            token: token,
            token_type: type,
            user_id: payload.sub,
        }
    });
    if (!tokenDoc) {
        throw new Error('Token not found');
    };
    if (tokenDoc.expired_at < new Date()) {
        throw new Error('Token is Expired !! Please Log in..');
    };
    return tokenDoc;
};

const generateAuthTokens = async (user) => {

    // if (user) {
    //     await UserToken.update({ is_active: false }, { where: { user_id: user.id } });
    // };

    const accessTokenExpires = moment().add(config.jwt.accessExpirationMinutes, 'days');
    const accessToken = generateToken(user.id, accessTokenExpires, tokenTypes.ACCESS);

    await saveToken(accessToken, user.id, moment.utc(accessTokenExpires).format('YYYY-MM-DD HH:mm:ss'), tokenTypes.ACCESS);

    await saveLoginTiming(
        accessToken,
        user.id,
      )

    return {
        access: {
            token: accessToken,
            expires: accessTokenExpires.toDate(),
        },
        refresh: {
            token: '',
            expires: ''
        }
    };
};

module.exports = {
    generateToken,
    saveToken,
    verifyToken,
    generateAuthTokens
};
