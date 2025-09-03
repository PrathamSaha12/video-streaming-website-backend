import mongoose from "mongoose"
import {Comment} from "../models/comments.model.js"
import {ApiError} from "../utils/apiError.js"
import {ApiResponse} from "../utils/apiResponse.js"
import {asyncHandler} from "../utils/asyncHandler.js"

const getVideoComments = asyncHandler(async (req, res) => {
    //TODO: get all comments for a video
    const {videoId} = req.params
    if(!videoId){
        throw new ApiError(400,"video id not found")
    }
    const {page = 1, limit = 10} = req.query

    const userComment = await Comment.aggregate(
        [
            {
                $match:{
                    video : new mongoose.Types.ObjectId(videoId)
                }
            },
            {
                $lookup:{
                    from : "videos",
                    localField : "video",
                    foreignField : "_id",
                    as:"video",
                    pipeline:[
                        {
                            $project:{
                                videofile:1,
                                title:1,
                                owner:1

                            }
                        }
                    ]
                }
            },
            {
                $addFields:{
                   video: {$first: "$video"},
                    
                }
            },
            {
                $project:{
                    content:1,
                    video:1
                }
            },
            {
                $skip:
                    (parseInt(page)-1)*(parseInt(limit))
                
            },
            {
                $limit:parseInt(limit)
            }
        ]
    )

     if(!userComment|| userComment.length===0){
        throw new ApiError(40,"no comments found")
    }


    return res
    .status(200)
    .json(
        new ApiResponse(200,userComment,"all comment fetched successfully")
    )

})

const addComment = asyncHandler(async (req, res) => {
    // TODO: add a comment to a video
    const {videoId} = req.params
    if(!videoId){
        throw new ApiError(400,"video id not found")
    }
    const {content} = req.body
    if(!content){
        throw new ApiError(400,"there is no comment")
    }

    const owner = req.user?._id
    if(!owner){
        throw new ApiError(400,"Owner not found")
    }

    const commentAdd = await Comment.create({
        video:videoId,
        content,
        owner
    })

    if(!commentAdd){
        throw new ApiError(400,"comment can't be added")
    }

    return res
    .status(201)
    .json(
        new ApiResponse(201,commentAdd,"comment added successfully")
    )


})

const updateComment = asyncHandler(async (req, res) => {
    // TODO: update a comment
    
    const{commentId} = req.params
    
        if(!commentId){
            throw new ApiError(400,"comment id not found")
        }
    
    const{content} = req.body
    if(!content){
        throw new ApiError(400,"content is not found")
    }

    const comment = await Comment.findById(commentId)
    const user = req.user?._id

    if(comment.owner.toString() !== user.toString()){
        throw new ApiError(400,"you can't access to update the comment")
    }

    const commentUpdate = await Comment.findByIdAndUpdate(
        commentId,
        {
            $set:{
                content:content
            }
        },
        {
            new:true
        }
     )
    if(!commentId|| commentId.length===0){
        throw new ApiError(40,"no comments found")
    }
    return res
    .status(200)
    .json(
        new ApiResponse(200,commentUpdate,"comment updated successfully")
    )
})

const deleteComment = asyncHandler(async (req, res) => {
    // TODO: delete a comment
    const{commentId} = req.params
    if(!commentId){
        throw new ApiError(400,"comment id not found")
    }

    const comment = await Comment.findById(commentId)
    const user = req.user?._id

    if(comment.owner.toString() !== user.toString()){
        throw new ApiError(400,"you can't access to delete the comment")
    }
    const commentDelete = await Comment.findByIdAndDelete(
        commentId
    )

    if(!commentDelete){
        throw new ApiError(400,"error while deleting comment")
    }

    return res
    .status(200)
    .json(
        new ApiResponse(200,commentDelete,"comment deleted successfully")
    )
})

export {
    getVideoComments, 
    addComment, 
    updateComment,
     deleteComment
    }