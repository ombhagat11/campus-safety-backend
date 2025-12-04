import mongoose from "mongoose";

const auditLogSchema = new mongoose.Schema(
    {
        reportId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Report",
            index: true,
        },
        actorId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: [true, "Actor is required"],
            index: true,
        },
        action: {
            type: String,
            required: [true, "Action is required"],
            enum: [
                // Report actions
                "create_report",
                "edit_report",
                "delete_report",
                "vote_report",
                "report_spam",
                // Moderation actions
                "verify_report",
                "invalidate_report",
                "resolve_report",
                "assign_report",
                "add_moderator_note",
                // User actions
                "verify_email",
                "ban_user",
                "unban_user",
                "change_user_role",
                "delete_user",
                // Campus actions
                "create_campus",
                "update_campus",
                "delete_campus",
                // System actions
                "system_alert",
                "bulk_action",
                "other",
            ],
            index: true,
        },
        entityType: {
            type: String,
            enum: ["report", "user", "campus", "comment", "system"],
            required: true,
            index: true,
        },
        entityId: {
            type: mongoose.Schema.Types.ObjectId,
            index: true,
        },
        // Detailed information about the action
        payload: {
            type: mongoose.Schema.Types.Mixed,
            default: {},
        },
        // Old and new values for tracking changes
        changes: {
            before: mongoose.Schema.Types.Mixed,
            after: mongoose.Schema.Types.Mixed,
        },
        // IP address and user agent
        metadata: {
            ipAddress: String,
            userAgent: String,
            location: {
                type: {
                    type: String,
                    enum: ["Point"],
                    default: "Point",
                },
                coordinates: [Number], // [longitude, latitude]
            },
        },
    },
    {
        timestamps: { createdAt: true, updatedAt: false }, // Only need createdAt
    }
);

// Indexes for efficient querying
auditLogSchema.index({ reportId: 1, createdAt: -1 });
auditLogSchema.index({ actorId: 1, createdAt: -1 });
auditLogSchema.index({ action: 1, createdAt: -1 });
auditLogSchema.index({ entityType: 1, entityId: 1, createdAt: -1 });
auditLogSchema.index({ createdAt: -1 });

// Static methods
auditLogSchema.statics.logAction = async function (data) {
    const {
        reportId,
        actorId,
        action,
        entityType,
        entityId,
        payload = {},
        changes = null,
        metadata = {},
    } = data;

    return await this.create({
        reportId,
        actorId,
        action,
        entityType,
        entityId,
        payload,
        changes,
        metadata,
    });
};

auditLogSchema.statics.getReportHistory = function (reportId, limit = 50) {
    return this.find({ reportId })
        .sort({ createdAt: -1 })
        .limit(limit)
        .populate("actorId", "name email role");
};

auditLogSchema.statics.getUserActions = function (userId, limit = 100) {
    return this.find({ actorId: userId })
        .sort({ createdAt: -1 })
        .limit(limit);
};

auditLogSchema.statics.getRecentActions = function (campusId, limit = 100) {
    // Would need to join with report to filter by campus
    // For now, return all recent actions
    return this.find({})
        .sort({ createdAt: -1 })
        .limit(limit)
        .populate("actorId", "name role")
        .populate("reportId", "title category");
};

// TTL index for automatic cleanup (optional - keep logs for 1 year)
// auditLogSchema.index({ createdAt: 1 }, { expireAfterSeconds: 365 * 24 * 60 * 60 });

const AuditLog = mongoose.model("AuditLog", auditLogSchema);

export default AuditLog;
