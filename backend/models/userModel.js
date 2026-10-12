import mongoose ,{Schema} from "mongoose";

const  userSchema = new Schema({
    email:{
        type:String,
        unique:true,
        required:true
    },
    password:{
        type:String,
        required:true
    }
})

const userModel = mongoose.model("users",userSchema)

export default userModel;