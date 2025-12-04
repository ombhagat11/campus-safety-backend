import mongoose from "mongoose";
import env from "../config/env.js";

const connectDB = async (retries = 5) => {
    const uri = env.nodeEnv === "test" ? env.mongoTestUri : env.mongoUri;

    try {
        const conn = await mongoose.connect(uri, {
            maxPoolSize: 10,
            minPoolSize: 2,
            socketTimeoutMS: 45000,
            serverSelectionTimeoutMS: 5000,
        });

        console.log(`✔ MongoDB Connected: ${conn.connection.host}`);

        // Create geospatial indexes
        await createGeospatialIndexes();

        return conn;
    } catch (error) {
        console.error(`✖ MongoDB connection error:`, error.message);

        if (retries > 0) {
            console.log(`⏳ Retrying connection... (${retries} attempts remaining)`);
            await new Promise((resolve) => setTimeout(resolve, 5000));
            return connectDB(retries - 1);
        } else {
            throw new Error("Failed to connect to MongoDB after multiple attempts");
        }
    }
};

const createGeospatialIndexes = async () => {
    try {
        // Import Report model (will be created later)
        const Report = mongoose.models.Report || (await import("../db/schemas/Report.js")).default;

        // Create 2dsphere index for location field
        await Report.collection.createIndex({ location: "2dsphere" });
        console.log("✔ Geospatial index created for Report.location");

        // Create compound index for campus + location queries
        await Report.collection.createIndex({ campusId: 1, location: "2dsphere" });
        console.log("✔ Compound index created for campus + location");

    } catch (error) {
        // Silently fail if models don't exist yet (during initial setup)
        if (error.message.includes("Cannot find module")) {
            console.log("⚠ Report model not found yet, skipping index creation");
        } else {
            console.error("✖ Error creating geospatial indexes:", error.message);
        }
    }
};

const disconnectDB = async () => {
    try {
        await mongoose.disconnect();
        console.log("✔ MongoDB Disconnected");
    } catch (error) {
        console.error("✖ Error disconnecting from MongoDB:", error.message);
        throw error;
    }
};

// Handle connection events
mongoose.connection.on("connected", () => {
    console.log("📡 Mongoose connected to MongoDB");
});

mongoose.connection.on("error", (err) => {
    console.error("📡 Mongoose connection error:", err);
});

mongoose.connection.on("disconnected", () => {
    console.log("📡 Mongoose disconnected from MongoDB");
});

// Graceful shutdown
process.on("SIGINT", async () => {
    await disconnectDB();
    process.exit(0);
});

export { connectDB, disconnectDB };
export default connectDB;
