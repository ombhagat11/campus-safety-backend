import Joi from "joi";

// Get nearby reports validation
export const getNearbySchema = Joi.object({
    lat: Joi.number().min(-90).max(90).required(),
    lon: Joi.number().min(-180).max(180).required(),
    radius: Joi.number().min(100).max(10000).default(1000),
    category: Joi.string().valid(
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
    ).optional(),
    severity: Joi.number().min(1).max(5).optional(),
    status: Joi.string().valid("reported", "verified", "investigating", "resolved", "invalid", "spam").optional(),
    since: Joi.date().optional(),
    limit: Joi.number().min(1).max(500).default(100),
});

// Create report validation
export const createReportSchema = Joi.object({
    category: Joi.string()
        .valid(
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
        )
        .required(),
    severity: Joi.number().min(1).max(5).required(),
    title: Joi.string().trim().min(5).max(200).required(),
    description: Joi.string().trim().min(10).max(2000).required(),
    location: Joi.object({
        type: Joi.string().valid("Point").default("Point"),
        coordinates: Joi.array()
            .length(2)
            .items(Joi.number())
            .required()
            .messages({
                "array.length": "Coordinates must be [longitude, latitude]",
            }),
    }).required(),
    mediaUrls: Joi.array().items(Joi.string().uri()).max(10).default([]),
    isAnonymous: Joi.boolean().default(false),
});

// Update report validation
export const updateReportSchema = Joi.object({
    title: Joi.string().trim().min(5).max(200).optional(),
    description: Joi.string().trim().min(10).max(2000).optional(),
    category: Joi.string()
        .valid(
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
        )
        .optional(),
    severity: Joi.number().min(1).max(5).optional(),
    mediaUrls: Joi.array().items(Joi.string().uri()).max(10).optional(),
}).min(1); // At least one field must be provided

// Vote validation
export const voteSchema = Joi.object({
    vote: Joi.string().valid("confirm", "dispute").required(),
});

// Comment validation
export const commentSchema = Joi.object({
    content: Joi.string().trim().min(1).max(500).required(),
    isAnonymous: Joi.boolean().default(false),
});

export default {
    getNearbySchema,
    createReportSchema,
    updateReportSchema,
    voteSchema,
    commentSchema,
};
