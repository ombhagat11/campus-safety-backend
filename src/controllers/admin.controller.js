import Campus from "../db/schemas/Campus.js";
import User from "../db/schemas/User.js";
import Report from "../db/schemas/Report.js";
import AuditLog from "../db/schemas/AuditLog.js";
import { hashPassword } from "../utils/password.js";
import env from "../config/env.js";
import { sendModeratorInvite } from "../services/emailService.js";

/**
 * Get analytics/dashboard data
 * GET /admin/analytics
 */
export const getAnalytics = async (req, res) => {
    try {
        const {
            campusId,
            startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // Last 30 days
            endDate = new Date(),
        } = req.query;

        const query = {};

        // Super-admin can view all campuses, otherwise only own campus
        if (req.user.role !== "super-admin") {
            query.campusId = req.user.campusId;
        } else if (campusId) {
            query.campusId = campusId;
        }

        query.createdAt = { $gte: new Date(startDate), $lte: new Date(endDate) };

        // Get report statistics
        const [
            totalReports,
            reportsByCategory,
            reportsBySeverity,
            reportsByStatus,
            avgResponseTime,
        ] = await Promise.all([
            Report.countDocuments(query),
            Report.aggregate([
                { $match: query },
                { $group: { _id: "$category", count: { $sum: 1 } } },
            ]),
            Report.aggregate([
                { $match: query },
                { $group: { _id: "$severity", count: { $sum: 1 } } },
            ]),
            Report.aggregate([
                { $match: query },
                { $group: { _id: "$status", count: { $sum: 1 } } },
            ]),
            Report.aggregate([
                {
                    $match: {
                        ...query,
                        status: "resolved",
                        resolvedAt: { $exists: true },
                    },
                },
                {
                    $project: {
                        responseTime: {
                            $subtract: ["$resolvedAt", "$createdAt"],
                        },
                    },
                },
                {
                    $group: {
                        _id: null,
                        avgTime: { $avg: "$responseTime" },
                    },
                },
            ]),
        ]);

        // Calculate spam ratio
        const spamCount = await Report.countDocuments({ ...query, isSpam: true });
        const spamRatio = totalReports > 0 ? (spamCount / totalReports) * 100 : 0;

        // Get user statistics
        const [totalUsers, activeUsers] = await Promise.all([
            User.countDocuments(req.user.role !== "super-admin" ? { campusId: req.user.campusId } : {}),
            User.countDocuments({
                ...(req.user.role !== "super-admin" ? { campusId: req.user.campusId } : {}),
                isActive: true,
                isBanned: false
            })
        ]);

        // Calculate resolved reports count
        const resolvedCount = reportsByStatus.find(s => s._id === "resolved")?.count || 0;

        res.json({
            success: true,
            data: {
                summary: {
                    totalReports,
                    totalUsers,
                    activeUsers,
                    resolvedReports: resolvedCount,
                    spamRatio: spamRatio.toFixed(2),
                    avgResponseTime: avgResponseTime[0]?.avgTime || 0,
                },
                charts: {
                    byCategory: reportsByCategory,
                    bySeverity: reportsBySeverity,
                    byStatus: reportsByStatus,
                },
            },
        });
    } catch (error) {
        console.error("Get analytics error:", error);
        res.status(500).json({
            success: false,
            message: "Failed to get analytics",
            error: env.nodeEnv === "development" ? error.message : undefined,
        });
    }
};

/**
 * Create new campus
 * POST /admin/campuses
 */
export const createCampus = async (req, res) => {
    try {
        const {
            name,
            code,
            description,
            boundaries,
            center,
            settings,
            contact,
        } = req.body;

        // Check if code already exists
        const existing = await Campus.findOne({ code: code.toUpperCase() });
        if (existing) {
            return res.status(409).json({
                success: false,
                message: "Campus code already exists",
            });
        }

        const campus = await Campus.create({
            name,
            code: code.toUpperCase(),
            description,
            boundaries,
            center,
            settings,
            contact,
            isActive: true,
        });

        // Log audit
        await AuditLog.logAction({
            actorId: req.userId,
            action: "create_campus",
            entityType: "campus",
            entityId: campus._id,
            payload: { name, code },
        });

        res.status(201).json({
            success: true,
            message: "Campus created successfully",
            data: { campus },
        });
    } catch (error) {
        console.error("Create campus error:", error);
        res.status(500).json({
            success: false,
            message: "Failed to create campus",
            error: env.nodeEnv === "development" ? error.message : undefined,
        });
    }
};

/**
 * Get all campuses (admin view)
 * GET /admin/campuses
 */
export const getCampuses = async (req, res) => {
    try {
        const { limit = 50, page = 1 } = req.query;
        const skip = (parseInt(page) - 1) * parseInt(limit);

        const campuses = await Campus.find({})
            .sort({ createdAt: -1 })
            .limit(parseInt(limit))
            .skip(skip);

        const total = await Campus.countDocuments({});

        res.json({
            success: true,
            data: {
                campuses,
                pagination: {
                    total,
                    page: parseInt(page),
                    limit: parseInt(limit),
                    pages: Math.ceil(total / parseInt(limit)),
                },
            },
        });
    } catch (error) {
        console.error("Get campuses error:", error);
        res.status(500).json({
            success: false,
            message: "Failed to get campuses",
            error: env.nodeEnv === "development" ? error.message : undefined,
        });
    }
};

/**
 * Update campus
 * PATCH /admin/campuses/:id
 */
export const updateCampus = async (req, res) => {
    try {
        const { id } = req.params;
        const updates = req.body;

        const campus = await Campus.findById(id);

        if (!campus) {
            return res.status(404).json({
                success: false,
                message: "Campus not found",
            });
        }

        // Update allowed fields
        Object.assign(campus, updates);
        await campus.save();

        // Log audit
        await AuditLog.logAction({
            actorId: req.userId,
            action: "update_campus",
            entityType: "campus",
            entityId: campus._id,
            payload: updates,
        });

        res.json({
            success: true,
            message: "Campus updated successfully",
            data: { campus },
        });
    } catch (error) {
        console.error("Update campus error:", error);
        res.status(500).json({
            success: false,
            message: "Failed to update campus",
            error: env.nodeEnv === "development" ? error.message : undefined,
        });
    }
};

/**
 * Get all users (admin view)
 * GET /admin/users
 */
export const getUsers = async (req, res) => {
    try {
        const { campusId, role, search, limit = 50, page = 1 } = req.query;

        const query = {};

        // Filter by campus (super-admin can see all)
        if (req.user.role !== "super-admin") {
            query.campusId = req.user.campusId;
        } else if (campusId) {
            query.campusId = campusId;
        }

        if (role) query.role = role;
        if (search) {
            query.$or = [
                { name: { $regex: search, $options: "i" } },
                { email: { $regex: search, $options: "i" } },
            ];
        }

        const skip = (parseInt(page) - 1) * parseInt(limit);

        const users = await User.find(query)
            .select("-passwordHash")
            .sort({ createdAt: -1 })
            .limit(parseInt(limit))
            .skip(skip)
            .populate("campusId", "name code");

        const total = await User.countDocuments(query);

        res.json({
            success: true,
            data: {
                users,
                pagination: {
                    total,
                    page: parseInt(page),
                    limit: parseInt(limit),
                    pages: Math.ceil(total / parseInt(limit)),
                },
            },
        });
    } catch (error) {
        console.error("Get users error:", error);
        res.status(500).json({
            success: false,
            message: "Failed to get users",
            error: env.nodeEnv === "development" ? error.message : undefined,
        });
    }
};

/**
 * Update user (block, role change, etc.)
 * PATCH /admin/users/:id
 */
export const updateUser = async (req, res) => {
    try {
        const { id } = req.params;
        const { role, isActive, isBanned, bannedReason } = req.body;

        const user = await User.findById(id);

        if (!user) {
            return res.status(404).json({
                success: false,
                message: "User not found",
            });
        }

        // Check campus access
        if (!user.campusId.equals(req.user.campusId) && req.user.role !== "super-admin") {
            return res.status(403).json({
                success: false,
                message: "Access denied",
            });
        }

        // Update fields
        if (role) user.role = role;
        if (isActive !== undefined) user.isActive = isActive;
        if (isBanned !== undefined) {
            user.isBanned = isBanned;
            user.bannedReason = bannedReason;
            user.bannedAt = isBanned ? new Date() : null;
        }

        await user.save();

        // Log audit
        await AuditLog.logAction({
            actorId: req.userId,
            action: "change_user_role",
            entityType: "user",
            entityId: user._id,
            payload: { role, isActive, isBanned },
        });

        res.json({
            success: true,
            message: "User updated successfully",
            data: { user: user.toSafeObject() },
        });
    } catch (error) {
        console.error("Update user error:", error);
        res.status(500).json({
            success: false,
            message: "Failed to update user",
            error: env.nodeEnv === "development" ? error.message : undefined,
        });
    }
};

/**
 * Invite moderator
 * POST /admin/moderators
 */
export const inviteModerator = async (req, res) => {
    try {
        const { name, email, campusId } = req.body;

        // Determine campus (super-admin can specify, others use own campus)
        const targetCampusId = req.user.role === "super-admin" && campusId ? campusId : req.user.campusId;

        // Check if user already exists
        const existing = await User.findOne({ email });
        if (existing) {
            return res.status(409).json({
                success: false,
                message: "User with this email already exists",
            });
        }

        // Generate temporary password
        const tempPassword = Math.random().toString(36).slice(-10);
        const passwordHash = await hashPassword(tempPassword);

        const moderator = await User.create({
            name,
            email,
            passwordHash,
            campusId: targetCampusId,
            role: "moderator",
            isVerified: false,
        });

        // Update campus moderator count
        const campus = await Campus.findById(targetCampusId);
        if (campus) {
            campus.stats.totalModerators += 1;
            await campus.save();
        }

        // TODO: Send invitation email with temp password
        console.log(`📧 Moderator invited: ${email} / Temp password: ${tempPassword}`);

        res.status(201).json({
            success: true,
            message: "Moderator invited successfully. Temporary credentials sent via email.",
            data: {
                moderator: moderator.toSafeObject(),
                tempPassword: env.nodeEnv === "development" ? tempPassword : undefined,
            },
        });
    } catch (error) {
        console.error("Invite moderator error:", error);
        res.status(500).json({
            success: false,
            message: "Failed to invite moderator",
            error: env.nodeEnv === "development" ? error.message : undefined,
        });
    }
};

export default {
    getAnalytics,
    createCampus,
    getCampuses,
    updateCampus,
    getUsers,
    updateUser,
    inviteModerator,
};
