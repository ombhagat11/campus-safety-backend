import dotenv from "dotenv";

dotenv.config();

const env = {
    // Server
    nodeEnv: process.env.NODE_ENV || "development",
    port: parseInt(process.env.PORT || "5000", 10),

    // Database
    mongoUri: process.env.MONGODB_URI || "mongodb://localhost:27017/campus-safety",
    mongoTestUri: process.env.MONGODB_TEST_URI || "mongodb://localhost:27017/campus-safety-test",

    // Redis
    redis: {
        host: process.env.REDIS_HOST || "localhost",
        port: parseInt(process.env.REDIS_PORT || "6379", 10),
        password: process.env.REDIS_PASSWORD || undefined,
    },

    // JWT
    jwt: {
        secret: process.env.JWT_SECRET || "dev-secret-key",
        accessExpiry: process.env.JWT_ACCESS_EXPIRY || "15m",
        refreshExpiry: process.env.JWT_REFRESH_EXPIRY || "7d",
    },

    // AWS S3 (Legacy - replaced by UploadThing)
    aws: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
        bucketName: process.env.AWS_BUCKET_NAME || "campus-safety-media",
        region: process.env.AWS_REGION || "us-east-1",
    },

    // UploadThing
    uploadthing: {
        apiKey: process.env.UPLOADTHING_SECRET,
        appId: process.env.UPLOADTHING_APP_ID,
    },

    // Firebase
    fcm: {
        serviceAccountPath: process.env.FCM_SERVICE_ACCOUNT_PATH || "./config/fcm-service-account.json",
    },

    // Mapbox
    mapbox: {
        accessToken: process.env.MAPBOX_ACCESS_TOKEN,
    },

    // Email
    email: {
        service: process.env.EMAIL_SERVICE || "smtp",
        host: process.env.EMAIL_HOST,
        port: parseInt(process.env.EMAIL_PORT || "587", 10),
        user: process.env.EMAIL_USER,
        password: process.env.EMAIL_PASSWORD,
        from: process.env.EMAIL_FROM || "noreply@campussafety.com",
    },

    // Rate Limiting
    rateLimit: {
        reportsPerHour: parseInt(process.env.RATE_LIMIT_REPORTS_PER_HOUR || "5", 10),
        windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || "3600000", 10),
    },

    // Notifications
    notifications: {
        defaultRadius: parseInt(process.env.DEFAULT_NOTIFICATION_RADIUS || "500", 10),
        minSeverityForPush: parseInt(process.env.MINIMUM_SEVERITY_FOR_PUSH || "4", 10),
    },

    // Frontend
    frontendUrl: process.env.FRONTEND_URL || "http://localhost:5173",

    // Admin
    admin: {
        requireModeratorsBeforePublicSignup: process.env.REQUIRE_MODERATORS_BEFORE_PUBLIC_SIGNUP === "true",
        minimumModeratorsCount: parseInt(process.env.MINIMUM_MODERATORS_COUNT || "3", 10),
    },
};

// Validation in production
if (env.nodeEnv === "production") {
    const required = [
        "JWT_SECRET",
        "MONGODB_URI",
        "AWS_ACCESS_KEY_ID",
        "AWS_SECRET_ACCESS_KEY",
        "MAPBOX_ACCESS_TOKEN",
    ];

    const missing = required.filter((key) => !process.env[key]);
    if (missing.length > 0) {
        throw new Error(`Missing required environment variables: ${missing.join(", ")}`);
    }
}

export default env;
