const Joi = require('joi');

const schema = Joi.string()
    .min(8)                                         // Minimum length 8
    .max(100)                                       // Maximum length 100
    .pattern(/(\d.*){2,}/)                          // Must have at least 2 digits
    .pattern(/([\s].*)/, { invert: true })          // Should not have spaces
    .invalid('Passw0rd', 'Password123');            // Blacklist these values

const validatePassword = function (pass) {
    return !schema.validate(String(pass)).error;
};

module.exports = validatePassword;
