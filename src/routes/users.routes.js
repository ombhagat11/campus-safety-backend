import express from "express";
import {
    getUserProfile,
    updateUserProfile,
    changePassword,
    getUserReports,
    getUserNotifications,
    markNotificationRead,
    markAllNotificationsRead,
    registerDevice,
    unregisterDevice,
} from "../controllers/users.controller.js";
import { authenticate } from "../middlewares/auth.js";
import { validate, changePasswordSchema } from "../middlewares/validate.js";

const router = express.Router();

/**
 * @route   GET /users/:id
 * @desc    Get user profile
 * @access  Private
 */
router.get("/:id", authenticate, getUserProfile);

/**
 * @route   PATCH /users/:id
 * @desc    Update user profile
 * @access  Private (own profile only)
 */
router.patch("/:id", authenticate, updateUserProfile);

/**
 * @route   POST /users/:id/change-password
 * @desc    Change password
 * @access  Private (own profile only)
 */
router.post("/:id/change-password", authenticate, validate(changePasswordSchema), changePassword);

/**
 * @route   GET /users/:id/reports
 * @desc    Get user's reports
 * @access  Private
 */
router.get("/:id/reports", authenticate, getUserReports);

/**
 * @route   GET /users/:id/notifications
 * @desc    Get user's notifications
 * @access  Private (own profile only)
 */
router.get("/:id/notifications", authenticate, getUserNotifications);

/**
 * @route   PATCH /users/:id/notifications/:notifId/read
 * @desc    Mark notification as read
 * @access  Private (own profile only)
 */
router.patch("/:id/notifications/:notifId/read", authenticate, markNotificationRead);

/**
 * @route   POST /users/:id/notifications/read-all
 * @desc    Mark all notifications as read
 * @access  Private (own profile only)
 */
router.post("/:id/notifications/read-all", authenticate, markAllNotificationsRead);

/**
 * @route   POST /devices/register
 * @desc    Register device for push notifications
 * @access  Private
 */
router.post("/devices/register", authenticate, registerDevice);

/**
 * @route   DELETE /devices/:deviceId
 * @desc    Unregister device
 * @access  Private
 */
router.delete("/devices/:deviceId", authenticate, unregisterDevice);

export default router;
