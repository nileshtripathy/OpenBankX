import rateLimit from 'express-rate-limit';

/** Applies to /login, /register - blunt protection against brute force / spam. */
export const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many attempts, please try again later.',
  },
});
