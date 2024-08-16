import { asyncHandler } from "../utils/asyncHandler.js";
import {ApiError} from "../utils/ApiError.js"
import { User } from "../models/users.model.js";
import { ApiResponse } from "../utils/ApiResponse.js";

import { uploadOnCloudinary } from "../utils/cloudinary.js"

const registerUser = asyncHandler( async (req,res) => {
    // console.log("testing");
    // res.status(200).json({
    //     message: "chai aur code"
    // })

    // for registering user what thing i have to keep in mind
    //  1. Get user Details from Frontend
    //  2. check for Validations -> Not empty
    //  3. check if user already exists -> username ,email
    //  4. check for images and avatar and upload it on cloudinary
    //  5. create user object to save data in MongoDb 
    //  6. Remove password and refresh token from the response
    //  7. check for user creation
    //  8. return res

    const {fullName, username,email,password} = req.body


    if ([fullName, username , email, password].some((field) => field?.trim() === "")) {   // this line means if any of the fields is empty u gonna return a error
        throw new ApiError(400 , "All Fields Are required")
    }

    const existedUser = await User.findOne({                // this is used for finding data from the user as User is directly connected to our database
        $or : [{username} , {email}]                      // $or -> for finding multiple things 
    })

    if(existedUser){
        throw new ApiError(409 , "user with Username or Email already exist")
    }

    //  check for the files u r going to upload
    const avatarLocalPath = req.files?.avatar[0]?.path;         // refrence for the files we are going to upload
    // const coverImageLocalPath = req.files?.coverImage[0]?.path;
    let coverImageLocalPath;
    if(req.files && Array.isArray(req.files.coverImage) && req.files.coverImage.length > 0){
        coverImageLocalPath = req.files.coverImage[0].path;
    }

    //  to check if avatar is uploaded or not

    if (!avatarLocalPath) {
        throw new ApiError(400 , "Avatar file is required")
    }

    const avatar = await uploadOnCloudinary(avatarLocalPath);   // isko refrence me lelenge kyuki uploadoncloudinary ek response return kar rha h 
    const coverImage = await uploadOnCloudinary(coverImageLocalPath);

    if(!avatar){
        throw new ApiError(400 , "Avatar file is required");
    }

    const user = await User.create({
        fullName,
        avatar : avatar.url,
        coverImage : coverImage?.url || "",
        email,
        password,
        username : username.toLowerCase()
    })

    const createdUser = await User.findById(user._id).select(    // this is for ki agar user create ho jaye to usme se password and refresh token remove kardo kyuki wo sensitive in formation hai
        "-password -refreshToken"                 // ye select function remove krne k liye hi hota h kyuki by default baki sari cheeze already select hoti h 
    )

    if(!createdUser){
        throw new ApiError(500 , "Something went wrong while registering the user")
    }

    return res.status(201).json(
        new ApiResponse(200 , createdUser , "User Created Successfully")
    )
})


export {registerUser}