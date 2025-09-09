import mongoose from "mongoose"
import {Video} from "../models/video.model.js"
import {Subscription} from "../models/subscription.model.js"
import {Like} from "../models/like.model.js"
import {ApiError} from "../utils/apiError.js"
import {ApiResponse} from "../utils/apiResponse.js"
import {asyncHandler} from "../utils/asyncHandler.js"

const getChannelStats = asyncHandler(async (req, res) => {
    // TODO: Get the channel stats like total video views, total subscribers, total videos, total likes etc.
    const userId = req.user?._id
    if(!userId){
        throw new ApiError(400,"userId not found")
    }

    const videoStats = await Video.aggregate([
        {
            $match:{
                owner : new mongoose.Types.ObjectId(userId)
            }
        },
        {
            $group:{
                _id:"videofile",
                totalvideos:{$sum:1},
                totalviews:{$sum:"$views"},
            }
        },
        {
            $project:{
                _id:0,
                totalvideos:1,
                totalviews:1
            }
        }
    ])
    const subscriptionStats = await Subscription.aggregate([
        {
            $match:{
                channel:new mongoose.Types.ObjectId(userId)
            }
        },
        {
            $group:{
                _id:"$channnel",
                totalsubscriber:{$sum:1}
            }
        },
        {
            $project:{
                _id:0,
                totalsubscriber:1
            }
        }
    ])
    const likeStats = await Like.aggregate([
        {
           $lookup:{
                from:"videos",
                localField:"video",
                foreignField:"_id",
                as:"videoinfo"
           } 
        },
        {
            $match:{
                "videoinfo.owner" : userId
            }
        },
        {
            $group:{
                _id:null,
                totallikes:{$sum:1}
            }
        },
        {
            $project:{
                _id:0,
                totallikes:1,
            }
        }
    ])

    const info = {
        totalvideos: videoStats[0]?.totalvideos || 0,
        totalviews : videoStats[0]?.totalviews || 0,
        totallikes : likeStats[0]?.totallikes || 0,
        totalsubscriber: subscriptionStats[0]?.totalsubscriber || 0
    }

    if(!info){
        throw new ApiError(400,"error while fetching the stats")
    }


    return res
    .status(200)
    .json(
        new ApiResponse(200,info,"all stats fetched successfully")
    )
})

const getChannelVideos = asyncHandler(async (req, res) => {
    // TODO: Get all the videos uploaded by the channel
    const userId = req.user?._id
    if(!userId){
        throw new ApiError(400,"userId not found")
    }

    const allVideos = await Video.aggregate([
        {
            $match:{
                owner:new mongoose.Types.ObjectId(userId)
            }
        },
        {
            $project:{
                videofile:1,
                thumbnail:1,
                title:1,
                description:1,
                views:1,
                isPublished:1,
                owner:1,
                createdAt:1,
            }
        }
])

    if(!allVideos || allVideos.length===0){
        throw new ApiError(400,"no videos yet")
    }

    return res
    .status(200)
    .json(
        new ApiResponse(200,allVideos,"all videos fetched successfully")
    )
    
})

export {
    getChannelStats, 
    getChannelVideos
    }