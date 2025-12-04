import mongoose from "mongoose";

const commentSchema = new mongoose.Schema(
    {
        reportId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Report",
            required: [true, "Report is required"],
            index: true,
        },
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: [true, "User is required"],
            index: true,
        },
        content: {
            type: String,
            required: [true, "Content is required"],
            trim: true,
            minlength: [1, "Comment cannot be empty"],
            maxlength: [500, "Comment cannot exceed 500 characters"],
        },
        isAnonymous: {
            type: Boolean,
            default: false,
        },
        isEdited: {
            type: Boolean,
            default: false,
        },
        editedAt: {
            type: Date,
        },
        // For moderator/admin comments
        isModeratorComment: {
            type: Boolean,
            default: false,
        },
        isDeleted: {
            type: Boolean,
            default: false,
        },
        deletedAt: {
            type: Date,
        },
    },
    {
        timestamps: true,
        toJSON: {
            transform: function (doc, ret) {
                if (ret.isDeleted) {
                    ret.content = "[Comment deleted]";
                }
                if (ret.isAnonymous && !ret._moderatorView) {
                    delete ret.userId;
                }
                delete ret._moderatorView;
                return ret;
            },
        },
    }
);

// Indexes
commentSchema.index({ reportId: 1, createdAt: -1 });
commentSchema.index({ userId: 1, createdAt: -1 });

// Instance methods
commentSchema.methods.canEdit = function (userId, timeLimit = 10 * 60 * 1000) {
    // Can edit within 10 minutes
    if (this.isDeleted) return false;
    if (!this.userId.equals(userId)) return false;

    const now = new Date();
    const timeSinceCreation = now - this.createdAt;
    return timeSinceCreation < timeLimit;
};

commentSchema.methods.softDelete = async function () {
    this.isDeleted = true;
    this.deletedAt = new Date();
    await this.save();
};

// Static methods
commentSchema.statics.findByReport = function (reportId) {
    return this.find({ reportId, isDeleted: false })
        .sort({ createdAt: 1 })
        .populate("userId", "name");
};

commentSchema.statics.countByReport = function (reportId) {
    return this.countDocuments({ reportId, isDeleted: false });
};

const Comment = mongoose.model("Comment", commentSchema);

export default Comment;
