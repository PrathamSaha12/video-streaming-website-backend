import mongoose, { isValidObjectId } from "mongoose"
import {Tweet} from "../models/tweets.model.js"
import {User} from "../models/user.model.js"
import {ApiError} from "../utils/apiError.js"
import {ApiResponse} from "../utils/apiResponse.js"
import {asyncHandler} from "../utils/asyncHandler.js"

const createTweet = asyncHandler(async (req, res) => {
    //TODO: create tweet
    const userId = req.user?._id
    if(!userId){
        throw new ApiError(400,"user id not found")
    }
    const{content} = req.body
    console.log("content of tweet is:",content)

    if(!content){
        throw new ApiError(400,"content is missing")
    }

    const tweet = await Tweet.create({
        content: content,
        owner: userId
    })

    return res
    .status(201) //201 for creation status
    .json(
        new ApiResponse(201,tweet,"tweeted successfully")
    )

})

const getUserTweets = asyncHandler(async (req, res) => {
    // TODO: get user tweets
    

    const userwithTweets = await Tweet.aggregate([
       {
        $match:{
            owner:new mongoose.Types.ObjectId(req.user?._id)
        }
       },
       {
            $lookup:{
                from: "users",
                localField: "owner",
                foreignField: "_id",
                as: "owner",
                pipeline:[{
                    $project:{
                        username: 1,
                        fullname: 1,
                        avatar: 1
                    }
                }]
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
                content: 1,
                owner: 1,
                

            }
       }
       
    ])

    if(!userwithTweets || userwithTweets.length === 0){
        throw new ApiError(404,"user tweets not found")
    }

    return res
    .status(200)
    .json(
        new ApiResponse(200,userwithTweets,"user with all tweets fethced successfully")
    )

   
})

const updateTweet = asyncHandler(async (req, res) => {
    //TODO: update tweet
    
    const {content} = req.body
    if(!content){
        throw new ApiError(400,"content is missing")
    }

    const {tweetId}= req.params
    
    if(!tweetId){
        throw new ApiError(400,"your tweet id is missing")
    }
    //console.log("tweet id is :",tweetId);
    const tweet= await Tweet.findById(tweetId)
    const user = req.user?._id
    if(tweet.owner.toString()!== user.toString()){
        throw new ApiError(400,"you cant access to update tweet")
    }
    
    const tweetUpdate = await Tweet.findByIdAndUpdate(
        tweetId,
        {
            $set:{
                content: content
            },
        },
        {new: true}
    )

    if(!tweet || tweet.length === 0){
        throw new ApiError(404,"tweet not found")
    }
    //console.log("updated tweet is :",tweet)

    return res
    .status(200)
    .json(
        new ApiResponse(200,tweetUpdate,"tweet updated sucessfully")
    )
})

const deleteTweet = asyncHandler(async (req, res) => {
    //TODO: delete tweet
    const {tweetId} = req.params
    if(!tweetId){
        throw new ApiError("tweet id is missing")
    }

    const tweet= await Tweet.findById(tweetId)
    const user = req.user?._id
    if(tweet.owner.toString()!== user.toString()){
        throw new ApiError(400,"you cant access to update tweet")
    }

    const tweetDelete = await Tweet.findByIdAndDelete(
        tweetId,
    )
     if(!tweetDelete){
        throw new ApiError(400,"tweet can't be deleted")
    }

    return res
    .status(200)
    .json(
        new ApiResponse(200,tweetDelete,"tweet is delete successfully")
    )
})

export {
    createTweet,
    getUserTweets,
    updateTweet,
    deleteTweet
}