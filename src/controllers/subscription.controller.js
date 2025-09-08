import mongoose, {isValidObjectId} from "mongoose"
import {User} from "../models/user.model.js"
import { Subscription } from "../models/subscription.model.js"
import {ApiError} from "../utils/apiError.js"
import {ApiResponse} from "../utils/apiResponse.js"
import {asyncHandler} from "../utils/asyncHandler.js"


const toggleSubscription = asyncHandler(async (req, res) => {

    const {channelId} = req.params
    // TODO: toggle subscription
    if(!channelId || !isValidObjectId(channelId)){
        throw new ApiError(404,"channel Id not found")
    }

    const userId = req.user?._id

    const subscribed = await Subscription.findOne(
        {
            channel : channelId,
            subscriber: userId
        }
    )
    
    let subs;

    //for subscribe
    if(!subscribed){
        const subscribe = await Subscription.create(
            {
                channel : channelId,
                subscriber : userId
            }
        )

        if(!subscribe){
            throw new ApiError(400,"error occur while subscribing")
        }
        subs=true
    }

    //for unsbscribe
    if(subscribed){
        const unsbscribe = await Subscription.deleteOne(
            {
                channel : channelId,
                subscriber : userId
            }
        )
        if(!unsbscribe){
            throw new ApiError(400,"error occur while unsubcribing")
        }
        subs=false
    }

    return res
    .status(200).json(
        new ApiResponse(200,subs, subs?"channel subscribed successfully" :"channel unsubscribed successfully")
    )

    


})

// controller to return subscriber list of a channel
const getUserChannelSubscribers = asyncHandler(async (req, res) => {
    const {channelId} = req.params
    if(!channelId){
        throw new ApiError(404,"channel id not found")
    }

    //const user = req.user?._id

    const allSubscribers = await Subscription.aggregate([
        {
            $match:{
                channel : new mongoose.Types.ObjectId(channelId)
            }
        },
        {
            $group:{
                _id: "$channel",
                subscriberCount:{
                    $sum:1
                }
            }
        },
        {
            $project:{
                channel:1,
                subscriberCount:1
            }
        }
    ])

    if(!allSubscribers || allSubscribers.length===0){
        throw new ApiError(400,"no subscriber yet")
    }

    return res
    .status(200)
    .json(
       new ApiResponse (200,allSubscribers,"all subscribers fetched successfully")
    )
})

// controller to return channel list to which user has subscribed
const getSubscribedChannels = asyncHandler(async (req, res) => {
    const { subscriberId } = req.params

    if(!subscriberId || !isValidObjectId(subscriberId)){
        throw new ApiError(400,"invalid or missing subscriberId")
    }

    const userId = req.user?._id
    if(!userId){
        throw new ApiError(400,"invalid or missing userid")
    }

    const allChannel = await Subscription.aggregate([
        {
            $match:{
                subscriber: new mongoose.Types.ObjectId(subscriberId)
            }
        },
        {
            $lookup:{
                from:"users",
                localField:"channel",
                foreignField:"_id",
                as:"channeldetails",
                pipeline:[
                    {
                        $project:{
                            username:1,
                            fullname:1,
                            avatar:1,
                        }
                    }
                ]
            }
        },
        {
            $addFields:{
                channeldetails:{
                    $first:"$channeldetails"
                }
            }
        },
        {
            $project:{
                channeldetails:1
            }
        }
    ])

    if(!allChannel || allChannel.length === 0){
        throw new ApiError(400,"user not subscribe any channel")
    }

    return res
    .status(200)
    .json(
        new ApiResponse(200,allChannel,"all channel list fetched successfully")
    )
})

export {
    toggleSubscription,
    getUserChannelSubscribers,
    getSubscribedChannels
}