import mongoose, {isValidObjectId} from "mongoose"
import {Video} from "../models/video.model.js"
import {User} from "../models/user.model.js"
import {ApiError} from "../utils/apiError.js"
import {ApiResponse} from "../utils/apiResponse.js"
import {asyncHandler} from "../utils/asyncHandler.js"
import {uploadCloudinary } from "../utils/cloudinary.js"


const getAllVideos = asyncHandler(async (req, res) => {
    const { page = 1, limit = 10, query, sortBy, sortType, userId } = req.query
    //TODO: get all videos based on query, sort, pagination
})

const publishAVideo = asyncHandler(async (req, res) => {
    const { title, description} = req.body
    // TODO: get video, upload to cloudinary, create video
    if(!title){
        throw new ApiError(400,"Please enter a tiltle")
    }
    if(!description){
        throw new ApiError(400,"Please enter a description")
    }

    const videoLocalPath = req.files.videoFile[0]?.path
    if(!videoLocalPath){
        throw new ApiError(400,"Video local path can't find")
    }

    const video = await uploadCloudinary(videoLocalPath)
    if(!video){
        throw new ApiError(400,"error while upload video on cloudinary")
    }


    const thumbnailLocalPath = req.files.thumbnail[0]?.path
    if(!thumbnailLocalPath){
        throw new ApiError(400,"Thumbnail local path can't find")
    }

    const thumbnail = await uploadCloudinary(thumbnailLocalPath)
    if(!thumbnail){
        throw new ApiError(400,"error while upload thumbnail on cloudinary")
    }

     const videoCreate = await Video.create({
        title,
        thumbnail: thumbnail.url,
        videoFile : video.url,
        description,
        owner: req.user._id,
        duration: video.duration,
        
    })  

    return res
    .status(201)
    .json(
        new ApiResponse(201, videoCreate ,"Publish video successfully")
    )


})

const getVideoById = asyncHandler(async (req, res) => {
    const { videoId } = req.params
    //TODO: get video by id

    const userVideo = await Video.aggregate([
        {
            $match:{
                _id : new mongoose.Types.ObjectId(videoId)
            }
        },
        {
            $lookup:{
                from: "users",
                localField: "owner",
                foreignField: "_id",
                as:"owner",
                pipeline:[
                    {
                        $project:{
                            username : 1,
                            fullname:1,
                            avatar:1,
                        }
                    }
                ]
            }
        },
        {
            $addFields:{
                owner:{
                    $first:"$owner"
                }
            }
        },
        {
            $project:{
                owner:1,
                duration:1,
                thumbnail:1,
                title:1,
                description:1,
                videoFile:1,
            }
        }
    ])

    return res
    .status(200)
    .json(
        new ApiResponse (200,userVideo,"video details fetched successfully")
    )

})

const updateVideo = asyncHandler(async (req, res) => {
    const { videoId } = req.params
    //TODO: update video details like title, description, thumbnail

    const {title , description }= req.body
    
   if(!(title)){
        throw new ApiError(400,"title is required")
    }
    if(!description){
        throw new ApiError(400,"description is required")
    }

    const thumbnailLocalPath = req.file?.path
    if(!thumbnailLocalPath){
        throw new ApiError(400,"thumbnail file is missing")
    }

    const thumbnail = await uploadCloudinary(thumbnailLocalPath)
    if(!thumbnail.url){
        throw new ApiError(400,"error while uploading thumbnail")
    }

    const user = req.user?._id
    const video = await Video.findById(videoId)

    if(video.owner.toString() != user.toString()){
        throw new ApiError(400,"you are not autorized to update this video")
    }
    
    const videoUpdate = await Video.findByIdAndUpdate(
        videoId,{
            $set:{
            title : title,
            description : description,
            thumbnail : thumbnail.url
        }
        },
        {new : true}
        
    )

    return res
    .status(200)
    .json(
        new ApiResponse(200,videoUpdate,"updated successfully"))

})

const deleteVideo = asyncHandler(async (req, res) => {
    const { videoId } = req.params
    //TODO: delete video
    const user = req.user?._id
    const video = await Video.findById(videoId)

    if(video.owner.toString() != user.toString()){
        throw new ApiError(400,"you are not autorized to delete  this video")
    }

    const videoDelete = await Video.findByIdAndDelete(videoId)
    if(!videoDelete){
        throw new ApiError(400,"error occur while deleting video")
    }
    return res
    .status(200)
    .json(
        new ApiResponse(200,videoDelete,"video delete successfully")
    )
})

const togglePublishStatus = asyncHandler(async (req, res) => {
    const { videoId } = req.params
})

export {
    getAllVideos,
    publishAVideo,
    getVideoById,
    updateVideo,
    deleteVideo,
    togglePublishStatus
}