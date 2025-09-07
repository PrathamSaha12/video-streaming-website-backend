import mongoose, {isValidObjectId} from "mongoose"
import {Playlist} from "../models/playlist.model.js"
import {ApiError} from "../utils/apiError.js"
import {ApiResponse} from "../utils/apiResponse.js"
import {asyncHandler} from "../utils/asyncHandler.js"


const createPlaylist = asyncHandler(async (req, res) => {
    const {name, description} = req.body
    //TODO: create playlist
    if(!name){
        throw new ApiError(400,"name is required")
    }

    if(!description){
        throw new ApiError(400,"description is required")
    }

    const userId = req.user?._id
    if(!userId){
        throw new ApiError(400,"user id nort found")
    }

    const playlist = await Playlist.create(
        {
            name,
            description,
            owner: userId
        }
    )

    if(!playlist){
        throw new ApiError(400,"error while creating playlist")
    }

    return res
    .status(200)
    .json(
        new ApiResponse(200,"playlist created successfully")
    )
})

const getUserPlaylists = asyncHandler(async (req, res) => {
    const {userId} = req.params
    //TODO: get user playlists
    if(!userId){
        throw new ApiError(400,"user id not found")
    }
    const userPlaylist = await Playlist.aggregate(
        [
            {//lookup for owner of playlist
                $match:{
                    createdBy : await mongoose.Types.ObjectId(userId)
                }
            },
            {
                $lookup:{
                    from : "users",
                    localField:"owner",
                    foreignField:"_id",
                    as:"createdBy",
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
                    createdBy:{
                        $first:"$createdBy"
                    }
                }
            },
            {//lookup for videos
                $lookup:{
                    from:"videos",
                    localField:"videos",
                    foreignField:"_id",
                    as:"videos",
                    pipeline:[
                        {
                            $lookup:{
                                from:"users",
                                localField:"videos",
                                foreignField:"_id",
                                as:"owner",
                                pipeline:[
                                    {
                                        $projeect:{
                                            usename:1,
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
                        }
                    ]
                }
            },
            {
                $project:{
                    videos: 1,
                    creatdeBY: 1,
                    name: 1,
                    description: 1
                }
            }
        ]
    )
    if(!userPlaylist){
        throw new ApiError(400,"error while creating playlist")
    }

    return res
    .status(200)
    .json(
        new ApiResponse(200,"playlist created successfully")
    )
})

const getPlaylistById = asyncHandler(async (req, res) => {
    const {playlistId} = req.params
    if(!playlistId){
        throw new ApiError(400,"play list id not found")
    }

    const userPlaylist = await Playlist.aggregate([
        {
            $match:{
                _id : await mongoose.Types.ObjectId(playlistId)
            }
        },
        {
            $lookup:{
                from : "users",
                localField: "owner",
                foreignField:"_id",
                as:"createdBy",
                pipeline: [
                    {
                        $project:{
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
                createdBy:{
                    $first:"$owner"
                }
            }
        },
        {
            $lookup : {
                from : "videos",
                localField : "videos",
                foreignField : "_id",
                as:"videos",
                pipeline: [
                    {
                        $lookup:{
                            from : "users",
                            localField : "owner",
                            foreignField : "_id",
                            as:"owner",
                            pipeline: [
                                {
                                    $project : {
                                        username : 1,
                                        fullname : 1,
                                        avatar : 1
                                    }
                                }
                            ]
                        }
                    },
                    {
                        $addFields: {
                            $first : "$owner"
                        }
                    }
                ]
            }
        },
        {
            $project : {
                videos: 1,
                creatdeBY: 1,
                name: 1,
                description: 1
            }
        }

    ])
    if(!userPlaylist){
        throw new ApiError(400,"error while creating playlist")
    }

    return res
    .status(200)
    .json(
        new ApiResponse(200,"playlist created successfully")
    )
    
})

const addVideoToPlaylist = asyncHandler(async (req, res) => {
    const {playlistId, videoId} = req.params
    if(!playlistId || !videoId){
        throw new ApiError(400,"missing or invalid playlistId or videoId ")
    }
    const user = req.user?._id
    if(!user){
        throw new ApiError(404,"user is not found")
    }
    const playList = await Playlist.findById(playlistId)
    if(!playList){
        throw new ApiError(404,"playlist is not found")
    }

    if(playList.owner.toString() != user.toString()){
        throw new ApiError(403,"you are not allowed to add videos in playlist")
    } 
    
    if(playList.videos.includes(videoId)){
        throw new ApiError(400,"video already exist in the playlist")
    }

    const addVideos = await Playlist.findByIdAndUpdate(
        playList,
        {
            $push:{
                videos:videoId
            }
        },
        {
            new:true
        }
    )

    if(!addVideos){
        throw new ApiError(400,"error whiel add videos to playlist")
    }

    return res
    .status(200)
    .json(
        new ApiResponse(200,"add videos to the playlist successfully")
    )
})

const removeVideoFromPlaylist = asyncHandler(async (req, res) => {
    const {playlistId, videoId} = req.params
    // TODO: remove video from playlist
    if(!playlistId || !videoId){
        throw new ApiError(400,"missing or invalid playlistId or videoID")
    }

    const user = req.user?._id
    if(!user){
        throw new ApiError(404,"user not found")
    }

    const playlist = await Playlist.findById(playlistId)
    if(!playlist){
        throw new ApiError(400,"playlist not found")
    }

    if(playlist.owner.toString() != user.toString()){
        throw new ApiError(403,"you are not autorized to remove video from playlist")
    }

    const removeVideo = await Playlist.findByIdAndUpdate(
        playlist,
        {
            $pull:{
                videos : videoId
            }
        },
        {new:true}
    )

    if(!removeVideo){
        throw new ApiError(400,"error while remove video from playlist")
    }

    return res
    .status(200)
    .json(
        new ApiResponse(200,"remove video from playlist successfully")
    )

})

const deletePlaylist = asyncHandler(async (req, res) => {
    const {playlistId} = req.params
    // TODO: delete playlist
    if(!playlistId){
        throw new ApiError(400,"Invalid or missing playlistId")
    }
    const playlist = await Playlist.findById(playlistId)
    if(!playlist){
        throw new ApiError(400,"playlist not found")
    }
    const user = eq.user?._id
    if(!user){
        throw new ApiError(400,"invalid or missing userId")
    }

    if(playlist.owner.toString() != user.toString()){
        throw new ApiError(400,"you are not allowed to delete the playlist")
    }

    const  playlistDelete = await Playlist.findByIdAndDelete(playlistId)

    if(!playlistDelete){
        throw new ApiError(400,"error while deleting the Playlist")
    }

    return res
    .status(200)
    .json(
        new ApiResponse(200,"playlist delete successfully")
    )
    
})

const updatePlaylist = asyncHandler(async (req, res) => {
    const {playlistId} = req.params
    const {name, description} = req.body
    //TODO: update playlist
    if(!playlistId){
        throw new ApiError(400,"Invalid or miiding playlistId")
    }

    const uploadFields = {}
    if(name){
        uploadFields.name = name
    }
    if(description){
        uploadFields.description = description
    }

    const playList = await Playlist.findById(playlistId)
    if(!playList){
        throw new ApiError(404,"playlist not found")
    }
    const user = req.body?._id
    if(!user){
        throw new ApiError(400,"invalid or missing userId")
    }

    if(playList.owner.toString() != user.toString()){
        throw new ApiError(400,"you are not alllowed to update this playlist")
    }

    const playlistUpdate = await Playlist.findByIdAndUpdate(
        playList,
        {
            name,
            description
        },
        {
            new : true
        }
    )

    if(!playlistUpdate){
        throw new ApiError(400,"error while updating the playlist")
    }

    return res
    .status(200)
    .json(
        new ApiResponse(200,"playlist updated successfully")
    )
})

export {
    createPlaylist,
    getUserPlaylists,
    getPlaylistById,
    addVideoToPlaylist,
    removeVideoFromPlaylist,
    deletePlaylist,
    updatePlaylist
}