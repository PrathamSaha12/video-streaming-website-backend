import {asyncHandler} from "../utils/asyncHandler.js"
import {ApiError} from "../utils/apiError.js"
import { User } from "../models/user.model.js"
import {uploadCloudinary} from "../utils/cloudinary.js"
import { ApiResponse } from "../utils/apiResponse.js"




const registerUser = asyncHandler( async (req,res) => {
     //get user details from frontend
     //validation(notwmpty) *emptyname_emptyemail_correctformat
     //check if user already exist : username,email
     //check for image,avatar
     //upload them to cludinary,avatar
     //create user object - create entry in db
     //remove password and refresh token field from response
     //check for user creation
     //return response 

    const {fullname , username , email , password} = req.body
    console.log("email : " , email);
    console.log("username : " , username);

    if([fullname , email, username, password].some((field)=> field?.trim() === "")){
        throw new ApiError (400,"all fields are required")
    }


    const existedUser = await User.findOne({
        $or: [{username},{email}]
    })
    console.log(`user is ${existedUser}`);
    

    if (existedUser) {
        throw new ApiError (409,"user with emai or username already exist")
    }
    
    const avatarLocalPath = req.files.avatar[0]?.path
    //const coverimageLocalPath = req.files.coverimage[0]?.path
     
    let coverimageLocalPath;
    if(req.files && Array.isArray(req.files.coverimage) && req.files.coverimage.length > 0){
        coverimageLocalPath = req.files.coverimage[0].path
    }


    if(!avatarLocalPath) {
        throw new ApiError(400,"avatar is required")
    }

    const avatar = await uploadCloudinary (avatarLocalPath)
    const coverimage = await uploadCloudinary (coverimageLocalPath)


    if(!avatar) {
        throw new ApiError(400,"avatar file is required");
        
    }


    const user = await User.create({
        fullname,
        avatar: avatar.url,
        coverimage : coverimage?.url || "",
        email,
        password,
        username : username.toLowerCase()
    })

   const createdUser = await User.findById(user._id).select(
    "-password -refreshtoken"
   )

   if(!createdUser){
    throw new ApiError(500,"somthing went wrong while registering the user")
   }

   return res.status(200).json(
        new ApiResponse(200, createdUser , "user registerd successfully")
    )
})


export {registerUser}