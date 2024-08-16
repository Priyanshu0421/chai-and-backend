import { Router } from "express";
import { registerUser } from "../controllers/user.controllers.js";
import {upload} from "../middlewares/multer.middlewares.js"

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

export default router;