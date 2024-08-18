import { Router } from "express";
import { loginUser, logoutUser, registerUser } from "../controllers/user.controllers.js";
import {upload} from "../middlewares/multer.middlewares.js"
import { verifyJWT } from "../middlewares/auth.middleware.js";

const router = Router();

router.route("/register").post(
    upload.fields([                        // i am using a middleware right before registerUser to check for the upload fields
        {
            name : "avatar",                 // here this fiields check for multiple things and take array as a input
            maxCount: 1
        },
        {
            name: "coverImage",
            maxCount : 1
        }
    ]),
    registerUser
)

router.route("/login").post(loginUser)

// scured Routes
router.route("/logout").post(verifyJWT,logoutUser)  // here we are using middleware just before clling the logout function

export default router;