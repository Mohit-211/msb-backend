const crypto = require('crypto');
const jwt = require('jsonwebtoken')
const config = require('../config/config');

const  tokenTypes  = require('../config/tokens');
const { UserToken, LoginTiming } = require('../models');

const toUnixSeconds = (date) => Math.floor(date.getTime() / 1000);

const generateToken = (userId, expires, type, secret = config.jwt.secret) => {

    const payload = {
        sub: userId,
        iat: toUnixSeconds(new Date()),
        exp: toUnixSeconds(expires),
        type,
        // Unique per token, so two sign-ins in the same second don't produce the same token.
        jti: crypto.randomUUID(),
    };
    return jwt.sign(payload, secret);
};

const saveToken = (token, userId, expires, type) =>
    UserToken.create({ user_id: userId, token_type: type, token, expired_at: expires });

const saveLoginTiming = (token, userId) =>
    LoginTiming.create({ user_id: userId, token, login_time: new Date() });

const generateAuthTokens = async (user) => {

    const accessTokenExpires = new Date();
    accessTokenExpires.setDate(accessTokenExpires.getDate() + config.jwt.accessExpirationMinutes);
    const accessToken = generateToken(user.id, accessTokenExpires, tokenTypes.ACCESS);

    await saveToken(accessToken, user.id, accessTokenExpires, tokenTypes.ACCESS);

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
