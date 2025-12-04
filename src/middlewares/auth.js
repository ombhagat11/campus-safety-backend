import { verifyToken } from "../utils/jwt.js";
import User from "../db/schemas/User.js";

/**
 * Authenticate middleware - Verify JWT and attach user to request
 */
export const authenticate = async (req, res, next) => {
    try {
        // Get token from Authorization header
        const authHeader = req.headers.authorization;

        if (!authHeader || !authHeader.startsWith("Bearer ")) {
            return res.status(401).json({
                success: false,
                message: "No token provided",
            });
        }

        const token = authHeader.substring(7); // Remove 'Bearer ' prefix

        // Verify token
        let decoded;
        try {
            decoded = verifyToken(token);
        } catch (error) {
            return res.status(401).json({
                success: false,
                message: error.message || "Invalid token",
            });
        }

        // Check token type
        if (decoded.type !== "access") {
            return res.status(401).json({
                success: false,
                message: "Invalid token type",
            });
        }

        // Get user from database
        const user = await User.findById(decoded.id);

        if (!user) {
            return res.status(401).json({
                success: false,
                message: "User not found",
            });
        }

        // Check if user is active and not banned
        if (!user.isActive) {
            return res.status(403).json({
                success: false,
                message: "Account is deactivated",
            });
        }

        if (user.isBanned) {
            return res.status(403).json({
                success: false,
                message: `Account is banned${user.bannedReason ? `: ${user.bannedReason}` : ""}`,
            });
        }

        // Attach user to request
        req.user = user;
        req.userId = user._id;

        next();
    } catch (error) {
        console.error("Authentication error:", error);
        res.status(500).json({
            success: false,
            message: "Authentication failed",
        });
    }
};

/**
 * Optional authentication - Attach user if token is provided, but don't require it
 */
export const optionalAuthenticate = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;

        if (!authHeader || !authHeader.startsWith("Bearer ")) {
            // No token provided, continue without user
            return next();
        }

        const token = authHeader.substring(7);

        try {
            const decoded = verifyToken(token);

            if (decoded.type === "access") {
                const user = await User.findById(decoded.id);

                if (user && user.isActive && !user.isBanned) {
                    req.user = user;
                    req.userId = user._id;
                }
            }
        } catch (error) {
            // Invalid token, but continue without user
            console.log("Optional auth: Invalid token, continuing without user");
        }

        next();
    } catch (error) {
        console.error("Optional authentication error:", error);
        next();
    }
};

/**
 * Role-based authorization middleware
 * @param {string|string[]} allowedRoles - Single role or array of allowed roles
 */
export const requireRole = (allowedRoles) => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({
                success: false,
                message: "Authentication required",
            });
        }

        const roles = Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles];

        if (!roles.includes(req.user.role)) {
            return res.status(403).json({
                success: false,
                message: "Insufficient permissions",
                requiredRoles: roles,
                userRole: req.user.role,
            });
        }

        next();
    };
};

/**
 * Verify user belongs to specific campus
 * @param {string} campusIdField - Name of the field in req.params/body containing campusId
 */
export const verifyCampus = (campusIdField = "campusId") => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({
                success: false,
                message: "Authentication required",
            });
        }

        const campusId = req.params[campusIdField] || req.body[campusIdField];

        // Super admin can access any campus
        if (req.user.role === "super-admin") {
            return next();
        }

        // Check if user belongs to the campus
        if (req.user.campusId.toString() !== campusId) {
            return res.status(403).json({
                success: false,
                message: "Access denied to this campus",
            });
        }

        next();
    };
};

/**
 * Verify email is verified
 */
export const requireVerifiedEmail = (req, res, next) => {
    if (!req.user) {
        return res.status(401).json({
            success: false,
            message: "Authentication required",
        });
    }

    if (!req.user.isVerified) {
        return res.status(403).json({
            success: false,
            message: "Email verification required",
        });
    }

    next();
};

export default {
    authenticate,
    optionalAuthenticate,
    requireRole,
    verifyCampus,
    requireVerifiedEmail,
};
