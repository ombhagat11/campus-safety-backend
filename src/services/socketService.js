import { Server } from "socket.io";
import { verifyToken } from "../utils/jwt.js";
import User from "../db/schemas/User.js";

let io = null;

/**
 * Initialize Socket.io server
 */
export const initializeSocket = (httpServer) => {
    io = new Server(httpServer, {
        cors: {
            origin: process.env.FRONTEND_URL || "http://localhost:5173",
            credentials: true,
        },
    });

    // Authentication middleware for Socket.io
    io.use(async (socket, next) => {
        try {
            const token = socket.handshake.auth.token;

            if (!token) {
                return next(new Error("Authentication required"));
            }

            const decoded = verifyToken(token);
            const user = await User.findById(decoded.id);

            if (!user || !user.isActive) {
                return next(new Error("User not found or inactive"));
            }

            socket.userId = user._id;
            socket.campusId = user.campusId;
            socket.role = user.role;

            next();
        } catch (error) {
            next(new Error("Authentication failed"));
        }
    });

    io.on("connection", (socket) => {
        console.log(`✅ User connected: ${socket.userId} (Campus: ${socket.campusId})`);

        // Join campus room
        const campusRoom = `campus:${socket.campusId}`;
        socket.join(campusRoom);
        console.log(`User ${socket.userId} joined room: ${campusRoom}`);

        // Join role-specific room (for moderators/admins)
        if (["moderator", "admin", "super-admin"].includes(socket.role)) {
            const roleRoom = `${socket.role}:${socket.campusId}`;
            socket.join(roleRoom);
            console.log(`User ${socket.userId} joined role room: ${roleRoom}`);
        }

        // Handle location updates (for nearby reports)
        socket.on("update_location", (data) => {
            const { latitude, longitude } = data;
            // Store location in socket for proximity-based notifications
            socket.location = { latitude, longitude };
            console.log(`📍 Location updated for ${socket.userId}: ${latitude}, ${longitude}`);
        });

        // Handle typing indicators (for comments)
        socket.on("typing", (data) => {
            const { reportId } = data;
            socket.to(`report:${reportId}`).emit("user_typing", {
                userId: socket.userId,
                reportId,
            });
        });

        // Handle joining specific report room
        socket.on("join_report", (reportId) => {
            socket.join(`report:${reportId}`);
            console.log(`User ${socket.userId} joined report room: ${reportId}`);
        });

        // Handle leaving report room
        socket.on("leave_report", (reportId) => {
            socket.leave(`report:${reportId}`);
            console.log(`User ${socket.userId} left report room: ${reportId}`);
        });

        // Disconnect handler
        socket.on("disconnect", () => {
            console.log(`❌ User disconnected: ${socket.userId}`);
        });
    });

    console.log("✅ Socket.io server initialized");
    return io;
};

/**
 * Get Socket.io instance
 */
export const getIO = () => {
    if (!io) {
        throw new Error("Socket.io not initialized");
    }
    return io;
};

/**
 * Emit new report to campus
 */
export const emitNewReport = (campusId, report) => {
    if (!io) return;

    io.to(`campus:${campusId}`).emit("new_report", {
        type: "new_report",
        data: report,
        timestamp: new Date(),
    });

    console.log(`📢 Emitted new report to campus:${campusId}`);
};

/**
 * Emit report update to campus
 */
export const emitReportUpdate = (campusId, reportId, updates) => {
    if (!io) return;

    io.to(`campus:${campusId}`).emit("report_update", {
        type: "report_update",
        reportId,
        data: updates,
        timestamp: new Date(),
    });

    // Also emit to specific report room
    io.to(`report:${reportId}`).emit("report_update", {
        type: "report_update",
        reportId,
        data: updates,
        timestamp: new Date(),
    });

    console.log(`📢 Emitted report update: ${reportId}`);
};

/**
 * Emit moderator action to moderators/admins
 */
export const emitModeratorAction = (campusId, action) => {
    if (!io) return;

    io.to(`moderator:${campusId}`).emit("moderator_action", {
        type: "moderator_action",
        data: action,
        timestamp: new Date(),
    });

    io.to(`admin:${campusId}`).emit("moderator_action", {
        type: "moderator_action",
        data: action,
        timestamp: new Date(),
    });

    console.log(`📢 Emitted moderator action to campus:${campusId}`);
};

/**
 * Emit new comment to report watchers
 */
export const emitNewComment = (reportId, comment) => {
    if (!io) return;

    io.to(`report:${reportId}`).emit("new_comment", {
        type: "new_comment",
        reportId,
        data: comment,
        timestamp: new Date(),
    });

    console.log(`📢 Emitted new comment to report:${reportId}`);
};

/**
 * Emit system alert to campus
 */
export const emitSystemAlert = (campusId, alert) => {
    if (!io) return;

    io.to(`campus:${campusId}`).emit("system_alert", {
        type: "system_alert",
        data: alert,
        timestamp: new Date(),
    });

    console.log(`🚨 Emitted system alert to campus:${campusId}`);
};

export default {
    initializeSocket,
    getIO,
    emitNewReport,
    emitReportUpdate,
    emitModeratorAction,
    emitNewComment,
    emitSystemAlert,
};
