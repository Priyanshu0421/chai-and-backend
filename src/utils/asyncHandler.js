const asynHandler = (requstHandler) => {
    (req,res,next) => {
        Promise.resolve(requstHandler(req,res,next)).catch((err) => next(err))
    }
}



export {asynHandler}



// const asyncHandler = () => {}
// const asyncHandler = () => {()=>{}}   or const asyncHandler = () => () => {}

// const asyncHandler = (fn) => async (req,res,next) => {
//     try {
//         await fn(req,res,next)
//     } catch (error) {
//         res.status(error.code || 500).json({
//             success: false,
//             message: error.message
//         })
//     }
// }