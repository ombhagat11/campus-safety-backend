import { UTApi } from "uploadthing/server";
import env from "../config/env.js";

// Initialize UploadThing API
const utapi = new UTApi({
    apiKey: env.uploadthing?.apiKey,
});

/**
 * Get upload URL and metadata
 * This endpoint is called before uploading to get the upload URL
 * POST /uploads/prepare
 */
export const prepareUpload = async (req, res) => {
    try {
        const { fileName, fileType, fileSize, uploadType = "reportImage" } = req.body;

        if (!fileName || !fileType) {
            return res.status(400).json({
                success: false,
                message: "fileName and fileType are required",
            });
        }

        // Validate file type
        const allowedImageTypes = ["image/jpeg", "image/jpg", "image/png", "image/gif", "image/webp"];
        const allowedVideoTypes = ["video/mp4", "video/quicktime", "video/webm"];
        const allowedTypes = [...allowedImageTypes, ...allowedVideoTypes];

        if (!allowedTypes.includes(fileType)) {
            return res.status(400).json({
                success: false,
                message: "File type not allowed. Only images and videos are permitted.",
            });
        }

        // Validate file size based on type
        let maxSize;
        if (uploadType === "profilePicture") {
            maxSize = 2 * 1024 * 1024; // 2MB
        } else if (allowedVideoTypes.includes(fileType)) {
            maxSize = 32 * 1024 * 1024; // 32MB
        } else {
            maxSize = 4 * 1024 * 1024; // 4MB
        }

        if (fileSize && fileSize > maxSize) {
            return res.status(400).json({
                success: false,
                message: `File size exceeds maximum allowed (${maxSize / (1024 * 1024)}MB)`,
            });
        }

        // Return upload configuration
        // The actual upload will be handled by UploadThing on the frontend
        res.json({
            success: true,
            data: {
                uploadType,
                maxSize,
                allowedTypes: allowedTypes,
                endpoint: `/api/uploadthing`, // UploadThing endpoint
            },
        });
    } catch (error) {
        console.error("Prepare upload error:", error);
        res.status(500).json({
            success: false,
            message: "Failed to prepare upload",
            error: env.nodeEnv === "development" ? error.message : undefined,
        });
    }
};

/**
 * Delete file from UploadThing
 * DELETE /uploads/delete
 */
export const deleteFile = async (req, res) => {
    try {
        const { fileKey } = req.body;

        if (!fileKey) {
            return res.status(400).json({
                success: false,
                message: "fileKey is required",
            });
        }

        // Delete file from UploadThing
        await utapi.deleteFiles(fileKey);

        res.json({
            success: true,
            message: "File deleted successfully",
        });
    } catch (error) {
        console.error("Delete file error:", error);
        res.status(500).json({
            success: false,
            message: "Failed to delete file",
            error: env.nodeEnv === "development" ? error.message : undefined,
        });
    }
};

/**
 * Delete multiple files from UploadThing
 * DELETE /uploads/delete-multiple
 */
export const deleteMultipleFiles = async (req, res) => {
    try {
        const { fileKeys } = req.body;

        if (!fileKeys || !Array.isArray(fileKeys) || fileKeys.length === 0) {
            return res.status(400).json({
                success: false,
                message: "fileKeys array is required",
            });
        }

        // Delete files from UploadThing
        await utapi.deleteFiles(fileKeys);

        res.json({
            success: true,
            message: `${fileKeys.length} file(s) deleted successfully`,
        });
    } catch (error) {
        console.error("Delete multiple files error:", error);
        res.status(500).json({
            success: false,
            message: "Failed to delete files",
            error: env.nodeEnv === "development" ? error.message : undefined,
        });
    }
};

/**
 * Get file info from UploadThing
 * GET /uploads/info/:fileKey
 */
export const getFileInfo = async (req, res) => {
    try {
        const { fileKey } = req.params;

        if (!fileKey) {
            return res.status(400).json({
                success: false,
                message: "fileKey is required",
            });
        }

        // Get file info from UploadThing
        const fileData = await utapi.getFileUrls(fileKey);

        res.json({
            success: true,
            data: fileData,
        });
    } catch (error) {
        console.error("Get file info error:", error);
        res.status(500).json({
            success: false,
            message: "Failed to get file info",
            error: env.nodeEnv === "development" ? error.message : undefined,
        });
    }
};

export default {
    prepareUpload,
    deleteFile,
    deleteMultipleFiles,
    getFileInfo,
};
