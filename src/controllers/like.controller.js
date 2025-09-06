import mongoose, {isValidObjectId} from "mongoose"
import {Like} from "../models/like.model.js"
import {ApiError} from "../utils/apiError.js"
import {ApiResponse} from "../utils/apiResponse.js"
import {asyncHandler} from "../utils/asyncHandler.js"

const toggleVideoLike = asyncHandler(async (req, res) => {
    const {videoId} = req.params
    //TODO: toggle like on video
        if(!videoId){
        throw new ApiError(400,"video id not found")
    }

    const userId = req.user?._id
    if(!userId){
        throw new ApiError(400,"user id not found")
    }

    const likeVideo = await Like.findOne(
        {
            video: videoId,
            likedBy: userId
        }
    )

    let like
    if(!likeVideo){
        const videoLike = await Like.create(
            {
                video: videoId,
                likedBy: userId 
            }

        )
        like:true
        if(!videoLike){
            throw new ApiError(400,"erro occur while liking the video")
        }
        
    }

    if(likeVideo){
        const unlikeVideo = await Like.deleteOne(
            {
                video: videoId,
                likedBy: userId
            }
        )
        like:false

        if(!unlikeVideo){
            throw new ApiError(400, "error occur while unliking the video")
        }
    }

    return res
    .status(200)
    .json(
        new ApiResponse(200,like,like?"you like this video":"you unlike this video")
    )
})

const toggleCommentLike = asyncHandler(async (req, res) => {
    const {commentId} = req.params
    //TODO: toggle like on comment
    if(!commentId){
        throw new ApiError(400,"comment id not found")
    }

    const userId = req.user?._id

    if(!userId){
        throw new ApiError(400,"user id not found")
    }

    const likeComment = await Like.findOne(
        {
            comment : commentId,
            likedBy : userId
        }
    )
    
    let like
    if(!likeComment){
        const commentLike = await Like.create(
            {
                comment : commentId,
                likedBy : userId
            }
        )
        

        if(!commentLike){
            throw new ApiError(400, " error occur while liking this comment")
        }

        like = true
        //console.log("like t",like)
    }



    if(likeComment){
        const commentUnlike = await Like.deleteOne(
            {
                comment : commentId,
                likedBy : userId
            }
        )

        if(!commentUnlike){
            throw new ApiError(400, " error occur while unliking this comment")
        }
        like = false
        // console.log("like f",like)
    }

   // console.log("like is:",like)
   
    return res
    .status(200)
    .json(
        new ApiResponse(200,like,like? "you liked this comment" : "you unlike this comment")
    )

})


const toggleTweetLike = asyncHandler(async (req, res) => {
    const {tweetId} = req.params
    //TODO: toggle like on tweet
    if(!tweetId){
        throw new ApiError(400,"tweet id not found")
    }

    const userId = req.user?._id
    if(!userId){
        throw new ApiError(400,"user id not found")
    }

    const likeTweet = await Like.findOne(
        {
            tweet: tweetId,
            likedBy: userId
        }
    )

    let like
    if(!likeTweet){
        const tweetLike = await Like.create(
            {
                tweet: tweetId,
                likedBy: userId 
            }

        )
        like = true
        if(!tweetLike){
            throw new ApiError(400,"error occur while liking the tweet")
        }
        
    }

    if(likeTweet){
        const unlikeTweet = await Like.deleteOne(
            {
                tweet: tweetId,
                likedBy: userId
            }
        )
        like = false

        if(!unlikeTweet){
            throw new ApiError(400, "error occur while unliking the tweet")
        }
    }
    console.log("like:",like)

    return res
    .status(200)
    .json(
        new ApiResponse(200,like,like?"you like this tweet":"you unlike this tweet")
    )
}

)

const getLikedVideos = asyncHandler(async (req, res) => {
    //TODO: get all liked videos

    const userId = req.user?._id
    if(!userId){
        throw new ApiError(400,"user id not found")
    }

    const getallLikevideos = await Like.aggregate(
        [
            {
                $match:{
                    likedBy : userId,
                    video : {$exists: true, $ne: null}
                }
            },
            {
                $lookup:{
                    from: "videos",
                    localField:"video",
                    foreignField:"_id",
                    as:"video",
                    pipeline:[
                        {
                            $lookup:{
                                from : "users",
                                localField: "owner",
                                foreignField:"_id",
                                as: "owner",
                                pipeline: [
                                    {
                                        $project: {
                                            username:1,
                                            fullname:1,
                                            avatar:1
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
                            videoFile:1,
                            thumbnail:1,
                            description:1,
                            views:1,
                            owner:1
                          }   
                        }
                    ]  
                }
            },
            {
                $unwind:{
                    path:"$video"
                }
            },
            {
                $project:{
                    likedBy:1,
                    video:1
                }
            }
           
        ]
    )
    if(!getallLikevideos){
        throw new ApiError(400,"error while fetching all liked videos")
    }

    return res
    .status(200)
    .json(
        new ApiResponse(200,getallLikevideos,"all liked videos fetched successfully")
    )
    
})

export {
    toggleCommentLike,
    toggleTweetLike,
    toggleVideoLike,
    getLikedVideos
} 