import Joi from "joi";

// Register validation
export const registerSchema = Joi.object({
    name: Joi.string().trim().min(2).max(100).required().messages({
        "string.empty": "Name is required",
        "string.min": "Name must be at least 2 characters",
        "string.max": "Name cannot exceed 100 characters",
    }),
    email: Joi.string().email().lowercase().trim().required().messages({
        "string.empty": "Email is required",
        "string.email": "Please provide a valid email address",
    }),
    password: Joi.string().min(8).max(128).required().messages({
        "string.empty": "Password is required",
        "string.min": "Password must be at least 8 characters",
        "string.max": "Password cannot exceed 128 characters",
    }),
    campusCode: Joi.string().uppercase().trim().min(4).max(20).required().messages({
        "string.empty": "Campus code is required",
        "string.min": "Campus code must be at least 4 characters",
    }),
    phone: Joi.string().trim().pattern(/^\+?[\d\s-()]+$/).allow("").optional().messages({
        "string.pattern.base": "Please provide a valid phone number",
    }),
});

// Login validation
export const loginSchema = Joi.object({
    email: Joi.string().email().lowercase().trim().required().messages({
        "string.empty": "Email is required",
        "string.email": "Please provide a valid email address",
    }),
    password: Joi.string().required().messages({
        "string.empty": "Password is required",
    }),
});

// Refresh token validation
export const refreshTokenSchema = Joi.object({
    refreshToken: Joi.string().required().messages({
        "string.empty": "Refresh token is required",
    }),
});

// Forgot password validation
export const forgotPasswordSchema = Joi.object({
    email: Joi.string().email().lowercase().trim().required().messages({
        "string.empty": "Email is required",
        "string.email": "Please provide a valid email address",
    }),
});

// Reset password validation
export const resetPasswordSchema = Joi.object({
    token: Joi.string().required().messages({
        "string.empty": "Reset token is required",
    }),
    password: Joi.string().min(8).max(128).required().messages({
        "string.empty": "Password is required",
        "string.min": "Password must be at least 8 characters",
        "string.max": "Password cannot exceed 128 characters",
    }),
});

// Email verification validation
export const verifyEmailSchema = Joi.object({
    token: Joi.string().required().messages({
        "string.empty": "Verification token is required",
    }),
});

// Change password validation
export const changePasswordSchema = Joi.object({
    currentPassword: Joi.string().required().messages({
        "string.empty": "Current password is required",
    }),
    newPassword: Joi.string().min(8).max(128).required().messages({
        "string.empty": "New password is required",
        "string.min": "Password must be at least 8 characters",
        "string.max": "Password cannot exceed 128 characters",
    }),
});

/**
 * Validation middleware factory
 * @param {Joi.Schema} schema - Joi validation schema
 * @param {string} property - Property to validate (body, params, query)
 */
export const validate = (schema, property = "body") => {
    return (req, res, next) => {
        console.log(`[Validation] Validating ${property}:`, JSON.stringify(req[property], null, 2));

        const { error, value } = schema.validate(req[property], {
            abortEarly: false,
            stripUnknown: true,
        });

        if (error) {
            console.error(`[Validation] Validation failed for ${property}:`, error.details);

            const errors = error.details.map((detail) => ({
                field: detail.path.join("."),
                message: detail.message,
            }));

            return res.status(400).json({
                success: false,
                message: "Validation failed",
                errors,
            });
        }

        // Replace request property with validated value
        if (property === "query") {
            // req.query might be a getter-only in some environments
            // We can't replace the object, but we can assign properties
            Object.assign(req.query, value);
        } else {
            req[property] = value;
        }
        next();
    };
};

export default {
    registerSchema,
    loginSchema,
    refreshTokenSchema,
    forgotPasswordSchema,
    resetPasswordSchema,
    verifyEmailSchema,
    changePasswordSchema,
    validate,
};
