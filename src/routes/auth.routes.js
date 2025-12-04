import express from "express";
import {
    register,
    verifyEmailOTP,
    resendOTP,
    login,
    refresh,
    forgotPassword,
    resetPassword,
    getMe,
} from "../controllers/auth.controller.js";
import { authenticate } from "../middlewares/auth.js";
import {
    validate,
    registerSchema,
    loginSchema,
    refreshTokenSchema,
    forgotPasswordSchema,
} from "../middlewares/validate.js";

const router = express.Router();

/**
 * @route   POST /auth/register
 * @desc    Register a new user (sends OTP)
 * @access  Public
 */
router.post("/register", validate(registerSchema), register);

/**
 * @route   POST /auth/verify-email-otp
 * @desc    Verify email with OTP
 * @access  Public
 */
router.post("/verify-email-otp", verifyEmailOTP);

/**
 * @route   POST /auth/resend-otp
 * @desc    Resend OTP for email verification
 * @access  Public
 */
router.post("/resend-otp", resendOTP);

/**
 * @route   POST /auth/login
 * @desc    Login user
 * @access  Public
 */
router.post("/login", validate(loginSchema), login);

/**
 * @route   POST /auth/refresh
 * @desc    Refresh access token
 * @access  Public
 */
router.post("/refresh", validate(refreshTokenSchema), refresh);

/**
 * @route   POST /auth/forgot-password
 * @desc    Request password reset (sends OTP)
 * @access  Public
 */
router.post("/forgot-password", validate(forgotPasswordSchema), forgotPassword);

/**
 * @route   POST /auth/reset-password
 * @desc    Reset password with OTP
 * @access  Public
 */
router.post("/reset-password", resetPassword);

/**
 * @route   GET /auth/me
 * @desc    Get current user
 * @access  Private
 */
router.get("/me", authenticate, getMe);

export default router;
