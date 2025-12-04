import mongoose from "mongoose";

const reportSchema = new mongoose.Schema(
    {
        reporterId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: [true, "Reporter is required"],
            index: true,
        },
        campusId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Campus",
            required: [true, "Campus is required"],
            index: true,
        },
        // Report content
        category: {
            type: String,
            required: [true, "Category is required"],
            enum: [
                "safety",
                "emergency",
                "theft",
                "suspicious",
                "suspicious_activity",
                "harassment",
                "vandalism",
                "medical",
                "fire",
                "hazard",
                "assault",
                "other"
            ],
            index: true,
        },
        severity: {
            type: Number,
            required: [true, "Severity is required"],
            min: [1, "Severity must be between 1 and 5"],
            max: [5, "Severity must be between 1 and 5"],
            index: true,
        },
        title: {
            type: String,
            required: [true, "Title is required"],
            trim: true,
            maxlength: [200, "Title cannot exceed 200 characters"],
        },
        description: {
            type: String,
            required: [true, "Description is required"],
            maxlength: [2000, "Description cannot exceed 2000 characters"],
        },
        // Location as GeoJSON Point
        location: {
            type: {
                type: String,
                enum: ["Point"],
                required: true,
                default: "Point",
            },
            coordinates: {
                type: [Number], // [longitude, latitude]
                required: [true, "Location coordinates are required"],
                validate: {
                    validator: function (coords) {
                        return coords.length === 2 &&
                            coords[0] >= -180 && coords[0] <= 180 &&
                            coords[1] >= -90 && coords[1] <= 90;
                    },
                    message: "Invalid coordinates",
                },
            },
        },
        // Media files (S3 URLs)
        mediaUrls: {
            type: [String],
            default: [],
            validate: {
                validator: function (arr) {
                    return arr.length <= 10;
                },
                message: "Cannot upload more than 10 media files",
            },
        },
        // Privacy
        isAnonymous: {
            type: Boolean,
            default: false,
        },
        // Status tracking
        status: {
            type: String,
            enum: ["reported", "verified", "investigating", "resolved", "invalid", "spam"],
            default: "reported",
            index: true,
        },
        resolvedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
        },
        resolvedAt: {
            type: Date,
        },
        // Moderation
        moderatorNotes: {
            type: String,
            maxlength: [1000, "Moderator notes cannot exceed 1000 characters"],
            select: false, // Only visible to moderators/admins
        },
        assignedTo: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User", // Security staff
        },
        // Engagement metrics
        votes: {
            confirms: {
                type: [mongoose.Schema.Types.ObjectId],
                default: [],
                ref: "User",
            },
            disputes: {
                type: [mongoose.Schema.Types.ObjectId],
                default: [],
                ref: "User",
            },
        },
        commentsCount: {
            type: Number,
            default: 0,
        },
        viewsCount: {
            type: Number,
            default: 0,
        },
        // Spam tracking
        spamReports: {
            type: [mongoose.Schema.Types.ObjectId],
            default: [],
            ref: "User",
        },
        isSpam: {
            type: Boolean,
            default: false,
        },
        // Edit tracking
        isEdited: {
            type: Boolean,
            default: false,
        },
        editedAt: {
            type: Date,
        },
        editHistory: {
            type: [
                {
                    editedAt: Date,
                    changes: Object,
                },
            ],
            default: [],
            select: false,
        },
    },
    {
        timestamps: true,
        toJSON: {
            virtuals: true,
            transform: function (doc, ret) {
                // Remove sensitive data for non-moderators
                if (!ret._moderatorView) {
                    if (doc.isAnonymous) {
                        delete ret.reporterId;
                    }
                    delete ret.moderatorNotes;
                    delete ret.spamReports;
                    delete ret.editHistory;
                }
                delete ret._moderatorView;
                return ret;
            },
        },
    }
);

// Compound indexes for queries
reportSchema.index({ campusId: 1, status: 1, createdAt: -1 });
reportSchema.index({ campusId: 1, category: 1, severity: -1 });
reportSchema.index({ location: "2dsphere" });
reportSchema.index({ campusId: 1, location: "2dsphere" });
reportSchema.index({ reporterId: 1, createdAt: -1 });

// Virtuals
reportSchema.virtual("confirmCount").get(function () {
    return this.votes.confirms.length;
});

reportSchema.virtual("disputeCount").get(function () {
    return this.votes.disputes.length;
});

reportSchema.virtual("netVotes").get(function () {
    return this.votes.confirms.length - this.votes.disputes.length;
});

reportSchema.virtual("comments", {
    ref: "Comment",
    localField: "_id",
    foreignField: "reportId",
});

// Instance methods
reportSchema.methods.canEdit = function (userId, timeLimit = 30 * 60 * 1000) {
    // Can edit within 30 minutes and not resolved
    if (this.status !== "reported") return false;
    if (!this.reporterId.equals(userId)) return false;

    const now = new Date();
    const timeSinceCreation = now - this.createdAt;
    return timeSinceCreation < timeLimit;
};

reportSchema.methods.addVote = async function (userId, voteType) {
    const userIdStr = userId.toString();

    // Remove from opposite vote type
    if (voteType === "confirm") {
        this.votes.disputes = this.votes.disputes.filter(id => !id.equals(userId));
        if (!this.votes.confirms.some(id => id.equals(userId))) {
            this.votes.confirms.push(userId);
        }
    } else {
        this.votes.confirms = this.votes.confirms.filter(id => !id.equals(userId));
        if (!this.votes.disputes.some(id => id.equals(userId))) {
            this.votes.disputes.push(userId);
        }
    }

    await this.save();
};

reportSchema.methods.removeVote = async function (userId) {
    this.votes.confirms = this.votes.confirms.filter(id => !id.equals(userId));
    this.votes.disputes = this.votes.disputes.filter(id => !id.equals(userId));
    await this.save();
};

reportSchema.methods.incrementViews = async function () {
    this.viewsCount += 1;
    await this.save();
};

reportSchema.methods.toModeratorView = function () {
    const obj = this.toObject({ virtuals: true });
    obj._moderatorView = true;
    return obj;
};

// Static methods
reportSchema.statics.findNearby = function (campusId, longitude, latitude, radiusMeters = 1000, filters = {}) {
    const query = {
        campusId,
        location: {
            $near: {
                $geometry: {
                    type: "Point",
                    coordinates: [longitude, latitude],
                },
                $maxDistance: radiusMeters,
            },
        },
    };

    // Apply filters
    if (filters.category) {
        query.category = filters.category;
    }
    if (filters.severity) {
        query.severity = { $gte: filters.severity };
    }
    if (filters.status) {
        query.status = filters.status;
    } else {
        // By default, exclude spam and invalid
        query.status = { $in: ["reported", "verified", "investigating", "resolved"] };
    }
    if (filters.since) {
        query.createdAt = { $gte: new Date(filters.since) };
    }

    return this.find(query).sort({ createdAt: -1 });
};

reportSchema.statics.getPendingForModeration = function (campusId) {
    return this.find({
        campusId,
        status: "reported",
    })
        .sort({ severity: -1, createdAt: -1 })
        .populate("reporterId", "name email");
};

const Report = mongoose.model("Report", reportSchema);

export default Report;
