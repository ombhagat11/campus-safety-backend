import express from "express";
import { createRouteHandler } from "uploadthing/express";
import { prepareUpload, deleteFile, deleteMultipleFiles, getFileInfo } from "../controllers/uploads.controller.js";
import { authenticate } from "../middlewares/auth.js";
import { uploadRouter } from "../config/uploadthing.js";

const router = express.Router();

/**
 * UploadThing route handler
 * This handles the actual file uploads
 */
router.use(
    "/uploadthing",
    createRouteHandler({
        router: uploadRouter,
        config: {
            // Custom authentication middleware
            middleware: authenticate,
        },
    })
);

/**
 * @route   POST /uploads/prepare
 * @desc    Prepare upload and validate file
 * @access  Private
 */
router.post("/prepare", authenticate, prepareUpload);

/**
 * @route   DELETE /uploads/delete
 * @desc    Delete file from UploadThing
 * @access  Private
 */
router.delete("/delete", authenticate, deleteFile);

/**
 * @route   DELETE /uploads/delete-multiple
 * @desc    Delete multiple files from UploadThing
 * @access  Private
 */
router.delete("/delete-multiple", authenticate, deleteMultipleFiles);

/**
 * @route   GET /uploads/info/:fileKey
 * @desc    Get file information
 * @access  Private
 */
router.get("/info/:fileKey", authenticate, getFileInfo);

export default router;
