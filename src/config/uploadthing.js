import { createUploadthing } from "uploadthing/express";
import env from "../config/env.js";

// Initialize UploadThing
const f = createUploadthing();

/**
 * UploadThing File Router
 * Defines upload endpoints and their configurations
 */
export const uploadRouter = {
    // Image uploader for reports
    reportImage: f({
        image: {
            maxFileSize: "4MB",
            maxFileCount: 5,
        },
    })
        .middleware(async ({ req }) => {
            // Authenticate user
            if (!req.userId) {
                throw new Error("Unauthorized");
            }

            // Return metadata to be available in onUploadComplete
            return {
                userId: req.userId,
                campusId: req.user?.campusId,
            };
        })
        .onUploadComplete(async ({ metadata, file }) => {
            console.log("✅ Upload complete for userId:", metadata.userId);
            console.log("📁 File URL:", file.url);

            // Return data to client
            return {
                uploadedBy: metadata.userId,
                url: file.url,
                key: file.key,
                name: file.name,
                size: file.size,
            };
        }),

    // Video uploader for reports
    reportVideo: f({
        video: {
            maxFileSize: "32MB",
            maxFileCount: 1,
        },
    })
        .middleware(async ({ req }) => {
            if (!req.userId) {
                throw new Error("Unauthorized");
            }

            return {
                userId: req.userId,
                campusId: req.user?.campusId,
            };
        })
        .onUploadComplete(async ({ metadata, file }) => {
            console.log("✅ Video upload complete for userId:", metadata.userId);
            console.log("📁 Video URL:", file.url);

            return {
                uploadedBy: metadata.userId,
                url: file.url,
                key: file.key,
                name: file.name,
                size: file.size,
            };
        }),

    // Profile picture uploader
    profilePicture: f({
        image: {
            maxFileSize: "2MB",
            maxFileCount: 1,
        },
    })
        .middleware(async ({ req }) => {
            if (!req.userId) {
                throw new Error("Unauthorized");
            }

            return {
                userId: req.userId,
            };
        })
        .onUploadComplete(async ({ metadata, file }) => {
            console.log("✅ Profile picture uploaded for userId:", metadata.userId);
            console.log("📁 File URL:", file.url);

            return {
                uploadedBy: metadata.userId,
                url: file.url,
                key: file.key,
            };
        }),
};

export default uploadRouter;
