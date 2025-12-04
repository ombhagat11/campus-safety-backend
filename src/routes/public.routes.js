import express from "express";
import {
    submitContactForm,
    getPublicCampusInfo,
    getPublicStats,
} from "../controllers/public.controller.js";
import { validate } from "../middlewares/validate.js";
import Joi from "joi";

const router = express.Router();

// Validation schemas
const contactFormSchema = Joi.object({
    name: Joi.string().trim().min(2).max(100).required(),
    email: Joi.string().email().required(),
    institutionName: Joi.string().trim().min(2).max(200).required(),
    role: Joi.string().valid("administrator", "security", "it", "other").required(),
    message: Joi.string().trim().min(10).max(1000).required(),
    phoneNumber: Joi.string().trim().optional(),
});

/**
 * @route   POST /public/contact
 * @desc    Submit contact/pilot request form
 * @access  Public
 */
router.post("/contact", validate(contactFormSchema), submitContactForm);

/**
 * @route   GET /public/campus/:code
 * @desc    Get public campus information
 * @access  Public
 */
router.get("/campus/:code", getPublicCampusInfo);

/**
 * @route   GET /public/stats
 * @desc    Get public platform statistics
 * @access  Public
 */
router.get("/stats", getPublicStats);

export default router;
