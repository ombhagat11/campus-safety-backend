import mongoose from "mongoose";

const deviceSchema = new mongoose.Schema(
    {
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: [true, "User is required"],
            index: true,
        },
        token: {
            type: String,
            required: [true, "Device token is required"],
            unique: true,
        },
        platform: {
            type: String,
            required: [true, "Platform is required"],
            enum: ["ios", "android", "web"],
        },
        deviceInfo: {
            model: String,
            os: String,
            appVersion: String,
        },
        isActive: {
            type: Boolean,
            default: true,
            index: true,
        },
        lastUsedAt: {
            type: Date,
            default: Date.now,
        },
    },
    {
        timestamps: true,
    }
);

// Indexes
deviceSchema.index({ userId: 1, isActive: 1 });
// deviceSchema.index({ token: 1 }, { unique: true }); // Already defined in schema

// Instance methods
deviceSchema.methods.updateLastUsed = async function () {
    this.lastUsedAt = new Date();
    await this.save();
};

deviceSchema.methods.deactivate = async function () {
    this.isActive = false;
    await this.save();
};

// Static methods
deviceSchema.statics.findActiveByUser = function (userId) {
    return this.find({ userId, isActive: true });
};

deviceSchema.statics.deactivateOldDevices = async function (daysOld = 90) {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysOld);

    await this.updateMany(
        { lastUsedAt: { $lt: cutoffDate }, isActive: true },
        { $set: { isActive: false } }
    );
};

const Device = mongoose.model("Device", deviceSchema);

export default Device;
