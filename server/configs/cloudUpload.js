import { v2 as cloudinary } from "cloudinary";
import fs from "fs";
import path from "path";
import imagekit from "./imageKit.js";

const hasCloudinaryConfig = Boolean(
    process.env.CLOUDINARY_CLOUD_NAME &&
    process.env.CLOUDINARY_API_KEY &&
    process.env.CLOUDINARY_API_SECRET
);

const hasImageKitConfig = Boolean(
    process.env.IMAGEKIT_PUBLIC_KEY &&
    process.env.IMAGEKIT_PRIVATE_KEY &&
    process.env.IMAGEKIT_URL_ENDPOINT &&
    !process.env.IMAGEKIT_PUBLIC_KEY.includes("Enter your IMAGEKIT") &&
    !process.env.IMAGEKIT_PRIVATE_KEY.includes("Enter your IMAGEKIT") &&
    !process.env.IMAGEKIT_URL_ENDPOINT.includes("Enter your IMAGEKIT")
);

if (hasCloudinaryConfig) {
    cloudinary.config({
        cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
        api_key: process.env.CLOUDINARY_API_KEY,
        api_secret: process.env.CLOUDINARY_API_SECRET
    });
}

export const uploadImage = async ({file, folder, width = 1280}) => {
    if (hasCloudinaryConfig) {
        const response = await cloudinary.uploader.upload(file.path, {
            folder,
            resource_type: "image",
            transformation: [{width, crop: "limit"}, {quality: "auto"}, {fetch_format: "auto"}]
        });
        return response.secure_url;
    }

    if (hasImageKitConfig) {
        const fileBuffer = fs.readFileSync(file.path);
        const response = await imagekit.upload({
            file: fileBuffer,
            fileName: file.originalname,
            folder: `/${folder}`
        });

        return imagekit.url({
            path : response.filePath,
            transformation : [{width: String(width)}, {quality: 'auto'}, { format: 'webp' }]
        });
    }

    const uploadDir = path.resolve("uploads", folder);
    fs.mkdirSync(uploadDir, {recursive: true});
    const extension = path.extname(file.originalname) || ".jpg";
    const fileName = `${Date.now()}-${Math.round(Math.random() * 1e9)}${extension}`;
    const targetPath = path.join(uploadDir, fileName);
    fs.copyFileSync(file.path, targetPath);
    const baseUrl = process.env.PUBLIC_API_URL || `http://localhost:${process.env.PORT || 3000}`;
    return `${baseUrl}/uploads/${folder}/${fileName}`;
};
