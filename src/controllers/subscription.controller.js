import mongoose, {isValidObjectId} from "mongoose"
import {User} from "../models/user.model.js"
import { Subscription } from "../models/subscription.model.js"
import {ApiError} from "../utils/apiError.js"
import {ApiResponse} from "../utils/apiResponse.js"
import {asyncHandler} from "../utils/asyncHandler.js"


const toggleSubscription = asyncHandler(async (req, res) => {

    const {channelId} = req.params
    // TODO: toggle subscription
    if(!channelId){
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
        subs:true
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
        subs:false
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
})

// controller to return channel list to which user has subscribed
const getSubscribedChannels = asyncHandler(async (req, res) => {
    const { subscriberId } = req.params
})

export {
    toggleSubscription,
    getUserChannelSubscribers,
    getSubscribedChannels
}