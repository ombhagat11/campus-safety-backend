import User from "../db/schemas/User.js";
import Report from "../db/schemas/Report.js";
import Notification from "../db/schemas/Notification.js";
import Device from "../db/schemas/Device.js";
import { hashPassword, comparePassword, validatePasswordStrength } from "../utils/password.js";
import env from "../config/env.js";

/**
 * Get user profile
 * GET /users/:id
 */
export const getUserProfile = async (req, res) => {
    try {
        const { id } = req.params;

        // Check authorization
        if (id !== req.userId.toString() && !req.user.canModerate()) {
            return res.status(403).json({
                success: false,
                message: "Unauthorized to view this profile",
            });
        }

        const user = await User.findById(id).populate("campusId", "name code");

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
        console.error("Get user profile error:", error);
        res.status(500).json({
            success: false,
            message: "Failed to get user profile",
            error: env.nodeEnv === "development" ? error.message : undefined,
        });
    }
};

/**
 * Update user profile
 * PATCH /users/:id
 */
export const updateUserProfile = async (req, res) => {
    try {
        const { id } = req.params;

        // Check authorization
        if (id !== req.userId.toString()) {
            return res.status(403).json({
                success: false,
                message: "Unauthorized to update this profile",
            });
        }

        const {
            name,
            phone,
            notificationPreferences,
            isAnonymousByDefault,
        } = req.body;

        const user = await User.findById(id);

        if (!user) {
            return res.status(404).json({
                success: false,
                message: "User not found",
            });
        }

        // Update allowed fields
        if (name) user.name = name;
        if (phone !== undefined) user.phone = phone;
        if (notificationPreferences) user.notificationPreferences = { ...user.notificationPreferences, ...notificationPreferences };
        if (isAnonymousByDefault !== undefined) user.isAnonymousByDefault = isAnonymousByDefault;

        await user.save();

        res.json({
            success: true,
            message: "Profile updated successfully",
            data: { user: user.toSafeObject() },
        });
    } catch (error) {
        console.error("Update user profile error:", error);
        res.status(500).json({
            success: false,
            message: "Failed to update profile",
            error: env.nodeEnv === "development" ? error.message : undefined,
        });
    }
};

/**
 * Change password
 * POST /users/:id/change-password
 */
export const changePassword = async (req, res) => {
    try {
        const { id } = req.params;
        const { currentPassword, newPassword } = req.body;

        // Check authorization
        if (id !== req.userId.toString()) {
            return res.status(403).json({
                success: false,
                message: "Unauthorized",
            });
        }

        // Validate new password strength
        const passwordValidation = validatePasswordStrength(newPassword);
        if (!passwordValidation.valid) {
            return res.status(400).json({
                success: false,
                message: "Password does not meet requirements",
                errors: passwordValidation.errors,
            });
        }

        const user = await User.findById(id).select("+passwordHash");

        if (!user) {
            return res.status(404).json({
                success: false,
                message: "User not found",
            });
        }

        // Verify current password
        const isPasswordValid = await comparePassword(currentPassword, user.passwordHash);
        if (!isPasswordValid) {
            return res.status(401).json({
                success: false,
                message: "Current password is incorrect",
            });
        }

        // Hash and update new password
        user.passwordHash = await hashPassword(newPassword);
        await user.save();

        res.json({
            success: true,
            message: "Password changed successfully",
        });
    } catch (error) {
        console.error("Change password error:", error);
        res.status(500).json({
            success: false,
            message: "Failed to change password",
            error: env.nodeEnv === "development" ? error.message : undefined,
        });
    }
};

/**
 * Get user's reports
 * GET /users/:id/reports
 */
export const getUserReports = async (req, res) => {
    try {
        const { id } = req.params;
        const { limit = 50, page = 1 } = req.query;

        // Check authorization
        if (id !== req.userId.toString() && !req.user.canModerate()) {
            return res.status(403).json({
                success: false,
                message: "Unauthorized",
            });
        }

        const skip = (parseInt(page) - 1) * parseInt(limit);

        const reports = await Report.find({ reporterId: id })
            .sort({ createdAt: -1 })
            .limit(parseInt(limit))
            .skip(skip);

        const total = await Report.countDocuments({ reporterId: id });

        res.json({
            success: true,
            data: {
                reports,
                pagination: {
                    total,
                    page: parseInt(page),
                    limit: parseInt(limit),
                    pages: Math.ceil(total / parseInt(limit)),
                },
            },
        });
    } catch (error) {
        console.error("Get user reports error:", error);
        res.status(500).json({
            success: false,
            message: "Failed to get user reports",
            error: env.nodeEnv === "development" ? error.message : undefined,
        });
    }
};

/**
 * Get user's notifications
 * GET /users/:id/notifications
 */
export const getUserNotifications = async (req, res) => {
    try {
        const { id } = req.params;
        const { unreadOnly = false, limit = 50 } = req.query;

        // Check authorization
        if (id !== req.userId.toString()) {
            return res.status(403).json({
                success: false,
                message: "Unauthorized",
            });
        }

        const query = { userId: id };
        if (unreadOnly === "true") {
            query.isRead = false;
        }

        const notifications = await Notification.find(query)
            .sort({ createdAt: -1 })
            .limit(parseInt(limit))
            .populate("reportId", "title category");

        const unreadCount = await Notification.countDocuments({ userId: id, isRead: false });

        res.json({
            success: true,
            data: {
                notifications,
                unreadCount,
            },
        });
    } catch (error) {
        console.error("Get notifications error:", error);
        res.status(500).json({
            success: false,
            message: "Failed to get notifications",
            error: env.nodeEnv === "development" ? error.message : undefined,
        });
    }
};

/**
 * Mark notification as read
 * PATCH /users/:id/notifications/:notifId/read
 */
export const markNotificationRead = async (req, res) => {
    try {
        const { id, notifId } = req.params;

        // Check authorization
        if (id !== req.userId.toString()) {
            return res.status(403).json({
                success: false,
                message: "Unauthorized",
            });
        }

        const notification = await Notification.findOne({
            _id: notifId,
            userId: id,
        });

        if (!notification) {
            return res.status(404).json({
                success: false,
                message: "Notification not found",
            });
        }

        await notification.markAsRead();

        res.json({
            success: true,
            message: "Notification marked as read",
        });
    } catch (error) {
        console.error("Mark notification read error:", error);
        res.status(500).json({
            success: false,
            message: "Failed to mark notification as read",
            error: env.nodeEnv === "development" ? error.message : undefined,
        });
    }
};

/**
 * Mark all notifications as read
 * POST /users/:id/notifications/read-all
 */
export const markAllNotificationsRead = async (req, res) => {
    try {
        const { id } = req.params;

        // Check authorization
        if (id !== req.userId.toString()) {
            return res.status(403).json({
                success: false,
                message: "Unauthorized",
            });
        }

        await Notification.markAllAsRead(id);

        res.json({
            success: true,
            message: "All notifications marked as read",
        });
    } catch (error) {
        console.error("Mark all notifications read error:", error);
        res.status(500).json({
            success: false,
            message: "Failed to mark all notifications as read",
            error: env.nodeEnv === "development" ? error.message : undefined,
        });
    }
};

/**
 * Register device for push notifications
 *  POST /devices/register
 */
export const registerDevice = async (req, res) => {
    try {
        const { token, platform, deviceInfo } = req.body;

        if (!token || !platform) {
            return res.status(400).json({
                success: false,
                message: "Token and platform are required",
            });
        }

        // Check if device already exists
        let device = await Device.findOne({ token });

        if (device) {
            // Update existing device
            device.userId = req.userId;
            device.platform = platform;
            device.deviceInfo = deviceInfo || device.deviceInfo;
            device.isActive = true;
            device.lastUsedAt = new Date();
            await device.save();
        } else {
            // Create new device
            device = await Device.create({
                userId: req.userId,
                token,
                platform,
                deviceInfo,
            });
        }

        res.json({
            success: true,
            message: "Device registered successfully",
            data: { deviceId: device._id },
        });
    } catch (error) {
        console.error("Register device error:", error);
        res.status(500).json({
            success: false,
            message: "Failed to register device",
            error: env.nodeEnv === "development" ? error.message : undefined,
        });
    }
};

/**
 * Unregister device
 * DELETE /devices/:deviceId
 */
export const unregisterDevice = async (req, res) => {
    try {
        const { deviceId } = req.params;

        const device = await Device.findOne({
            _id: deviceId,
            userId: req.userId,
        });

        if (!device) {
            return res.status(404).json({
                success: false,
                message: "Device not found",
            });
        }

        await device.deactivate();

        res.json({
            success: true,
            message: "Device unregistered successfully",
        });
    } catch (error) {
        console.error("Unregister device error:", error);
        res.status(500).json({
            success: false,
            message: "Failed to unregister device",
            error: env.nodeEnv === "development" ? error.message : undefined,
        });
    }
};

export default {
    getUserProfile,
    updateUserProfile,
    changePassword,
    getUserReports,
    getUserNotifications,
    markNotificationRead,
    markAllNotificationsRead,
    registerDevice,
    unregisterDevice,
};
