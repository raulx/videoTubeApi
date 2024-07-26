import { v2 as cloudinary } from "cloudinary";
import fs from "fs";

import { ApiError } from "./ApiError.js";

const uploadOnCloudinary = async (localFilePath) => {
    try {
        if (!localFilePath) return null;
        //upload the file on cloudinary
        const response = await cloudinary.uploader.upload(localFilePath, {
            resource_type: "auto",
            folder: "videoTube/images",
        });
        // file has been uploaded successfull
        //console.log("file is uploaded on cloudinary ", response.url);
        fs.unlinkSync(localFilePath);
        return response;
    } catch (error) {
        console.log(error);
        fs.unlinkSync(localFilePath); // remove the locally saved temporary file as the upload operation got failed
        return null;
    }
};

function getPublicId(cloudinaryUrl, folderPath) {
    const parsedUrl = new URL(cloudinaryUrl);
    const pathParts = parsedUrl.pathname.split("/");
    const publicIdWithExtension = pathParts.pop();
    const publicId = publicIdWithExtension.split(".")[0];

    return `${folderPath}/${publicId}`;
}

const deleteOnCloudinary = async (publicId) => {
    try {
        await cloudinary.uploader.destroy(publicId);
    } catch (err) {
        new ApiError(500, "Error occured while deleting asset");
    }
};
export { uploadOnCloudinary, deleteOnCloudinary, getPublicId };
