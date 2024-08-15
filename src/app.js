import express from 'express'
import cors from 'cors'
import cookieParser from 'cookie-parser';

const app = express();

app.use(cors({
    origin : process.env.CORS_ORIGIN,               // cors are middleware 
    credentials: true
}))

app.use(express.json({                   // to limit the amount of json we recieve from the server,if we recieve large data there are poosibility our server may crash doen
    limit:"16kb"
}))

app.use(express.urlencoded({               // this is for like in url there are some speacial symbols to handle space in the url 
    extended: true
}))

app.use(express.static("public"))   // to store some assest like photos like in public so that any one can access

app.use(cookieParser());



//  import router 
 import userRouter from './routes/user.routes.js';

// routes declaration
app.use("/api/v1/user" , userRouter)  // in this whenever we will access the api/v1/user will be redirected to routes where we have already defined what we have to do

export default app;