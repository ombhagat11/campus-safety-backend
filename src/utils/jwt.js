import jwt from "jsonwebtoken";
import env from "../config/env.js";

/**
 * Generate access token (short-lived)
 * @param {Object} user - User object
 * @returns {string} JWT access token
 */
export const generateAccessToken = (user) => {
    const payload = {
        id: user._id || user.id,
        email: user.email,
        role: user.role,
        campusId: user.campusId,
        type: "access",
    };

    return jwt.sign(payload, env.jwt.secret, {
        expiresIn: env.jwt.accessExpiry,
        issuer: "campus-safety",
        audience: "campus-safety-api",
    });
};

/**
 * Generate refresh token (long-lived)
 * @param {Object} user - User object
 * @returns {string} JWT refresh token
 */
export const generateRefreshToken = (user) => {
    const payload = {
        id: user._id || user.id,
        email: user.email,
        type: "refresh",
    };

    return jwt.sign(payload, env.jwt.secret, {
        expiresIn: env.jwt.refreshExpiry,
        issuer: "campus-safety",
        audience: "campus-safety-api",
    });
};

/**
 * Generate both access and refresh tokens
 * @param {Object} user - User object
 * @returns {{accessToken: string, refreshToken: string}}
 */
export const generateTokenPair = (user) => {
    return {
        accessToken: generateAccessToken(user),
        refreshToken: generateRefreshToken(user),
    };
};

/**
 * Verify and decode a JWT token
 * @param {string} token - JWT token
 * @returns {Object} Decoded token payload
 * @throws {Error} If token is invalid
 */
export const verifyToken = (token) => {
    try {
        return jwt.verify(token, env.jwt.secret, {
            issuer: "campus-safety",
            audience: "campus-safety-api",
        });
    } catch (error) {
        if (error.name === "TokenExpiredError") {
            throw new Error("Token has expired");
        } else if (error.name === "JsonWebTokenError") {
            throw new Error("Invalid token");
        } else {
            throw error;
        }
    }
};

/**
 * Decode token without verification (use cautiously)
 * @param {string} token - JWT token
 * @returns {Object} Decoded token payload
 */
export const decodeToken = (token) => {
    return jwt.decode(token);
};

/**
 * Generate email verification token
 * @param {string} userId - User ID
 * @returns {string} Verification token
 */
export const generateVerificationToken = (userId) => {
    const payload = {
        id: userId,
        type: "email-verification",
    };

    return jwt.sign(payload, env.jwt.secret, {
        expiresIn: "24h",
        issuer: "campus-safety",
    });
};

/**
 * Generate password reset token
 * @param {string} userId - User ID
 * @returns {string} Reset token
 */
export const generateResetToken = (userId) => {
    const payload = {
        id: userId,
        type: "password-reset",
    };

    return jwt.sign(payload, env.jwt.secret, {
        expiresIn: "1h",
        issuer: "campus-safety",
    });
};

/**
 * Verify special purpose token (verification, reset)
 * @param {string} token - JWT token
 * @param {string} expectedType - Expected token type
 * @returns {Object} Decoded token payload
 */
export const verifySpecialToken = (token, expectedType) => {
    const decoded = verifyToken(token);

    if (decoded.type !== expectedType) {
        throw new Error("Invalid token type");
    }

    return decoded;
};

export default {
    generateAccessToken,
    generateRefreshToken,
    generateTokenPair,
    verifyToken,
    decodeToken,
    generateVerificationToken,
    generateResetToken,
    verifySpecialToken,
};
