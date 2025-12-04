import User from "../db/schemas/User.js";
import Campus from "../db/schemas/Campus.js";
import AuditLog from "../db/schemas/AuditLog.js";
import { hashPassword, comparePassword, validatePasswordStrength } from "../utils/password.js";
import { generateTokenPair, verifyToken } from "../utils/jwt.js";
import { generateOTP, verifyOTP, getOTPExpiry } from "../utils/otp.js";
import { sendOTPEmail } from "../services/emailService.js";
import env from "../config/env.js";

/**
 * Register a new user (Step 1: Send OTP)
 * POST /auth/register
 */
export const register = async (req, res) => {
    try {
        const { name, email, password, campusCode, phone } = req.body;

        // Validate password strength
        const passwordValidation = validatePasswordStrength(password);
        if (!passwordValidation.valid) {
            return res.status(400).json({
                success: false,
                message: "Password does not meet requirements",
                errors: passwordValidation.errors,
            });
        }

        // Check if email already exists
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(409).json({
                success: false,
                message: "Email already registered",
            });
        }

        // Find campus by code
        const campus = await Campus.findByCode(campusCode);
        if (!campus) {
            return res.status(404).json({
                success: false,
                message: "Invalid campus code",
            });
        }

        // Check moderation requirement
        if (env.admin.requireModeratorsBeforePublicSignup) {
            if (campus.stats.totalModerators < env.admin.minimumModeratorsCount) {
                return res.status(403).json({
                    success: false,
                    message: "Campus is not yet accepting student registrations. Please contact your campus administrator.",
                });
            }
        }

        // Hash password
        const passwordHash = await hashPassword(password);

        // Generate OTP
        const otp = generateOTP();
        const otpExpiry = getOTPExpiry(10); // 10 minutes

        // Create user (not verified yet)
        const user = await User.create({
            name,
            email,
            passwordHash,
            campusId: campus._id,
            phone,
            role: "student",
            isVerified: false,
            emailOTP: otp,
            emailOTPExpiry: otpExpiry,
        });

        // Send OTP email
        await sendOTPEmail(email, otp, name, 'verification');

        res.status(201).json({
            success: true,
            message: "Registration initiated. Please check your email for the OTP code.",
            data: {
                email,
                userId: user._id,
            },
        });
    } catch (error) {
        console.error("Registration error:", error);
        res.status(500).json({
            success: false,
            message: "Registration failed",
            error: env.nodeEnv === "development" ? error.message : undefined,
        });
    }
};

/**
 * Verify email with OTP (Step 2: Complete registration)
 * POST /auth/verify-email-otp
 */
export const verifyEmailOTP = async (req, res) => {
    try {
        const { email, otp } = req.body;

        if (!email || !otp) {
            return res.status(400).json({
                success: false,
                message: "Email and OTP are required",
            });
        }

        // Find user with OTP fields
        const user = await User.findOne({ email }).select("+emailOTP +emailOTPExpiry");

        if (!user) {
            return res.status(404).json({
                success: false,
                message: "User not found",
            });
        }

        // Check if already verified
        if (user.isVerified) {
            return res.status(400).json({
                success: false,
                message: "Email already verified",
            });
        }

        // Verify OTP
        if (!verifyOTP(otp, user.emailOTP, user.emailOTPExpiry)) {
            return res.status(400).json({
                success: false,
                message: "Invalid or expired OTP",
            });
        }

        // Update user
        user.isVerified = true;
        user.emailOTP = undefined;
        user.emailOTPExpiry = undefined;
        await user.save();

        // Update campus user count
        const campus = await Campus.findById(user.campusId);
        if (campus) {
            await campus.incrementUserCount();
        }

        // Log audit
        await AuditLog.logAction({
            actorId: user._id,
            action: "verify_email",
            entityType: "user",
            entityId: user._id,
            payload: { email },
        });

        // Generate tokens
        const tokens = generateTokenPair(user);

        res.json({
            success: true,
            message: "Email verified successfully",
            data: {
                user: user.toSafeObject(),
                ...tokens,
            },
        });
    } catch (error) {
        console.error("Verify email OTP error:", error);
        res.status(500).json({
            success: false,
            message: "Email verification failed",
            error: env.nodeEnv === "development" ? error.message : undefined,
        });
    }
};

/**
 * Resend OTP for email verification
 * POST /auth/resend-otp
 */
export const resendOTP = async (req, res) => {
    try {
        const { email } = req.body;

        if (!email) {
            return res.status(400).json({
                success: false,
                message: "Email is required",
            });
        }

        const user = await User.findOne({ email });

        if (!user) {
            return res.status(404).json({
                success: false,
                message: "User not found",
            });
        }

        if (user.isVerified) {
            return res.status(400).json({
                success: false,
                message: "Email already verified",
            });
        }

        // Generate new OTP
        const otp = generateOTP();
        const otpExpiry = getOTPExpiry(10);

        user.emailOTP = otp;
        user.emailOTPExpiry = otpExpiry;
        await user.save();

        // Send OTP email
        await sendOTPEmail(email, otp, user.name, 'verification');

        res.json({
            success: true,
            message: "OTP sent successfully",
        });
    } catch (error) {
        console.error("Resend OTP error:", error);
        res.status(500).json({
            success: false,
            message: "Failed to resend OTP",
            error: env.nodeEnv === "development" ? error.message : undefined,
        });
    }
};

/**
 * Login user
 * POST /auth/login
 */
export const login = async (req, res) => {
    try {
        const { email, password } = req.body;

        // Find user with password
        const user = await User.findOne({ email }).select("+passwordHash");
        if (!user) {
            return res.status(401).json({
                success: false,
                message: "Invalid email or password",
            });
        }

        // Check if user is banned
        if (user.isBanned) {
            return res.status(403).json({
                success: false,
                message: `Account is banned${user.bannedReason ? `: ${user.bannedReason}` : ""}`,
            });
        }

        // Check if user is active
        if (!user.isActive) {
            return res.status(403).json({
                success: false,
                message: "Account is deactivated",
            });
        }

        // Check if email is verified
        if (!user.isVerified) {
            return res.status(403).json({
                success: false,
                message: "Please verify your email before logging in",
                requiresVerification: true,
            });
        }

        // Verify password
        const isPasswordValid = await comparePassword(password, user.passwordHash);
        if (!isPasswordValid) {
            return res.status(401).json({
                success: false,
                message: "Invalid email or password",
            });
        }

        // Update last login
        user.lastLoginAt = new Date();
        await user.save();

        // Generate tokens
        const tokens = generateTokenPair(user);

        // Remove password from user object
        const userObject = user.toObject();
        delete userObject.passwordHash;

        res.json({
            success: true,
            message: "Login successful",
            data: {
                user: userObject,
                ...tokens,
            },
        });
    } catch (error) {
        console.error("Login error:", error);
        res.status(500).json({
            success: false,
            message: "Login failed",
            error: env.nodeEnv === "development" ? error.message : undefined,
        });
    }
};

/**
 * Request password reset (Send OTP)
 * POST /auth/forgot-password
 */
export const forgotPassword = async (req, res) => {
    try {
        const { email } = req.body;

        // Find user
        const user = await User.findOne({ email });
        if (!user) {
            // Don't reveal if email exists
            return res.json({
                success: true,
                message: "If the email exists, an OTP has been sent",
            });
        }

        // Generate OTP
        const otp = generateOTP();
        const otpExpiry = getOTPExpiry(10); // 10 minutes

        // Save OTP to user
        user.resetOTP = otp;
        user.resetOTPExpiry = otpExpiry;
        await user.save();

        // Send OTP email
        await sendOTPEmail(email, otp, user.name, 'reset');

        res.json({
            success: true,
            message: "If the email exists, an OTP has been sent",
        });
    } catch (error) {
        console.error("Forgot password error:", error);
        res.status(500).json({
            success: false,
            message: "Password reset request failed",
            error: env.nodeEnv === "development" ? error.message : undefined,
        });
    }
};

/**
 * Reset password with OTP
 * POST /auth/reset-password
 */
export const resetPassword = async (req, res) => {
    try {
        const { email, otp, password } = req.body;

        // Validate password strength
        const passwordValidation = validatePasswordStrength(password);
        if (!passwordValidation.valid) {
            return res.status(400).json({
                success: false,
                message: "Password does not meet requirements",
                errors: passwordValidation.errors,
            });
        }

        // Find user with reset OTP
        const user = await User.findOne({ email }).select("+resetOTP +resetOTPExpiry +passwordHash");

        if (!user) {
            return res.status(404).json({
                success: false,
                message: "User not found",
            });
        }

        // Verify OTP
        if (!verifyOTP(otp, user.resetOTP, user.resetOTPExpiry)) {
            return res.status(400).json({
                success: false,
                message: "Invalid or expired OTP",
            });
        }

        // Hash new password
        const passwordHash = await hashPassword(password);

        // Update password and clear reset OTP
        user.passwordHash = passwordHash;
        user.resetOTP = undefined;
        user.resetOTPExpiry = undefined;
        await user.save();

        res.json({
            success: true,
            message: "Password reset successful",
        });
    } catch (error) {
        console.error("Reset password error:", error);
        res.status(500).json({
            success: false,
            message: "Password reset failed",
            error: env.nodeEnv === "development" ? error.message : undefined,
        });
    }
};

/**
 * Refresh access token
 * POST /auth/refresh
 */
export const refresh = async (req, res) => {
    try {
        const { refreshToken } = req.body;

        // Verify refresh token
        let decoded;
        try {
            decoded = verifyToken(refreshToken);
        } catch (error) {
            return res.status(401).json({
                success: false,
                message: error.message || "Invalid refresh token",
            });
        }

        // Check token type
        if (decoded.type !== "refresh") {
            return res.status(401).json({
                success: false,
                message: "Invalid token type",
            });
        }

        // Get user
        const user = await User.findById(decoded.id);
        if (!user || !user.isActive || user.isBanned) {
            return res.status(401).json({
                success: false,
                message: "Invalid user",
            });
        }

        // Generate new tokens
        const tokens = generateTokenPair(user);

        res.json({
            success: true,
            message: "Token refreshed successfully",
            data: tokens,
        });
    } catch (error) {
        console.error("Refresh token error:", error);
        res.status(500).json({
            success: false,
            message: "Token refresh failed",
            error: env.nodeEnv === "development" ? error.message : undefined,
        });
    }
};

/**
 * Get current user
 * GET /auth/me
 */
export const getMe = async (req, res) => {
    try {
        const user = await User.findById(req.userId).populate("campusId", "name code");

        if (!user) {
            return res.status(404).json({
                success: false,
                message: "User not found",
            });
        }

        res.json({
            success: true,
            data: { user: user.toSafeObject() },
        });
    } catch (error) {
        console.error("Get me error:", error);
        res.status(500).json({
            success: false,
            message: "Failed to get user",
            error: env.nodeEnv === "development" ? error.message : undefined,
        });
    }
};

export default {
    register,
    verifyEmailOTP,
    resendOTP,
    login,
    forgotPassword,
    resetPassword,
    refresh,
    getMe,
};
