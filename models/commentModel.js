import mongoose from "mongoose";

const Schema = mongoose.Schema

const commentSchema = new Schema(
  {
    body: { type: String, required: true },
    creator: { type: Schema.Types.ObjectId, ref: "User", required: true },
    post: { type: Schema.Types.ObjectId, ref: "Comment", required: true },
  },
  { timestamps: true }
);

export const CommentModel = mongoose.model('Comment', commentSchema)
export default CommentModel