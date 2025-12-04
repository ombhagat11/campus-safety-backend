import env from "../config/env.js";

/**
 * Submit contact/pilot request
 * POST /public/contact
 */
export const submitContactForm = async (req, res) => {
    try {
        const { name, email, institutionName, role, message, phoneNumber } = req.body;

        // TODO: Store in database or send to admin email
        console.log("📧 Contact form submission:", {
            name,
            email,
            institutionName,
            role,
            message,
            phoneNumber,
        });

        // TODO: Send notification email to admin
        // await emailService.sendContactNotification({...});

        res.status(201).json({
            success: true,
            message: "Thank you for your interest! We'll get back to you soon.",
        });
    } catch (error) {
        console.error("Submit contact form error:", error);
        res.status(500).json({
            success: false,
            message: "Failed to submit form. Please try again later.",
            error: env.nodeEnv === "development" ? error.message : undefined,
        });
    }
};

/**
 * Get public campus information
 * GET /public/campus/:code
 */
export const getPublicCampusInfo = async (req, res) => {
    try {
        const { code } = req.params;

        const Campus = (await import("../db/schemas/Campus.js")).default;

        const campus = await Campus.findOne({ code: code.toUpperCase(), isActive: true }).select(
            "name code description stats contact"
        );

        if (!campus) {
            return res.status(404).json({
                success: false,
                message: "Campus not found",
            });
        }

        res.json({
            success: true,
            data: { campus },
        });
    } catch (error) {
        console.error("Get public campus info error:", error);
        res.status(500).json({
            success: false,
            message: "Failed to get campus information",
            error: env.nodeEnv === "development" ? error.message : undefined,
        });
    }
};

/**
 * Get public statistics
 * GET /public/stats
 */
export const getPublicStats = async (req, res) => {
    try {
        const Campus = (await import("../db/schemas/Campus.js")).default;
        const Report = (await import("../db/schemas/Report.js")).default;

        const [totalCampuses, totalReports, activeCampuses] = await Promise.all([
            Campus.countDocuments({}),
            Report.countDocuments({ status: "resolved" }),
            Campus.countDocuments({ isActive: true }),
        ]);

        res.json({
            success: true,
            data: {
                totalCampuses,
                totalReports,
                activeCampuses,
                resolvedIncidents: totalReports,
            },
        });
    } catch (error) {
        console.error("Get public stats error:", error);
        res.status(500).json({
            success: false,
            message: "Failed to get statistics",
            error: env.nodeEnv === "development" ? error.message : undefined,
        });
    }
};

export default {
    submitContactForm,
    getPublicCampusInfo,
    getPublicStats,
};
