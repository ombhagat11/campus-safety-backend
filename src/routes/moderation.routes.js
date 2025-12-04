import express from "express";
import {
    getModerationSummary,
    getModerationReports,
    updateReportStatus,
    banUser,
    getAuditLogs,
} from "../controllers/moderation.controller.js";
import { authenticate, requireRole } from "../middlewares/auth.js";

const router = express.Router();

// All moderation routes require moderator role or higher
router.use(authenticate, requireRole(["moderator", "admin", "super-admin"]));

/**
 * @route   GET /moderation/summary
 * @desc    Get moderation dashboard summary
 * @access  Moderator+
 */
router.get("/summary", getModerationSummary);

/**
 * @route   GET /moderation/reports
 * @desc    Get reports for moderation
 * @access  Moderator+
 */
router.get("/reports", getModerationReports);

/**
 * @route   PATCH /moderation/reports/:id
 * @desc    Update report status
 * @access  Moderator+
 */
router.patch("/reports/:id", updateReportStatus);

/**
 * @route   POST /moderation/ban-user
 * @desc    Ban a user
 * @access  Moderator+
 */
router.post("/ban-user", banUser);

/**
 * @route   GET /moderation/audit
 * @desc    Get audit logs
 * @access  Moderator+
 */
router.get("/audit", getAuditLogs);

export default router;
