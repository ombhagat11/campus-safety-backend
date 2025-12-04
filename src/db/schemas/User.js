import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: [true, "Name is required"],
            trim: true,
            maxlength: [100, "Name cannot exceed 100 characters"],
        },
        email: {
            type: String,
            required: [true, "Email is required"],
            unique: true,
            lowercase: true,
            trim: true,
            match: [/^\S+@\S+\.\S+$/, "Please provide a valid email"],
        },
        passwordHash: {
            type: String,
            required: [true, "Password is required"],
            select: false, // Don't return password by default
        },
        phone: {
            type: String,
            trim: true,
            match: [/^\+?[\d\s-()]+$/, "Please provide a valid phone number"],
        },
        campusId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Campus",
            required: [true, "Campus is required"],
            index: true,
        },
        role: {
            type: String,
            enum: ["student", "moderator", "admin", "security", "super-admin"],
            default: "student",
            index: true,
        },
        isVerified: {
            type: Boolean,
            default: false,
        },
        verificationToken: {
            type: String,
            select: false,
        },
        verificationTokenExpiry: {
            type: Date,
            select: false,
        },
        resetToken: {
            type: String,
            select: false,
        },
        resetTokenExpiry: {
            type: Date,
            select: false,
        },
        // OTP for email verification
        emailOTP: {
            type: String,
            select: false,
        },
        emailOTPExpiry: {
            type: Date,
            select: false,
        },
        // OTP for password reset
        resetOTP: {
            type: String,
            select: false,
        },
        resetOTPExpiry: {
            type: Date,
            select: false,
        },
        lastLoginAt: {
            type: Date,
        },
        isActive: {
            type: Boolean,
            default: true,
        },
        isBanned: {
            type: Boolean,
            default: false,
        },
        bannedReason: {
            type: String,
        },
        bannedAt: {
            type: Date,
        },
        // Notification preferences
        notificationPreferences: {
            radius: {
                type: Number,
                default: 500, // meters
            },
            categories: {
                type: [String],
                default: ["safety", "emergency", "theft", "suspicious", "other"],
            },
            enablePush: {
                type: Boolean,
                default: true,
            },
            enableEmail: {
                type: Boolean,
                default: true,
            },
        },
        // Privacy settings
        isAnonymousByDefault: {
            type: Boolean,
            default: false,
        },
    },
    {
        timestamps: true,
        toJSON: {
            virtuals: true,
            transform: function (doc, ret) {
                delete ret.passwordHash;
                delete ret.verificationToken;
                delete ret.resetToken;
                return ret;
            },
        },
    }
);

// Indexes for performance
// userSchema.index({ email: 1 }, { unique: true }); // Already defined in schema
userSchema.index({ campusId: 1, role: 1 });
userSchema.index({ isActive: 1, isBanned: 1 });

// Virtual for user's reports
userSchema.virtual("reports", {
    ref: "Report",
    localField: "_id",
    foreignField: "reporterId",
});

// Instance methods
userSchema.methods.toSafeObject = function () {
    const obj = this.toObject();
    delete obj.passwordHash;
    delete obj.verificationToken;
    delete obj.resetToken;
    return obj;
};

userSchema.methods.hasRole = function (roles) {
    if (typeof roles === "string") {
        return this.role === roles;
    }
    return roles.includes(this.role);
};

userSchema.methods.canModerate = function () {
    return ["moderator", "admin", "super-admin"].includes(this.role);
};

userSchema.methods.canAdmin = function () {
    return ["admin", "super-admin"].includes(this.role);
};

const User = mongoose.model("User", userSchema);

export default User;
