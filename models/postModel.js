import mongoose from "mongoose";

const Schema = mongoose.Schema;

const postSchema = new Schema(
  {
    body: { type: String, required: true },
    commentCount: { type: Number, default: 0, required: true },
    likeCount: { type: Number, default: 0, required: true },
    userImage: { type: String, required: false },
    creator: { type: Schema.Types.ObjectId, ref: "User", required: true },
    comments: [{ type: Schema.Types.ObjectId, ref: "Comment" }],
    likes: [{ type: Schema.Types.ObjectId, ref: "Like" }],
  },
  {
    timestamps: true,
  }
);

export const PostModel = mongoose.model("Post", postSchema);
export default PostModel