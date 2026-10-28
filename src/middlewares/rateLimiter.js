const rateLimit = require('express-rate-limit');

const tooManyRequests = {
  success: false,
  status: 429,
  message: 'Too many requests, please try again later.',
};

// Failed sign-in and password attempts, per IP.
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  skipSuccessfulRequests: true,
  message: tooManyRequests,
});

// Every OTP request sends an email, so limit them per IP and per address.
const otpLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 5,
  message: tooManyRequests,
});

const otpEmailLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 5,
  keyGenerator: (req) => String(req.body?.email || '').trim().toLowerCase(),
  message: tooManyRequests,
});

// Story generation calls OpenAI, so cap it per user. Runs after authentication.
const storyLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 30,
  keyGenerator: (req) => String(req.body.user.id),
  message: tooManyRequests,
});

module.exports = {
  authLimiter,
  otpLimiter,
  otpEmailLimiter,
  storyLimiter,
};
