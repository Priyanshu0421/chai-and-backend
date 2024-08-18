import { ApiError } from "../utils/ApiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import jwt from "jsonwebtoken"
import { User } from "../models/users.model.js";

export const verifyJWT = asyncHandler(async (req,res,next) => {
    try {
        const token = req.cookies?.accessToken || req.header("Authorization")?.replace("Bearer " , "")  // here in this authorization is a key value pair in this in value we have Bearer and then token number
    
        if(!token){
            throw new ApiError(401 , "Unauthorized request")
        }
    
        const decodedtoken = await jwt.verify(token , process.env.ACCESS_TOKEN_SECRET)
    
        const user = User.findById(decodedtoken?._id).select("-password -refreshToken")
    
        if(!user){
            throw new ApiError(401, "Invalid Access Token")
        }
        req.user = user
        next()
    } catch (error) {
        throw new ApiError(401 , error?.message || "Invalid access Token")
    }
})