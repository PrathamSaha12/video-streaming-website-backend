import {asyncHandler} from "../utils/asyncHandler.js"
import {ApiError} from "../utils/apiError.js"
import { User } from "../models/user.model.js"
import {uploadCloudinary} from "../utils/cloudinary.js"
import { ApiResponse } from "../utils/apiResponse.js"
import jwt from "jsonwebtoken"
import mongoose from "mongoose"



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



const changeCurrentPassword = asyncHandler(async(req,res)=>{

    const{oldpassword,newpassword} = req.body

    const user = await User.findById(req.user?._id)

    const ispasswordCorrect = await user.ispasswordCorrect(oldpassword)

    if(!ispasswordCorrect){
        throw new ApiError(400, "invalid old password")
    }
    user.password = newpassword
    await user.save({validateBeforeSave: false})

    return res
    .status(200)
    .json(new ApiResponse(200,{},"password change successfully"))
})


const getCurrentUser= asyncHandler(async(req,res)=>{
    return res
    .status(200)
    .json(new ApiResponse(200, req.user,"user fetched"))
})



const updateAccountDetails = asyncHandler(async(req,res)=>{
    const { fullname , email } = req.body

    if(!fullname || !email){
        throw new ApiError(400, "all fields are required");
        
    }

    const user = await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set: {
                fullname,
                email
            }
        },
        {new: true}
    ).select("-password")

    return res
    .status(200)
    .json(new ApiResponse(200,user,"accountdetails update successfully"))
})



const updateUserAvatar =asyncHandler(async(req,res)=>{

    const avatarLocalpath = req.file?.path

    if(!avatarLocalpath){
        throw new ApiError(400,"Avtar file is missing")
    } 

    const avatar = await uploadCloudinary(avatarLocalpath)

    if(!avatar.url){
        throw new ApiError(400, "error while uploading avatar")
    }

   
    const user = await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set:{
                avatar : avatar.url
            }
        },
        {
            new : true
        }
    ).select("-password")

    return res
    .status(200)
    .json(
        new ApiResponse(200,user,"avatar is updated")
    )
})



const updateCoverImage =asyncHandler(async(req,res)=>{
    const coverImageLocalpath = req.file?.path

    if(!coverImageLocalpath){
        throw new ApiError(400,"cover image file is missing")
    } 

    const coverImage = await uploadCloudinary(coverImageLocalpath)

    if(!coverImage.url){
        throw new ApiError(400, "error while uploading cover image")
    }
    const user = await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set:{
                coverImage : coverImage.url
            }
        },
        {
            new : true
        }
    ).select("-password")

    return res
    .status(200)
    .json(
        new ApiResponse(200,user,"cover image is updated")
    )
})


const getUserChannelProfile = asyncHandler(async(req,res) =>{
    const {username} = req.params

    if(!username?.trim()){
        throw new ApiError(400,"username is missing")
    }

    console.log("username is :",username)

    const channel = await User.aggregate([
        {
           $match:{
                username: username.toLowerCase()
            }
            
        },
        {
            $lookup:{
                from: "subscriptions",
                localField:"_id",
                foreignField:"channel",
                as:"subscribers"
            }
        },
        {
            $lookup:{
                from: "subscriptions",
                localField:"_id",
                foreignField:"subscriber",
                as : "subscribe_to" 
            }
        },
        {
            $addFields:{
                subscribersCount:{
                    $size: "$subscribers"
                },
                channelSubscribedToCount: {
                    $size: "$subscribe_to"
                },
                isSubscribed:{
                    $cond:{
                        if:{$in: [req.user?._id,"$subscribers.subscriber"]},
                        then: true,
                        else: false
                    }
                }
            }
        },
        {
            $project:{

                fullname: 1,
                email: 1,
                username: 1,
                subscribersCount: 1,
                channelSubscribedToCount: 1,
                isSubscribed: 1,
                avatar: 1,
                coverimage: 1
            }
        }
    ])
    //console.log("channel is",channel)

    if(!channel?.length){
        throw new ApiError(404, "channel does not exist")
    }

    return res
    .status(200)
    .json(
        new ApiResponse(200,channel[0],"User channel fetched successfully")
    )
    
})
console.log(getUserChannelProfile)

const getWtchHistroy = asyncHandler(async(req,res)=>{
    const user = await User.aggregate([
        {
            $match:{
                _id: new mongoose.Types.ObjectId(req.user._id)
            }
        },
        {
            $lookup:{
                from:"videos",
                localField:"watchhistory",
                foreignField:"_id",
                as:"watchhistory",
                 pipeline:[
                    {
                        $lookup:{
                            from:"users",
                            localField:"owner",
                            foreignField:"_id",
                            as:"owner",
                            pipeline:[
                                {
                                    $project:{
                                        fullname: 1,
                                        user: 1,
                                        avatar: 1
                                    }
                                }
                            ]
                        }
                    },
                    {
                        $addFields:{
                            owner:{
                                $first: "$owner"
                            }
                        }
                    }

                ]
            }
        }
    ])

    return res
    .status(200)
    .json(
        new ApiResponse(
            200,
            user[0].watchhistory,
            "watch histroy fetched successfully"
        )
    )
})




export {
    registerUser,
    logoutUser,
    loginUser,
    refreshAccessToken,
    changeCurrentPassword,
    getCurrentUser,
    updateAccountDetails,
    updateUserAvatar,
    updateCoverImage,
    getUserChannelProfile,
    getWtchHistroy,
    
}