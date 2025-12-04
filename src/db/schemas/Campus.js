import mongoose from "mongoose";

const campusSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: [true, "Campus name is required"],
            trim: true,
            unique: true,
            maxlength: [200, "Campus name cannot exceed 200 characters"],
        },
        code: {
            type: String,
            required: [true, "Campus code is required"],
            unique: true,
            uppercase: true,
            trim: true,
            minlength: [4, "Campus code must be at least 4 characters"],
            maxlength: [20, "Campus code cannot exceed 20 characters"],
            match: [/^[A-Z0-9-]+$/, "Campus code can only contain uppercase letters, numbers, and hyphens"],
        },
        description: {
            type: String,
            maxlength: [1000, "Description cannot exceed 1000 characters"],
        },
        // GeoJSON boundary - defines the campus area
        boundaries: {
            type: {
                type: String,
                enum: ["Polygon", "MultiPolygon"],
                default: "Polygon",
            },
            coordinates: {
                type: [[[Number]]], // Array of LinearRings
                required: true,
            },
        },
        // Center point for map display
        center: {
            type: {
                type: String,
                enum: ["Point"],
                default: "Point",
            },
            coordinates: {
                type: [Number], // [longitude, latitude]
                required: true,
            },
        },
        // Campus-specific settings
        settings: {
            // Notification radius in meters
            notificationRadius: {
                type: Number,
                default: 500,
                min: [100, "Notification radius must be at least 100 meters"],
                max: [5000, "Notification radius cannot exceed 5000 meters"],
            },
            // Minimum severity for immediate push (1-5)
            minSeverityForPush: {
                type: Number,
                default: 4,
                min: 1,
                max: 5,
            },
            // Rate limiting per user
            reportsPerHour: {
                type: Number,
                default: 5,
                min: 1,
                max: 20,
            },
            // Reports require moderation before appearing
            requireModeration: {
                type: Boolean,
                default: false,
            },
            // Allow anonymous reporting
            allowAnonymous: {
                type: Boolean,
                default: true,
            },
        },
        // Contact information
        contact: {
            email: {
                type: String,
                match: [/^\S+@\S+\.\S+$/, "Please provide a valid email"],
            },
            phone: String,
            website: String,
            address: String,
        },
        // Status
        isActive: {
            type: Boolean,
            default: true,
            index: true,
        },
        isPilot: {
            type: Boolean,
            default: false,
        },
        // Statistics (cached)
        stats: {
            totalUsers: {
                type: Number,
                default: 0,
            },
            totalReports: {
                type: Number,
                default: 0,
            },
            totalModerators: {
                type: Number,
                default: 0,
            },
        },
    },
    {
        timestamps: true,
        toJSON: { virtuals: true },
    }
);

// Indexes
// campusSchema.index({ code: 1 }, { unique: true }); // Already defined in schema
campusSchema.index({ boundaries: "2dsphere" });
campusSchema.index({ center: "2dsphere" });
// campusSchema.index({ isActive: 1 }); // Already defined in schema

// Virtual for users
campusSchema.virtual("users", {
    ref: "User",
    localField: "_id",
    foreignField: "campusId",
});

// Instance methods
campusSchema.methods.isPointInBoundary = function (longitude, latitude) {
    // Would need turf.js or similar for proper point-in-polygon check
    // For now, return true (implement proper check in production)
    return true;
};

campusSchema.methods.incrementUserCount = async function () {
    this.stats.totalUsers += 1;
    await this.save();
};

campusSchema.methods.incrementReportCount = async function () {
    this.stats.totalReports += 1;
    await this.save();
};

// Static methods
campusSchema.statics.findByCode = function (code) {
    return this.findOne({ code: code.toUpperCase(), isActive: true });
};

campusSchema.statics.findNearPoint = function (longitude, latitude, maxDistance = 10000) {
    return this.find({
        center: {
            $near: {
                $geometry: {
                    type: "Point",
                    coordinates: [longitude, latitude],
                },
                $maxDistance: maxDistance, // in meters
            },
        },
        isActive: true,
    });
};

const Campus = mongoose.model("Campus", campusSchema);

export default Campus;
