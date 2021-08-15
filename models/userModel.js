import mongoose from "mongoose";

const Schema = mongoose.Schema;

const userSchema = new Schema(
  {
    email: { type: String, required: true, unique: true },
    isVerified: { type: Boolean, default: false },
    token: { type: String, required: false },
    password: { type: String, required: true },
    name: { type: String, required: true },
    bio: { type: String, required: false },
    location: { type: String, required: false },
    website: { type: String, required: false },
    image: { data: Buffer, contentType: String,required: false },
    imageUrl: {type: String, required: false },
    posts: [{ type: Schema.Types.ObjectId, ref: "Post" }],
    comments: [{ type: Schema.Types.ObjectId, ref: "Comment" }],
    likes: [{ type: Schema.Types.ObjectId, ref: "Like" }],
    notifications: [{ type: Schema.Types.ObjectId, ref: "Notification" }],
  },
  { timestamps: true }
);

export const UserModel = mongoose.model("User", userSchema);
export default UserModel;