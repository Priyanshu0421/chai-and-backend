import {v2 as cloudinary} from 'cloudinary'

import fs from 'fs'
import { ApiError } from './ApiError.js';
import { log } from 'console';

cloudinary.config({ 
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME, 
    api_key: process.env.CLOUDINARY_API_KEY, 
    api_secret: process.env.CLOUDINARY_API_SECRET 
});


const uploadOnCloudinary = async (localFilePath) => {
    try {
        if(!localFilePath) return null;
        const response = await cloudinary.uploader.upload(localFilePath , {
            resource_type : 'auto'
        })
        // File has been uploaded Successfully 
        // console.log('File has been Uploaded in the Cloudinary' , response.url);
        fs.unlinkSync(localFilePath)
        // console.log(response);
        // console.log(response.public_id);
        return response;
    } catch (error) {
        fs.unlinkSync(localFilePath) // remove the locally saved temporary file as the upload operation got failed
        return null;
    }
}

const deleteFromCloudinary = async(publicId) => {
    try {
        if(!publicId) return null

        const response = await cloudinary.uploader.destroy(publicId)
        return response
    } catch (error) {
        throw new ApiError(400 , "File can't be deleted")
    }
}

export {uploadOnCloudinary , deleteFromCloudinary}