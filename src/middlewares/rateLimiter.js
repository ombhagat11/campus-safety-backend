import rateLimit from "express-rate-limit";
import env from "../config/env.js";

/**
 * General API rate limiter
 */
export const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 1000, // Limit each IP to 1000 requests per windowMs
    message: "Too many requests from this IP, please try again later.",
    standardHeaders: true,
    legacyHeaders: false,
});

/**
 * Auth rate limiter (stricter)
 */
export const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5, // Limit each IP to 5 login attempts per windowMs
    message: "Too many login attempts, please try again after 15 minutes.",
    standardHeaders: true,
    legacyHeaders: false,
    skipSuccessfulRequests: true, // Don't count successful requests
});

/**
 * Report creation rate limiter
 */
export const reportLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: env.nodeEnv === 'development' ? 100 : (parseInt(env.rateLimit.reportsPerHour) || 5), // Higher limit for dev
    message: "You have reached the maximum number of reports per hour. Please try again later.",
    standardHeaders: true,
    legacyHeaders: false,
});

/**
 * Password reset rate limiter
 */
export const passwordResetLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 3, // Max 3 password reset requests per hour
    message: "Too many password reset attempts, please try again later.",
    standardHeaders: true,
    legacyHeaders: false,
});

/**
 * Email verification rate limiter
 */
export const verificationLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 5, // Max 5 verification emails per hour
    message: "Too many verification requests, please try again later.",
    standardHeaders: true,
    legacyHeaders: false,
});

export default {
    apiLimiter,
    authLimiter,
    reportLimiter,
    passwordResetLimiter,
    verificationLimiter,
};
