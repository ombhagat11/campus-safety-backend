import express from "express";
import cors from "cors";
import helmet from "helmet";
import cookieParser from "cookie-parser";
import { createServer } from "http";

// Import environment config
import env from "./config/env.js";

// Import routes
import authRoutes from "./routes/auth.routes.js";
import reportsRoutes from "./routes/reports.routes.js";
import usersRoutes from "./routes/users.routes.js";
import uploadsRoutes from "./routes/uploads.routes.js";
import moderationRoutes from "./routes/moderation.routes.js";
import adminRoutes from "./routes/admin.routes.js";
import publicRoutes from "./routes/public.routes.js";

// Import middleware
import { errorHandler, notFoundHandler } from "./middlewares/errorHandler.js";
import { apiLimiter, authLimiter, reportLimiter } from "./middlewares/rateLimiter.js";

// Import services
import { initializeSocket } from "./services/socketService.js";
import { verifyEmailConfig } from "./services/emailService.js";

// Import database
import connectDB from "./db/connection.js";

const app = express();
const httpServer = createServer(app);

// Initialize Socket.io
const io = initializeSocket(httpServer);

// Security middleware
app.use(helmet());

// CORS configuration
app.use(
  cors({
    origin: env.frontendUrl,
    credentials: true,
  })
);

// Body parsing middleware
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// Cookie parser
app.use(cookieParser());

// Apply global rate limiting
app.use("/api/", apiLimiter);

// Request logging in development
if (env.nodeEnv === "development") {
  app.use((req, res, next) => {
    console.log(`${req.method} ${req.path}`);
    next();
  });
}

// Connect to database
connectDB();

// Verify email service (non-blocking)
verifyEmailConfig().catch((err) => console.warn("Email service not configured:", err.message));

// Health check
app.get("/health", (req, res) => {
  res.json({
    status: "OK",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: env.nodeEnv,
  });
});

// Root route
app.get("/", (req, res) => {
  res.json({
    message: "Campus Safety API",
    version: "1.0.0",
    docs: "/api-docs",
  });
});

// API routes with rate limiting
app.use("/auth", authLimiter, authRoutes);
app.use("/reports", reportsRoutes);
app.use("/users", usersRoutes);
app.use("/uploads", uploadsRoutes);
app.use("/moderation", moderationRoutes);
app.use("/admin", adminRoutes);
app.use("/public", publicRoutes);

// 404 handler
app.use(notFoundHandler);

// Error handler (must be last)
app.use(errorHandler);

// Export both app and httpServer
export { io };
export default httpServer;
