import mongoose , {Schema} from "mongoose";
import { User } from "./users.model.js";

const subscriptionSchema = new mongoose.Schema({
    subscriber: {
        typeof: Schema.Types.ObjectId,   // one who is Subscribing
        ref : "User"
    },
    channel: {
        typeof : Schema.Types.ObjectId,   // the channel they Are subscribing
        ref : "User"
    }
},
{
    timestamps:true
}
)