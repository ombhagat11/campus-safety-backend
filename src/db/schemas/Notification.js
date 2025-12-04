import mongoose from "mongoose";

const notificationSchema = new mongoose.Schema(
    {
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: [true, "User is required"],
            index: true,
        },
        reportId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Report",
            index: true,
        },
        type: {
            type: String,
            required: [true, "Type is required"],
            enum: [
                "new_report",           // New report in user's radius
                "report_update",        // Status change on followed report
                "report_resolved",      // Report marked as resolved
                "comment_reply",        // Someone replied to user's comment
                "vote_threshold",       // Report reached vote threshold
                "moderator_action",     // Moderator action on user's report
                "system_alert",         // System-wide alert
                "campus_announcement",  // Campus announcement
            ],
            index: true,
        },
        title: {
            type: String,
            required: [true, "Title is required"],
            maxlength: [200, "Title cannot exceed 200 characters"],
        },
        message: {
            type: String,
            required: [true, "Message is required"],
            maxlength: [500, "Message cannot exceed 500 characters"],
        },
        data: {
            type: mongoose.Schema.Types.Mixed,
            default: {},
        },
        priority: {
            type: String,
            enum: ["low", "medium", "high", "urgent"],
            default: "medium",
            index: true,
        },
        isRead: {
            type: Boolean,
            default: false,
            index: true,
        },
        readAt: {
            type: Date,
        },
        // Push notification status
        isPushed: {
            type: Boolean,
            default: false,
        },
        pushedAt: {
            type: Date,
        },
        // Email notification status
        isEmailed: {
            type: Boolean,
            default: false,
        },
        emailedAt: {
            type: Date,
        },
    },
    {
        timestamps: true,
    }
);

// Indexes
notificationSchema.index({ userId: 1, isRead: 1, createdAt: -1 });
notificationSchema.index({ userId: 1, type: 1, createdAt: -1 });
// notificationSchema.index({ reportId: 1 }); // Already defined in schema

// Instance methods
notificationSchema.methods.markAsRead = async function () {
    if (!this.isRead) {
        this.isRead = true;
        this.readAt = new Date();
        await this.save();
    }
};

notificationSchema.methods.markAsPushed = async function () {
    this.isPushed = true;
    this.pushedAt = new Date();
    await this.save();
};

notificationSchema.methods.markAsEmailed = async function () {
    this.isEmailed = true;
    this.emailedAt = new Date();
    await this.save();
};

// Static methods
notificationSchema.statics.createNotification = async function (data) {
    const { userId, reportId, type, title, message, data: notifData = {}, priority = "medium" } = data;

    return await this.create({
        userId,
        reportId,
        type,
        title,
        message,
        data: notifData,
        priority,
    });
};

notificationSchema.statics.getUnreadByUser = function (userId) {
    return this.find({ userId, isRead: false })
        .sort({ createdAt: -1 })
        .populate("reportId", "title category severity");
};

notificationSchema.statics.markAllAsRead = async function (userId) {
    await this.updateMany(
        { userId, isRead: false },
        { $set: { isRead: true, readAt: new Date() } }
    );
};

notificationSchema.statics.deleteOldNotifications = async function (daysOld = 30) {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysOld);

    await this.deleteMany({
        createdAt: { $lt: cutoffDate },
        isRead: true,
    });
};

// TTL index for automatic cleanup (delete read notifications after 30 days)
// notificationSchema.index({ createdAt: 1 }, { 
//   expireAfterSeconds: 30 * 24 * 60 * 60,
//   partialFilterExpression: { isRead: true }
// });

const Notification = mongoose.model("Notification", notificationSchema);

export default Notification;
