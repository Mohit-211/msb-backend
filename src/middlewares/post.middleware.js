const httpStatus = require('http-status');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const { Sequelize, QueryTypes, Op } = require('sequelize');
const moment = require('moment');
const randomize = require('randomatic');
const jwt = require('jsonwebtoken');


const sequelize = require('../config/central.db');
const { User, OTP, UserAttachment, UserToken, Category, SubCategory, Post } = require('../models');
const validateEmail = require('../helpers/validateEmail');
const validatePassword = require('../helpers/validatePassword');
const tokenTypes = require('../config/tokens');
const catchAsync = require('../utils/catchAsync');
const ApiError = require('../utils/ApiError');


const { roleService } = require('../services');
const config = require('../config/config');
const Roles = require('../config/roles');
const otpTypes = require('../config/otpType');
const responseWrapper = require('../config/responseWrapper');

const isPostOwner = catchAsync(async (req, res, next) => {
    const { id } = req.params;
    const { user } = req.body;
    const postDoc = await Post.findOne({ where: { id: id, is_active: true } });
    if (!postDoc) return responseWrapper(res, '', 'Unvalid Post Id.', httpStatus.BAD_Request);
    if (postDoc.user_id !== user.id) return responseWrapper(res, '', 'Only post owner can do this action.', httpStatus.UNAUTHORIZED);
    req.body.postDoc = postDoc;
    next()
});

module.exports = {
    isPostOwner
}