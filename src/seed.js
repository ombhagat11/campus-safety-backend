import mongoose from "mongoose";
import connectDB, { disconnectDB } from "./db/connection.js";
import Campus from "./db/schemas/Campus.js";
import User from "./db/schemas/User.js";
import { hashPassword } from "./utils/password.js";

/**
 * Seed database with initial data for testing
 */
async function seed() {
    try {
        console.log("🌱 Starting database seed...");

        // Connect to database
        await connectDB();

        // Clear existing data (optional - comment out if you want to keep existing data)
        console.log("🧹 Clearing existing data...");
        await Campus.deleteMany({});
        await User.deleteMany({});

        // Create sample campus
        console.log("🏫 Creating sample campus...");
        const campus = await Campus.create({
            name: "Test University",
            code: "TEST-U",
            description: "Test university for development",
            boundaries: {
                type: "Polygon",
                coordinates: [
                    [
                        [-122.4194, 37.7749], // San Francisco area (example)
                        [-122.4194, 37.8049],
                        [-122.3894, 37.8049],
                        [-122.3894, 37.7749],
                        [-122.4194, 37.7749], // Close the polygon
                    ],
                ],
            },
            center: {
                type: "Point",
                coordinates: [-122.4044, 37.7899], // Center of the campus
            },
            settings: {
                notificationRadius: 500,
                minSeverityForPush: 4,
                reportsPerHour: 5,
                requireModeration: false,
                allowAnonymous: true,
            },
            contact: {
                email: "admin@test-university.edu",
                phone: "+1-555-0100",
                website: "https://test-university.edu",
            },
            isActive: true,
            isPilot: true,
        });

        console.log(`✅ Created campus: ${campus.name} (${campus.code})`);

        // Create admin user
        console.log("👤 Creating admin user...");
        const adminPassword = await hashPassword("Admin@123456");
        const adminUser = await User.create({
            name: "Admin User",
            email: "admin@test-university.edu",
            passwordHash: adminPassword,
            campusId: campus._id,
            role: "admin",
            isVerified: true,
            isActive: true,
        });

        console.log(`✅ Admin created: ${adminUser.email} / Admin@123456`);

        // Create moderator user
        console.log("👮 Creating moderator user...");
        const modPassword = await hashPassword("Mod@123456");
        const moderator = await User.create({
            name: "Moderator User",
            email: "moderator@test-university.edu",
            passwordHash: modPassword,
            campusId: campus._id,
            role: "moderator",
            isVerified: true,
            isActive: true,
        });

        console.log(`✅ Moderator created: ${moderator.email} / Mod@123456`);

        // Create test student user
        console.log("🎓 Creating test student...");
        const studentPassword = await hashPassword("Student@123456");
        const student = await User.create({
            name: "Test Student",
            email: "student@test-university.edu",
            passwordHash: studentPassword,
            campusId: campus._id,
            role: "student",
            isVerified: true,
            isActive: true,
        });

        console.log(`✅ Student created: ${student.email} / Student@123456`);

        // Update campus stats
        campus.stats.totalUsers = 3;
        campus.stats.totalModerators = 1;
        await campus.save();

        console.log("\n🎉 Database seeding completed successfully!");
        console.log("\n📝 Login Credentials:");
        console.log("================================");
        console.log("Campus Code: TEST-U");
        console.log("\nAdmin:");
        console.log("  Email: admin@test-university.edu");
        console.log("  Password: Admin@123456");
        console.log("\nModerator:");
        console.log("  Email: moderator@test-university.edu");
        console.log("  Password: Mod@123456");
        console.log("\nStudent:");
        console.log("  Email: student@test-university.edu");
        console.log("  Password: Student@123456");
        console.log("================================\n");

    } catch (error) {
        console.error("❌ Error seeding database:", error);
        throw error;
    } finally {
        await disconnectDB();
        process.exit(0);
    }
}

// Run seed
seed();
