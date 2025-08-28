import {asyncHandler} from "../utils/asyncHandler.js"
import {ApiError} from "../utils/apiError.js"
import { User } from "../models/user.model.js"
import {uploadCloudinary} from "../utils/cloudinary.js"
import { ApiResponse } from "../utils/apiResponse.js"
import jwt from "jsonwebtoken"



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
    // console.log("email : " , email);
    // console.log("username : " , username);

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



const generateAccessAndRefreshtokens = async(userid) => {
    try {
        const user = await User.findById(userid)
        const accesstoken = user.generateAccessToken()
        const refreshtoken = user.generateRefreshToken()
        
        user.refreshtoken = refreshtoken
        await user.save({validateBeforeSave: false})

        return {accesstoken , refreshtoken}

    } catch (error) {
        throw new ApiError(500,"somthing went wrong while generate access and refresh token")
    }
}

const loginUser = asyncHandler(async(req,res) =>{
    //reqbody->data
    //username or email
    //find the user
    //password check
    //access and refresh token
    //send cookies
    //response

    const {email,username,password} = req.body

    if(!username && !email){
        throw new ApiError(400, "username or email is required")
    }

    const user = await User.findOne(
        {
            $or: [{username},{email}]
        }
    )

    if(!user){
        throw new ApiError(404, "user or email does not exist")
    }

    const isPasswordvalid = await user.ispasswordCorrect(password)
    if(!isPasswordvalid){
        throw new ApiError(401, "password incorrect")
    }

    const {accesstoken,refreshtoken} = await generateAccessAndRefreshtokens(user._id)
     
    const loggedinuser = await User.findById(user._id).select("-password -refreshtoken")

    const options = {
        httpOnly: true,
        secure: false
    }


    return res
    .status(200)
    .cookie("accesstoken",accesstoken,options)
    .cookie("refreshtoken",refreshtoken,options)
    .json(
        new ApiResponse(
            200,{
                user: loggedinuser,accesstoken,refreshtoken
            },
            "user logged in successfully"
        )
    )
    
})


const logoutUser = asyncHandler(async(req,res) => {
    await User.findByIdAndUpdate(
        req.user._id,
        {
            $set: {
                refreshtoken:undefined
            }
        },
        {
            new: true
        }
    )

    const options = {
        httpOnly: true,
        secure: false
    }

    return res
    .status(200)
    .clearCookie("accesstoken" , options)
    .clearCookie("refreshtoken" , options)
    .json(new ApiResponse(200,{},"user logged out")) 
    
})


const refreshAccessToken = asyncHandler (async(req,res)=>{
    const incomingRefreshToken =req.cookies.refreshtoken || req.body.refreshtoken

    if(!incomingRefreshToken){
        throw new ApiError(401, "unautorized request")
    }


    try {
        const decodedRefreshToken = jwt.verify(
            incomingRefreshToken,
            process.env.REFRESH_TOKEN_SECRET
        )
    
        const user = await  User.findById(decodedRefreshToken?._id)
        if(!user){
            throw new ApiError(401, "Invalid refresh token")
        }
    
        if(incomingRefreshToken !== user?.refreshtoken){
            throw new ApiError(401, "Refresh token is expired or used")
        }
    
        const options = {
            httpOnly : true,
            secure : false
        }
    
        const {accesstoken, newRefreshtoken} = await generateAccessAndRefreshtokens(user._id)
    
        return res
        .status(200)
        .cookie("accesstoken",accesstoken,options)
        .cookie("refreshtoken",newRefreshtoken,options)
        .json(
            new ApiResponse(
                200,
                {accesstoken, refreshtoken:newRefreshtoken},
                "Access token refreshed"
            )
        )
    } catch (error) {
        throw new ApiError(401, error?.message || "Invalid refresh token")
    }
})




export {
    registerUser,
    logoutUser,
    loginUser,
    refreshAccessToken
}