import { v2 as cloudinary} from "cloudinary"
import fs from "fs"
import path from "path"

const uploadCloudinary = async (localFilePath) => {
    try {
        if (!localFilePath) {
            return null
        }

        // Configure Cloudinary inside the function to ensure env vars are loaded
        cloudinary.config({ 
            cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
            api_key: process.env.CLOUDINARY_API_KEY,
            api_secret: process.env.CLOUDINARY_API_SECRET,
        });

        // Normalize the path (handle Windows backslashes)
        const normalizedPath = path.resolve(localFilePath)
        
        // Check if file exists
        if (!fs.existsSync(normalizedPath)) {
            console.log(`File does not exist: ${normalizedPath}`)
            return null
        }

        // Upload the file to cloudinary
        const response = await cloudinary.uploader.upload(normalizedPath, {
            resource_type: "auto"
        })

        // File has been uploaded successfully
        console.log("File is uploaded on cloudinary: ", response.url)
        
        // Delete local file after successful upload
        fs.unlinkSync(normalizedPath)
        
        return response

    } catch (error) {
        console.error("Cloudinary upload error:", error)
        
        // Clean up local file if it exists
        const normalizedPath = path.resolve(localFilePath)
        if (fs.existsSync(normalizedPath)) {
            try {
                fs.unlinkSync(normalizedPath)
                console.log("Cleaned up local file after error")
            } catch (cleanupError) {
                console.error("Error cleaning up file:", cleanupError)
            }
        }
        
        return null
    }
}

export { uploadCloudinary }