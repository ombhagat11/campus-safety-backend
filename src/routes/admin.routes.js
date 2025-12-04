import express from "express";
import {
    getAnalytics,
    createCampus,
    getCampuses,
    updateCampus,
    getUsers,
    updateUser,
    inviteModerator,
} from "../controllers/admin.controller.js";
import { authenticate, requireRole } from "../middlewares/auth.js";

const router = express.Router();

// All admin routes require admin role or higher
router.use(authenticate, requireRole(["admin", "super-admin"]));

/**
 * @route   GET /admin/analytics
 * @desc    Get analytics and dashboard data
 * @access  Admin+
 */
router.get("/analytics", getAnalytics);

/**
 * @route   POST /admin/campuses
 * @desc    Create new campus
 * @access  Admin+
 */
router.post("/campuses", createCampus);

/**
 * @route   GET /admin/campuses
 * @desc    Get all campuses
 * @access  Admin+
 */
router.get("/campuses", getCampuses);

/**
 * @route   PATCH /admin/campuses/:id
 * @desc    Update campus
 * @access  Admin+
 */
router.patch("/campuses/:id", updateCampus);

/**
 * @route   GET /admin/users
 * @desc    Get all users with filters
 * @access  Admin+
 */
router.get("/users", getUsers);

/**
 * @route   PATCH /admin/users/:id
 * @desc    Update user (role, status)
 * @access  Admin+
 */
router.patch("/users/:id", updateUser);

/**
 * @route   POST /admin/moderators
 * @desc    Invite moderator
 * @access  Admin+
 */
router.post("/moderators", inviteModerator);

export default router;
