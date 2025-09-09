import { ApiError } from "../utils/apiError.js"
import { asyncHandler } from "../utils/asyncHandler.js"
import jwt from "jsonwebtoken"
import { User } from "../models/user.model.js"



export const verifyJWT = asyncHandler(async(req,_, next) => {
    // console.log("=== verifyJWT middleware called ===")
    // console.log("Request URL:", req.url)
    // console.log("Request method:", req.method)
    
    try {
        // console.log("Raw cookies:", req.cookies)
        //console.log("Authorization header:", req.headers.authorization)
        
        const token = req.cookies?.accesstoken || req.header("Authorization")?.replace("Bearer ", "")
        console.log("Extracted token:", token)
        
        if(!token) {
            //console.log("No token found")
            throw new ApiError(401, "unauthorized request")
        }
        
        const decodedToken = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET)
        console.log("Token decoded successfully")
        
        const user = await User.findById(decodedToken?._id).select("-password -refreshtoken")
    
        if(!user) {
            console.log("User not found")
            throw new ApiError(401, "invalid access token")
        }
    
        console.log("User found, proceeding...")
        req.user = user;
        next()
    } catch (error) {
        console.log("Error in verifyJWT:", error.message)
        throw new ApiError(401, error?.message || "invalid access token")
    }
})