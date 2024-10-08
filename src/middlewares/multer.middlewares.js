import multer from "multer";

//  For storage of the file and here we are choosing the disk Storage than memoryfile 

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
      cb(null, './public/temp')
    },
    filename: function (req, file, cb) {
      cb(null, file.originalname)
    }
  })
  
export const upload = multer(
    {
     storage: storage 
    }
)