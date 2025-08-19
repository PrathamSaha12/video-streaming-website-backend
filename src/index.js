import dotenv from 'dotenv';
//import mongoose from "mongoose";
//import {DB_NAME } from "./constants";
import connectDB from "./db/index.js";

dotenv.config({
    path: './.env'
})

connectDB()








//1st approach

/*import express from "express"

const app = express();



;(async()=>{
    try {
        await mongoose.connect(`${process.env.MONGO_URI}/${DB_NAME}`)
        
        
        app.on("err:",(error)=>{
            console.log("ERR:",error);
            throw error
        })

        app.listen(process.env.PORT,()=>{
            console.log(`App listening on ${process.env.PORT}`);
            
        })


    } catch (error) {
        console.error("ERROR:",error)
    }
})()*/