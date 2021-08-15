import mongoose from "mongoose";

const Schema = mongoose.Schema

const likeSchema = new Schema(
  {
    creator: { type: Schema.Types.ObjectId, ref: "User", required: true },
    post: { type: Schema.Types.ObjectId, ref: "Like", required: true },
  },
  { timestamps: true }
);

export const LikeModel = mongoose.model('Like', likeSchema)
export default LikeModel