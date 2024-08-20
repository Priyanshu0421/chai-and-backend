import { asyncHandler } from "../utils/asyncHandler.js";
import {ApiError} from "../utils/ApiError.js"
import { User } from "../models/users.model.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { deleteFromCloudinary, uploadOnCloudinary } from "../utils/cloudinary.js"
import jwt from "jsonwebtoken"

const generateAccessAndRefreshToken = async(userId) =>{
    try {
        const user = await User.findById(userId)           // here we get all the required properties of the User and we can use mongoose methods too
        const accessToken = user.generateAcessToken();    // here we get access of the methods for generating access token
        const refreshToken = user.generateRefreshAcessToken();   // here we get access of the methods for generating Refresh token
        
        user.refreshToken = refreshToken   // as we need to save refresh token in database as well as we need to give it to the user so that he can access the file withouth using access token again and again
        await user.save({validateBeforeSave: false})  // taki save krde in the mongoose data base and ye validate before save isliye kar rhe hn taki mongoose k data models me jo jo required fields thi wo kickin na kre and jo jo ham save krana chahte h wo seedha save ho jaye 

        return {accessToken , refreshToken}

    } catch (error) {
        throw new ApiError(500, "Something went wrong while generating access token and refresh token")
    }
}

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

const loginUser = asyncHandler(async (req,res) => {
    // get data from the request.body
    // determine from which parameter u want to login username or email
    // find the username in the mongodb database
    //  check the password entered
    //  give the access token and refresh token to the User
    // send token to the cookies 

    const { username, email, password } = req.body;

    // Check if at least one of username or email is provided
    if (!username && !email) {
        throw new ApiError(400, "Username or email is required");
    }

    // Find the user by username or email
    const user = await User.findOne({
        $or: [{ username }, { email }]
    });

    // Check if user exists
    if (!user) {
        throw new ApiError(404, "User does not exist");
    }

    // Validate the password
    const isValidatePassword = await user.isPasswordCorrect(password);
    if (!isValidatePassword) {
        throw new ApiError(401, "Invalid user credentials");
    }

    // Generate access and refresh tokens
    const { accessToken, refreshToken } = await generateAccessAndRefreshToken(user._id);

    // Retrieve the logged-in user without sensitive information
    const loggedInUser = await User.findById(user._id).select("-password -refreshToken");

    // Cookie options
    const options = {
        httpOnly: true,
        secure: true // Ensure this is set to true in production
    };

    // Send response with tokens and user information
    return res
        .status(200)
        .cookie("accessToken", accessToken, options)
        .cookie("refreshToken", refreshToken, options)
        .json(new ApiResponse(200, {
            user: loggedInUser,
            accessToken,
            refreshToken
        }));
});
const logoutUser = asyncHandler( async (req,res) => {
    User.findByIdAndUpdate(
        req.user._id,
        {
            $set:{
                refreshToken : undefined
            }
        },
        {
            new : true        //it will return the new value no the old value 
        }
    )
    const options = {
        httpOnly : true,
        secure: true
    }

    return res
    .status(200)
    .clearCookie("accessToken" , options)
    .clearCookie("refreshToken" , options)
    .json(
        new ApiResponse(200 , {} , "User logged out Successfully")
    )
})

const refreshAccessToken = asyncHandler(async (req,res) => {
    const incomingRefreshToken = req.cookie?.refreshToken || req.body.refreshToken

    if(!incomingRefreshToken){
        throw new ApiError(401 , "unauthorised request")
    }

    try {
        const decodedToken = jwt.verify(incomingRefreshToken , process.env.REFRESH_TOKEN_SECRET)
    
        const user = User.findById(decodedToken?._id)
    
        if(!user){
            throw new ApiError(401, "Invalid refresh Token")
        }
    
        if(incomingRefreshToken !== user?.refreshToken){
            throw new ApiError(401 , "Refresh Token is expired or used")
        }
    
        const options = {
            httpOnly: true,
            secure: true
        }
    
        //  now everything is checked now just generate new access and refresh tokens
    
        const {accessToken , newRefreshToken} = await generateAccessAndRefreshToken(user._id)
    
        return res
        .status(201)
        .cokkie("accessToken" , accessToken , options)
        .cookie("refreshToken" , newRefreshToken, options)
        .json(
            new ApiResponse(201,{accessToken ,refreshToken: newRefreshToken} , "Acess Token refreshed Successfully")
        )
    } catch (error) {
        throw new ApiError(401, error?.message || "Invalid Refresh Token")
    }
})

const changeCurrentPassword = asyncHandler(async (req,res) => {
    const {oldpassword , newpassword} = req.body

    const user = await User.findById(req.user?._id)

    const isPasswordCorrect = isPasswordCorrect(oldpassword)
    if(!isPasswordCorrect){
        throw new ApiError(400, "Invalid old password")
    }
    user.password = newpassword
    user.save({validateBeforeSave: false})

    return res
    .status(201)
    .json(
        new ApiResponse(201,{} , "Password has been changed successully")
    )
})

const getCurrentUser = asyncHandler(async(req,res) => {   // isme directly hi return kr diya kyuki hmare auth middle ware k pass req.user h toh seedha wha se current user mil jaega
    return res
    .status(200)
    .json(new ApiResponse(200 , req.user, "current user fetched Successfully"))
})

const updateAccountDetails = asyncHandler(async (req, res) => {
    const {fullName,email} = req.body

    if(!(username || email)){
        throw new ApiError(400 , "All fields are required")
    }

    const user = await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set: {
                fullName,    // these both fullName and email syntax is same this fullName, => fullName : fullName
                email: email
            }
        },
        {new : true}
    ).select("-password")
    return res 
    .status(200)
    .json(
        new ApiResponse(200,user , "User Account Details has been updated Successfully")
    )
})

const updateUserAvatar = asyncHandler(async (req,res) => {
    const avatarLocalPath = req.file?.path

    if(!avatarLocalPath){
        throw new ApiError(400," avatar file is missing ")
    }
    const avatar = uploadOnCloudinary(avatarLocalPath)

    if(!avatar.url){
        throw new ApiError(400,"Error while uploading the file")
    }

    const user = await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set : {
                avatar : avatar.url
            }
        },{
            new: true
        }
    ).select("-password")

    return res
    .status(200)
    .json(
        new ApiResponse(200 ,user , "Avatar image updated successfully")
    )
})

const updateUserCoverImage = asyncHandler(async (req,res) => {
    const coverImageLocalPath = req.file?.path

    if(!coverImageLocalPath){
        throw new ApiError(400, "Cover image file is missing")
    }

    const coverImage = await uploadOnCloudinary(coverImageLocalPath)

    if(!coverImage.url){
        throw new ApiError(400 , "Error while uploading the file")
    }

    const user = await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set: {
                coverImage : coverImage.url
            }
        },
        {
            new : true
        }
    ).select("-password")

    return res
    .status(201)
    .json(
        new ApiResponse(201,user,"cover image update successfully")
    )
})

const getUserChannelProfile = asyncHandler(async (req ,res) => {
    const {username} = req.params

    if(!username){
        throw new ApiError(400, "username is missing")
    }

    const channel = await User.aggregate([
        {
            $match: {
                username : username?.toLowerCase()
            }
        },
        {
            $lookup: {
                from : "subscriptions",
                localField: "_id",
                foreignField : "channel",
                as : "subscribers"
            }
        },
        {
            $lookup: {
                from : "subscriptions",
                localField: "_id",
                foreignField : "subscriber",
                as : "subscribedTo"
            }
        },
        {
            $addFields:{
                subscribersCount : {
                    $size: "$subscribers"  // we are using $ sign because it  is a field
                },
                channelsSubscribedToCount : {
                    $size : "$subscribedTo"
                },
                isSubscribed : {
                    $cond: { // this stand for condition and it has three things like if, then , else
                        if : {$in : [req.user?._id , "$subscribers.subscriber"]}, // to check if are in subcribers document or not 
                        then : true,
                        else: false
                    }
                }
            }
        },
        {
            $project : {  // this project property is for selecting document jo jo bhi ana chaiye
                fullName: 1,
                username: 1,
                subscribersCount: 1,
                channelsSubscribedToCount: 1,
                avatar : 1,
                coverImage: 1,
                email: 1
            }
        }
    ])

    if(!channel?.length){
        throw new ApiError(400, "Channeel does not exists")
    }
    return res
    .status(200)
    .json(
        new ApiResponse(200,channel[0],"user channel fetched successfully")
    )
})


export {
    registerUser, 
    loginUser , 
    logoutUser , 
    refreshAccessToken , 
    changeCurrentPassword,
    getCurrentUser , 
    updateAccountDetails , 
    updateUserAvatar , 
    updateUserCoverImage, 
    getUserChannelProfile
}