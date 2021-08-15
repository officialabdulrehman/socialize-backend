import mongoose from "mongoose";

const Schema = mongoose.Schema;

const notificationModal = new Schema(
  {
    creator: { type: Schema.Types.ObjectId, ref: "User", required: true },
    recipient: { type: Schema.Types.ObjectId, ref: "User", required: true },
    post: { type: Schema.Types.ObjectId, ref: "Post", required: true },
    action: { type: String, required: true },
    like: { type: Schema.Types.ObjectId, ref: "Like" },
    comment: { type: Schema.Types.ObjectId, ref: "Comment" },
    read: { type: Boolean, required: true },
    name: { type: String, required: true },
  },
  { timestamps: true }
);

export const NotificationModel = mongoose.model("Notification", notificationModal);
export default NotificationModel;